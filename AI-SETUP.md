# AI summary — API key (developer only)

Users **do not** enter a key in the app. You configure it once before building.

## Option A — Local file (easiest)

1. Create your private config (this file is **not** pushed to GitHub):

```powershell
cd c:\Users\zied\Tnewsipa
copy www\config.ai.example.js www\config.ai.js
```

2. Open `www\config.ai.js` and replace `PASTE_YOUR_OPENAI_KEY_HERE` with your real OpenAI key (`sk-…`).

3. Build / sync:

```powershell
npm run sync
git push
```

`www/config.ai.js` is **gitignored** so your key is not pushed to GitHub.

## Option B — Environment variable

```powershell
$env:OPENAI_API_KEY = "sk-your-key-here"
npm run ai:config
npm run sync
```

## Option C — GitHub Actions (IPA builds)

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. New secret: `OPENAI_API_KEY` = your key
3. Push to `main` — the workflow injects the key into the IPA at build time

---

## Security note

The key is embedded in the app binary. Anyone who extracts the IPA could find it and use your quota. For a public app, use a small backend proxy later.

## Billing

OpenAI requires credits on your account. Summaries use `gpt-4o-mini` (low cost per article).
