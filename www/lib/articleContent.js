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

  const SITE_HANDLERS = [
    {
      match: /mosaiquefm\.net/i,
      selectors: [
        ".article-content",
        ".content-article",
        ".detail-content",
        ".detail__content",
        ".field-name-body",
        ".node-content",
        "article .text",
        ".article-body",
      ],
      minFullChars: 180,
    },
    {
      match: /shemsfm\.net/i,
      selectors: [".entry-content", ".post-content", "article .content", "main article"],
      minFullChars: 200,
    },
    {
      match: /diwanfm\.net/i,
      selectors: [".entry-content", ".post-content", "article"],
      minFullChars: 200,
    },
  ];

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
    ".field-name-body",
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
    /(اشترك|newsletter|cookie|فيسبوك|تويتر|إعلان|advert|related|اقرأ أيضا|المزيد من|share on|تابعنا|mosaique fm)/i;

  function isNative() {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  }

  function siteHandlerForUrl(url) {
    const u = String(url || "");
    return SITE_HANDLERS.find((h) => h.match.test(u)) || null;
  }

  function decodeHtmlEntities(text) {
    return String(text || "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&rsquo;/gi, "'")
      .replace(/&lsquo;/gi, "'")
      .replace(/&rdquo;/gi, '"')
      .replace(/&ldquo;/gi, '"')
      .replace(/&raquo;/gi, "»")
      .replace(/&laquo;/gi, "«")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  function stripHtml(html) {
    return decodeHtmlEntities(
      String(html || "")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
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
          if (typeof body === "string" && body.length >= 120) {
            return cleanBoilerplate(stripHtml(body));
          }
        }
      } catch {
        /* next */
      }
    }
    return "";
  }

  function extractFromMeta(doc) {
    const og = doc.querySelector('meta[property="og:description"]')?.getAttribute("content");
    if (og && og.length >= 80) return cleanBoilerplate(stripHtml(og));
    const desc = doc.querySelector('meta[name="description"]')?.getAttribute("content");
    if (desc && desc.length >= 80) return cleanBoilerplate(stripHtml(desc));
    return "";
  }

  function normalizeAuthorName(raw) {
    let s = stripHtml(String(raw || ""))
      .replace(/\s+/g, " ")
      .trim();
    if (!s) return "";

    s = s
      .replace(/^[Bb]y\s+/i, "")
      .replace(/^بواسطة\s+/i, "")
      .replace(/^بقلم\s+/i, "")
      .replace(/^كتب(?:ها)?\s+/i, "")
      .replace(/^written\s+by\s+/i, "")
      .replace(/^par\s+/i, "");

    const paren = s.match(/\(([^)]+)\)/);
    if (s.includes("@") && paren) s = paren[1].trim();
    else if (s.includes("@")) {
      const before = s.split("@")[0].trim();
      if (before.length >= 2) s = before;
    }

    if (s.length < 2 || s.length > 90) return "";
    if (/^(admin|unknown|redaction|rédaction|تحرير|مجهول|anon)/i.test(s)) return "";
    return s;
  }

  function authorFromJsonLd(doc) {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || "");
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const types = String(item["@type"] || "").toLowerCase();
          if (!types.includes("article") && !types.includes("newsarticle") && !types.includes("blogposting")) {
            continue;
          }
          const author = item.author;
          if (typeof author === "string") {
            const n = normalizeAuthorName(author);
            if (n) return n;
          }
          if (author && typeof author === "object") {
            const list = Array.isArray(author) ? author : [author];
            for (const a of list) {
              const n = normalizeAuthorName(a.name || a.url || "");
              if (n) return n;
            }
          }
        }
      } catch {
        /* next */
      }
    }
    return "";
  }

  function extractAuthor(doc) {
    const jsonLd = authorFromJsonLd(doc);
    if (jsonLd) return jsonLd;

    const metaAuthor =
      doc.querySelector('meta[property="article:author"]')?.getAttribute("content") ||
      doc.querySelector('meta[name="author"]')?.getAttribute("content") ||
      doc.querySelector('meta[property="og:article:author"]')?.getAttribute("content");
    const fromMeta = normalizeAuthorName(metaAuthor);
    if (fromMeta) return fromMeta;

    const selectors = [
      "[rel='author']",
      "[itemprop='author']",
      ".author-name",
      ".post-author",
      ".entry-author",
      ".byline a",
      ".byline",
      ".article-author",
      ".author a",
      ".author",
      ".tdb-author-name",
      ".jeg_post_author",
    ];

    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (!el) continue;
      const n = normalizeAuthorName(el.textContent || el.getAttribute("content") || "");
      if (n) return n;
    }

    return "";
  }

  function extractAuthorFromHtml(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (doc.querySelector("parsererror")) return "";
    return extractAuthor(doc);
  }

  function scoreBlock(text, minChars) {
    if (!text || text.length < minChars) return 0;
    const sentences = text.split(/(?<=[.!?؟])\s+/).filter((s) => s.length > 35);
    const words = text.split(/\s+/).length;
    return sentences.length * 12 + Math.min(words, 800);
  }

  function extractArticleText(html, pageUrl) {
    const handler = siteHandlerForUrl(pageUrl);
    const minFull = handler?.minFullChars || MIN_FULL_CHARS;
    const selectorList = handler
      ? [...handler.selectors, ...CONTENT_SELECTORS]
      : CONTENT_SELECTORS;

    const doc = new DOMParser().parseFromString(html, "text/html");
    if (doc.querySelector("parsererror")) return "";

    pruneDocument(doc);

    const jsonLd = extractFromJsonLd(doc);
    if (jsonLd.length >= minFull) return shorten(jsonLd, MAX_CHARS);

    let best = "";
    let bestScore = 0;

    for (const selector of selectorList) {
      const nodes = doc.querySelectorAll(selector);
      for (const el of nodes) {
        const text = textFromElement(el);
        const score = scoreBlock(text, minFull);
        if (score > bestScore) {
          bestScore = score;
          best = text;
        }
      }
    }

    if (best.length >= minFull) return shorten(best, MAX_CHARS);

    const paragraphs = Array.from(doc.querySelectorAll("p"))
      .map((p) => stripHtml(p.innerHTML))
      .filter((t) => t.length >= 50 && !BOILERPLATE_RE.test(t));

    if (paragraphs.length >= 2) {
      const joined = shorten(paragraphs.join(" "), MAX_CHARS);
      if (joined.length >= minFull) return joined;
    }

    const meta = extractFromMeta(doc);
    if (meta.length >= minFull) return shorten(meta, MAX_CHARS);

    const bodyText = cleanBoilerplate(stripHtml(doc.body?.innerHTML || ""));
    return bodyText.length >= minFull ? shorten(bodyText, MAX_CHARS) : best || bodyText;
  }

  function rssFallbackBody(article) {
    const title = article.title || "";
    const rss = article.summary || "";
    if (rss && rss !== title && rss.length >= 40) {
      return `${title}. ${rss}`;
    }
    return title;
  }

  /**
   * Load article body from the source URL. RSS is only a fallback.
   */
  async function loadFromArticlePage(article, onStatus) {
    const title = article.title || "";
    const link = article.link || "";
    const rss = article.summary || "";
    const rssAuthor = normalizeAuthorName(article.author || "");
    const feedLocale = article.locale || "";
    const handler = siteHandlerForUrl(link);
    const minFull = handler?.minFullChars || MIN_FULL_CHARS;

    function result(extra) {
      return {
        locale: feedLocale,
        author: rssAuthor,
        ...extra,
      };
    }

    if (!link || !/^https?:\/\//i.test(link)) {
      return result({
        title,
        body: rssFallbackBody(article),
        source: "rss",
        fromPage: false,
        error: "لا يوجد رابط للمقال",
      });
    }

    onStatus?.("قاعدين نجيبو المقال من الموقع…");

    try {
      const html = await httpGetText(link);
      const pageAuthor = extractAuthorFromHtml(html);
      const author = pageAuthor || rssAuthor;
      const pageText = extractArticleText(html, link);

      if (pageText.length >= minFull) {
        return result({
          title,
          body: pageText,
          author,
          source: "article",
          fromPage: true,
          url: link,
        });
      }

      const combined = pageText.length >= 80 && rss ? `${pageText}\n\n${rss}` : pageText || rss;
      if (combined.length >= 100) {
        return result({
          title,
          body: shorten(combined, MAX_CHARS),
          author,
          source: pageText.length >= 80 ? "article_partial" : "rss",
          fromPage: pageText.length >= 80,
          url: link,
        });
      }

      const fallback = rssFallbackBody(article);
      if (fallback.length >= 60) {
        return result({
          title,
          body: fallback,
          author: rssAuthor,
          source: "rss",
          fromPage: false,
          url: link,
          error: "لم يُستخرج نص كافٍ من صفحة المقال",
        });
      }
    } catch (err) {
      const fallback = rssFallbackBody(article);
      if (fallback.length >= 60) {
        return result({
          title,
          body: fallback,
          author: rssAuthor,
          source: "rss",
          fromPage: false,
          error: err.message || "تعذّر فتح صفحة المقال",
        });
      }
      throw new Error("تعذّر تحميل المقال من الموقع — تحقق من الإنترنت أو افتح المصدر");
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
