/**
 * Build DOCUMENTATION.pdf from markdown using Edge/Chrome headless print.
 * Usage: node scripts/generate-documentation-pdf.mjs
 */
import fs from "fs";
import path from "path";
import { execSync, spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const mdPath = path.join(root, "DOCUMENTATION.md");
const outDir = path.join(root, "docs");
const htmlPath = path.join(outDir, "DOCUMENTATION.html");
const pdfPath = path.join(outDir, "Tnews-Documentation.pdf");

const CSS = `
  @page { margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", Tahoma, "Noto Sans Arabic", Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.55;
    color: #1a1a1a;
    max-width: 210mm;
    margin: 0 auto;
    padding: 12mm 0;
  }
  h1 { font-size: 22pt; border-bottom: 2px solid #2563eb; padding-bottom: 0.3em; margin-top: 0; }
  h2 { font-size: 15pt; color: #1e40af; margin-top: 1.4em; page-break-after: avoid; }
  h3 { font-size: 12.5pt; margin-top: 1.1em; page-break-after: avoid; }
  h4 { font-size: 11pt; }
  p, li { orphans: 3; widows: 3; }
  a { color: #2563eb; word-break: break-all; }
  code {
    font-family: Consolas, "Courier New", monospace;
    font-size: 9.5pt;
    background: #f1f5f9;
    padding: 0.15em 0.35em;
    border-radius: 3px;
  }
  pre {
    background: #0f172a;
    color: #e2e8f0;
    padding: 12px 14px;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 8.5pt;
    line-height: 1.45;
    page-break-inside: avoid;
  }
  pre code { background: transparent; color: inherit; padding: 0; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 10pt;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }
  th { background: #e2e8f0; font-weight: 600; }
  tr:nth-child(even) td { background: #f8fafc; }
  blockquote {
    border-left: 4px solid #94a3b8;
    margin: 1em 0;
    padding: 0.25em 0 0.25em 1em;
    color: #475569;
  }
  hr { border: none; border-top: 1px solid #cbd5e1; margin: 1.5em 0; }
  .cover {
    text-align: center;
    padding: 2em 0 3em;
    margin-bottom: 2em;
    border-bottom: 1px solid #e2e8f0;
  }
  .cover .subtitle { color: #64748b; font-size: 12pt; margin-top: 0.5em; }
  .mermaid-note {
    background: #eff6ff;
    border: 1px solid #93c5fd;
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 10pt;
    margin: 1em 0;
  }
`;

function findBrowser() {
  const candidates = [
    process.env.TNEWS_PDF_BROWSER,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);

  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  throw new Error("No Edge or Chrome found for PDF export.");
}

async function loadMarked() {
  try {
    return (await import("marked")).marked;
  } catch {
    const markedDir = path.join(root, "node_modules", "marked");
    if (!fs.existsSync(markedDir)) {
      console.log("Installing marked (dev)…");
      execSync("npm install marked --no-save", { cwd: root, stdio: "inherit" });
    }
    return (await import("marked")).marked;
  }
}

function preprocessMarkdown(raw) {
  return raw.replace(/```mermaid\n([\s\S]*?)```/g, (_match, diagram) => {
    const escaped = diagram
      .trim()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return (
      `\n<div class="mermaid-note"><strong>Architecture diagram</strong> (see repo for interactive version):<pre>${escaped}</pre></div>\n`
    );
  });
}

function buildHtml(bodyHtml) {
  const generated = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Tnews Widget — Documentation</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="cover">
    <h1>Tnews Widget — Project Documentation</h1>
    <p class="subtitle">iOS app · Capacitor · WidgetKit · v2.0.1</p>
    <p class="subtitle">Generated ${generated}</p>
  </div>
  ${bodyHtml}
</body>
</html>`;
}

function printPdf(browser, htmlFile, pdfFile) {
  const fileUrl = "file:///" + htmlFile.replace(/\\/g, "/").replace(/ /g, "%20");
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    `--print-to-pdf=${pdfFile}`,
    "--no-pdf-header-footer",
    fileUrl,
  ];

  const result = spawnSync(browser, args, { encoding: "utf8", timeout: 120000 });
  if (result.status !== 0) {
    throw new Error(
      `Browser PDF export failed (code ${result.status}): ${result.stderr || result.stdout || "unknown"}`,
    );
  }
  if (!fs.existsSync(pdfFile)) {
    throw new Error("PDF file was not created.");
  }
}

async function main() {
  if (!fs.existsSync(mdPath)) {
    console.error("Missing DOCUMENTATION.md");
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const marked = await loadMarked();
  marked.setOptions({ gfm: true, breaks: false });

  const md = preprocessMarkdown(fs.readFileSync(mdPath, "utf8"));
  const bodyHtml = marked.parse(md);
  fs.writeFileSync(htmlPath, buildHtml(bodyHtml), "utf8");

  const browser = findBrowser();
  console.log(`Using browser: ${browser}`);
  printPdf(browser, htmlPath, pdfPath);

  const sizeKb = Math.round(fs.statSync(pdfPath).size / 1024);
  console.log(`PDF written: ${pdfPath} (${sizeKb} KB)`);
  console.log(`HTML preview: ${htmlPath}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
