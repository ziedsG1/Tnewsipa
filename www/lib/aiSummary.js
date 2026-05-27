(function () {
  const GROQ_DEFAULTS = {
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
  };

  const OPENAI_DEFAULTS = {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
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

  function buildPrompt(article, loaded) {
    const title = article.translatedTitle || article.title || "";
    const source = article.sourceLabel || "";
    const topic = article.topic || "";
    const date = article.pubDate || "";
    const rss = article.summary || "";

    const fromPage = loaded.fromPage && loaded.body.length >= 200;
    const bodySection = fromPage
      ? `نص المقال الكامل (مُستخرج من صفحة الخبر على الموقع — هذا هو المصدر الوحيد للملخص):\n\n${loaded.body}`
      : `تعذّر تحميل صفحة المقال. استخدم فقط هذا النص المحدود:\n${loaded.body || rss || title}`;

    return `أنت محلل أخبار تونسي. لخّص الخبر التالي بالعربية الفصحى الواضحة.

قواعد صارمة:
- اعتمد **فقط** على نص المقال أدناه (من الموقع)، لا على معرفة خارجية.
- لا تخترع أسماء أو أرقام أو اقتباسات غير موجودة في النص.
- إن كان النص قصيراً، قل ذلك باختصار.

المطلوب في رد واحد منظم:
1) **الفكرة الرئيسية** (جملتان كحد أقصى)
2) **أهم النقاط** (3–5 نقاط مختصرة)
3) **السياق والأهمية** (جملة أو جملتان)
4) **ما يجب متابعته** (نقطة واحدة إن وُجدت)

---
العنوان: ${title}
المصدر: ${source}
التصنيف: ${topic}
التاريخ: ${date}
الرابط: ${article.link || ""}

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
        "حساب OpenAI بدون رصيد أو بدون بطاقة دفع مفعّلة — ليس بالضرورة أنك استخدمت التطبيق. " +
        "أضف رصيداً على platform.openai.com (Billing) أو أنشئ مفتاحاً جديداً إن سُرّب المفتاح القديم."
      );
    }
    if (/invalid.*api.*key|incorrect api key|401/i.test(m)) {
      return "مفتاح API غير صالح أو ملغى — أنشئ مفتاحاً جديداً على OpenAI وحدّث الإعداد.";
    }
    if (/rate limit|429/i.test(m)) {
      return "طلبات كثيرة جداً — انتظر دقيقة وحاول مرة أخرى.";
    }
    return m || "تعذّر التحليل — تحقق من الإنترنت";
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

    onStatus?.("جاري التلخيص من نص المقال…");

    const url = config.baseUrl.includes("/chat/completions")
      ? config.baseUrl
      : config.baseUrl.replace(/\/$/, "") + "/v1/chat/completions";

    const data = await httpPostJson(
      url,
      { Authorization: `Bearer ${config.apiKey}` },
      {
        model: config.model,
        temperature: 0.35,
        max_tokens: 800,
        messages: [
          {
            role: "system",
            content:
              "أجب بالعربية فقط. كن موجزاً ودقيقاً. استخدم عناوين فرعية واضحة كما طُلب في التعليمات.",
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
      .replace(/\n/g, "<br>");
  }

  window.TnewsAiSummary = {
    getConfig,
    hasApiKey,
    summarizeArticle,
    formatSummaryHtml,
    formatApiError,
    defaults: GROQ_DEFAULTS,
  };
})();
