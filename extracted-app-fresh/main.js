const { app, BrowserWindow, Tray, Menu, shell, ipcMain, screen, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs/promises");
const { fetchNewsArticles } = require("./lib/newsFetcher.cjs");

const APP_ID = "tn.tnews.widget";
const CONFIG_NAME = "config.json";

let configPath = "";
let config = {};
let mainWindow = null;
let tray = null;
let refreshTimer = null;
let isRefreshing = false;

async function refreshAndPush() {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    const payload = await refreshNewsCache();
    if (mainWindow && payload) {
      mainWindow.webContents.send("news-updated", payload);
    }
  } finally {
    isRefreshing = false;
  }
}

function appIconPath() {
  const ico = path.join(__dirname, "assets", "icon.ico");
  const png = path.join(__dirname, "assets", "icon.png");
  return require("fs").existsSync(ico) ? ico : png;
}

async function ensureConfig() {
  if (app.isPackaged) {
    configPath = path.join(app.getPath("userData"), CONFIG_NAME);
    try {
      await fs.access(configPath);
    } catch {
      const bundled = await fs.readFile(path.join(__dirname, CONFIG_NAME), "utf8");
      await fs.writeFile(configPath, bundled, "utf8");
    }
  } else {
    configPath = path.join(__dirname, CONFIG_NAME);
  }
}

async function loadConfig() {
  await ensureConfig();
  const raw = await fs.readFile(configPath, "utf8");
  config = JSON.parse(raw);
  return config;
}

function resolveDataPath(relativeOrAbsolute) {
  if (!relativeOrAbsolute) return "";
  if (path.isAbsolute(relativeOrAbsolute)) return relativeOrAbsolute;
  const base = app.isPackaged ? app.getPath("userData") : __dirname;
  return path.join(base, relativeOrAbsolute);
}

async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function fetchFromApi(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function isWithinDays(pubDate, days) {
  if (!pubDate) return false;
  const ts = Date.parse(pubDate);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= days * 24 * 60 * 60 * 1000;
}

function filterWeekArticles(list) {
  const maxAgeDays = config.maxAgeDays ?? 7;
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
    maxAgeDays: config.maxAgeDays ?? 7,
  };
}

async function getStoredNews() {
  const cachePath = resolveDataPath(config.localCachePath);
  const tnewsPath = config.tnewsDataPath ? resolveDataPath(config.tnewsDataPath) : "";
  const paths = [cachePath, tnewsPath].filter(Boolean);
  for (const filePath of paths) {
    const data = await readJsonIfExists(filePath);
    if (data?.articles?.length) return normalizePayload(data);
  }
  return null;
}

async function refreshNewsCache() {
  const cachePath = resolveDataPath(config.localCachePath);
  const maxAgeDays = config.maxAgeDays ?? 7;

  let rssPayload = null;
  try {
    rssPayload = await Promise.race([
      fetchNewsArticles(maxAgeDays),
      new Promise((resolve) => setTimeout(() => resolve(null), 30000)),
    ]);
  } catch {
    rssPayload = null;
  }

  let apiPayload = null;
  if (config.tnewsApiUrl) {
    try {
      apiPayload = await Promise.race([
        fetchFromApi(config.tnewsApiUrl),
        new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
      ]);
    } catch {
      apiPayload = null;
    }
  }

  let payload = pickFreshestPayload(rssPayload, apiPayload);

  if (!payload?.articles?.length) {
    payload = await getStoredNews();
  }

  if (payload?.articles?.length) {
    payload = normalizePayload(payload);
    payload.fetchedAt = new Date().toISOString();
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(payload, null, 2), "utf8");
  }

  return payload;
}

function pickFreshestPayload(a, b) {
  const score = (payload) => {
    if (!payload?.articles?.length) return -1;
    const newest = payload.articles.reduce((max, article) => {
      const ts = article.pubDate ? Date.parse(article.pubDate) : 0;
      return ts > max ? ts : max;
    }, 0);
    return newest;
  };

  const scoreA = score(a);
  const scoreB = score(b);
  if (scoreA >= scoreB && scoreA > 0) return a;
  if (scoreB > 0) return b;
  return a?.articles?.length ? a : b;
}

function windowPosition() {
  const { width, height, marginRight = 24, marginBottom = 24 } = config.window;
  const { workArea } = screen.getPrimaryDisplay();
  return {
    x: workArea.x + workArea.width - width - marginRight,
    y: workArea.y + workArea.height - height - marginBottom,
    width,
    height,
  };
}

function lockWindowSize() {
  if (!mainWindow) return;
  const { width, height } = config.window;
  mainWindow.setMinimumSize(width, height);
  mainWindow.setMaximumSize(width, height);
  mainWindow.setBounds(
    {
      ...mainWindow.getBounds(),
      width,
      height,
    },
    false,
  );
}

function createWindow() {
  const bounds = windowPosition();
  const { width, height } = config.window;

  mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width,
    height,
    icon: appIconPath(),
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    thickFrame: false,
    hasShadow: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      zoomFactor: 1,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));
  mainWindow.setAlwaysOnTop(true, "floating");
  lockWindowSize();

  mainWindow.webContents.setVisualZoomLevelLimits(1, 1);
  mainWindow.webContents.setZoomFactor(1);

  mainWindow.on("will-resize", (event) => {
    event.preventDefault();
  });

  mainWindow.on("resize", () => {
    lockWindowSize();
  });

  mainWindow.on("focus", () => {
    lockWindowSize();
  });

  mainWindow.webContents.on("did-finish-load", () => {
    lockWindowSize();
    refreshAndPush();
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  let icon = nativeImage.createFromPath(appIconPath());
  if (icon.isEmpty()) {
    icon = nativeImage.createFromPath(path.join(__dirname, "assets", "tray-icon.png"));
  }
  icon = icon.resize({ width: 16, height: 16 });

  tray = new Tray(icon);
  tray.setToolTip("Tnews Widget");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show widget",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: "Refresh news",
      click: async () => {
        await refreshAndPush();
      },
    },
    { type: "separator" },
    {
      label: "Open Tnews",
      click: () => shell.openExternal("http://localhost:3000"),
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

function scheduleRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  const minutes = config.refreshMinutes || 3;
  refreshTimer = setInterval(refreshAndPush, minutes * 60 * 1000);
}

ipcMain.handle("get-config", () => ({
  rotateSeconds: config.rotateSeconds || 8,
  window: config.window || { width: 520, height: 220 },
}));

ipcMain.handle("load-news", async () => {
  const cached = await getStoredNews();
  if (cached?.articles?.length) {
    refreshAndPush();
    return cached;
  }
  return refreshNewsCache();
});

ipcMain.handle("open-link", (_event, url) => {
  if (typeof url === "string" && /^https?:\/\//i.test(url)) {
    shell.openExternal(url);
  }
});

ipcMain.on("window-minimize", () => mainWindow?.hide());

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      mainWindow.webContents.reloadIgnoringCache();
      lockWindowSize();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    if (process.platform === "win32") {
      app.setAppUserModelId(APP_ID);
    }
    await loadConfig();
    createWindow();
    createTray();
    scheduleRefresh();
  });

  app.on("before-quit", () => {
    app.isQuitting = true;
  });

  app.on("window-all-closed", (event) => {
    event.preventDefault();
  });
}
