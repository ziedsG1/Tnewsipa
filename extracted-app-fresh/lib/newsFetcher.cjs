const Parser = require("rss-parser");

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

const parser = new Parser({
  timeout: FEED_TIMEOUT_MS,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  },
});

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

async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.url);
    return (feed.items || []).slice(0, 10).map((item, index) => {
      const title = stripHtml(item.title || "");
      const topicKey = inferTopicKey(title);
      return {
        id: `${source.id}:${item.link || item.guid || title}:${index}`,
        title,
        link: item.link || "",
        sourceLabel: source.label,
        sourceId: source.id,
        pubDate: item.pubDate || item.isoDate || null,
        summary: shorten(stripHtml(item.contentSnippet || item.content || item.summary || "")),
        topic: TOPIC_AR[topicKey],
        topicKey,
        locale: source.locale,
        independentMedia: source.independentMedia,
      };
    });
  } catch {
    return [];
  }
}

function fetchFeedWithTimeout(source) {
  return Promise.race([
    fetchFeed(source),
    new Promise((resolve) => setTimeout(() => resolve([]), FEED_TIMEOUT_MS)),
  ]);
}

async function fetchNewsArticles(maxAgeDays = 7) {
  const batches = await Promise.all(FEEDS.map(fetchFeedWithTimeout));
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

module.exports = { fetchNewsArticles };
