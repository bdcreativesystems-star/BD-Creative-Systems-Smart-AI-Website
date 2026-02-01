// ========= CONFIG =========
// Put your BACKEND Render URL here (no trailing slash)
const API_BASE = "https://bd-smart-ai-backend.onrender.com";

// ========= HELPERS =========
const $ = (id) => document.getElementById(id);

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addMessage(role, text) {
  const wrap = $("messages");
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role === "user" ? "bubble-user" : "bubble-ai"}`;

  // IMPORTANT: preserve multi-line + wrap nicely
  bubble.innerHTML = escapeHtml(text).replaceAll("\n", "<br/>");

  wrap.appendChild(bubble);
  wrap.scrollTop = wrap.scrollHeight;
}

function setStatus(label, good = false) {
  const el = $("statusBadge");
  el.textContent = label;
  el.classList.toggle("good", !!good);
}

// ========= API =========
async function healthCheck() {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: "GET" });
    if (!res.ok) throw new Error("Health not ok");
    setStatus("Ready", true);
    return true;
  } catch {
    setStatus("Waking...", false);
    return false;
  }
}

async function sendChat(message) {
  const payload = { message };

  // Your FastAPI likely returns: { reply: "..." } or { response: "..." }
  // We'll support both, plus a fallback.
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = data?.detail || "Something went wrong.";
    throw new Error(detail);
  }

  return data?.reply || data?.response || data?.message || JSON.stringify(data);
}

// ========= LEAD CAPTURE (optional: only if your backend supports it) =========
async function submitLead() {
  const name = $("leadName").value.trim();
  const email = $("leadEmail").value.trim();
  const business = $("leadBusiness").value.trim();
  const goal = $("leadGoal").value.trim();
  const status = $("leadStatus");

  if (!name || !email) {
    status.textContent = "Please add at least name + email.";
    return;
  }

  status.textContent = "Submitting...";

  // If you don't have /lead on backend yet, this will fail safely.
  try {
    const res = await fetch(`${API_BASE}/lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, business, goal }),
    });

    if (!res.ok) throw new Error("Lead endpoint not available yet.");
    status.textContent = "✅ Lead submitted!";
  } catch (e) {
    status.textContent =
      "Saved locally ✅ (Backend /lead not set yet).";

    // quick local fallback so you don't lose it
    const leads = JSON.parse(localStorage.getItem("bd_leads") || "[]");
    leads.push({ name, email, business, goal, ts: new Date().toISOString() });
    localStorage.setItem("bd_leads", JSON.stringify(leads));
  }
}

// ========= UI WIRING =========
async function onSend() {
  const input = $("userInput");
  const msg = input.value.trim();
  if (!msg) return;

  addMessage("user", msg);
  input.value = "";

  try {
    setStatus("Thinking...", false);
    const reply = await sendChat(msg);
    addMessage("ai", reply);
    setStatus("Ready", true);
  } catch (e) {
    addMessage("ai", `⚠️ ${e.message}\n\nIf the backend was asleep, try again in ~30 seconds.`);
    setStatus("Waking...", false);
  }
}

function init() {
  $("year").textContent = String(new Date().getFullYear());

  // Initial assistant prompt once (not repeated)
  addMessage("ai", "Hey! 👋 What kind of business is this for? (ex: realtor, salon, coach, cleaning service)");

  $("sendBtn").addEventListener("click", onSend);
  $("userInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") onSend();
  });

  const leadBtn = $("leadBtn");
  if (leadBtn) leadBtn.addEventListener("click", submitLead);

  // Health check with a small retry if it’s asleep
  healthCheck();
  setTimeout(healthCheck, 2500);
}

document.addEventListener("DOMContentLoaded", init);


