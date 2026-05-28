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
let newsStale = false;
let statusTimer = null;
let selectedIndex = null;
let aiPanelArticle = null;
let cardTranslateGeneration = 0;

const aiPanelEl = document.getElementById("ai-panel");
const aiPanelBackdrop = document.getElementById("ai-panel-backdrop");
const aiPanelClose = document.getElementById("ai-panel-close");
const aiPanelTitle = document.getElementById("ai-panel-title");
const aiPanelMeta = document.getElementById("ai-panel-meta");
const aiPanelLoading = document.getElementById("ai-panel-loading");
const aiPanelContent = document.getElementById("ai-panel-content");
const aiPanelError = document.getElementById("ai-panel-error");
const aiOpenSourceBtn = document.getElementById("ai-open-source");
const aiRetryBtn = document.getElementById("ai-retry-btn");
let cardTranslateTimer = null;
const uiLangBarEl = document.getElementById("ui-lang-bar");
const aiSummaryLangBarEl = document.getElementById("ai-summary-lang-bar");
const summaryLangLabelEl = document.getElementById("summary-lang-label");

const t = (key, vars) => (window.TnewsUi?.t ? window.TnewsUi.t(key, vars) : key);

function formatTime(pubDate) {
  if (!pubDate) return "";
  const date = new Date(pubDate);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfArticle = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday - startOfArticle) / 86400000);

  const fmt = window.TnewsUi?.formatLocaleDate || ((d, o) => d.toLocaleString("ar-TN", o));
  const clock = fmt(date, { hour: "2-digit", minute: "2-digit" });

  if (dayDiff === 0) return `${t("today")} ${clock}`;
  if (dayDiff === 1) return `${t("yesterday")} ${clock}`;
  if (dayDiff < 7) {
    const weekday = fmt(date, { weekday: "long" });
    return `${weekday} ${clock}`;
  }

  return fmt(date, {
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
  if (mins < 1) return t("now");
  if (mins < 60) return t("agoMin", { n: mins });
  const hours = Math.floor(mins / 60);
  return t("agoHour", { n: hours });
}

function updateStatusLine() {
  const updated = formatUpdatedAgo(lastFetchedAt);
  let line = updated ? `${t("weekNews")} · ${updated}` : t("weekNews");
  if (newsStale) line = `${line} · ${t("newsStale")}`;
  statusEl.textContent = line;
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

function cardText(article) {
  return { title: article.title || "", summary: article.summary || "" };
}

function scheduleCardTranslations() {
  /* Off by default — saves Gemini quota for summaries. */
}

async function refreshCardTranslations() {
  /* Card translation disabled — summaries use article text + free translate. */
}

function updateNotifyButton() {
  if (!notifyBtn || !window.TnewsNotifications) return;
  const on = window.TnewsNotifications.isEnabled();
  notifyBtn.classList.toggle("active", on);
  notifyBtn.title = on ? t("notifyOn") : t("notifyOff");
}

async function toggleNotifications() {
  if (!window.TnewsNotifications) return;
  const enabled = await window.TnewsNotifications.toggle();
  updateNotifyButton();
  if (enabled) {
    statusEl.textContent = t("notifyEnabled");
    const payload = articles.length ? { articles } : null;
    if (payload) await window.TnewsNotifications.onNewsUpdated(payload);
    setTimeout(updateStatusLine, 2500);
  } else {
    statusEl.textContent = t("notifyDisabled");
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
    weatherTextEl.textContent = t("weatherUnavailable");
    weatherIconEl.textContent = "☁";
  }
}

function applyTheme(theme) {
  const next = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
  themeBtn.textContent = next === "dark" ? "☀" : "◐";
  themeBtn.title = next === "dark" ? t("themeLight") : t("themeDark");
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
  statusEl.textContent = t("sharePreparing");
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

function setAiPanelState({ loading, content, error, showRetry }) {
  aiPanelLoading.hidden = !loading;
  aiPanelContent.hidden = !content;
  aiPanelError.hidden = !error;
  if (error) aiPanelError.textContent = error;
  if (aiRetryBtn) aiRetryBtn.hidden = !showRetry;
}

function initUiLangBar() {
  const langs = window.TnewsUi?.UI_LANGS;
  if (!langs || !uiLangBarEl) return;

  uiLangBarEl.setAttribute("aria-label", t("pageLangAria"));
  uiLangBarEl.innerHTML = "";
  Object.values(langs).forEach((lang) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ui-lang-btn";
    btn.dataset.lang = lang.id;
    btn.textContent = lang.label;
    btn.addEventListener("click", () => selectUiLang(lang.id));
    uiLangBarEl.appendChild(btn);
  });
  syncUiLangButtons();
}

function syncUiLangButtons() {
  const id = window.TnewsUi?.getUiLangId?.() || "ar";
  document.querySelectorAll(".ui-lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === id);
  });
}

function selectUiLang(id) {
  if (!window.TnewsUi?.setUiLang) return;
  window.TnewsUi.setUiLang(id);
  window.TnewsUi.applyDocumentLocale();
  applyStaticUi();
  syncUiLangButtons();
  updateNotifyButton();
  updateStatusLine();
  renderNewsList();
  if (aiPanelArticle && !aiPanelEl.hidden) {
    aiPanelMeta.textContent = buildAiPanelMeta(aiPanelArticle);
  }
  loadWeather().catch(() => {});
  scheduleCardTranslations();
}

function applyStaticUi() {
  if (notifyBtn) notifyBtn.title = t("notify");
  if (shareBtn) shareBtn.title = t("share");
  if (refreshBtn) refreshBtn.title = t("refresh");
  if (themeBtn) {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    themeBtn.title = current === "dark" ? t("themeLight") : t("themeDark");
  }
  if (uiLangBarEl) uiLangBarEl.setAttribute("aria-label", t("pageLangAria"));
  if (summaryLangLabelEl) summaryLangLabelEl.textContent = t("summaryLangHint");
  if (aiSummaryLangBarEl) aiSummaryLangBarEl.setAttribute("aria-label", t("summaryLangAria"));
  if (aiPanelClose) aiPanelClose.title = t("aiClose");
  if (aiOpenSourceBtn) aiOpenSourceBtn.textContent = t("aiOpenSource");
  if (aiRetryBtn) aiRetryBtn.textContent = t("retrySummary");
  if (statusEl && !lastFetchedAt) statusEl.textContent = t("statusLoading");
  if (weatherTextEl && weatherTextEl.textContent.includes("…")) {
    weatherTextEl.textContent = t("weatherLoading");
  }
  updateNotifyButton();
}

function initSummaryLangBar() {
  const langs = window.TnewsSummaryLanguage?.LANGUAGES;
  if (!langs || !aiSummaryLangBarEl) return;

  aiSummaryLangBarEl.setAttribute("aria-label", t("summaryLangAria"));
  aiSummaryLangBarEl.innerHTML = "";
  Object.values(langs).forEach((lang) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "summary-lang-btn";
    btn.dataset.lang = lang.id;
    btn.textContent = lang.label;
    btn.title = lang.panelTitle;
    btn.addEventListener("click", () => selectSummaryLang(lang.id));
    aiSummaryLangBarEl.appendChild(btn);
  });
  syncSummaryLangButtons();
}

function syncSummaryLangButtons() {
  const id = window.TnewsSummaryLanguage?.getLangId?.() || "tn";
  document.querySelectorAll(".summary-lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === id);
  });
}

function selectSummaryLang(id) {
  if (!window.TnewsSummaryLanguage?.setLang) return;
  window.TnewsSummaryLanguage.setLang(id);
  syncSummaryLangButtons();
  renderNewsList();
  if (aiPanelArticle && !aiPanelEl.hidden) {
    aiPanelContent.innerHTML = "";
    setAiPanelState({ loading: true, content: false, error: false, showRetry: false });
    runArticleSummary(aiPanelArticle);
  }
}

function translateSourceNote(note) {
  if (!note) return "";
  if (note.includes("من المقال نفسه") || note.includes("From full")) return t("fromArticle");
  if (note.includes("جزء") || note.includes("partial") || note.includes("partiel")) return t("fromArticlePartial");
  if (note.includes("RSS")) return t("fromRss");
  return note;
}

function buildAiPanelMeta(article) {
  const langLabel = window.TnewsSummaryLanguage?.getLang?.()?.label || "";
  return `${displaySource(article)} · ${formatTime(article.pubDate) || "—"} · ${langLabel} · ${t("freeSummary")}`;
}

function openAiPanel(article) {
  aiPanelArticle = article;
  aiPanelEl.hidden = false;
  aiPanelEl.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  syncSummaryLangButtons();
  if (summaryLangLabelEl) summaryLangLabelEl.textContent = t("summaryLangHint");

  const title = article.title || "خبر";
  aiPanelTitle.textContent = title.length > 80 ? `${title.slice(0, 77)}…` : title;
  aiPanelMeta.textContent = buildAiPanelMeta(article);
  aiOpenSourceBtn.hidden = !article.link;

  runArticleSummary(article);
}

function closeAiPanel() {
  aiPanelEl.hidden = true;
  aiPanelEl.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  aiPanelArticle = null;
  aiPanelContent.innerHTML = "";
  setAiPanelState({ loading: false, content: false, error: false, showRetry: false });
}

function formatSummaryToHtml(text) {
  return window.TnewsLocalSummary?.formatSummaryHtml
    ? window.TnewsLocalSummary.formatSummaryHtml(text)
    : text;
}

function unwrapSummaryResult(result) {
  if (typeof result === "string") {
    return { text: result, sourceNote: "" };
  }
  return {
    text: result?.text || "",
    sourceNote: result?.sourceNote || "",
  };
}

function appendSourceToMeta(sourceNote) {
  if (!sourceNote || !aiPanelMeta) return;
  const label = translateSourceNote(sourceNote);
  if (!aiPanelMeta.textContent.includes(label)) {
    aiPanelMeta.textContent = `${aiPanelMeta.textContent} · ${label}`;
  }
}

async function runArticleSummary(article) {
  aiPanelLoading.textContent = t("aiFetching");
  setAiPanelState({ loading: true, content: false, error: false, showRetry: false });
  if (aiPanelMeta) aiPanelMeta.textContent = buildAiPanelMeta(article);

  const onStatus = (msg) => {
    aiPanelLoading.textContent = msg;
  };

  try {
    const result = await window.TnewsLocalSummary.summarizeArticle(article, { onStatus });
    const { text, sourceNote } = unwrapSummaryResult(result);
    const summaryLang = window.TnewsSummaryLanguage?.getLangId?.() || "tn";
    aiPanelContent.dir = summaryLang === "ar" || summaryLang === "tn" ? "rtl" : "ltr";
    aiPanelContent.lang = summaryLang === "en" ? "en" : summaryLang === "fr" ? "fr" : "ar";
    aiPanelContent.innerHTML = formatSummaryToHtml(text);
    appendSourceToMeta(sourceNote);
    setAiPanelState({ loading: false, content: true, error: false, showRetry: false });
  } catch (err) {
    setAiPanelState({
      loading: false,
      content: false,
      error: err.message || t("summaryFailed"),
      showRetry: true,
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
        <strong>${escapeHtml(t("noNews"))}</strong>
        ${escapeHtml(t("noNewsHint"))}
      </div>`;
    return;
  }

  articleCountEl.textContent = t("articleCount", { n: articles.length });
  newsListEl.innerHTML = articles
    .map((article, index) => {
      const display = cardText(article);
      return `
    <article class="news-card${selectedIndex === index ? " selected" : ""}" data-index="${index}">
      <div class="news-card-head">
        <h2 class="news-card-title">${escapeHtml(display.title)}</h2>
        <span class="news-card-time">${escapeHtml(formatTime(article.pubDate) || "—")}</span>
      </div>
      ${display.summary ? `<p class="news-card-summary">${escapeHtml(display.summary)}</p>` : ""}
      <div class="news-card-foot">
        <div class="news-card-meta">
          <span class="topic">${escapeHtml(window.TnewsUi?.topicLabel?.(article.topicKey) || article.topic || t("topicGeneral"))}</span>
          <span class="source">${escapeHtml(displaySource(article))}</span>
        </div>
        <button type="button" class="share-article-btn" data-share-index="${index}" title="${escapeHtml(t("shareArticle"))}">↗</button>
      </div>
      <div class="news-card-actions">
        <button type="button" class="ai-analyze-btn" data-analyze-index="${index}">${escapeHtml(window.TnewsSummaryLanguage?.getAnalyzeBtnLabel?.() || "✨")}</button>
        <button type="button" class="ai-open-link-btn" data-open-index="${index}">${escapeHtml(t("openSource"))}</button>
      </div>
      <p class="news-card-hint">${escapeHtml(t("cardHint"))}</p>
    </article>`;
    })
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
        statusEl.textContent = t("shareFailed");
        setTimeout(updateStatusLine, 2000);
      }
    });
  });
}

function applyPayload(payload) {
  if (!payload?.articles?.length) {
    articles = [];
    statusEl.textContent = t("noNewsRefresh");
    renderNewsList();
    return;
  }

  articles = payload.articles.map((a) => ({ ...a, uiDisplay: undefined }));
  selectedIndex = null;
  lastFetchedAt = payload.fetchedAt || null;
  newsStale = Boolean(payload.stale);
  updateStatusLine();
  renderNewsList();
  scheduleCardTranslations();
  if (window.tnewsWidget?.syncToHomeScreenWidget) {
    window.tnewsWidget.syncToHomeScreenWidget();
  }
}

async function loadNews(forceRefresh = false) {
  statusEl.textContent = t("statusUpdating");
  articleCountEl.textContent = "";
  try {
    if (!window.tnewsWidget) {
      statusEl.textContent = t("appError");
      return;
    }
    const payload = forceRefresh
      ? await window.tnewsWidget.refreshNews({ force: true })
      : await window.tnewsWidget.loadNews();
    if (payload?.articles?.length) {
      applyPayload(payload);
    } else {
      articles = [];
      const detail =
        payload?.loadedFeeds != null ? t("sourcesCount", { n: payload.loadedFeeds }) : "";
      statusEl.textContent = `${t("noNewsInternet")}${detail}`;
      renderNewsList();
    }
  } catch (err) {
    statusEl.textContent = t("updateFailed");
    console.error("loadNews failed", err);
  }
}

refreshBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  loadNews(true);
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
    statusEl.textContent = t("shareFailed");
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

aiRetryBtn?.addEventListener("click", () => {
  if (aiPanelArticle) runArticleSummary(aiPanelArticle);
});

(async function init() {
  try {
    window.TnewsUi?.applyDocumentLocale?.();
    initTheme();
    initUiLangBar();
    initSummaryLangBar();
    applyStaticUi();
    if (window.TnewsNotifications?.init) {
      window.TnewsNotifications.init().catch(() => {});
      updateNotifyButton();
    }
    if (!window.tnewsWidget) {
      statusEl.textContent = t("loadError");
      return;
    }
    window.tnewsWidget.onNewsUpdated((payload) => {
      applyPayload(payload);
    });
    statusTimer = setInterval(updateStatusLine, 30000);
    await loadNews();
    loadWeather().catch(() => {});
  } catch (err) {
    statusEl.textContent = t("initFailed");
    console.error("init failed", err);
  }
})();
