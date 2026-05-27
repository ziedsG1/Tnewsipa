(function () {
  const FEEDS = [
    { id: "nawaat", label: "نواة — Nawaat", url: "https://nawaat.org/feed/", locale: "ar", priority: true, independent: true },
    { id: "alqatiba", label: "الكتيبة — Al Katiba", url: "https://alqatiba.com/feed/", locale: "ar", priority: true, independent: true },
    { id: "tap-tn-ar", label: "TAP", url: "https://www.tap.info.tn/ar/rss/tunisia", locale: "ar", priority: false, independent: false },
    { id: "lapresse-tn-ar", label: "La Presse", url: "https://www.lapresse.tn/feed/", locale: "ar", priority: false, independent: false },
    { id: "shemsfm", label: "شمس FM", url: "https://www.shemsfm.net/feed/", locale: "ar", priority: false, independent: false },
    { id: "diwanfm", label: "ديوان FM", url: "https://diwanfm.net/feed/", locale: "ar", priority: false, independent: false },
    { id: "mosaique-ar", label: "موزاييك", url: "https://www.mosaiquefm.net/ar/rss/", locale: "ar", priority: false, independent: false },
    { id: "businessnews", label: "Business News", url: "https://www.businessnews.com.tn/rss", locale: "fr", priority: false, independent: false },
    { id: "webdo-fr", label: "Webdo.tn", url: "https://www.webdo.tn/feed/", locale: "fr", priority: false, independent: false },
  ];

  const FEED_TIMEOUT_MS = 18000;
  const FEED_RETRIES = 2;
  const FEED_BATCH_SIZE = 3;
  const REQUEST_HEADERS = {
    Accept: "application/rss+xml, application/xml, text/xml, */*",
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  };

  function parsePubDateMs(pubDate) {
    if (!pubDate) return 0;
    const ts = Date.parse(pubDate);
    if (!Number.isNaN(ts)) return ts;
    const m = String(pubDate).match(
      /(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/,
    );
    if (m) {
      const d = new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4] || 0),
        Number(m[5] || 0),
        Number(m[6] || 0),
      );
      const t = d.getTime();
      return Number.isNaN(t) ? 0 : t;
    }
    return 0;
  }

  function looksLikeRss(xmlText) {
    const head = String(xmlText || "").slice(0, 8000).toLowerCase();
    return (
      head.includes("<rss") ||
      head.includes("<feed") ||
      head.includes("<channel") ||
      head.includes("<item") ||
      head.includes("<entry")
    );
  }

  function httpBodyText(res) {
    const d = res?.data;
    if (typeof d === "string") return d;
    if (d == null) return "";
    if (typeof d === "object" && typeof d.body === "string") return d.body;
    return String(d);
  }

  const RULES = [
    { key: "sport", patterns: [/sport/i, /football/i, /كرة/i, /رياض/i] },
    { key: "economy", patterns: [/économ/i, /finance/i, /اقتصاد/i, /دينار/i] },
    { key: "politics", patterns: [/polit/i, /gouvern/i, /حكوم/i, /رئاس/i] },
    { key: "culture", patterns: [/culture/i, /ثقاف/i] },
    { key: "world", patterns: [/international/i, /monde/i, /عالم/i, /غزة/i] },
    { key: "tunisia", patterns: [/tunisi/i, /tunis\b/i, /تونس/i, /صفاقس/i] },
  ];

  const TOPIC_AR = {
    sport: "رياضة",
    economy: "اقتصاد",
    politics: "سياسة",
    culture: "ثقافة",
    world: "عالمي",
    tunisia: "تونس",
    general: "عام",
  };

  function isWithinDays(pubDate, days) {
    if (!pubDate) return false;
    const ts = Date.parse(pubDate);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts <= days * 24 * 60 * 60 * 1000;
  }

  function filterWeekArticles(list, maxAgeDays) {
    const week = list.filter((a) => isWithinDays(a.pubDate, maxAgeDays));
    if (week.length >= 3) return week;
    const twoWeeks = list.filter((a) => isWithinDays(a.pubDate, maxAgeDays * 2));
    if (twoWeeks.length >= 3) return twoWeeks;
    return list.slice(0, 50);
  }

  function inferTopicKey(title) {
    for (const { key, patterns } of RULES) {
      if (patterns.some((p) => p.test(title))) return key;
    }
    return "general";
  }

  function stripHtml(html) {
    return String(html || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function shorten(text, max = 260) {
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1).trim()}…`;
  }

  function childText(node, tagName) {
    const el = Array.from(node.children).find(
      (child) => child.localName && child.localName.toLowerCase() === tagName.toLowerCase(),
    );
    return el?.textContent?.trim() || "";
  }

  function childTextNs(node, localName) {
    const el = Array.from(node.children).find((child) => child.localName === localName);
    return el?.textContent?.trim() || "";
  }

  function getItemLink(item) {
    const guidEl = Array.from(item.children).find((c) => c.localName === "guid");
    if (guidEl?.getAttribute("isPermaLink") === "true") {
      const guid = guidEl.textContent?.trim();
      if (guid && /^https?:\/\//i.test(guid)) return guid;
    }

    const links = Array.from(item.children).filter((child) => child.localName === "link");
    for (const linkEl of links) {
      const href = linkEl.getAttribute("href");
      if (href && /^https?:\/\//i.test(href)) return href.trim();
    }
    for (const linkEl of links) {
      const text = linkEl.textContent?.trim();
      if (text && /^https?:\/\//i.test(text)) return text;
    }

    const guid = childText(item, "guid");
    if (guid && /^https?:\/\//i.test(guid)) return guid;

    const id = childText(item, "id");
    if (id && /^https?:\/\//i.test(id)) return id;

    return "";
  }

  function getItemAuthor(item) {
    const authorEl = Array.from(item.children).find((c) => c.localName === "author");
    if (authorEl) {
      const name =
        childTextNs(authorEl, "name") ||
        childText(authorEl, "name") ||
        authorEl.textContent?.trim() ||
        "";
      if (name && !name.includes("@")) return stripHtml(name);
    }
    return (
      childTextNs(item, "creator") ||
      childText(item, "author") ||
      childText(item, "dc:creator") ||
      ""
    );
  }

  function getItemSummaryRaw(item) {
    return (
      childTextNs(item, "encoded") ||
      childText(item, "description") ||
      childText(item, "summary") ||
      childText(item, "content") ||
      ""
    );
  }

  function parseRssItems(xmlText, source) {
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    if (doc.querySelector("parsererror")) return [];

    const limit = source.priority ? 15 : 12;
    const items = Array.from(doc.querySelectorAll("item, entry")).slice(0, limit);
    return items
      .map((item, index) => {
        const title = stripHtml(childText(item, "title"));
        const link = getItemLink(item);
        const pubDate =
          childText(item, "pubDate") ||
          childText(item, "published") ||
          childText(item, "updated") ||
          null;
        const summaryRaw = getItemSummaryRaw(item);
        const topicKey = inferTopicKey(title);
        const author = getItemAuthor(item);

        return {
          id: `${source.id}:${link || title}:${index}`,
          title,
          link,
          author: stripHtml(author),
          sourceLabel: source.label,
          sourceId: source.id,
          pubDate,
          summary: shorten(stripHtml(summaryRaw)),
          topic: TOPIC_AR[topicKey],
          topicKey,
          locale: source.locale,
          priority: Boolean(source.priority),
          independent: Boolean(source.independent),
        };
      })
      .filter((a) => a.title && a.link);
  }

  async function nativeHttpGet(url) {
    const http = window.Capacitor?.Plugins?.CapacitorHttp;
    if (!http?.get) return null;

    const res = await http.get({
      url,
      headers: REQUEST_HEADERS,
      connectTimeout: FEED_TIMEOUT_MS,
      readTimeout: FEED_TIMEOUT_MS,
      responseType: "text",
    });

    if (res.status < 200 || res.status >= 300) {
      throw new Error(`HTTP ${res.status}`);
    }

    const body = httpBodyText(res);
    if (!body || !looksLikeRss(body)) {
      throw new Error("Not RSS XML");
    }
    return body;
  }

  async function webFetchGet(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: REQUEST_HEADERS,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.text();
      if (!looksLikeRss(body)) throw new Error("Not RSS XML");
      return body;
    } finally {
      clearTimeout(timer);
    }
  }

  async function httpGetText(url) {
    let lastErr = null;
    const attempts = [];
    if (window.Capacitor?.isNativePlatform?.()) {
      attempts.push(() => nativeHttpGet(url));
    }
    attempts.push(() => webFetchGet(url), () => webFetchGet(url));

    for (const attempt of attempts) {
      try {
        const body = await attempt();
        if (body && looksLikeRss(body)) return body;
        lastErr = new Error("Not RSS XML");
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("fetch failed");
  }

  async function fetchFeedOnce(source) {
    const xmlText = await httpGetText(source.url);
    return parseRssItems(xmlText, source);
  }

  async function fetchFeed(source) {
    for (let i = 0; i < FEED_RETRIES; i += 1) {
      try {
        const items = await fetchFeedOnce(source);
        if (items.length) return items;
      } catch {
        /* retry */
      }
      if (i < FEED_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
      }
    }
    return [];
  }

  async function fetchAllFeeds() {
    const batches = [];
    for (let i = 0; i < FEEDS.length; i += FEED_BATCH_SIZE) {
      const chunk = FEEDS.slice(i, i + FEED_BATCH_SIZE);
      const part = await Promise.all(chunk.map(fetchFeed));
      batches.push(...part);
    }
    return batches;
  }

  function articleSortScore(article) {
    const ts = parsePubDateMs(article.pubDate);
    let score = ts;
    if (article.independent) score += 45 * 60 * 1000;
    if (article.priority) score += 15 * 60 * 1000;
    return score;
  }

  async function fetchNewsArticles(maxAgeDays = 7) {
    const batches = await fetchAllFeeds();
    const seen = new Set();
    const sorted = batches
      .flat()
      .filter((a) => {
        if (seen.has(a.link)) return false;
        seen.add(a.link);
        return true;
      })
      .sort((a, b) => articleSortScore(b) - articleSortScore(a));

    const articles = filterWeekArticles(sorted, maxAgeDays).slice(0, 100);

    return {
      fetchedAt: new Date().toISOString(),
      maxAgeDays,
      articles,
      feedCount: FEEDS.length,
      loadedFeeds: batches.filter((b) => b.length > 0).length,
    };
  }

  window.TnewsNewsFetcher = { fetchNewsArticles, FEEDS };
})();
