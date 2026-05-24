const articleView = document.getElementById("article-view");
const statusEl = document.getElementById("status");
const headlineEl = document.getElementById("headline");
const summaryEl = document.getElementById("summary");
const metaEl = document.getElementById("meta");
const headerTimeEl = document.getElementById("header-time");
const progressBar = document.getElementById("progress-bar");
const refreshBtn = document.getElementById("refresh-btn");

let articles = [];
let currentIndex = 0;
let rotateSeconds = 8;
let rotateTimer = null;
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

function applyPayload(payload) {
  if (!payload?.articles?.length) {
    statusEl.textContent = "لا توجد أخبار — اضغط ↻";
    return;
  }
  articles = payload.articles;
  lastFetchedAt = payload.fetchedAt || null;
  currentIndex = 0;
  renderArticle(currentIndex);
  startRotation();
  updateStatusLine();
}

function renderArticle(index) {
  const article = articles[index];
  if (!article) {
    statusEl.textContent = "No news available";
    headlineEl.textContent = "";
    summaryEl.textContent = "";
    metaEl.innerHTML = "";
    headerTimeEl.textContent = "—";
    return;
  }

  updateStatusLine();
  headlineEl.textContent = article.translatedTitle || article.title;
  summaryEl.textContent = article.summary || "";
  headerTimeEl.textContent = formatTime(article.pubDate) || "—";
  metaEl.innerHTML = `
    <span class="topic">${article.topic || "عام"}</span>
    <span class="source">${article.sourceLabel || ""}</span>
    <span class="counter">${index + 1}/${articles.length}</span>
  `;
}

function resetProgress() {
  progressBar.style.transition = "none";
  progressBar.style.width = "0%";
  requestAnimationFrame(() => {
    progressBar.style.transition = `width ${rotateSeconds}s linear`;
    progressBar.style.width = "100%";
  });
}

function showNext() {
  if (!articles.length) return;

  articleView.classList.add("fade-out");
  setTimeout(() => {
    currentIndex = (currentIndex + 1) % articles.length;
    renderArticle(currentIndex);
    articleView.classList.remove("fade-out");
    resetProgress();
  }, 280);
}

function startRotation() {
  clearInterval(rotateTimer);
  if (!articles.length) return;
  resetProgress();
  rotateTimer = setInterval(showNext, rotateSeconds * 1000);
}

async function loadNews() {
  statusEl.textContent = "جاري التحديث…";
  try {
    if (!window.tnewsWidget) {
      statusEl.textContent = "خطأ في التطبيق — أعد التثبيت";
      return;
    }
    const payload = await window.tnewsWidget.loadNews();
    if (payload?.articles?.length) {
      applyPayload(payload);
    } else {
      const detail = payload?.loadedFeeds != null ? ` (${payload.loadedFeeds} مصادر)` : "";
      statusEl.textContent = `لا توجد أخبار — تحقق من الإنترنت واضغط ↻${detail}`;
    }
  } catch (err) {
    statusEl.textContent = "فشل التحديث — اضغط ↻";
    console.error("loadNews failed", err);
  }
}

articleView.addEventListener("click", () => {
  const article = articles[currentIndex];
  if (article?.link) window.tnewsWidget.openLink(article.link);
});

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
    const config = await window.tnewsWidget.getConfig();
    rotateSeconds = config.rotateSeconds || 8;
    statusTimer = setInterval(updateStatusLine, 30000);
    await loadNews();
  } catch (err) {
    statusEl.textContent = "فشل بدء التطبيق — اضغط ↻";
    console.error("init failed", err);
  }
})();
