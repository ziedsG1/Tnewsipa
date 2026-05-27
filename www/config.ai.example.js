/**
 * Copy to config.ai.js (gitignored). Groq + optional Gemini fallback.
 *
 *   copy www\config.ai.example.js www\config.ai.js
 *
 * Or: $env:GROQ_API_KEY="gsk_..."; $env:GEMINI_API_KEY="AIza..."; npm run ai:config
 */
window.TNEWS_AI_CONFIG = {
  provider: "groq",
  apiKey: "gsk_PASTE_YOUR_GROQ_KEY_HERE",
  baseUrl: "https://api.groq.com/openai/v1/chat/completions",
  model: "llama-3.3-70b-versatile",
  fallback: {
    provider: "gemini",
    apiKey: "AIza_PASTE_YOUR_GEMINI_KEY_HERE",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: "gemini-2.0-flash",
  },
};
