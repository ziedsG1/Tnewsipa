(function () {
  const ARTICLE_TIMEOUT_MS = 18000;
  const ARTICLE_MAX_CHARS = 12000;
  const REQUEST_HEADERS = {
    Accept: "text/html,application/xhtml+xml,*/*",
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  };

  const STOP_WORDS = new Set([
    "في",
    "من",
    "إلى",
    "على",
    "أن",
    "ان",
    "هذا",
    "هذه",
    "التي",
    "الذي",
    "مع",
    "عن",
    "ما",
    "لا",
    "تم",
    "قد",
    "كان",
    "كانت",
    "بعد",
    "قبل",
    "أو",
    "او",
    "كل",
    "ذلك",
    "هو",
    "هي",
    "وفق",
    "حسب",
    "ضمن",
    "خلال",
    "لدى",
    "حول",
    "بين",
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "des",
    "les",
    "une",
    "dans",
  ]);

  function isNative() {
    return Boolean(window.Capacitor?.isNativePlatform?.());
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

  async function loadArticleBody(article, onStatus) {
    const title = article.translatedTitle || article.title || "";
    const rss = article.summary || "";

    if (article.link && /^https?:\/\//i.test(article.link)) {
      onStatus?.("جاري تحميل نص المقال…");
      try {
        const html = await httpGetText(article.link);
        const full = extractArticleText(html);
        if (full.length >= 200) {
          return { title, body: full, source: "full" };
        }
      } catch {
        /* use RSS */
      }
    }

    const merged = rss ? `${title}. ${rss}` : title;
    return { title, body: merged, source: "rss" };
  }

  function tokenize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  }

  function splitSentences(text) {
    const parts = String(text || "")
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?؟؛])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 35 && s.length <= 500);

    if (parts.length >= 2) return parts;

    const chunks = String(text || "")
      .replace(/\s+/g, " ")
      .split(/(?<=،)\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 40);

    return chunks.length ? chunks : parts.length ? parts : [String(text || "").trim()].filter(Boolean);
  }

  function pickTopSentences(sentences, titleTokens, maxCount) {
    const scored = sentences.map((sentence, index) => ({
      sentence,
      index,
      score: scoreSentence(sentence, titleTokens, index),
    }));

    scored.sort((a, b) => b.score - a.score);
    const picked = scored.slice(0, maxCount).sort((a, b) => a.index - b.index);
    return picked.map((p) => p.sentence);
  }

  function scoreSentence(sentence, titleTokens, index) {
    const tokens = tokenize(sentence);
    let overlap = 0;
    for (const t of tokens) {
      if (titleTokens.has(t)) overlap += 1;
    }
    const positionBonus = index === 0 ? 3 : index < 4 ? 2 : index < 10 ? 1 : 0;
    const lengthBonus = sentence.length >= 50 && sentence.length <= 320 ? 1.5 : 0;
    return overlap * 2.2 + positionBonus + lengthBonus + Math.min(tokens.length, 14) * 0.08;
  }

  function buildLocalSummary({ title, body, source }) {
    const sentences = splitSentences(body);
    const titleTokens = new Set(tokenize(title));

    if (!sentences.length) {
      return (
        `**الفكرة الرئيسية**\n${title}\n\n` +
        `**ملاحظة**\nتعذّر استخراج فقرات إضافية — يعتمد الملخص على العنوان والمقتطف فقط.`
      );
    }

    const top = pickTopSentences(sentences, titleTokens, Math.min(5, sentences.length));
    const lead = top[0] || title;
    const bullets = top.slice(1, 4);
    const extra = top[4];

    const sourceNote =
      source === "full"
        ? "تم تلخيص النص من صفحة المقال (ملخص تلقائي — بدون حدود API)."
        : "تم تلخيص المقتطف من RSS (تعذّر تحميل الصفحة كاملة).";

    let out = `**الفكرة الرئيسية**\n${lead}\n\n**أهم النقاط**\n`;
    if (bullets.length) {
      out += bullets.map((b) => `• ${b}`).join("\n");
    } else {
      out += `• ${lead}`;
    }

    out += `\n\n**السياق**\n${extra || bullets[bullets.length - 1] || lead}`;

    if (title && !lead.includes(title.slice(0, Math.min(40, title.length)))) {
      out += `\n\n**العنوان**\n${title}`;
    }

    out += `\n\n**ملاحظة**\n${sourceNote}`;
    return out;
  }

  async function summarizeArticle(article, options) {
    const onStatus = options?.onStatus;
    onStatus?.("جاري إعداد الملخص…");
    const loaded = await loadArticleBody(article, onStatus);
    return buildLocalSummary(loaded);
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

  window.TnewsLocalSummary = {
    summarizeArticle,
    formatSummaryHtml,
    isFree: true,
  };
})();
