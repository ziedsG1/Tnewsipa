(function () {
  (function hideNativeSplash() {
    const cap = window.Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    const splash = cap.Plugins?.SplashScreen;
    if (splash?.hide) {
      Promise.resolve(splash.hide()).catch(() => {});
    }
  })();

  function cacheKey() {
    const id = window.TnewsCountries?.getSelectedId?.() || "tn";
    return `tnews-news-cache-${id}`;
  }
  const CONFIG = {
    rotateSeconds: 8,
    refreshMinutes: 3,
    maxAgeDays: 7,
    fetchTimeoutMs: 50000,
  };

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function slimArticle(a) {
    return {
      id: a.id,
      title: a.title || "",
      link: a.link || "",
      author: a.author || "",
      sourceLabel: a.sourceLabel || "",
      sourceId: a.sourceId,
      pubDate: a.pubDate || null,
      summary: (a.summary || "").slice(0, 280),
      topic: a.topic || "عام",
      topicKey: a.topicKey,
      locale: a.locale,
      priority: Boolean(a.priority),
      independent: Boolean(a.independent),
    };
  }

  function writeCache(payload) {
    const toStore = {
      ...payload,
      articles: (payload.articles || []).map(slimArticle),
    };
    try {
      localStorage.setItem(cacheKey(), JSON.stringify(toStore));
    } catch {
      /* ignore quota errors */
    }
    syncWidget(toStore);
    if (window.TnewsNotifications?.onNewsUpdated) {
      Promise.resolve(window.TnewsNotifications.onNewsUpdated(toStore)).catch(() => {});
    }
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

  function articleTime(article) {
    const ts = Date.parse(article?.pubDate || "");
    return Number.isNaN(ts) ? 0 : ts;
  }

  function mergeArticles(freshList, cachedList) {
    const byLink = new Map();
    for (const a of cachedList || []) {
      if (a?.link) byLink.set(a.link, a);
    }
    for (const a of freshList || []) {
      if (!a?.link) continue;
      const prev = byLink.get(a.link);
      if (!prev || articleTime(a) >= articleTime(prev)) {
        byLink.set(a.link, a);
      }
    }
    return Array.from(byLink.values()).sort((a, b) => articleTime(b) - articleTime(a));
  }

  async function fetchFromNetwork() {
    return Promise.race([
      window.TnewsNewsFetcher.fetchNewsArticles(CONFIG.maxAgeDays),
      new Promise((resolve) => setTimeout(() => resolve(null), CONFIG.fetchTimeoutMs)),
    ]);
  }

  async function refreshNewsCache(options = {}) {
    const cached = readCache();
    let networkPayload = null;

    try {
      networkPayload = await fetchFromNetwork();
    } catch {
      networkPayload = null;
    }

    const networkOk = Boolean(networkPayload?.articles?.length);
    const loadedFeeds = networkPayload?.loadedFeeds ?? 0;

    if (networkOk) {
      let articles = networkPayload.articles;
      if (cached?.articles?.length) {
        articles = mergeArticles(articles, cached.articles);
      }
      const payload = normalizePayload({
        ...networkPayload,
        articles,
        fetchedAt: new Date().toISOString(),
        stale: false,
      });
      writeCache(payload);
      return payload;
    }

    if (cached?.articles?.length) {
      const stalePayload = normalizePayload({
        ...cached,
        fetchedAt: cached.fetchedAt,
        stale: true,
        loadedFeeds,
      });
      syncWidget(stalePayload);
      return stalePayload;
    }

    if (networkPayload) {
      return normalizePayload({ ...networkPayload, stale: true, loadedFeeds });
    }

    return null;
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

    loadNews: async (options = {}) => {
      const force = Boolean(options.force);

      if (force) {
        return refreshNewsCache({ force: true });
      }

      const cached = readCache();
      if (cached?.articles?.length) {
        refreshNewsCache()
          .then((fresh) => {
            if (fresh) notifyListeners(fresh);
          })
          .catch(() => {});
        return normalizePayload({ ...cached, stale: Boolean(cached.stale) });
      }
      return refreshNewsCache();
    },

    refreshNews: async (options = {}) => refreshNewsCache(options),

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

    syncToHomeScreenWidget: async () => {
      const payload = readCache();
      if (payload?.articles?.length) syncWidget(payload);
    },

    share: async ({ title, text, url }) => {
      if (window.Capacitor?.isNativePlatform?.()) {
        const sharePlugin = window.Capacitor.Plugins.Share;
        if (sharePlugin?.share) {
          return sharePlugin.share({ title, text, url, dialogTitle: "مشاركة" });
        }
      }
      if (navigator.share) {
        return navigator.share({ title, text, url });
      }
      throw new Error("Share unavailable");
    },
  };

  scheduleRefresh();
})();
