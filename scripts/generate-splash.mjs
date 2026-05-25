/**
 * Replace default Capacitor splash images with Tnews branding.
 * Usage: node scripts/generate-splash.mjs
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const iconPath = path.join(root, "icon.png");
const outDir = path.join(root, "ios", "App", "App", "Assets.xcassets", "Splash.imageset");

const BG = { r: 8, g: 12, b: 22, alpha: 1 }; // #080c16
const SIZE = 2732;
const ICON_RATIO = 0.2;

async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch {
    execSync("npm install sharp --no-save", { cwd: root, stdio: "inherit" });
    return (await import("sharp")).default;
  }
}

async function main() {
  if (!fs.existsSync(iconPath)) {
    console.error("Missing icon.png at project root");
    process.exit(1);
  }

  const sharp = await loadSharp();
  const iconSize = Math.round(SIZE * ICON_RATIO);

  const icon = await sharp(iconPath)
    .resize(iconSize, iconSize, { fit: "contain", background: BG })
    .png()
    .toBuffer();

  const base = sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: BG },
  }).png();

  const composed = await base
    .composite([{ input: icon, gravity: "centre" }])
    .toBuffer();

  const names = ["splash-2732x2732-2.png", "splash-2732x2732-1.png", "splash-2732x2732.png"];
  for (const name of names) {
    fs.writeFileSync(path.join(outDir, name), composed);
  }

  console.log(`Splash images written to ${outDir}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
