const statusEl = document.getElementById("status");
const articleCountEl = document.getElementById("article-count");
const newsListEl = document.getElementById("news-list");
const refreshBtn = document.getElementById("refresh-btn");
const themeBtn = document.getElementById("theme-btn");
const shareBtn = document.getElementById("share-btn");
const notifyBtn = document.getElementById("notify-btn");
const weatherTextEl = document.getElementById("weather-text");
const weatherIconEl = document.querySelector(".weather-icon");

const THEME_KEY = "tnews-theme";

let articles = [];
let lastFetchedAt = null;
let statusTimer = null;
let selectedIndex = null;
let aiPanelArticle = null;

const aiPanelEl = document.getElementById("ai-panel");
const aiPanelBackdrop = document.getElementById("ai-panel-backdrop");
const aiPanelClose = document.getElementById("ai-panel-close");
const aiPanelTitle = document.getElementById("ai-panel-title");
const aiPanelMeta = document.getElementById("ai-panel-meta");
const aiPanelLoading = document.getElementById("ai-panel-loading");
const aiPanelContent = document.getElementById("ai-panel-content");
const aiPanelError = document.getElementById("ai-panel-error");
const aiOpenSourceBtn = document.getElementById("ai-open-source");

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

function displaySource(article) {
  if (window.TnewsShareCard?.sourceLabel) {
    return window.TnewsShareCard.sourceLabel(article);
  }
  return article.sourceLabel || "";
}

function updateNotifyButton() {
  if (!notifyBtn || !window.TnewsNotifications) return;
  const on = window.TnewsNotifications.isEnabled();
  notifyBtn.classList.toggle("active", on);
  notifyBtn.title = on ? "إيقاف الإشعارات" : "تفعيل الإشعارات";
}

async function toggleNotifications() {
  if (!window.TnewsNotifications) return;
  const enabled = await window.TnewsNotifications.toggle();
  updateNotifyButton();
  if (enabled) {
    statusEl.textContent = "الإشعارات مفعّلة — عنوان + وقت";
    const payload = articles.length ? { articles } : null;
    if (payload) await window.TnewsNotifications.onNewsUpdated(payload);
    setTimeout(updateStatusLine, 2500);
  } else {
    statusEl.textContent = "الإشعارات متوقفة";
    setTimeout(updateStatusLine, 2000);
  }
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

async function shareArticleAsStory(article) {
  if (!article) return;
  statusEl.textContent = "جاري تجهيز صورة المشاركة…";
  try {
    await window.TnewsShareCard.shareArticleImage(article);
  } finally {
    updateStatusLine();
  }
}

function selectArticle(index) {
  if (index === selectedIndex) {
    selectedIndex = null;
  } else {
    selectedIndex = index;
  }
  renderNewsList();
  if (selectedIndex != null) {
    const card = newsListEl.querySelector(`.news-card[data-index="${selectedIndex}"]`);
    card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function setAiPanelState({ loading, content, error }) {
  aiPanelLoading.hidden = !loading;
  aiPanelContent.hidden = !content;
  aiPanelError.hidden = !error;
  if (error) aiPanelError.textContent = error;
}

function openAiPanel(article) {
  aiPanelArticle = article;
  aiPanelEl.hidden = false;
  aiPanelEl.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  const title = article.translatedTitle || article.title || "خبر";
  aiPanelTitle.textContent = title.length > 80 ? `${title.slice(0, 77)}…` : title;
  const provider =
    window.TnewsAiSummary?.hasApiKey?.() && window.TnewsAiSummary?.getConfig?.().provider === "groq"
      ? "Groq AI"
      : window.TnewsAiSummary?.hasApiKey?.()
        ? "AI"
        : "ملخص مجاني";
  aiPanelMeta.textContent = `${displaySource(article)} · ${formatTime(article.pubDate) || "—"} · ${provider}`;
  aiOpenSourceBtn.hidden = !article.link;

  runArticleSummary(article);
}

function closeAiPanel() {
  aiPanelEl.hidden = true;
  aiPanelEl.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  aiPanelArticle = null;
  aiPanelContent.innerHTML = "";
  setAiPanelState({ loading: false, content: false, error: false });
}

function formatSummaryToHtml(text) {
  if (window.TnewsAiSummary?.formatSummaryHtml) {
    return window.TnewsAiSummary.formatSummaryHtml(text);
  }
  if (window.TnewsLocalSummary?.formatSummaryHtml) {
    return window.TnewsLocalSummary.formatSummaryHtml(text);
  }
  return text;
}

async function runArticleSummary(article) {
  aiPanelLoading.textContent = "جاري تحميل المقال وإعداد الملخص…";
  setAiPanelState({ loading: true, content: false, error: false });

  const onStatus = (msg) => {
    aiPanelLoading.textContent = msg;
  };

  const useCloudAi = window.TnewsAiSummary?.hasApiKey?.();

  try {
    let text;
    if (useCloudAi) {
      try {
        text = await window.TnewsAiSummary.summarizeArticle(article, { onStatus });
      } catch (cloudErr) {
        onStatus("تعذّر الذكاء السحابي — ملخص تلقائي محلي…");
        text = await window.TnewsLocalSummary.summarizeArticle(article, { onStatus });
      }
    } else {
      text = await window.TnewsLocalSummary.summarizeArticle(article, { onStatus });
    }

    aiPanelContent.innerHTML = formatSummaryToHtml(text);
    setAiPanelState({ loading: false, content: true, error: false });
  } catch (err) {
    setAiPanelState({
      loading: false,
      content: false,
      error: err.message || "تعذّر إعداد الملخص — تحقق من الإنترنت",
    });
  }
}

async function analyzeSelectedArticle(index) {
  const article = articles[index];
  if (!article || !window.TnewsLocalSummary) return;
  openAiPanel(article);
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
    <article class="news-card${selectedIndex === index ? " selected" : ""}" data-index="${index}">
      <div class="news-card-head">
        <h2 class="news-card-title">${escapeHtml(article.translatedTitle || article.title)}</h2>
        <span class="news-card-time">${escapeHtml(formatTime(article.pubDate) || "—")}</span>
      </div>
      ${article.summary ? `<p class="news-card-summary">${escapeHtml(article.summary)}</p>` : ""}
      <div class="news-card-foot">
        <div class="news-card-meta">
          <span class="topic">${escapeHtml(article.topic || "عام")}</span>
          <span class="source">${escapeHtml(displaySource(article))}</span>
        </div>
        <button type="button" class="share-article-btn" data-share-index="${index}" title="مشاركة كصورة">↗</button>
      </div>
      <div class="news-card-actions">
        <button type="button" class="ai-analyze-btn" data-analyze-index="${index}">✨ تلخيص المقال</button>
        <button type="button" class="ai-open-link-btn" data-open-index="${index}">فتح المقال في المصدر</button>
      </div>
      <p class="news-card-hint">اضغط مرة لتحديد الخبر · ✨ ملخص مجاني (بدون API)</p>
    </article>`,
    )
    .join("");

  newsListEl.querySelectorAll(".news-card").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (
        event.target.closest(".share-article-btn") ||
        event.target.closest(".news-card-actions") ||
        event.target.closest(".ai-analyze-btn") ||
        event.target.closest(".ai-open-link-btn")
      ) {
        return;
      }
      selectArticle(Number(card.dataset.index));
    });
  });

  newsListEl.querySelectorAll(".ai-analyze-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      analyzeSelectedArticle(Number(btn.dataset.analyzeIndex));
    });
  });

  newsListEl.querySelectorAll(".ai-open-link-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const article = articles[Number(btn.dataset.openIndex)];
      if (article?.link) window.tnewsWidget.openLink(article.link);
    });
  });

  newsListEl.querySelectorAll(".share-article-btn").forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      event.stopPropagation();
      const article = articles[Number(btn.dataset.shareIndex)];
      if (!article) return;
      try {
        await shareArticleAsStory(article);
      } catch {
        statusEl.textContent = "تعذّرت المشاركة";
        setTimeout(updateStatusLine, 2000);
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
  selectedIndex = null;
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
  if (!articles[0]) return;
  try {
    await shareArticleAsStory(articles[0]);
  } catch {
    statusEl.textContent = "تعذّرت المشاركة";
    setTimeout(updateStatusLine, 2000);
  }
});

notifyBtn?.addEventListener("click", async (event) => {
  event.stopPropagation();
  await toggleNotifications();
});

aiPanelClose?.addEventListener("click", closeAiPanel);
aiPanelBackdrop?.addEventListener("click", closeAiPanel);

aiOpenSourceBtn?.addEventListener("click", () => {
  if (aiPanelArticle?.link) window.tnewsWidget.openLink(aiPanelArticle.link);
});

(async function init() {
  try {
    initTheme();
    if (window.TnewsNotifications?.init) {
      window.TnewsNotifications.init().catch(() => {});
      updateNotifyButton();
    }
    if (!window.tnewsWidget) {
      statusEl.textContent = "خطأ في التحميل — أعد فتح التطبيق";
      return;
    }
    window.tnewsWidget.onNewsUpdated((payload) => {
      applyPayload(payload);
    });
    statusTimer = setInterval(updateStatusLine, 30000);
    await loadNews();
    loadWeather().catch(() => {});
  } catch (err) {
    statusEl.textContent = "فشل بدء التطبيق — اضغط ↻";
    console.error("init failed", err);
  }
})();
