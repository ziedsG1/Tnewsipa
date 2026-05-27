(function () {
  const GEMINI_DEFAULTS = {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: "gemini-2.0-flash",
  };

  const LANG_STATUS = {
    tn: "قاعدين نحضّرو الشرح بالدارجة…",
    ar: "جاري إعداد الملخص بالعربية…",
    en: "Preparing English summary…",
    fr: "Préparation du résumé en français…",
  };

  const providerRateLimits = {};
  const SUMMARY_CACHE_PREFIX = "tnews-summary:";

  function isNative() {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  }

  function normalizeProvider(entry) {
    if (!entry || typeof entry !== "object") return null;
    const apiKey = String(entry.apiKey || "").trim();
    if (!apiKey || /PASTE_YOUR/i.test(apiKey) || apiKey.startsWith("sk-") || apiKey.startsWith("gsk_")) {
      return null;
    }

    const provider = String(entry.provider || "").toLowerCase();
    const isGemini =
      provider === "gemini" ||
      apiKey.startsWith("AIza") ||
      /generativelanguage\.googleapis\.com/i.test(entry.baseUrl || "");

    if (!isGemini) return null;

    return {
      id: "gemini",
      provider: "gemini",
      apiKey,
      baseUrl: String(entry.baseUrl || GEMINI_DEFAULTS.baseUrl).trim(),
      model: String(entry.model || GEMINI_DEFAULTS.model).trim(),
    };
  }

  function getProviders() {
    const cfg = window.TNEWS_AI_CONFIG;
    if (!cfg || typeof cfg !== "object") return [];

    if (Array.isArray(cfg.providers)) {
      return cfg.providers.map(normalizeProvider).filter(Boolean);
    }

    const list = [];
    const primary = normalizeProvider(cfg);
    if (primary) list.push(primary);
    const fb = normalizeProvider(cfg.fallback);
    if (fb && !list.some((p) => p.id === fb.id)) list.push(fb);
    return list;
  }

  function getConfig() {
    return getProviders()[0] || { apiKey: "", provider: "gemini", ...GEMINI_DEFAULTS };
  }

  function hasApiKey() {
    return getProviders().length > 0;
  }

  function getProviderLabel() {
    return hasApiKey() ? "Gemini AI" : "AI";
  }

  function isRateLimitError(message) {
    return /rate limit|429|tokens per day|too many requests|quota|resource exhausted/i.test(
      String(message || ""),
    );
  }

  function setRateLimited(seconds, providerId) {
    if (providerId) providerRateLimits[providerId] = Date.now() + seconds * 1000;
  }

  function isRateLimited(providerId) {
    if (!providerId) return false;
    return Date.now() < (providerRateLimits[providerId] || 0);
  }

  function getRateLimitWaitSec() {
    return 0;
  }

  function summaryCacheKey(article, langId) {
    return `${SUMMARY_CACHE_PREFIX}${langId}:${article.link || article.id}`;
  }

  function readSummaryCache(article, langId) {
    try {
      const raw = sessionStorage.getItem(summaryCacheKey(article, langId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeSummaryCache(article, langId, result) {
    try {
      sessionStorage.setItem(summaryCacheKey(article, langId), JSON.stringify(result));
    } catch {
      /* quota */
    }
  }

  async function httpPostJson(url, headers, body) {
    if (isNative()) {
      const http = window.Capacitor?.Plugins?.CapacitorHttp;
      if (http?.post) {
        const res = await http.post({
          url,
          headers: { "Content-Type": "application/json", ...headers },
          data: body,
          connectTimeout: 60000,
          readTimeout: 60000,
          responseType: "json",
        });
        if (res.status < 200 || res.status >= 300) {
          const msg =
            typeof res.data === "object" && res.data?.error?.message
              ? res.data.error.message
              : `HTTP ${res.status}`;
          throw new Error(msg);
        }
        return typeof res.data === "object" ? res.data : JSON.parse(String(res.data || "{}"));
      }
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error?.message || `HTTP ${res.status}`);
    }
    return data;
  }

  function getLangId() {
    return window.TnewsSummaryLanguage?.getLangId?.() || "tn";
  }

  function languageInstruction() {
    const lang = window.TnewsSummaryLanguage?.getLang?.();
    const style = window.TnewsTunisianStyle?.getStyle?.() || {};
    const note = style.translateNote || lang?.translateNote || "";

    const map = {
      tn: "Write the ENTIRE response in Tunisian derja (colloquial Tunisian Arabic). Translate the headline and every sentence from the article into derja — even if the source is French or English.",
      ar: "Write the ENTIRE response in Modern Standard Arabic (not derja). Translate the headline and every sentence from the article into Arabic — even if the source is French or English.",
      en: "Write the ENTIRE response in English. Translate the headline and all article excerpts, quotes, and facts into English.",
      fr: "Write the ENTIRE response in French. Translate the headline and all article excerpts, quotes, and facts into French.",
    };

    return `${map[getLangId()] || map.tn}\n${note}`;
  }

  function buildPrompt(article, loaded) {
    const title = article.title || "";
    const source = article.sourceLabel || "";
    const topic = article.topic || "";
    const date = article.pubDate || "";
    const rss = article.summary || "";

    const fromPage = loaded.fromPage && loaded.body.length >= 120;
    const bodySection = fromPage
      ? `Full article text (from the news page — sole source for the summary):\n\n${loaded.body}`
      : `Could not load full page. Use only this limited text:\n${loaded.body || rss || title}`;

    const style = window.TnewsTunisianStyle?.getStyle?.() || {};
    const sections = style.USER_SECTIONS || "Summarize in clear sections.";

    return `Summarize this Tunisia news item for the reader.

Strict rules:
- Use ONLY the article text below.
- Do not invent names, numbers, or quotes.
- ${languageInstruction()}
- Never leave the body in the original language if the reader chose another language.
- If the text is very short, say so honestly.

Required sections:
${sections}

---
Original headline (translate in your response): ${title}
Source: ${source}
Category: ${topic}
Date: ${date}
Link: ${article.link || ""}

${bodySection}`;
  }

  function extractAssistantText(data) {
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.trim()) return content.trim();
    throw new Error("لم يصل ملخص من Gemini");
  }

  function formatApiError(message) {
    const m = String(message || "");
    if (/invalid.*api.*key|incorrect api key|401|invalid_api_key/i.test(m)) {
      return "مفتاح Gemini غير صالح — أنشئ مفتاح AIza على aistudio.google.com وأعد بناء الـ IPA (GEMINI_API_KEY في GitHub).";
    }
    if (isRateLimitError(m)) {
      return "حد Gemini — اضغط «إعادة المحاولة» بعد قليل.";
    }
    if (/model.*decommission|no longer supported|not found/i.test(m)) {
      return "نموذج Gemini تغيّر — حدّث التطبيق من GitHub.";
    }
    return m || "تعذّر الاتصال بـ Gemini — تحقق من الإنترنت";
  }

  async function callProvider(provider, messages, options) {
    const url = provider.baseUrl.includes("/chat/completions")
      ? provider.baseUrl
      : provider.baseUrl.replace(/\/$/, "") + "/v1/chat/completions";

    try {
      return await httpPostJson(
        url,
        { Authorization: `Bearer ${provider.apiKey}` },
        {
          model: provider.model,
          temperature: options?.temperature ?? 0.2,
          max_tokens: options?.maxTokens ?? 1200,
          messages,
        },
      );
    } catch (err) {
      if (isRateLimitError(err.message)) {
        setRateLimited(12, provider.id);
        const e = new Error(err.message);
        e.code = "RATE_LIMIT";
        throw e;
      }
      throw err;
    }
  }

  async function requestChat(messages, options) {
    const providers = getProviders();
    if (!providers.length) {
      const err = new Error("GEMINI_NOT_CONFIGURED");
      err.code = "GEMINI_NOT_CONFIGURED";
      throw err;
    }

    let lastErr;
    for (const provider of providers) {
      if (isRateLimited(provider.id)) continue;
      try {
        return await callProvider(provider, messages, options);
      } catch (err) {
        lastErr = err;
        if (providers.length > 1) continue;
        throw err;
      }
    }

    const err = new Error(lastErr?.message || "rate limit");
    err.code = "RATE_LIMIT";
    throw err;
  }

  async function summarizeArticle(article, options) {
    const onStatus = options?.onStatus;
    const langId = getLangId();
    if (!hasApiKey()) {
      const err = new Error("GEMINI_NOT_CONFIGURED");
      err.code = "GEMINI_NOT_CONFIGURED";
      throw err;
    }

    if (!options?.skipCache) {
      const cached = readSummaryCache(article, langId);
      if (cached?.text) return cached;
    }

    if (!window.TnewsArticleContent?.loadFromArticlePage) {
      throw new Error("وحدة تحميل المقال غير متوفرة");
    }

    const loaded = await window.TnewsArticleContent.loadFromArticlePage(article, onStatus);
    onStatus?.(LANG_STATUS[langId] || LANG_STATUS.tn);

    const style = window.TnewsTunisianStyle?.getStyle?.() || {};
    const data = await requestChat(
      [
        {
          role: "system",
          content: `${style.SYSTEM_PROMPT || "Summarize news clearly."}\nYou only output in the language requested in the user message.`,
        },
        { role: "user", content: buildPrompt(article, loaded) },
      ],
      { temperature: 0.55, maxTokens: 950 },
    );

    const sourceNote = window.TnewsArticleContent.sourceLabelArabic(loaded);
    const result = {
      text: extractAssistantText(data),
      fromPage: loaded.fromPage,
      sourceNote,
    };
    writeSummaryCache(article, langId, result);
    return result;
  }

  function formatSummaryHtml(text) {
    const escaped = String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return escaped
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/_(.+?)_/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  }

  window.TnewsAiSummary = {
    getConfig,
    hasApiKey,
    getProviderLabel,
    requestChat,
    summarizeArticle,
    formatSummaryHtml,
    formatApiError,
    isRateLimited,
    isRateLimitError,
    getRateLimitWaitSec,
    defaults: GEMINI_DEFAULTS,
  };
})();
