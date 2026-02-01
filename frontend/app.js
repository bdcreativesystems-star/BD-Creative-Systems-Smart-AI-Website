// ✅ SET THIS to your backend base URL (NOT the frontend URL)
// Example: "https://bd-smart-ai-backend.onrender.com"
const BACKEND_URL = "https://bd-smart-ai-backend.onrender.com";


const chatWindow = document.getElementById("chatWindow");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

const statusText = document.getElementById("statusText");
const statusNote = document.getElementById("statusNote");
const yearEl = document.getElementById("year");

yearEl.textContent = String(new Date().getFullYear());

function addMessage(text, who) {
  const el = document.createElement("div");
  el.className = `msg ${who}`;
  el.textContent = text;          // safe text output
  chatWindow.appendChild(el);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function checkHealth() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, { method: "GET" });
    if (!res.ok) throw new Error(`Health not ok: ${res.status}`);
    const data = await res.json();
    statusText.textContent = "Backend online";
    statusNote.textContent = data?.service ? `Service: ${data.service}` : "Ready.";
  } catch (e) {
    statusText.textContent = "Backend offline";
    statusNote.textContent = "If chat fails, confirm your backend URL and Render status.";
  }
}

async function sendMessage(message) {
  addMessage(message, "user");

  // little UX: disable while waiting
  sendBtn.disabled = true;
  sendBtn.textContent = "Sending…";

  try {
    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    const data = await res.json();
    const reply = (data && data.reply) ? data.reply : "No reply received.";
    addMessage(reply, "ai");
  } catch (e) {
    addMessage("⚠️ Could not reach the AI backend. Check your BACKEND_URL and Render logs.", "ai");
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Send";
  }
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = (userInput.value || "").trim();
  if (!msg) return;
  userInput.value = "";
  sendMessage(msg);
});

checkHealth();


