# Article summary (Groq + optional Gemini)

Summaries use **free cloud AI**. Users never enter a key in the app.

## Recommended setup (two free keys)

| Provider | Free key | Limits (approx.) | Get key |
|----------|----------|------------------|---------|
| **Groq** (primary) | `gsk_…` | Fast; ~30 req/min | [console.groq.com](https://console.groq.com) |
| **Google Gemini** (fallback) | `AIza…` | ~1500 req/day | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

When Groq hits its limit, the app automatically tries **Gemini** if you added `GEMINI_API_KEY`.

Other free options (not built in yet): **Cerebras**, **OpenRouter** (`:free` models), **Mistral** free tier.

## GitHub Actions (IPA build)

1. [Settings → Secrets → Actions](https://github.com/ziedsG1/Tnewsipa/settings/secrets/actions)
2. **`GROQ_API_KEY`** — required (`gsk_…`)
3. **`GEMINI_API_KEY`** — optional but recommended (`AIza…`)
4. Push to `main` → rebuild IPA

## Local build

```powershell
cd c:\Users\zied\Tnewsipa
$env:GROQ_API_KEY = "gsk-your-key"
$env:GEMINI_API_KEY = "AIza-your-key"   # optional fallback
npm run ai:config
npm run sync
```

`www/config.ai.js` is **gitignored**.

## Security

Keys are embedded in the IPA. For a public app, use a backend proxy later. Rotate keys if leaked.

## No key

Without keys, the app shows how to add `GROQ_API_KEY` / `GEMINI_API_KEY` — no translated summaries.
