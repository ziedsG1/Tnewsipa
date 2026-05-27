/** Default — no key. Overridden by config.ai.js when built with GROQ_API_KEY. */
window.TNEWS_AI_CONFIG = {
  provider: "groq",
  apiKey: "",
  baseUrl: "https://api.groq.com/openai/v1/chat/completions",
  model: "llama-3.3-70b-versatile",
};
