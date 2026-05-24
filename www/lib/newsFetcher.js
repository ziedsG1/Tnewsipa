const FEEDS = [
  { id: "tap-tn-ar", label: "TAP", url: "https://www.tap.info.tn/ar/rss/tunisia", locale: "ar", independentMedia: false },
  { id: "lapresse-tn-ar", label: "La Presse", url: "https://www.lapresse.tn/feed/", locale: "ar", independentMedia: false },
  { id: "mosaique-ar", label: "موزاييك", url: "https://www.mosaiquefm.net/ar/rss/", locale: "ar", independentMedia: false },
  { id: "nawaat", label: "نواة", url: "https://nawaat.org/feed/", locale: "ar", independentMedia: true },
  { id: "alqatiba", label: "الكتيبة", url: "https://alqatiba.com/feed/", locale: "ar", independentMedia: true },
  { id: "businessnews", label: "Business News", url: "https://www.businessnews.com.tn/rss", locale: "fr", independentMedia: false },
  { id: "webdo-fr", label: "Webdo.tn", url: "https://www.webdo.tn/feed/", locale: "fr", independentMedia: false },
];

const FEED_TIMEOUT_MS = 6000;

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

function textContent(node, tagName) {
  const el = node.getElementsByTagName(tagName)[0];
  return el?.textContent?.trim() || "";
}

function parseRssItems(xmlText, source) {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  if (doc.querySelector("parsererror")) return [];

  const items = Array.from(doc.querySelectorAll("item, entry")).slice(0, 10);
  return items.map((item, index) => {
    const title = stripHtml(
      textContent(item, "title") ||
        item.querySelector("title")?.textContent?.trim() ||
        "",
    );
    const link =
      textContent(item, "link") ||
      item.querySelector("link")?.getAttribute("href") ||
      item.querySelector("guid")?.textContent?.trim() ||
      "";
    const pubDate =
      textContent(item, "pubDate") ||
      textContent(item, "published") ||
      textContent(item, "updated") ||
      null;
    const summaryRaw =
      textContent(item, "description") ||
      textContent(item, "summary") ||
      textContent(item, "content") ||
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
      independentMedia: source.independentMedia,
    };
  });
}

async function fetchFeed(source) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);

  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      },
    });
    if (!res.ok) return [];
    const xmlText = await res.text();
    return parseRssItems(xmlText, source);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchNewsArticles(maxAgeDays = 7) {
  const batches = await Promise.all(FEEDS.map(fetchFeed));
  const seen = new Set();
  const sorted = batches
    .flat()
    .filter((a) => a.title && a.link)
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
  };
}
