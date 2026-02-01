// ===============================
// BD Creative Systems — Frontend
// ===============================

// ✅ Your LIVE backend
const API_BASE = "https://bd-smart-ai-backend.onrender.com";
const CHAT_URL = `${API_BASE}/chat`;
const LEAD_URL = `${API_BASE}/lead`;

const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const messages = document.getElementById("messages");
const statusPill = document.getElementById("status-pill");

// Lead form elements
const leadForm = document.getElementById("lead-form");
const leadResult = document.getElementById("lead-result");
const leadName = document.getElementById("lead-name");
const leadEmail = document.getElementById("lead-email");
const leadBusiness = document.getElementById("lead-business");
const leadGoal = document.getElementById("lead-goal");
const leadNotes = document.getElementById("lead-notes");

function addMessage(text, sender = "bot") {
  const div = document.createElement("div");
  div.className = `message ${sender}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function setStatus(text, kind = "neutral") {
  statusPill.textContent = text;
  statusPill.style.color = "";
  statusPill.style.borderColor = "";
  statusPill.style.background = "";

  if (kind === "warn") {
    statusPill.style.color = "rgba(255,255,255,0.92)";
    statusPill.style.borderColor = "rgba(245,158,11,0.5)";
    statusPill.style.background = "rgba(245,158,11,0.12)";
  }
  if (kind === "ok") {
    statusPill.style.color = "rgba(255,255,255,0.92)";
    statusPill.style.borderColor = "rgba(34,197,94,0.45)";
    statusPill.style.background = "rgba(34,197,94,0.10)";
  }
}

async function postJson(url, payload, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });

  clearTimeout(timer);

  // Try to parse JSON, even on errors
  let data = null;
  try { data = await res.json(); } catch (_) {}

  return { ok: res.ok, status: res.status, data };
}

// -------------------------------
// Chat
// -------------------------------
async function sendChat(message) {
  // First request might “wake” Render free tier
  setStatus("Thinking…", "warn");

  // show a subtle system message if it’s slow
  const slowTimer = setTimeout(() => {
    addMessage("Waking up the server… one moment ⏳", "system");
  }, 1800);

  // retry once if wake-up / network hiccup
  let attempt = 0;
  while (attempt < 2) {
    try {
      const { ok, data } = await postJson(CHAT_URL, { message });

      clearTimeout(slowTimer);

      if (!ok) {
        setStatus("Error", "warn");
        return "⚠️ The server responded with an error. Try again in a moment.";
      }

      setStatus("Ready", "ok");
      return data?.reply || "No reply received.";
    } catch (err) {
      attempt += 1;
      if (attempt >= 2) {
        clearTimeout(slowTimer);
        setStatus("Offline?", "warn");
        return "⚠️ I couldn’t reach the AI server. Please try again (it may be waking up).";
      }
      // short delay before retry
      await new Promise(r => setTimeout(r, 2500));
    }
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");
  input.value = "";

  const reply = await sendChat(text);
  addMessage(reply, "bot");
});

// -------------------------------
// Lead Capture
// -------------------------------
leadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  leadResult.textContent = "Sending…";

  const payload = {
    name: leadName.value.trim(),
    email: leadEmail.value.trim(),
    business: leadBusiness.value.trim(),
    goal: leadGoal.value,
    notes: leadNotes.value.trim(),
    source: "website",
  };

  try {
    const { ok, data } = await postJson(LEAD_URL, payload, 25000);

    if (!ok) {
      leadResult.textContent = "⚠️ Couldn’t submit right now. Please try again.";
      return;
    }

    leadResult.textContent = "✅ Received! I’ll follow up with recommended package + next steps.";
    leadForm.reset();
  } catch (err) {
    leadResult.textContent = "⚠️ Network error — please try again (server may be waking up).";
  }
});


