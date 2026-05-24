const statusEl = document.getElementById("status");
const articleCountEl = document.getElementById("article-count");
const newsListEl = document.getElementById("news-list");
const refreshBtn = document.getElementById("refresh-btn");

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
    <article class="news-card" data-index="${index}" tabindex="0">
      <div class="news-card-head">
        <h2 class="news-card-title">${escapeHtml(article.translatedTitle || article.title)}</h2>
        <span class="news-card-time">${escapeHtml(formatTime(article.pubDate) || "—")}</span>
      </div>
      ${article.summary ? `<p class="news-card-summary">${escapeHtml(article.summary)}</p>` : ""}
      <div class="news-card-meta">
        <span class="topic">${escapeHtml(article.topic || "عام")}</span>
        <span class="source">${escapeHtml(article.sourceLabel || "")}</span>
      </div>
    </article>`,
    )
    .join("");

  newsListEl.querySelectorAll(".news-card").forEach((card) => {
    card.addEventListener("click", () => {
      const article = articles[Number(card.dataset.index)];
      if (article?.link) window.tnewsWidget.openLink(article.link);
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
});

(async function init() {
  try {
    if (!window.tnewsWidget) {
      statusEl.textContent = "خطأ في التحميل — أعد فتح التطبيق";
      return;
    }
    window.tnewsWidget.onNewsUpdated((payload) => {
      applyPayload(payload);
    });
    statusTimer = setInterval(updateStatusLine, 30000);
    await loadNews();
  } catch (err) {
    statusEl.textContent = "فشل بدء التطبيق — اضغط ↻";
    console.error("init failed", err);
  }
})();
