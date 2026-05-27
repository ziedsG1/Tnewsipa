(function () {
  const BATCH_SIZE = 12;
  const MAX_TRANSLATE = 14;
  const BATCH_DELAY_MS = 2200;
  const CACHE_PREFIX = "tnews-card-ui:";

  const TARGET = {
    ar: "Modern Standard Arabic (not derja)",
    tn: "Tunisian derja (colloquial Tunisian Arabic)",
    en: "English",
    fr: "French",
  };

  function cacheKey(article, uiLang) {
    return `${CACHE_PREFIX}${uiLang}:${article.id || article.link}`;
  }

  function readCache(article, uiLang) {
    try {
      const raw = sessionStorage.getItem(cacheKey(article, uiLang));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeCache(article, uiLang, data) {
    try {
      sessionStorage.setItem(cacheKey(article, uiLang), JSON.stringify(data));
    } catch {
      /* quota */
    }
  }

  function needsTranslation(article, uiLang) {
    const src = article.locale || "ar";
    if (uiLang === "tn") return true;
    if (uiLang === "ar" && src === "ar") return false;
    if (uiLang === "fr" && src === "fr") return false;
    if (uiLang === "en") return true;
    return uiLang !== src;
  }

  function getDisplay(article, uiLang) {
    if (!needsTranslation(article, uiLang)) {
      return { title: article.title || "", summary: article.summary || "" };
    }
    const mem = article.uiDisplay;
    if (mem && mem.lang === uiLang) {
      return { title: mem.title || article.title, summary: mem.summary ?? article.summary };
    }
    const cached = readCache(article, uiLang);
    if (cached) {
      article.uiDisplay = { lang: uiLang, ...cached };
      return cached;
    }
    return { title: article.title || "", summary: article.summary || "" };
  }

  function parseJsonArray(text) {
    const raw = String(text || "").trim();
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start < 0 || end <= start) return null;
    try {
      const arr = JSON.parse(raw.slice(start, end + 1));
      return Array.isArray(arr) ? arr : null;
    } catch {
      return null;
    }
  }

  async function translateBatch(batch, uiLang) {
    if (!window.TnewsAiSummary?.hasApiKey?.()) return null;
    if (window.TnewsAiSummary?.isRateLimited?.()) return null;

    const target = TARGET[uiLang] || TARGET.en;
    const items = batch.map((article, index) => ({
      i: index,
      title: (article.title || "").slice(0, 200),
      summary: (article.summary || "").slice(0, 240),
    }));

    const prompt = `Translate into ${target}. JSON array only: [{"i":0,"title":"...","summary":"..."}]
${JSON.stringify(items)}`;

    const data = await window.TnewsAiSummary.requestChat(
      [
        { role: "system", content: "Translate headlines. JSON array only." },
        { role: "user", content: prompt },
      ],
      { temperature: 0.1, maxTokens: 900, retries: 1 },
    );

    return parseJsonArray(data?.choices?.[0]?.message?.content);
  }

  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function refreshForUiLang(_articles, _uiLang, _onBatchDone) {
    return { translated: 0, rateLimited: false, disabled: true };
  }

  window.TnewsCardTranslate = {
    needsTranslation,
    getDisplay,
    refreshForUiLang,
  };
})();
