/**
 * Writes www/config.ai.js from GEMINI_API_KEY only (never commit).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "www", "config.ai.js");

const GEMINI = {
  baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  model: "gemini-2.0-flash",
};

const apiKey = (process.env.GEMINI_API_KEY || process.argv[2] || "").trim();

if (!apiKey) {
  console.error("Set GEMINI_API_KEY (AIza…) from https://aistudio.google.com/apikey");
  process.exit(1);
}

if (!apiKey.startsWith("AIza")) {
  console.error("GEMINI_API_KEY must start with AIza");
  process.exit(1);
}

const config = {
  provider: "gemini",
  apiKey,
  baseUrl: (process.env.GEMINI_API_BASE || GEMINI.baseUrl).trim(),
  model: (process.env.GEMINI_MODEL || GEMINI.model).trim(),
};

const content = `/** Auto-generated — do not commit */
window.TNEWS_AI_CONFIG = ${JSON.stringify(config, null, 2)};
`;

fs.writeFileSync(outPath, content, "utf8");
console.log(`Wrote ${outPath} (Gemini, ${config.model})`);
