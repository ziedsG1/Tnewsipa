/**
 * Writes www/config.ai.js from OPENAI_API_KEY (never commit that file).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "www", "config.ai.js");

const apiKey = (process.env.OPENAI_API_KEY || process.argv[2] || "").trim();
if (!apiKey) {
  console.error("Set OPENAI_API_KEY or pass the key as the first argument.");
  process.exit(1);
}

const baseUrl =
  (process.env.OPENAI_API_BASE || "https://api.openai.com/v1/chat/completions").trim();
const model = (process.env.OPENAI_API_MODEL || "gpt-4o-mini").trim();

const content = `/** Auto-generated — do not commit */\nwindow.TNEWS_AI_CONFIG = {\n  apiKey: ${JSON.stringify(apiKey)},\n  baseUrl: ${JSON.stringify(baseUrl)},\n  model: ${JSON.stringify(model)},\n};\n`;

fs.writeFileSync(outPath, content, "utf8");
console.log(`Wrote ${outPath}`);
