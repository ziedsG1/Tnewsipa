const statusEl = document.getElementById("status");
const articleCountEl = document.getElementById("article-count");
const newsListEl = document.getElementById("news-list");
const refreshBtn = document.getElementById("refresh-btn");
const themeBtn = document.getElementById("theme-btn");
const shareBtn = document.getElementById("share-btn");
const weatherTextEl = document.getElementById("weather-text");
const weatherIconEl = document.querySelector(".weather-icon");

const THEME_KEY = "tnews-theme";

let articles = [];
let lastFetchedAt = null;
let statusTimer = null;

function formatTime(pubDate) {
  if (!pubDate) return "";
  const date = new Date(pubDate);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfArticle = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday - startOfArticle) / 86400000);

  const clock = date.toLocaleString("ar-TN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (dayDiff === 0) return `اليوم ${clock}`;
  if (dayDiff === 1) return `أمس ${clock}`;
  if (dayDiff < 7) {
    const weekday = date.toLocaleString("ar-TN", { weekday: "long" });
    return `${weekday} ${clock}`;
  }

  return date.toLocaleString("ar-TN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatUpdatedAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - Date.parse(iso);
  if (Number.isNaN(diffMs) || diffMs < 0) return "";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  return `منذ ${hours} س`;
}

function updateStatusLine() {
  const updated = formatUpdatedAgo(lastFetchedAt);
  statusEl.textContent = updated ? `أخبار الأسبوع · ${updated}` : "أخبار الأسبوع";
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function weatherEmoji(label) {
  if (!label) return "☁";
  if (/صاف|Clear/i.test(label)) return "☀";
  if (/مطر|رذاذ|زخات/i.test(label)) return "🌧";
  if (/ثلج/i.test(label)) return "❄";
  if (/ضباب/i.test(label)) return "🌫";
  if (/عاصف/i.test(label)) return "⛈";
  if (/غائم/i.test(label)) return "⛅";
  return "☁";
}

async function loadWeather() {
  try {
    const w = await window.TnewsWeather.fetchWeather();
    weatherTextEl.textContent = `${w.city} · ${w.temp}° · ${w.label}`;
    weatherIconEl.textContent = weatherEmoji(w.label);
  } catch {
    weatherTextEl.textContent = "تونس · الطقس غير متاح";
    weatherIconEl.textContent = "☁";
  }
}

function applyTheme(theme) {
  const next = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
  themeBtn.textContent = next === "dark" ? "☀" : "◐";
  themeBtn.title = next === "dark" ? "وضع فاتح" : "وضع داكن";
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved === "light" ? "light" : "dark");
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(current === "dark" ? "light" : "dark");
}

async function shareContent({ title, text, url }) {
  const shareText = text || title || "Tnews";
  const shareUrl = url || "";

  if (window.Capacitor?.isNativePlatform?.()) {
    const sharePlugin = window.Capacitor.Plugins.Share;
    if (sharePlugin?.share) {
      await sharePlugin.share({
        title: title || "Tnews",
        text: shareText,
        url: shareUrl,
        dialogTitle: "مشاركة",
      });
      return;
    }
  }

  if (navigator.share) {
    await navigator.share({
      title: title || "Tnews",
      text: shareText,
      url: shareUrl || undefined,
    });
    return;
  }

  const combined = [shareText, shareUrl].filter(Boolean).join("\n");
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(combined);
    statusEl.textContent = "تم نسخ الرابط";
    setTimeout(updateStatusLine, 2000);
  }
}

function renderNewsList() {
  if (!articles.length) {
    articleCountEl.textContent = "";
    newsListEl.innerHTML = `
      <div class="empty-state">
        <strong>لا توجد أخبار</strong>
        تحقق من اتصال الإنترنت واضغط ↻ للتحديث
      </div>`;
    return;
  }

  articleCountEl.textContent = `${articles.length} خبر`;
  newsListEl.innerHTML = articles
    .map(
      (article, index) => `
    <article class="news-card" data-index="${index}">
      <div class="news-card-head">
        <h2 class="news-card-title">${escapeHtml(article.translatedTitle || article.title)}</h2>
        <span class="news-card-time">${escapeHtml(formatTime(article.pubDate) || "—")}</span>
      </div>
      ${article.summary ? `<p class="news-card-summary">${escapeHtml(article.summary)}</p>` : ""}
      <div class="news-card-foot">
        <div class="news-card-meta">
          <span class="topic">${escapeHtml(article.topic || "عام")}</span>
          <span class="source">${escapeHtml(article.sourceLabel || "")}</span>
        </div>
        <button type="button" class="share-article-btn" data-share-index="${index}" title="مشاركة">↗</button>
      </div>
    </article>`,
    )
    .join("");

  newsListEl.querySelectorAll(".news-card").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest(".share-article-btn")) return;
      const article = articles[Number(card.dataset.index)];
      if (article?.link) window.tnewsWidget.openLink(article.link);
    });
  });

  newsListEl.querySelectorAll(".share-article-btn").forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      event.stopPropagation();
      const article = articles[Number(btn.dataset.shareIndex)];
      if (!article) return;
      try {
        await shareContent({
          title: article.title,
          text: article.title,
          url: article.link,
        });
      } catch {
        /* user cancelled */
      }
    });
  });
}

function applyPayload(payload) {
  if (!payload?.articles?.length) {
    articles = [];
    statusEl.textContent = "لا توجد أخبار — اضغط ↻";
    renderNewsList();
    return;
  }

  articles = payload.articles;
  lastFetchedAt = payload.fetchedAt || null;
  updateStatusLine();
  renderNewsList();
  if (window.tnewsWidget?.syncToHomeScreenWidget) {
    window.tnewsWidget.syncToHomeScreenWidget();
  }
}

async function loadNews() {
  statusEl.textContent = "جاري التحديث…";
  articleCountEl.textContent = "";
  try {
    if (!window.tnewsWidget) {
      statusEl.textContent = "خطأ في التطبيق — أعد التثبيت";
      return;
    }
    const payload = await window.tnewsWidget.loadNews();
    if (payload?.articles?.length) {
      applyPayload(payload);
    } else {
      articles = [];
      const detail = payload?.loadedFeeds != null ? ` (${payload.loadedFeeds} مصادر)` : "";
      statusEl.textContent = `لا توجد أخبار — تحقق من الإنترنت واضغط ↻${detail}`;
      renderNewsList();
    }
  } catch (err) {
    statusEl.textContent = "فشل التحديث — اضغط ↻";
    console.error("loadNews failed", err);
  }
}

refreshBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  loadNews();
  loadWeather();
});

themeBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleTheme();
});

shareBtn.addEventListener("click", async (event) => {
  event.stopPropagation();
  try {
    await shareContent({
      title: "Tnews",
      text: "تابع أخبار تونس مع Tnews",
      url: articles[0]?.link || "",
    });
  } catch {
    /* cancelled */
  }
});

(async function init() {
  try {
    initTheme();
    if (!window.tnewsWidget) {
      statusEl.textContent = "خطأ في التحميل — أعد فتح التطبيق";
      return;
    }
    window.tnewsWidget.onNewsUpdated((payload) => {
      applyPayload(payload);
    });
    statusTimer = setInterval(updateStatusLine, 30000);
    await Promise.all([loadNews(), loadWeather()]);
  } catch (err) {
    statusEl.textContent = "فشل بدء التطبيق — اضغط ↻";
    console.error("init failed", err);
  }
})();
