// frontend/app.js

// 🔥 Put your Render backend URL here:
const API_BASE = "https://bd-smart-ai-backend.onrender.com";

const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const statusEl = document.getElementById("statusBadge");

const chat = []; // { role: "user"|"assistant", content: string }

function setStatus(text) {
  if (!statusEl) return;
  statusEl.textContent = text;
}

function addMessage(role, content) {
  chat.push({ role, content });
  renderMessages();
}

function renderMessages() {
  messagesEl.innerHTML = "";

  chat.forEach((m) => {
    const row = document.createElement("div");
    row.className = `msg-row ${m.role}`;

    const bubble = document.createElement("div");
    bubble.className = `bubble ${m.role}`;
    bubble.textContent = m.content;

    // ✅ Makes assistant replies show multi-line properly
    bubble.style.whiteSpace = "pre-wrap";

    row.appendChild(bubble);
    messagesEl.appendChild(row);
  });

  // Auto-scroll to bottom
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;

  addMessage("user", text);
  inputEl.value = "";
  inputEl.focus();

  setStatus("Thinking...");

  try {
    const payload = {
      message: text,
      history: chat.map((m) => ({ role: m.role, content: m.content })),
    };

    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const reply = data.reply || "Hmm… I didn’t get a reply back.";

    addMessage("assistant", reply);
    setStatus("Ready");
  } catch (err) {
    console.error(err);
    addMessage("assistant", `⚠️ Server error:\n${err.message}`);
    setStatus("Offline?");
  }
}

// Events
sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

// ✅ Starter message (ONLY ONCE — no more duplicates)
addMessage(
  "assistant",
  "Hey! 👋 What kind of business is this for?\n\nExamples: realtor, salon, coach, cleaning service.\n\nTell me your niche + city and I’ll suggest what to put on your website."
);

setStatus("Ready");


