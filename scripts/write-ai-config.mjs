/**
 * Writes www/config.ai.js from GROQ_API_KEY or OPENAI_API_KEY (never commit that file).
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

const OPENAI = {
  baseUrl: "https://api.openai.com/v1/chat/completions",
  model: "gpt-4o-mini",
};

const apiKey = (
  process.env.GROQ_API_KEY ||
  process.env.OPENAI_API_KEY ||
  process.argv[2] ||
  ""
).trim();

if (!apiKey) {
  console.error("Set GROQ_API_KEY or OPENAI_API_KEY (or pass key as first argument).");
  process.exit(1);
}

const useGroq =
  process.env.AI_PROVIDER === "groq" ||
  apiKey.startsWith("gsk_") ||
  Boolean(process.env.GROQ_API_KEY);

const defaults = useGroq ? GROQ : OPENAI;
const baseUrl = (process.env.AI_API_BASE || defaults.baseUrl).trim();
const model = (process.env.AI_API_MODEL || defaults.model).trim();

const content = `/** Auto-generated — do not commit */
window.TNEWS_AI_CONFIG = {
  provider: ${JSON.stringify(useGroq ? "groq" : "openai")},
  apiKey: ${JSON.stringify(apiKey)},
  baseUrl: ${JSON.stringify(baseUrl)},
  model: ${JSON.stringify(model)},
};
`;

fs.writeFileSync(outPath, content, "utf8");
console.log(`Wrote ${outPath} (${useGroq ? "Groq" : "OpenAI"}, ${model})`);
