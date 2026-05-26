(function () {
  const DEFAULTS = {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
  };

  const ARTICLE_TIMEOUT_MS = 18000;
  const ARTICLE_MAX_CHARS = 14000;
  const REQUEST_HEADERS = {
    Accept: "text/html,application/xhtml+xml,*/*",
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  };

  function isNative() {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  }

  function getBakedConfig() {
    const cfg = window.TNEWS_AI_CONFIG;
    if (!cfg || typeof cfg !== "object") return null;
    const apiKey = String(cfg.apiKey || "").trim();
    if (!apiKey || apiKey.includes("PASTE_YOUR")) return null;
    return {
      apiKey,
      baseUrl: String(cfg.baseUrl || DEFAULTS.baseUrl).trim(),
      model: String(cfg.model || DEFAULTS.model).trim(),
    };
  }

  function getConfig() {
    return getBakedConfig() || { apiKey: "", baseUrl: DEFAULTS.baseUrl, model: DEFAULTS.model };
  }

  function hasApiKey() {
    return Boolean(getBakedConfig()?.apiKey);
  }

  function stripHtml(html) {
    return String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function shorten(text, max) {
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1).trim()}…`;
  }

  async function httpGetText(url) {
    if (isNative()) {
      const http = window.Capacitor?.Plugins?.CapacitorHttp;
      if (http?.get) {
        const res = await http.get({
          url,
          headers: REQUEST_HEADERS,
          connectTimeout: ARTICLE_TIMEOUT_MS,
          readTimeout: ARTICLE_TIMEOUT_MS,
          responseType: "text",
        });
        if (res.status >= 200 && res.status < 300) {
          return typeof res.data === "string" ? res.data : String(res.data ?? "");
        }
        throw new Error(`HTTP ${res.status}`);
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ARTICLE_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal, headers: REQUEST_HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  }

  function extractArticleText(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (doc.querySelector("parsererror")) return "";

    const selectors = [
      "article",
      "main",
      "[role='main']",
      ".post-content",
      ".entry-content",
      ".article-content",
      ".content",
      "#content",
      "body",
    ];

    for (const selector of selectors) {
      const el = doc.querySelector(selector);
      if (!el) continue;
      const text = stripHtml(el.innerHTML);
      if (text.length >= 280) return shorten(text, ARTICLE_MAX_CHARS);
    }

    return shorten(stripHtml(doc.body?.innerHTML || html), ARTICLE_MAX_CHARS);
  }

  async function fetchFullArticleText(url, onStatus) {
    if (!url || !/^https?:\/\//i.test(url)) return { text: "", source: "rss" };

    onStatus?.("جاري تحميل نص المقال…");
    try {
      const html = await httpGetText(url);
      const text = extractArticleText(html);
      if (text.length >= 200) {
        return { text, source: "full" };
      }
    } catch {
      /* fall back to RSS excerpt */
    }
    return { text: "", source: "rss" };
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

  function buildPrompt(article, articleBody, bodySource) {
    const title = article.translatedTitle || article.title || "";
    const summary = article.summary || "";
    const source = article.sourceLabel || "";
    const topic = article.topic || "";
    const date = article.pubDate || "";

    const bodySection =
      bodySource === "full" && articleBody
        ? `نص المقال (من صفحة المصدر):\n${articleBody}`
        : `مقتطف RSS (تعذّر تحميل الصفحة كاملة):\n${summary || articleBody || "(لا يوجد نص إضافي — اعتمد على العنوان)"}`;

    return `أنت محلل أخبار تونسي. لخّص الخبر التالي بالعربية الفصحى الواضحة.

المطلوب في رد واحد منظم:
1) **الفكرة الرئيسية** (جملتان كحد أقصى)
2) **أهم النقاط** (3–5 نقاط مختصرة)
3) **السياق والأهمية** (جملة أو جملتان)
4) **ما يجب متابعته** (نقطة واحدة إن وُجدت)

لا تخترع معلومات غير موجودة في النص.

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

    const { text: articleBody, source: bodySource } = await fetchFullArticleText(
      article.link,
      onStatus,
    );

    onStatus?.("جاري التحليل بالذكاء الاصطناعي…");

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
          { role: "user", content: buildPrompt(article, articleBody, bodySource) },
        ],
      },
    );

    return extractAssistantText(data);
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
    defaults: DEFAULTS,
  };
})();
