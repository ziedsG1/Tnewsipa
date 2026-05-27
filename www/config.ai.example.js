/**
 * Copy to config.ai.js (gitignored).
 *
 *   copy www\config.ai.example.js www\config.ai.js
 *
 * Or: $env:GEMINI_API_KEY="AIza..."; npm run ai:config
 */
window.TNEWS_AI_CONFIG = {
  provider: "gemini",
  apiKey: "AIza_PASTE_YOUR_GEMINI_KEY_HERE",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  model: "gemini-2.0-flash",
};
