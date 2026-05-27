(function () {
  const GROQ_DEFAULTS = {
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
  };

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

  function isNative() {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  }

  function normalizeProvider(entry) {
    if (!entry || typeof entry !== "object") return null;
    const apiKey = String(entry.apiKey || "").trim();
    if (!apiKey || /PASTE_YOUR/i.test(apiKey) || apiKey.startsWith("sk-")) return null;

    const provider = String(entry.provider || "").toLowerCase();
    const isGroq = provider === "groq" || apiKey.startsWith("gsk_") || /groq\.com/i.test(entry.baseUrl || "");
    const isGemini =
      provider === "gemini" || apiKey.startsWith("AIza") || /generativelanguage\.googleapis\.com/i.test(entry.baseUrl || "");

    if (!isGroq && !isGemini) return null;

    const defaults = isGemini ? GEMINI_DEFAULTS : GROQ_DEFAULTS;
    return {
      id: isGemini ? "gemini" : "groq",
      provider: isGemini ? "gemini" : "groq",
      apiKey,
      baseUrl: String(entry.baseUrl || defaults.baseUrl).trim(),
      model: String(entry.model || defaults.model).trim(),
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
    const p = getProviders()[0];
    return (
      p || {
        apiKey: "",
        provider: "",
        baseUrl: GROQ_DEFAULTS.baseUrl,
        model: GROQ_DEFAULTS.model,
      }
    );
  }

  function hasApiKey() {
    return getProviders().length > 0;
  }

  function getProviderLabel() {
    const ids = getProviders().map((p) => p.id);
    if (ids.includes("groq") && ids.includes("gemini")) return "Groq + Gemini";
    if (ids.includes("gemini")) return "Gemini AI";
    if (ids.includes("groq")) return "Groq AI";
    return "AI";
  }

  let rateLimitedUntil = 0;
  const SUMMARY_CACHE_PREFIX = "tnews-summary:";

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isRateLimitError(message) {
    return /rate limit|429|tokens per day|too many requests|quota|resource exhausted/i.test(
      String(message || ""),
    );
  }

  function setRateLimited(seconds, providerId) {
    const until = Date.now() + seconds * 1000;
    rateLimitedUntil = until;
    if (providerId) providerRateLimits[providerId] = until;
  }

  function isRateLimited(providerId) {
    if (providerId) {
      return Date.now() < (providerRateLimits[providerId] || 0);
    }
    return Date.now() < rateLimitedUntil;
  }

  function getRateLimitWaitSec() {
    return Math.max(0, Math.ceil((rateLimitedUntil - Date.now()) / 1000));
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
    throw new Error("لم يصل ملخص من الذكاء الاصطناعي");
  }

  function formatApiError(message) {
    const m = String(message || "");
    const hasGemini = getProviders().some((p) => p.id === "gemini");
    if (/invalid.*api.*key|incorrect api key|401|invalid_api_key/i.test(m)) {
      return "مفتاح API غير صالح — تحقق من GROQ_API_KEY و GEMINI_API_KEY في GitHub.";
    }
    if (isRateLimitError(m)) {
      const wait = getRateLimitWaitSec();
      if (hasGemini) {
        return wait > 0
          ? `حد الاستخدام — انتظر ${wait} ثانية ثم «إعادة المحاولة» (Groq ثم Gemini).`
          : "حد الاستخدام — جرّب «إعادة المحاولة» (يستخدم Gemini إن توفر).";
      }
      return wait > 0
        ? `حد Groq — انتظر ${wait} ثانية. أضف GEMINI_API_KEY في GitHub كاحتياطي مجاني.`
        : "حد Groq — أضف مفتاح Gemini مجاني من aistudio.google.com في GitHub Secrets.";
    }
    if (/model.*decommission|no longer supported/i.test(m)) {
      return "نموذج AI تغيّر — حدّث التطبيق من GitHub.";
    }
    return m || "تعذّر الاتصال — تحقق من الإنترنت";
  }

  async function callProvider(provider, messages, options) {
    const url = provider.baseUrl.includes("/chat/completions")
      ? provider.baseUrl
      : provider.baseUrl.replace(/\/$/, "") + "/v1/chat/completions";

    const maxRetries = options?.retries ?? 1;
    let lastErr;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
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
        lastErr = err;
        if (!isRateLimitError(err.message) || attempt >= maxRetries) break;
        setRateLimited(40, provider.id);
        await sleep(1500 * (attempt + 1));
      }
    }

    if (isRateLimitError(lastErr?.message)) {
      setRateLimited(45, provider.id);
      const err = new Error(lastErr.message);
      err.code = "RATE_LIMIT";
      throw err;
    }
    throw lastErr;
  }

  async function requestChat(messages, options) {
    const providers = getProviders();
    if (!providers.length) {
      const err = new Error("GROQ_NOT_CONFIGURED");
      err.code = "GROQ_NOT_CONFIGURED";
      throw err;
    }

    let lastErr;
    for (const provider of providers) {
      if (isRateLimited(provider.id)) continue;
      try {
        return await callProvider(provider, messages, options);
      } catch (err) {
        lastErr = err;
        if (isRateLimitError(err.message)) continue;
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
      const err = new Error("GROQ_NOT_CONFIGURED");
      err.code = "GROQ_NOT_CONFIGURED";
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
      { temperature: 0.55, maxTokens: 950, retries: 2 },
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
    defaults: GROQ_DEFAULTS,
  };
})();
