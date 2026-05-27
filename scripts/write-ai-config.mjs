/**
 * Writes www/config.ai.js — Gemini first (more daily quota), Groq as backup.
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

const GEMINI = {
  baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  model: "gemini-2.0-flash",
};

const groqKey = (process.env.GROQ_API_KEY || "").trim();
const geminiKey = (process.env.GEMINI_API_KEY || "").trim();

if (!groqKey && !geminiKey) {
  console.error("Set at least one: GROQ_API_KEY (gsk_) and/or GEMINI_API_KEY (AIza…)");
  process.exit(1);
}

if (groqKey && !groqKey.startsWith("gsk_")) {
  console.error("GROQ_API_KEY must start with gsk_");
  process.exit(1);
}

const geminiBlock = geminiKey
  ? {
      provider: "gemini",
      apiKey: geminiKey,
      baseUrl: (process.env.GEMINI_API_BASE || GEMINI.baseUrl).trim(),
      model: (process.env.GEMINI_MODEL || GEMINI.model).trim(),
    }
  : null;

const groqBlock = groqKey
  ? {
      provider: "groq",
      apiKey: groqKey,
      baseUrl: (process.env.AI_API_BASE || GROQ.baseUrl).trim(),
      model: (process.env.AI_API_MODEL || GROQ.model).trim(),
    }
  : null;

/** Gemini primary when both exist — avoids Groq per-minute limits on summaries. */
const primary = geminiBlock || groqBlock;
const fallback =
  geminiBlock && groqBlock ? (primary.provider === "gemini" ? groqBlock : geminiBlock) : null;

const config = { ...primary };
if (fallback) config.fallback = fallback;

const content = `/** Auto-generated — do not commit */
window.TNEWS_AI_CONFIG = ${JSON.stringify(config, null, 2)};
`;

fs.writeFileSync(outPath, content, "utf8");
console.log(`Wrote ${outPath} (primary: ${primary.provider}${fallback ? `, fallback: ${fallback.provider}` : ""})`);
