(function () {
  const CACHE_KEY = "tnews-news-cache";
  const CONFIG = {
    rotateSeconds: 8,
    refreshMinutes: 3,
    maxAgeDays: 7,
  };

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeCache(payload) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota errors */
    }
    syncWidget(payload);
  }

  function syncWidget(payload) {
    if (!window.Capacitor?.isNativePlatform?.() || !payload?.articles?.length) return;
    const plugin = window.Capacitor.Plugins.WidgetSync;
    if (!plugin?.saveNews) return;

    const slim = {
      fetchedAt: payload.fetchedAt || new Date().toISOString(),
      articles: payload.articles.map((a) => ({
        title: a.title || "",
        link: a.link || "",
        sourceLabel: a.sourceLabel || "",
        pubDate: a.pubDate || null,
        summary: a.summary || "",
        topic: a.topic || "عام",
      })),
    };

    plugin
      .saveNews({ payloadJson: JSON.stringify(slim) })
      .catch(() => plugin.saveNews({ payload: slim }).catch(() => {}));
  }

  function isWithinDays(pubDate, days) {
    if (!pubDate) return false;
    const ts = Date.parse(pubDate);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts <= days * 24 * 60 * 60 * 1000;
  }

  function filterWeekArticles(list) {
    const maxAgeDays = CONFIG.maxAgeDays;
    const week = list.filter((a) => isWithinDays(a.pubDate, maxAgeDays));
    if (week.length >= 3) return week;
    const twoWeeks = list.filter((a) => isWithinDays(a.pubDate, maxAgeDays * 2));
    if (twoWeeks.length >= 3) return twoWeeks;
    return list.slice(0, 50);
  }

  function normalizePayload(payload) {
    if (!payload?.articles?.length) return payload;
    const filtered = filterWeekArticles(payload.articles);
    return {
      ...payload,
      articles: filtered.length ? filtered : payload.articles.slice(0, 50),
      maxAgeDays: CONFIG.maxAgeDays,
    };
  }

  async function refreshNewsCache() {
    let payload = null;
    try {
      payload = await Promise.race([
        window.TnewsNewsFetcher.fetchNewsArticles(CONFIG.maxAgeDays),
        new Promise((resolve) => setTimeout(() => resolve(null), 35000)),
      ]);
    } catch {
      payload = null;
    }

    if (!payload?.articles?.length) {
      payload = readCache();
      if (payload?.articles?.length) syncWidget(payload);
    }

    if (payload?.articles?.length) {
      payload = normalizePayload(payload);
      payload.fetchedAt = new Date().toISOString();
      writeCache(payload);
    }

    return payload;
  }

  let refreshTimer = null;
  const updateListeners = new Set();

  function notifyListeners(payload) {
    updateListeners.forEach((cb) => cb(payload));
  }

  function scheduleRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(async () => {
      const payload = await refreshNewsCache();
      if (payload) notifyListeners(payload);
    }, CONFIG.refreshMinutes * 60 * 1000);
  }

  function isNativeApp() {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  }

  async function openExternalLink(url) {
    if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return;

    if (isNativeApp()) {
      const browser = window.Capacitor.Plugins.Browser;
      if (browser?.open) {
        await browser.open({ url });
        return;
      }
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  window.tnewsWidget = {
    getConfig: async () => ({
      rotateSeconds: CONFIG.rotateSeconds,
      window: { width: 520, height: 220 },
    }),

    loadNews: async () => refreshNewsCache(),

    openLink: openExternalLink,

    minimize: async () => {
      if (!isNativeApp()) return;
      const appPlugin = window.Capacitor.Plugins.App;
      if (appPlugin?.minimizeApp) {
        await appPlugin.minimizeApp();
      }
    },

    onNewsUpdated: (callback) => {
      updateListeners.add(callback);
      return () => updateListeners.delete(callback);
    },
  };

  scheduleRefresh();
})();
