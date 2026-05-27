/**
 * Writes www/config.ai.js from GROQ_API_KEY only (never commit that file).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "www", "config.ai.js");

const GROQ = {
  baseUrl: "https://api.groq.com/openai/v1/chat/completions",
  model: "llama-3.3-70b-versatile",
};

const apiKey = (process.env.GROQ_API_KEY || process.argv[2] || "").trim();

if (!apiKey) {
  console.error("Set GROQ_API_KEY (gsk_…) — this app uses Groq only.");
  process.exit(1);
}

if (!apiKey.startsWith("gsk_")) {
  console.error("Key must be a Groq key (starts with gsk_). Get one at https://console.groq.com");
  process.exit(1);
}

const baseUrl = (process.env.AI_API_BASE || GROQ.baseUrl).trim();
const model = (process.env.AI_API_MODEL || GROQ.model).trim();

const content = `/** Auto-generated — do not commit */
window.TNEWS_AI_CONFIG = {
  provider: "groq",
  apiKey: ${JSON.stringify(apiKey)},
  baseUrl: ${JSON.stringify(baseUrl)},
  model: ${JSON.stringify(model)},
};
`;

fs.writeFileSync(outPath, content, "utf8");
console.log(`Wrote ${outPath} (Groq, ${model})`);
