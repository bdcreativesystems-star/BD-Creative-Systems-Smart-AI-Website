const chatWidget = document.getElementById("chatWidget");
const openChat = document.getElementById("openChat");
const closeChat = document.getElementById("closeChat");

const messages = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");

// Backend API endpoint
const API_URL = "http://localhost:8000/chat";

// Persist a session id so the bot remembers the conversation
let sessionId = localStorage.getItem("ai_smart_site_session_id") || null;

function addMessage(text, who) {
  const div = document.createElement("div");
  div.className = `msg ${who}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function openChatWidget() {
  chatWidget.classList.remove("hidden");

  // Only show a greeting if there are no messages yet
  if (messages.children.length === 0) {
    addMessage("Hey! 👋 I’m the site assistant. What can I help you with today?", "bot");
  }
}

openChat.addEventListener("click", openChatWidget);

closeChat.addEventListener("click", () => {
  chatWidget.classList.add("hidden");
});

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = chatInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  chatInput.value = "";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        session_id: sessionId
      })
    });

    const data = await res.json();

    // Save session_id so the backend remembers the same user next time
    if (data.session_id) {
      sessionId = data.session_id;
      localStorage.setItem("ai_smart_site_session_id", sessionId);
    }

    addMessage(data.reply, "bot");
  } catch (err) {
    addMessage("Couldn’t reach the backend. Make sure FastAPI is running on port 8000.", "bot");
  }
});

// Optional: allow user to reset the conversation from the browser console:
// localStorage.removeItem("ai_smart_site_session_id");

