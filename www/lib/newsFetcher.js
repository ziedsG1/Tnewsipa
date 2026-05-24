(function () {
  const FEEDS = [
    { id: "tap-tn-ar", label: "TAP", url: "https://www.tap.info.tn/ar/rss/tunisia", locale: "ar" },
    { id: "lapresse-tn-ar", label: "La Presse", url: "https://www.lapresse.tn/feed/", locale: "ar" },
    { id: "mosaique-ar", label: "موزاييك", url: "https://www.mosaiquefm.net/ar/rss/", locale: "ar" },
    { id: "nawaat", label: "نواة", url: "https://nawaat.org/feed/", locale: "ar" },
    { id: "alqatiba", label: "الكتيبة", url: "https://alqatiba.com/feed/", locale: "ar" },
    { id: "businessnews", label: "Business News", url: "https://www.businessnews.com.tn/rss", locale: "fr" },
    { id: "webdo-fr", label: "Webdo.tn", url: "https://www.webdo.tn/feed/", locale: "fr" },
  ];

  const FEED_TIMEOUT_MS = 10000;
  const REQUEST_HEADERS = {
    Accept: "application/rss+xml, application/xml, text/xml, */*",
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  };

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

  function getItemLink(item) {
    const links = Array.from(item.children).filter((child) => child.localName?.toLowerCase() === "link");
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
    return "";
  }

  function parseRssItems(xmlText, source) {
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    if (doc.querySelector("parsererror")) return [];

    const items = Array.from(doc.querySelectorAll("item, entry")).slice(0, 12);
    return items
      .map((item, index) => {
        const title = stripHtml(childText(item, "title"));
        const link = getItemLink(item);
        const pubDate =
          childText(item, "pubDate") ||
          childText(item, "published") ||
          childText(item, "updated") ||
          null;
        const summaryRaw =
          childText(item, "description") ||
          childText(item, "summary") ||
          childText(item, "content") ||
          "";
        const topicKey = inferTopicKey(title);

        return {
          id: `${source.id}:${link || title}:${index}`,
          title,
          link,
          sourceLabel: source.label,
          sourceId: source.id,
          pubDate,
          summary: shorten(stripHtml(summaryRaw)),
          topic: TOPIC_AR[topicKey],
          topicKey,
          locale: source.locale,
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

    return typeof res.data === "string" ? res.data : String(res.data ?? "");
  }

  async function webFetchGet(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: REQUEST_HEADERS,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  }

  async function httpGetText(url) {
    if (window.Capacitor?.isNativePlatform?.()) {
      try {
        return await nativeHttpGet(url);
      } catch {
        /* fall through to fetch */
      }
    }
    return webFetchGet(url);
  }

  async function fetchFeed(source) {
    try {
      const xmlText = await httpGetText(source.url);
      return parseRssItems(xmlText, source);
    } catch {
      return [];
    }
  }

  async function fetchNewsArticles(maxAgeDays = 7) {
    const batches = await Promise.all(FEEDS.map(fetchFeed));
    const seen = new Set();
    const sorted = batches
      .flat()
      .filter((a) => {
        if (seen.has(a.link)) return false;
        seen.add(a.link);
        return true;
      })
      .sort((a, b) => {
        const ta = a.pubDate ? Date.parse(a.pubDate) : 0;
        const tb = b.pubDate ? Date.parse(b.pubDate) : 0;
        return tb - ta;
      });

    const articles = filterWeekArticles(sorted, maxAgeDays).slice(0, 100);

    return {
      fetchedAt: new Date().toISOString(),
      maxAgeDays,
      articles,
      feedCount: FEEDS.length,
      loadedFeeds: batches.filter((b) => b.length > 0).length,
    };
  }

  window.TnewsNewsFetcher = { fetchNewsArticles };
})();
