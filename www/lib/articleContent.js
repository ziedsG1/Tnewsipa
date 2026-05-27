(function () {
  const TIMEOUT_MS = 28000;
  const MAX_CHARS = 16000;
  const MIN_FULL_CHARS = 350;

  const REQUEST_HEADERS = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ar,fr-FR,fr;q=0.9,en;q=0.8",
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  };

  const CONTENT_SELECTORS = [
    "article .entry-content",
    "article .post-content",
    "article .article-body",
    "article .content",
    "article",
    "[itemprop='articleBody']",
    ".entry-content",
    ".post-content",
    ".article-content",
    ".article-body",
    ".story-body",
    ".news-body",
    ".field-body",
    ".node__content",
    "#article-body",
    "main article",
    "main .content",
    "main",
    "[role='main']",
    "#content article",
    "#content",
  ];

  const BOILERPLATE_RE =
    /(اشترك|newsletter|cookie|فيسبوك|تويتر|إعلان|advert|related|اقرأ أيضا|المزيد من|share on|تابعنا)/i;

  function isNative() {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  }

  function stripHtml(html) {
    return String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function shorten(text, max) {
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1).trim()}…`;
  }

  function cleanBoilerplate(text) {
    return String(text || "")
      .split(/(?<=[.!?؟؛])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 40 && !BOILERPLATE_RE.test(s))
      .join(" ")
      .trim();
  }

  async function httpGetText(url) {
    if (isNative()) {
      const http = window.Capacitor?.Plugins?.CapacitorHttp;
      if (http?.get) {
        const res = await http.get({
          url,
          headers: REQUEST_HEADERS,
          connectTimeout: TIMEOUT_MS,
          readTimeout: TIMEOUT_MS,
          responseType: "text",
        });
        if (res.status >= 200 && res.status < 300) {
          return typeof res.data === "string" ? res.data : String(res.data ?? "");
        }
        throw new Error(`HTTP ${res.status}`);
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal, headers: REQUEST_HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  }

  function pruneDocument(doc) {
    doc
      .querySelectorAll(
        "script, style, noscript, nav, header, footer, aside, iframe, form, .menu, .nav, .sidebar, .comments, .comment-form, .related, .share, .social, .advertisement, .ad, [aria-hidden='true']",
      )
      .forEach((el) => el.remove());
  }

  function textFromElement(el) {
    if (!el) return "";
    return cleanBoilerplate(stripHtml(el.innerHTML));
  }

  function extractFromJsonLd(doc) {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || "");
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const body =
            item.articleBody ||
            item.description ||
            (item["@type"] === "NewsArticle" && item.description);
          if (typeof body === "string" && body.length >= MIN_FULL_CHARS) {
            return cleanBoilerplate(stripHtml(body));
          }
        }
      } catch {
        /* next */
      }
    }
    return "";
  }

  function scoreBlock(text) {
    if (!text || text.length < MIN_FULL_CHARS) return 0;
    const sentences = text.split(/(?<=[.!?؟])\s+/).filter((s) => s.length > 35);
    const words = text.split(/\s+/).length;
    return sentences.length * 12 + Math.min(words, 800);
  }

  function extractArticleText(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (doc.querySelector("parsererror")) return "";

    pruneDocument(doc);

    const jsonLd = extractFromJsonLd(doc);
    if (jsonLd.length >= MIN_FULL_CHARS) return shorten(jsonLd, MAX_CHARS);

    let best = "";
    let bestScore = 0;

    for (const selector of CONTENT_SELECTORS) {
      const nodes = doc.querySelectorAll(selector);
      for (const el of nodes) {
        const text = textFromElement(el);
        const score = scoreBlock(text);
        if (score > bestScore) {
          bestScore = score;
          best = text;
        }
      }
    }

    if (best.length >= MIN_FULL_CHARS) return shorten(best, MAX_CHARS);

    const paragraphs = Array.from(doc.querySelectorAll("p"))
      .map((p) => stripHtml(p.innerHTML))
      .filter((t) => t.length >= 60 && !BOILERPLATE_RE.test(t));

    if (paragraphs.length >= 3) {
      const joined = shorten(paragraphs.join(" "), MAX_CHARS);
      if (joined.length >= MIN_FULL_CHARS) return joined;
    }

    const bodyText = cleanBoilerplate(stripHtml(doc.body?.innerHTML || ""));
    return bodyText.length >= MIN_FULL_CHARS ? shorten(bodyText, MAX_CHARS) : best || bodyText;
  }

  /**
   * Load article body from the source URL. RSS is only a tiny fallback.
   */
  async function loadFromArticlePage(article, onStatus) {
    const title = article.translatedTitle || article.title || "";
    const link = article.link || "";
    const rss = article.summary || "";

    if (!link || !/^https?:\/\//i.test(link)) {
      return {
        title,
        body: rss || title,
        source: "rss",
        fromPage: false,
        error: "لا يوجد رابط للمقال",
      };
    }

    onStatus?.("قاعدين نجيبو المقال من الموقع…");

    try {
      const html = await httpGetText(link);
      const pageText = extractArticleText(html);

      if (pageText.length >= MIN_FULL_CHARS) {
        return {
          title,
          body: pageText,
          source: "article",
          fromPage: true,
          url: link,
        };
      }

      if (pageText.length >= 120 && rss) {
        return {
          title,
          body: shorten(`${pageText}\n\n${rss}`, MAX_CHARS),
          source: "article_partial",
          fromPage: true,
          url: link,
        };
      }

      if (pageText.length >= 120) {
        return {
          title,
          body: pageText,
          source: "article_partial",
          fromPage: true,
          url: link,
        };
      }
    } catch (err) {
      if (rss && rss.length >= 80) {
        return {
          title,
          body: `${title}. ${rss}`,
          source: "rss",
          fromPage: false,
          error: err.message || "تعذّر فتح صفحة المقال",
        };
      }
      throw new Error("تعذّر تحميل المقال من الموقع — تحقق من الإنترنت أو افتح المصدر");
    }

    if (rss && rss.length >= 80) {
      return {
        title,
        body: `${title}. ${rss}`,
        source: "rss",
        fromPage: false,
        error: "لم يُستخرج نص كافٍ من صفحة المقال",
      };
    }

    throw new Error("تعذّر قراءة نص المقال من المصدر");
  }

  function sourceLabelArabic(result) {
    if (result.fromPage && result.source === "article") return "من المقال نفسه";
    if (result.fromPage) return "من المقال (جزء)";
    return "من RSS برك";
  }

  window.TnewsArticleContent = {
    loadFromArticlePage,
    sourceLabelArabic,
    MIN_FULL_CHARS,
  };
})();
