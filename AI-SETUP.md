# Article summary (Google Gemini)

Summaries use **Google Gemini** (free tier). Users never enter a key in the app.

## GitHub Actions (IPA build)

1. [Settings → Secrets → Actions](https://github.com/ziedsG1/Tnewsipa/settings/secrets/actions)
2. Add **`GEMINI_API_KEY`** (`AIza…` from [aistudio.google.com/apikey](https://aistudio.google.com/apikey))
3. Push to `main` → rebuild IPA

You can remove `GROQ_API_KEY` — the app no longer uses Groq.

## Local build

```powershell
cd c:\Users\zied\Tnewsipa
$env:GEMINI_API_KEY = "AIza-your-key"
npm run ai:config
npm run sync
```

`www/config.ai.js` is **gitignored**.

## Security

Keys are embedded in the IPA. Rotate on [Google AI Studio](https://aistudio.google.com) if leaked.
