(function () {
  const STORAGE_KEY = "tnews-country";

  const COUNTRIES = {
    tn: {
      id: "tn",
      flag: "🇹🇳",
      brand: "Tnews",
      defaultUiLang: "ar",
      pageDir: "rtl",
      weather: {
        lat: 36.8065,
        lon: 10.1815,
        timezone: "Africa/Tunis",
        city: { ar: "تونس", en: "Tunis", fr: "Tunis", tn: "تونس" },
      },
      topics: {
        sport: "رياضة",
        economy: "اقتصاد",
        politics: "سياسة",
        culture: "ثقافة",
        world: "عالمي",
        tunisia: "تونس",
        general: "عام",
      },
      feeds: [
        { id: "nawaat", label: "نواة — Nawaat", url: "https://nawaat.org/feed/", locale: "ar", priority: true, independent: true },
        { id: "alqatiba", label: "الكتيبة — Al Katiba", url: "https://alqatiba.com/feed/", locale: "ar", priority: true, independent: true },
        { id: "tap-tn-ar", label: "TAP", url: "https://www.tap.info.tn/ar/rss/tunisia", locale: "ar", priority: false, independent: false },
        { id: "lapresse-tn-ar", label: "La Presse", url: "https://www.lapresse.tn/feed/", locale: "ar", priority: false, independent: false },
        { id: "shemsfm", label: "شمس FM", url: "https://www.shemsfm.net/feed/", locale: "ar", priority: false, independent: false },
        { id: "diwanfm", label: "ديوان FM", url: "https://diwanfm.net/feed/", locale: "ar", priority: false, independent: false },
        { id: "mosaique-ar", label: "موزاييك", url: "https://www.mosaiquefm.net/ar/rss/", locale: "ar", priority: false, independent: false },
        { id: "businessnews", label: "Business News", url: "https://www.businessnews.com.tn/rss", locale: "fr", priority: false, independent: false },
        { id: "webdo-fr", label: "Webdo.tn", url: "https://www.webdo.tn/feed/", locale: "fr", priority: false, independent: false },
      ],
      labels: {
        ar: { name: "تونس", pickTitle: "اختر بلدك", pickHint: "الأخبار والطقس والملخصات حسب البلد", continue: "متابعة" },
        en: { name: "Tunisia", pickTitle: "Choose your country", pickHint: "News, weather, and summaries for your region", continue: "Continue" },
        fr: { name: "Tunisie", pickTitle: "Choisissez votre pays", pickHint: "Actualités, météo et résumés selon le pays", continue: "Continuer" },
        tn: { name: "تونس", pickTitle: "اختار بلدك", pickHint: "الأخبار والطقس على حسب البلد", continue: "كمّل" },
      },
    },
    fr: {
      id: "fr",
      flag: "🇫🇷",
      brand: "Fnews",
      defaultUiLang: "fr",
      pageDir: "ltr",
      weather: {
        lat: 48.8566,
        lon: 2.3522,
        timezone: "Europe/Paris",
        city: { ar: "باريس", en: "Paris", fr: "Paris", tn: "باريس" },
      },
      topics: {
        sport: "Sport",
        economy: "Économie",
        politics: "Politique",
        culture: "Culture",
        world: "International",
        tunisia: "France",
        general: "Général",
      },
      feeds: [
        { id: "lemonde", label: "Le Monde", url: "https://www.lemonde.fr/rss/une.xml", locale: "fr", priority: true, independent: true },
        { id: "franceinfo", label: "France Info", url: "https://www.francetvinfo.fr/titres.rss", locale: "fr", priority: true, independent: false },
        { id: "rfi", label: "RFI", url: "https://www.rfi.fr/fr/rss", locale: "fr", priority: false, independent: true },
        { id: "liberation", label: "Libération", url: "https://www.liberation.fr/arc/outboundfeeds/rss/", locale: "fr", priority: false, independent: true },
        { id: "lefigaro", label: "Le Figaro", url: "https://www.lefigaro.fr/rss/figaro_actualites.xml", locale: "fr", priority: false, independent: false },
        { id: "france24-fr", label: "France 24", url: "https://www.france24.com/fr/france/rss", locale: "fr", priority: false, independent: false },
        { id: "20minutes", label: "20 Minutes", url: "https://www.20minutes.fr/rss/une.xml", locale: "fr", priority: false, independent: false },
      ],
      labels: {
        ar: { name: "فرنسا", pickTitle: "اختر بلدك", pickHint: "الأخبار والطقس والملخصات حسب البلد", continue: "متابعة" },
        en: { name: "France", pickTitle: "Choose your country", pickHint: "News, weather, and summaries for your region", continue: "Continue" },
        fr: { name: "France", pickTitle: "Choisissez votre pays", pickHint: "Actualités, météo et résumés selon le pays", continue: "Continuer" },
        tn: { name: "فرنسا", pickTitle: "اختار بلدك", pickHint: "الأخبار والطقس على حسب البلد", continue: "كمّل" },
      },
    },
  };

  function getSelectedId() {
    const id = localStorage.getItem(STORAGE_KEY);
    return COUNTRIES[id] ? id : null;
  }

  function getCurrent() {
    const id = getSelectedId();
    return id ? COUNTRIES[id] : null;
  }

  function setSelected(id) {
    if (!COUNTRIES[id]) return false;
    localStorage.setItem(STORAGE_KEY, id);
    applyBranding(COUNTRIES[id]);
    return true;
  }

  function list() {
    return Object.values(COUNTRIES);
  }

  function label(country, uiLang) {
    const lang = uiLang || window.TnewsUi?.getUiLangId?.() || country.defaultUiLang;
    return country.labels[lang] || country.labels[country.defaultUiLang] || country.labels.en;
  }

  function applyBranding(country) {
    const c = country || getCurrent();
    if (!c) return;

    document.documentElement.setAttribute("data-country", c.id);
    document.title = c.brand;

    const titleEl = document.getElementById("app-brand");
    if (titleEl) {
      titleEl.textContent = `${c.flag} ${c.brand}`;
    }
  }

  function clearNewsCache() {
    try {
      for (const id of Object.keys(COUNTRIES)) {
        localStorage.removeItem(`tnews-news-cache-${id}`);
      }
      localStorage.removeItem("tnews-news-cache");
    } catch {
      /* ignore */
    }
  }

  function clearWeatherCache() {
    try {
      for (const id of Object.keys(COUNTRIES)) {
        localStorage.removeItem(`tnews-weather-cache-${id}`);
      }
      localStorage.removeItem("tnews-weather-cache");
    } catch {
      /* ignore */
    }
  }

  window.TnewsCountries = {
    COUNTRIES,
    getSelectedId,
    getCurrent,
    setSelected,
    list,
    label,
    applyBranding,
    clearNewsCache,
    clearWeatherCache,
  };
})();
