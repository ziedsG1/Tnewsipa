(function () {
  const MAX_TRANSLATE = 40;
  const REQUEST_GAP_MS = 280;
  const CACHE_PREFIX = "tnews-card-ui:";

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
    if (!window.TnewsFreeTranslate?.needsTranslation) return false;
    return window.TnewsFreeTranslate.needsTranslation(article, uiLang, article.locale);
  }

  function getDisplay(article, uiLang) {
    if (!needsTranslation(article, uiLang)) {
      return { title: article.title || "", summary: article.summary || "" };
    }
    const mem = article.uiDisplay;
    if (mem && mem.lang === uiLang) {
      return {
        title: mem.title || article.title,
        summary: mem.summary ?? article.summary,
      };
    }
    const cached = readCache(article, uiLang);
    if (cached) {
      article.uiDisplay = { lang: uiLang, ...cached };
      return cached;
    }
    return { title: article.title || "", summary: article.summary || "" };
  }

  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function translateArticle(article, uiLang) {
    const ft = window.TnewsFreeTranslate;
    if (!ft?.translateForUi) return null;
    const loc = article.locale;

    const title = await ft.translateForUi(article.title || "", uiLang, loc);
    await delay(REQUEST_GAP_MS);
    const summary = article.summary
      ? await ft.translateForUi(article.summary, uiLang, loc)
      : "";

    return {
      title: String(title || article.title || "").trim(),
      summary: String(summary ?? article.summary ?? "").trim(),
    };
  }

  async function refreshForUiLang(articles, uiLang, onItemDone) {
    if (!window.TnewsFreeTranslate?.translateForUi) {
      return { translated: 0, rateLimited: false };
    }

    const list = articles.slice(0, MAX_TRANSLATE).filter((a) => needsTranslation(a, uiLang));
    let translated = 0;
    let rateLimited = false;

    for (const article of list) {
      const cached = readCache(article, uiLang);
      if (cached) {
        article.uiDisplay = { lang: uiLang, ...cached };
        onItemDone?.();
        continue;
      }
      if (article.uiDisplay?.lang === uiLang) {
        onItemDone?.();
        continue;
      }

      try {
        const display = await translateArticle(article, uiLang);
        if (display) {
          article.uiDisplay = { lang: uiLang, ...display };
          writeCache(article, uiLang, display);
          translated += 1;
        }
      } catch (err) {
        if (/RATE|LIMIT|429|failed/i.test(String(err?.message || err))) {
          rateLimited = true;
        }
      }
      onItemDone?.();
      await delay(REQUEST_GAP_MS);
    }

    return { translated, rateLimited };
  }

  window.TnewsCardTranslate = {
    needsTranslation,
    getDisplay,
    refreshForUiLang,
  };
})();
