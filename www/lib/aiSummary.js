(function () {
  const STORAGE_KEY = "tnews-ai-config";

  const DEFAULTS = {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
  };

  function isNative() {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  }

  function getConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : {};
      return {
        apiKey: (saved.apiKey || "").trim(),
        baseUrl: (saved.baseUrl || DEFAULTS.baseUrl).trim(),
        model: (saved.model || DEFAULTS.model).trim(),
      };
    } catch {
      return { apiKey: "", baseUrl: DEFAULTS.baseUrl, model: DEFAULTS.model };
    }
  }

  function saveConfig(partial) {
    const next = { ...getConfig(), ...partial };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function hasApiKey() {
    return Boolean(getConfig().apiKey);
  }

  async function httpPostJson(url, headers, body) {
    const payload = JSON.stringify(body);

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
      body: payload,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error?.message || `HTTP ${res.status}`);
    }
    return data;
  }

  function buildPrompt(article) {
    const title = article.translatedTitle || article.title || "";
    const summary = article.summary || "";
    const source = article.sourceLabel || "";
    const topic = article.topic || "";
    const date = article.pubDate || "";

    return `أنت محلل أخبار تونسي. لخّص الخبر التالي بالعربية الفصحى الواضحة.

المطلوب في رد واحد منظم:
1) **الفكرة الرئيسية** (جملتان كحد أقصى)
2) **أهم النقاط** (3–5 نقاط مختصرة)
3) **السياق والأهمية** (جملة أو جملتان)
4) **ما يجب متابعته** (نقطة واحدة إن وُجدت)

لا تخترع معلومات غير موجودة في النص. إن كان النص قصيراً، قل ذلك باختصار.

---
العنوان: ${title}
المصدر: ${source}
التصنيف: ${topic}
التاريخ: ${date}
الرابط: ${article.link || ""}

المقتطف من الخبر:
${summary || "(لا يوجد مقتطف — اعتمد على العنوان فقط)"}`;
  }

  function extractAssistantText(data) {
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.trim()) return content.trim();
    throw new Error("لم يصل ملخص من خدمة الذكاء الاصطناعي");
  }

  async function summarizeArticle(article) {
    const config = getConfig();
    if (!config.apiKey) {
      const err = new Error("API_KEY_REQUIRED");
      err.code = "API_KEY_REQUIRED";
      throw err;
    }

    const url = config.baseUrl.includes("/chat/completions")
      ? config.baseUrl
      : config.baseUrl.replace(/\/$/, "") + "/v1/chat/completions";

    const data = await httpPostJson(
      url,
      { Authorization: `Bearer ${config.apiKey}` },
      {
        model: config.model,
        temperature: 0.35,
        max_tokens: 700,
        messages: [
          {
            role: "system",
            content:
              "أجب بالعربية فقط. كن موجزاً ودقيقاً. استخدم عناوين فرعية واضحة كما طُلب في التعليمات.",
          },
          { role: "user", content: buildPrompt(article) },
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
    saveConfig,
    hasApiKey,
    summarizeArticle,
    formatSummaryHtml,
    defaults: DEFAULTS,
  };
})();
