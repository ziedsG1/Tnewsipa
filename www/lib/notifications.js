(function () {
  const ENABLED_KEY = "tnews-notifications-enabled";
  const LAST_NOTIFY_KEY = "tnews-last-notified-id";
  const NOTIFY_IDS_KEY = "tnews-notify-ids";
  const INTERVAL_MINUTES = 8;
  const MAX_SCHEDULED = 12;

  function isNative() {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  }

  function getPlugin() {
    return window.Capacitor?.Plugins?.LocalNotifications;
  }

  function isEnabled() {
    return localStorage.getItem(ENABLED_KEY) === "1";
  }

  function setEnabled(value) {
    localStorage.setItem(ENABLED_KEY, value ? "1" : "0");
  }

  function shorten(text, max = 90) {
    const t = String(text || "").trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1)}…`;
  }

  function formatNotifyTime(pubDate) {
    if (!pubDate) return "الآن";
    const date = new Date(pubDate);
    if (Number.isNaN(date.getTime())) return "الآن";
    return date.toLocaleString("ar-TN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function articleKey(article) {
    return article?.id || article?.link || article?.title || "";
  }

  async function ensurePermission() {
    const LN = getPlugin();
    if (!LN) return false;

    let perm = await LN.checkPermissions();
    if (perm.display !== "granted") {
      perm = await LN.requestPermissions();
    }
    return perm.display === "granted";
  }

  async function cancelScheduled() {
    const LN = getPlugin();
    if (!LN) return;

    try {
      const pending = JSON.parse(localStorage.getItem(NOTIFY_IDS_KEY) || "[]");
      if (pending.length) {
        await LN.cancel({ notifications: pending.map((id) => ({ id })) });
      }
    } catch {
      /* ignore */
    }
    localStorage.setItem(NOTIFY_IDS_KEY, "[]");
  }

  async function showNow(article) {
    const LN = getPlugin();
    if (!LN || !article?.title) return;

    const id = Math.floor(Date.now() % 50000) + 1;
    await LN.schedule({
      notifications: [
        {
          id,
          title: shorten(article.title, 100),
          body: `${formatNotifyTime(article.pubDate)} · ${article.sourceLabel || "Tnews"}`,
          schedule: { at: new Date(Date.now() + 800) },
        },
      ],
    });
  }

  async function scheduleQueue(articles) {
    if (!isEnabled() || !isNative()) return;
    const LN = getPlugin();
    if (!LN || !articles?.length) return;
    if (!(await ensurePermission())) return;

    await cancelScheduled();

    const ids = [];
    const notifications = articles.slice(0, MAX_SCHEDULED).map((article, index) => {
      const id = 2000 + index;
      ids.push(id);
      return {
        id,
        title: shorten(article.title, 100),
        body: `${formatNotifyTime(article.pubDate)} · ${article.sourceLabel || "Tnews"}`,
        schedule: {
          at: new Date(Date.now() + (index + 1) * INTERVAL_MINUTES * 60 * 1000),
        },
      };
    });

    await LN.schedule({ notifications });
    localStorage.setItem(NOTIFY_IDS_KEY, JSON.stringify(ids));
  }

  async function notifyIfNewTopStory(articles) {
    if (!isEnabled() || !articles?.length) return;
    if (!(await ensurePermission())) return;

    const top = articles[0];
    const key = articleKey(top);
    if (!key) return;

    const last = localStorage.getItem(LAST_NOTIFY_KEY);
    if (last === key) return;

    await showNow(top);
    localStorage.setItem(LAST_NOTIFY_KEY, key);
  }

  async function onNewsUpdated(payload) {
    if (!payload?.articles?.length) return;
    await notifyIfNewTopStory(payload.articles);
    if (!isNative()) return;
    const LN = getPlugin();
    if (!LN) return;
    try {
      const pending = await LN.getPending();
      if (!pending?.notifications?.length) {
        await scheduleQueue(payload.articles);
      }
    } catch {
      await scheduleQueue(payload.articles);
    }
  }

  async function enable() {
    if (!isNative()) {
      alert("الإشعارات متاحة على iPhone بعد تثبيت التطبيق");
      return false;
    }
    const ok = await ensurePermission();
    if (!ok) return false;
    setEnabled(true);
    return true;
  }

  async function disable() {
    setEnabled(false);
    await cancelScheduled();
    localStorage.removeItem(LAST_NOTIFY_KEY);
  }

  async function toggle() {
    if (isEnabled()) {
      await disable();
      return false;
    }
    return enable();
  }

  async function init() {
    if (!isNative()) return;

    const LN = getPlugin();
    if (!LN) return;

    LN.addListener("localNotificationReceived", (notification) => {
      /* shown while app in foreground */
    });

    if (isEnabled()) {
      const perm = await LN.checkPermissions();
      if (perm.display !== "granted") {
        setEnabled(false);
      }
    }

    const app = window.Capacitor.Plugins.App;
    if (app?.addListener) {
      app.addListener("appStateChange", async ({ isActive }) => {
        if (!isEnabled()) return;
        if (!isActive) {
          try {
            const raw = localStorage.getItem("tnews-news-cache");
            const payload = raw ? JSON.parse(raw) : null;
            if (payload?.articles?.length) {
              await scheduleQueue(payload.articles);
            }
          } catch {
            /* ignore */
          }
        }
      });
    }
  }

  window.TnewsNotifications = {
    init,
    toggle,
    enable,
    disable,
    isEnabled,
    onNewsUpdated,
    scheduleQueue,
  };
})();
