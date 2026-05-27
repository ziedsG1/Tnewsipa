(function () {
  const GROQ_DEFAULTS = {
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
  };

  const OPENAI_DEFAULTS = {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
  };

  const LANG_STATUS = {
    tn: "قاعدين نحضّرو الشرح بالدارجة…",
    ar: "جاري إعداد الملخص بالعربية…",
    en: "Preparing English summary…",
    fr: "Préparation du résumé en français…",
  };

  function isNative() {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  }

  function getBakedConfig() {
    const cfg = window.TNEWS_AI_CONFIG;
    if (!cfg || typeof cfg !== "object") return null;
    const apiKey = String(cfg.apiKey || "").trim();
    if (!apiKey || /PASTE_YOUR/i.test(apiKey)) return null;
    const provider = String(cfg.provider || "").toLowerCase();
    const useGroq = provider === "groq" || apiKey.startsWith("gsk_");
    const defaults = useGroq ? GROQ_DEFAULTS : OPENAI_DEFAULTS;
    return {
      provider: useGroq ? "groq" : "openai",
      apiKey,
      baseUrl: String(cfg.baseUrl || defaults.baseUrl).trim(),
      model: String(cfg.model || defaults.model).trim(),
    };
  }

  function getConfig() {
    return (
      getBakedConfig() || {
        apiKey: "",
        provider: "",
        baseUrl: GROQ_DEFAULTS.baseUrl,
        model: GROQ_DEFAULTS.model,
      }
    );
  }

  function hasApiKey() {
    return Boolean(getBakedConfig()?.apiKey);
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
      tn: "Write the ENTIRE response in Tunisian derja (colloquial Tunisian Arabic). Translate the headline and every quoted fact into derja.",
      ar: "Write the ENTIRE response in Modern Standard Arabic (not derja). Translate the headline and all article excerpts into Arabic.",
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
    throw new Error("لم يصل ملخص من خدمة الذكاء الاصطناعي");
  }

  function formatApiError(message) {
    const m = String(message || "");
    if (/exceeded your current quota|insufficient_quota|billing/i.test(m)) {
      return (
        "حساب OpenAI بدون رصيد أو بدون بطاقة دفع مفعّلة. " +
        "أضف رصيداً على platform.openai.com أو استخدم Groq."
      );
    }
    if (/invalid.*api.*key|incorrect api key|401/i.test(m)) {
      return "مفتاح API غير صالح — حدّث config.ai.js أو سر GitHub.";
    }
    if (/rate limit|429/i.test(m)) {
      return "طلبات كثيرة — انتظر دقيقة وحاول مرة أخرى.";
    }
    return m || "تعذّر التحليل — تحقق من الإنترنت";
  }

  async function requestChat(messages) {
    const config = getBakedConfig();
    if (!config?.apiKey) throw new Error("AI_NOT_CONFIGURED");

    const url = config.baseUrl.includes("/chat/completions")
      ? config.baseUrl
      : config.baseUrl.replace(/\/$/, "") + "/v1/chat/completions";

    return httpPostJson(
      url,
      { Authorization: `Bearer ${config.apiKey}` },
      {
        model: config.model,
        temperature: 0.2,
        max_tokens: 1200,
        messages,
      },
    );
  }

  async function summarizeArticle(article, options) {
    const onStatus = options?.onStatus;
    const config = getBakedConfig();
    if (!config?.apiKey) {
      const err = new Error("AI_NOT_CONFIGURED");
      err.code = "AI_NOT_CONFIGURED";
      throw err;
    }

    if (!window.TnewsArticleContent?.loadFromArticlePage) {
      throw new Error("وحدة تحميل المقال غير متوفرة");
    }

    const loaded = await window.TnewsArticleContent.loadFromArticlePage(article, onStatus);

    onStatus?.(LANG_STATUS[getLangId()] || LANG_STATUS.tn);

    const url = config.baseUrl.includes("/chat/completions")
      ? config.baseUrl
      : config.baseUrl.replace(/\/$/, "") + "/v1/chat/completions";

    const style = window.TnewsTunisianStyle?.getStyle?.() || {};

    const data = await httpPostJson(
      url,
      { Authorization: `Bearer ${config.apiKey}` },
      {
        model: config.model,
        temperature: 0.55,
        max_tokens: 950,
        messages: [
          {
            role: "system",
            content: style.SYSTEM_PROMPT || "Summarize news clearly without inventing facts.",
          },
          { role: "user", content: buildPrompt(article, loaded) },
        ],
      },
    );

    const sourceNote = window.TnewsArticleContent.sourceLabelArabic(loaded);
    return {
      text: extractAssistantText(data),
      fromPage: loaded.fromPage,
      sourceNote,
    };
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
    requestChat,
    summarizeArticle,
    formatSummaryHtml,
    formatApiError,
    defaults: GROQ_DEFAULTS,
  };
})();
