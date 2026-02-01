import os
import csv
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv

# OpenAI (live mode)
from openai import OpenAI

load_dotenv()

AI_MODE = os.getenv("AI_MODE", "demo").strip().lower()  # demo | live
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

app = FastAPI(title="BD Smart AI Backend", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BACKEND_DIR = Path(__file__).resolve().parent
LEADS_CSV = BACKEND_DIR / "leads.csv"


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    mode: str


class LeadRequest(BaseModel):
    name: str
    email: EmailStr
    business: str
    goal: str
    notes: Optional[str] = ""
    source: Optional[str] = "website"


@app.get("/health")
def health():
    return {"status": "ok", "mode": AI_MODE}


@app.get("/")
def root():
    return {"status": "ok", "message": "Backend running. Use /docs, /health, POST /chat, POST /lead"}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    user_text = (req.message or "").strip()
    if not user_text:
        return ChatResponse(reply="Type a message and I’ll help 🙂", mode=AI_MODE)

    # Demo mode (free + reliable)
    if AI_MODE != "live":
        return ChatResponse(
            reply=(
                "Demo mode is on ✅\n"
                "Ask me about pricing, packages, or what you want your website to do."
            ),
            mode=AI_MODE,
        )

    # Live mode
    if client is None:
        return ChatResponse(
            reply="Live mode is on, but OPENAI_API_KEY is missing on the server.",
            mode=AI_MODE,
        )

    system_prompt = (
        "You are the BD Creative Systems website assistant.\n"
        "Be friendly, concise, and conversion-focused.\n"
        "Offer Starter/Growth/Custom packages and ask one short follow-up question if needed.\n"
        "Keep replies under 90 words unless user asks for details.\n"
    )

    try:
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text},
            ],
            temperature=0.4,
        )
        reply = resp.choices[0].message.content.strip()
        return ChatResponse(reply=reply, mode=AI_MODE)
    except Exception:
        return ChatResponse(
            reply="⚠️ The AI service is temporarily unavailable. Please try again.",
            mode=AI_MODE,
        )


def _ensure_csv_header():
    if not LEADS_CSV.exists():
        with open(LEADS_CSV, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["timestamp", "name", "email", "business", "goal", "notes", "source"])


@app.post("/lead")
def lead(req: LeadRequest):
    _ensure_csv_header()

    row = [
        datetime.utcnow().isoformat(),
        req.name.strip(),
        req.email.strip(),
        req.business.strip(),
        req.goal.strip(),
        (req.notes or "").strip(),
        (req.source or "website").strip(),
    ]

    with open(LEADS_CSV, "a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(row)

    return {"ok": True}

