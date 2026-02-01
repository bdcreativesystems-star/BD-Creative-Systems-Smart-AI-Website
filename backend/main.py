import os
from typing import Optional, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# ---- App ----
app = FastAPI(title="BD Smart AI Backend", version="1.0.0")

# ---- CORS (safe default: allow your frontend + local dev) ----
allowed_origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:5173",
    "https://bd-smart-ai-frontend.onrender.com",
]
# Optionally allow additional origins via env var:
# EXTRA_CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
extra = os.getenv("EXTRA_CORS_ORIGINS", "").strip()
if extra:
    allowed_origins.extend([o.strip() for o in extra.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Models ----
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

# ---- OpenAI (supports both old and new env var names) ----
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_KEY")

def _fallback_reply(user_text: str) -> str:
    # Safe fallback so your UI still works even if key is missing.
    return (
        "I’m online, but the backend is missing an OpenAI API key.\n\n"
        f"You said: {user_text}\n\n"
        "Set OPENAI_API_KEY in Render Environment Variables, then redeploy."
    )

@app.get("/health")
def health() -> Dict[str, Any]:
    return {"ok": True, "service": "bd-smart-ai-backend"}

@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    user_text = (payload.message or "").strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # If no key, return a helpful response instead of crashing
    if not OPENAI_API_KEY:
        return ChatResponse(reply=_fallback_reply(user_text))

    # --- OpenAI call (works with the new OpenAI Python SDK) ---
    try:
        from openai import OpenAI  # installed in requirements.txt
        client = OpenAI(api_key=OPENAI_API_KEY)

        resp = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant for BD Creative Systems. Be concise, friendly, and practical."},
                {"role": "user", "content": user_text},
            ],
            temperature=0.7,
        )

        reply = resp.choices[0].message.content or ""
        reply = reply.strip() or "I didn’t get that—can you try again?"
        return ChatResponse(reply=reply)

    except Exception as e:
        # Never hard-crash your app; return a useful message
        return ChatResponse(
            reply=(
                "⚠️ The backend hit an error while generating a reply.\n\n"
                f"Details: {type(e).__name__}: {e}\n\n"
                "Check Render logs and confirm your OPENAI_API_KEY is set."
            )
        )

