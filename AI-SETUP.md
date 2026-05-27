# Article summary

## Default: free local summary (no API, no quota)

The app uses **TnewsLocalSummary** — loads the article page (or RSS text), picks the most important sentences, and formats a short Arabic summary. **No OpenAI key required.** Never hits API quotas.

Users tap **✨ تلخيص المقال** — works with internet only.

---

## Optional: cloud AI with **Groq** (recommended)

Free tier, no OpenAI billing. Users **do not** enter a key in the app.

### GitHub Actions (your case)

1. [Settings → Secrets → Actions](https://github.com/ziedsG1/Tnewsipa/settings/secrets/actions)
2. Add **`GROQ_API_KEY`** with your key from [console.groq.com](https://console.groq.com) (`gsk_…`)
3. Or keep **`OPENAI_API_KEY`** secret name — paste the Groq key there; the build uses Groq URL automatically for `gsk_` keys
4. Push to `main` → IPA includes Groq config

### Local build

```powershell
$env:GROQ_API_KEY = "gsk-your-key"
npm run ai:config
npm run sync
```

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

### “You exceeded your current quota” (without using the app)

This usually means **no paid credits**, not that you used the app many times:

1. Open [platform.openai.com/settings/organization/billing](https://platform.openai.com/settings/organization/billing)
2. Add a **payment method** and **prepaid credits** (e.g. $5)
3. Check [Usage](https://platform.openai.com/usage) — if you see usage you did not make, your key was leaked (you posted it in chat earlier). **Revoke** that key and create a new one.
4. Update `www/config.ai.js` and GitHub secret `OPENAI_API_KEY`, then rebuild the IPA.

**Free alternative:** [Groq](https://console.groq.com) — create a key, then in `config.ai.js` set:
- `baseUrl`: `https://api.groq.com/openai/v1/chat/completions`
- `model`: `llama-3.3-70b-versatile`
