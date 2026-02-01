// ================================
// BD Creative Systems – Smart AI
// Frontend App (LIVE)
// ================================

// 🔗 LIVE BACKEND URL (Render)
const API_BASE = "https://bd-smart-ai-backend.onrender.com";

// DOM Elements
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatBox = document.getElementById("chat-box");

// Add message to UI
function addMessage(text, sender = "bot") {
  const message = document.createElement("div");
  message.className = sender === "user" ? "message user" : "message bot";
  message.textContent = text;
  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Loading indicator
function addLoading() {
  const loading = document.createElement("div");
  loading.className = "message bot loading";
  loading.id = "loading";
  loading.textContent = "Thinking...";
  chatBox.appendChild(loading);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function removeLoading() {
  const loading = document.getElementById("loading");
  if (loading) loading.remove();
}

// Handle form submit
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userMessage = chatInput.value.trim();
  if (!userMessage) return;

  addMessage(userMessage, "user");
  chatInput.value = "";
  addLoading();

  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: userMessage,
      }),
    });

    removeLoading();

    if (!response.ok) {
      throw new Error("Server error");
    }

    const data = await response.json();
    addMessage(data.reply || "No response received.");
  } catch (error) {
    removeLoading();
    addMessage(
      "⚠️ Sorry, the AI service is temporarily unavailable. Please try again."
    );
    console.error("Chat error:", error);
  }
});

// Optional welcome message
window.addEventListener("load", () => {
  addMessage("👋 Hi! I'm your AI assistant. How can I help you today?");
});


