# Article summaries (no API key)

Summaries are built **from the article page** on the news site. No Groq, no Gemini, no API keys in GitHub.

## How it works

1. Load the article HTML from the source link.
2. Pick the most important sentences (local algorithm).
3. If you chose another summary language, translate those sentences via **MyMemory** (free public service, no key — needs internet only for translation step).

## Summary languages

Use the buttons in the summary panel: **دارجة · عربي · EN · FR**.

## Build IPA

No AI secrets required. Push to `main` and run GitHub Actions as usual.

## Limits

- Translation quality is lower than Gemini/Groq.
- Tunisian **derja** uses Arabic translation (approximation).
- MyMemory has daily limits; if hit, you still see the article sentences in the original language.
