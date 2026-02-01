import os
from uuid import uuid4
from typing import Optional, Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# OpenAI (live mode)
from openai import OpenAI

load_dotenv()

app = FastAPI(title="AI Smart Site Backend")

# Demo-friendly CORS (tighten for production later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # e.g. ["http://localhost:5500"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AI_MODE = os.getenv("AI_MODE", "demo").lower()  # "demo" or "live"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()

# Initialize OpenAI client (only used in live mode)
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# In-memory sessions (resets when server restarts)
SESSIONS: Dict[str, Dict[str, Any]] = {}


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    mode: str
    session_id: str


def is_email(text: str) -> bool:
    t = (text or "").strip()
    return "@" in t and "." in t and len(t) >= 6 and " " not in t


def normalize(text: str) -> str:
    return (text or "").strip()


def reset_session(session: Dict[str, Any]) -> None:
    session["step"] = "ask_business"
    session["business"] = ""
    session["goal"] = ""
    session["email"] = ""


def demo_flow_reply(session: Dict[str, Any], user_message: str) -> str:
    """
    State machine to prevent repeating questions.
    Steps:
      start -> ask_business -> ask_goal -> ask_email -> done
    """
    msg = normalize(user_message)
    lower = msg.lower()

    # User can restart anytime
    if lower in {"restart", "start over", "reset"}:
        reset_session(session)
        return "No problem — let’s restart. What kind of business is this for? (ex: realtor, salon, coach, cleaning service)"

    if session["step"] == "start":
        session["step"] = "ask_business"
        return "Hey! 👋 What kind of business is this for? (ex: realtor, salon, coach, cleaning service)"

    if session["step"] == "ask_business":
        if not msg:
            return "What kind of business is this for? (ex: realtor, salon, coach, cleaning service)"
        session["business"] = msg
        session["step"] = "ask_goal"
        return f"Nice — {session['business']}. What do you want the website to do? (get leads, book calls, sell, support customers)"

    if session["step"] == "ask_goal":
        if not msg:
            return "What do you want the website to do? (get leads, book calls, sell, support customers)"
        session["goal"] = msg
        session["step"] = "ask_email"
        return "Perfect. What’s the best email to send your setup summary to?"

    if session["step"] == "ask_email":
        if not is_email(msg):
            return "That doesn’t look like an email. Can you type it like name@example.com?"
        session["email"] = msg
        session["step"] = "done"
        return (
            "Got it ✅ Here’s what I captured:\n"
            f"- Business: {session['business']}\n"
            f"- Goal: {session['goal']}\n"
            f"- Email: {session['email']}\n\n"
            "Do you want pricing options (Starter / Pro / Premium) or a recommended package?"
        )

    # After done: helpful responses
    if "price" in lower or "pricing" in lower or "cost" in lower:
        return (
            "Here are quick options:\n"
            "• Starter: landing page + basic assistant + contact form\n"
            "• Pro: Starter + smart lead capture + email notifications\n"
            "• Premium: Pro + Google Sheets/CRM integration + custom AI prompts\n\n"
            "Which one fits you best: Starter, Pro, or Premium?"
        )

    if "starter" in lower:
        return "Starter = a clean landing page + basic assistant + contact form. Great for getting online fast."

    if "pro" in lower:
        return "Pro = Starter + lead qualification + lead summaries. Great if you want organized leads."

    if "premium" in lower:
        return "Premium = Pro + Google Sheets/CRM + deeper automation + custom AI prompts. Great for scaling."

    if "services" in lower or "what do you offer" in lower or "do you offer" in lower:
        return "I build AI-powered business websites: landing pages + smart lead capture + AI assistants + automation-ready integrations."

    return (
        "Got it. Want to add one of these next?\n"
        "1) Appointment booking\n"
        "2) Google Sheets lead tracking\n"
        "3) A pricing + checkout page\n"
        "4) A multi-page website (Home / Services / About / Contact)"
    )


def ensure_intake_progress(session: Dict[str, Any], user_message: str) -> Optional[str]:
    """
    If intake isn't complete, we gently continue the intake steps.
    Returns a reply if we handled it; otherwise None.
    """
    msg = normalize(user_message)

    # If they're not done, keep flow consistent (same logic as demo, but shared with live)
    if session["step"] in {"start", "ask_business", "ask_goal", "ask_email"}:
        return demo_flow_reply(session, msg)

    return None


def live_ai_reply(session: Dict[str, Any], user_message: str) -> str:
    """
    Live AI replies AFTER intake is complete.
    Intake itself stays deterministic so it doesn't loop or repeat.
    """
    if client is None:
        # No key available; fall back
        return demo_flow_reply(session, user_message)

    msg = normalize(user_message)
    lower = msg.lower()

    # Let user restart even in live mode
    if lower in {"restart", "start over", "reset"}:
        reset_session(session)
        return "No problem — let’s restart. What kind of business is this for? (ex: realtor, salon, coach, cleaning service)"

    # If intake isn't done, continue intake (deterministic)
    intake_reply = ensure_intake_progress(session, msg)
    if intake_reply is not None:
        return intake_reply

    # If done, use real AI with context from captured info
    system_prompt = f"""
You are "BD SmartSite Assistant", a friendly, concise AI assistant embedded on a small business website.

Context (captured from the visitor):
- Business type: {session.get("business", "")}
- Website goal: {session.get("goal", "")}
- Visitor email: {session.get("email", "")}

Your job:
- Answer questions about services and pricing clearly
- Suggest the best package (Starter/Pro/Premium) based on goals
- Ask short follow-ups if needed
- Keep replies under 80 words unless the user asks for detail
- Never ask for the email again (we already have it)
"""

    try:
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": msg},
            ],
            temperature=0.4,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        # Safety fallback: if OpenAI errors for any reason
        return demo_flow_reply(session, msg)


@app.get("/health")
def health():
    return {"status": "ok", "mode": AI_MODE}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    session_id = req.session_id or str(uuid4())

    session = SESSIONS.get(session_id)
    if session is None:
        session = {"step": "start", "business": "", "goal": "", "email": ""}
        SESSIONS[session_id] = session

    if AI_MODE == "live":
        reply = live_ai_reply(session, req.message)
    else:
        reply = demo_flow_reply(session, req.message)

    return ChatResponse(reply=reply, mode=AI_MODE, session_id=session_id)

