(function () {
  const STORAGE_KEY = "tnews-country";

  const PICKER_LABELS = {
    ar: {
      pickTitle: "اختر بلدك",
      pickHint: "الأخبار والطقس والملخصات حسب البلد الذي تختاره",
      continue: "متابعة",
    },
    en: {
      pickTitle: "Choose your country",
      pickHint: "News, weather, and summaries for your region",
      continue: "Continue",
    },
    fr: {
      pickTitle: "Choisissez votre pays",
      pickHint: "Actualités, météo et résumés selon le pays",
      continue: "Continuer",
    },
    tn: {
      pickTitle: "اختار بلدك",
      pickHint: "الأخبار والطقس على حسب البلد",
      continue: "كمّل",
    },
  };

  const AR_TOPICS = {
    sport: "رياضة",
    economy: "اقتصاد",
    politics: "سياسة",
    culture: "ثقافة",
    world: "عالمي",
    local: "محلي",
    general: "عام",
  };

  function arLabels(nameAr, nameEn, nameFr, nameTn) {
    return {
      ar: { name: nameAr, ...PICKER_LABELS.ar },
      en: { name: nameEn, ...PICKER_LABELS.en },
      fr: { name: nameFr, ...PICKER_LABELS.fr },
      tn: { name: nameTn || nameAr, ...PICKER_LABELS.tn },
    };
  }

  const COUNTRIES = {
    tn: {
      id: "tn",
      flag: "🇹🇳",
      brand: "Tnews",
      share: { accent: "#34d399", accentSoft: "#0ea5e9" },
      defaultUiLang: "ar",
      pageDir: "rtl",
      order: 1,
      localPatterns: [/tunisi/i, /tunis\b/i, /تونس/i, /صفاقس/i],
      weather: {
        lat: 36.8065,
        lon: 10.1815,
        timezone: "Africa/Tunis",
        city: { ar: "تونس", en: "Tunis", fr: "Tunis", tn: "تونس" },
      },
      topics: { ...AR_TOPICS, local: "تونس" },
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
      labels: arLabels("تونس", "Tunisia", "Tunisie", "تونس"),
    },
    dz: {
      id: "dz",
      flag: "🇩🇿",
      brand: "Anews",
      share: { accent: "#16a34a", accentSoft: "#dc2626" },
      defaultUiLang: "ar",
      pageDir: "rtl",
      order: 2,
      localPatterns: [/algéri/i, /alger/i, /جزائر/i, /الجزائر/i],
      weather: {
        lat: 36.7538,
        lon: 3.0588,
        timezone: "Africa/Algiers",
        city: { ar: "الجزائر", en: "Algiers", fr: "Alger", tn: "الجزائر" },
      },
      topics: { ...AR_TOPICS, local: "الجزائر" },
      feeds: [
        { id: "tsa-dz", label: "TSA", url: "https://www.tsa-algerie.com/feed/", locale: "ar", priority: true, independent: true },
        { id: "elwatan", label: "El Watan", url: "https://www.elwatan.com/feed/", locale: "ar", priority: true, independent: false },
        { id: "aps-dz", label: "APS", url: "https://www.aps.dz/ar/rss", locale: "ar", priority: false, independent: false },
        { id: "liberte-dz", label: "Liberté", url: "https://www.liberte-algerie.com/feed/", locale: "fr", priority: false, independent: true },
        { id: "echorouk", label: "Echourouk", url: "https://www.echoroukonline.com/feed", locale: "ar", priority: false, independent: false },
      ],
      labels: arLabels("الجزائر", "Algeria", "Algérie", "الجزائر"),
    },
    ma: {
      id: "ma",
      flag: "🇲🇦",
      brand: "Mnews",
      share: { accent: "#b91c1c", accentSoft: "#15803d" },
      defaultUiLang: "ar",
      pageDir: "rtl",
      order: 3,
      localPatterns: [/maroc/i, /morocco/i, /المغرب/i, /مغرب/i, /الرباط/i, /الدار البيضاء/i],
      weather: {
        lat: 34.0209,
        lon: -6.8416,
        timezone: "Africa/Casablanca",
        city: { ar: "الرباط", en: "Rabat", fr: "Rabat", tn: "الرباط" },
      },
      topics: { ...AR_TOPICS, local: "المغرب" },
      feeds: [
        { id: "hespress", label: "Hespress", url: "https://www.hespress.com/feed", locale: "ar", priority: true, independent: true },
        { id: "yabiladi", label: "Yabiladi", url: "https://www.yabiladi.com/rss/articles_rss.xml", locale: "ar", priority: true, independent: true },
        { id: "lavieeco", label: "La Vie éco", url: "https://www.lavieeco.com/feed/", locale: "fr", priority: false, independent: false },
        { id: "aujourdhui", label: "Aujourd'hui Le Maroc", url: "https://aujourdhui.ma/feed", locale: "ar", priority: false, independent: false },
        { id: "medias24", label: "Medias24", url: "https://www.medias24.com/feed/", locale: "fr", priority: false, independent: true },
      ],
      labels: arLabels("المغرب", "Morocco", "Maroc", "المغرب"),
    },
    eg: {
      id: "eg",
      flag: "🇪🇬",
      brand: "Enews",
      defaultUiLang: "ar",
      pageDir: "rtl",
      order: 4,
      localPatterns: [/égypt/i, /egypt/i, /مصر/i, /القاهرة/i],
      weather: {
        lat: 30.0444,
        lon: 31.2357,
        timezone: "Africa/Cairo",
        city: { ar: "القاهرة", en: "Cairo", fr: "Le Caire", tn: "القاهرة" },
      },
      topics: { ...AR_TOPICS, local: "مصر" },
      feeds: [
        { id: "youm7", label: "اليوم السابع", url: "https://www.youm7.com/rss/SectionRss", locale: "ar", priority: true, independent: false },
        { id: "masrawy", label: "Masrawy", url: "https://www.masrawy.com/rss/rssfeed", locale: "ar", priority: true, independent: false },
        { id: "ahram", label: "Al-Ahram", url: "https://english.ahram.org.eg/Feed/News.aspx", locale: "en", priority: false, independent: false },
        { id: "dotmsr", label: "Dotmsr", url: "https://www.dotmsr.com/rss", locale: "ar", priority: false, independent: true },
        { id: "cairo24", label: "Cairo 24", url: "https://www.cairo24.com/rss", locale: "ar", priority: false, independent: false },
      ],
      labels: arLabels("مصر", "Egypt", "Égypte", "مصر"),
    },
    lb: {
      id: "lb",
      flag: "🇱🇧",
      brand: "Lnews",
      share: { accent: "#7c3aed", accentSoft: "#059669" },
      defaultUiLang: "ar",
      pageDir: "rtl",
      order: 5,
      localPatterns: [/leban/i, /liban/i, /لبنان/i, /بيروت/i],
      weather: {
        lat: 33.8938,
        lon: 35.5018,
        timezone: "Asia/Beirut",
        city: { ar: "بيروت", en: "Beirut", fr: "Beyrouth", tn: "بيروت" },
      },
      topics: { ...AR_TOPICS, local: "لبنان" },
      feeds: [
        { id: "naharnet", label: "Naharnet", url: "https://www.naharnet.com/rss/lebanon", locale: "en", priority: true, independent: false },
        { id: "lorient-lb", label: "L'Orient-Le Jour", url: "https://www.lorientlejour.com/rss", locale: "fr", priority: true, independent: true },
        { id: "annahar", label: "Annahar", url: "https://www.annahar.com/rss", locale: "ar", priority: false, independent: false },
        { id: "mtv-lb", label: "MTV Lebanon", url: "https://www.mtv.com.lb/rss", locale: "ar", priority: false, independent: false },
        { id: "lorient-today", label: "L'Orient Today", url: "https://today.lorientlejour.com/rss", locale: "en", priority: false, independent: true },
      ],
      labels: arLabels("لبنان", "Lebanon", "Liban", "لبنان"),
    },
    fr: {
      id: "fr",
      flag: "🇫🇷",
      brand: "Fnews",
      share: { accent: "#2563eb", accentSoft: "#dc2626" },
      defaultUiLang: "fr",
      pageDir: "ltr",
      order: 6,
      localPatterns: [/france/i, /français/i, /paris\b/i, /france\b/i],
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
        local: "France",
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
      labels: arLabels("فرنسا", "France", "France", "فرنسا"),
    },
  };

  const COUNTRY_ORDER = ["tn", "dz", "ma", "eg", "lb", "fr"];

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
    return COUNTRY_ORDER.map((id) => COUNTRIES[id]).filter(Boolean);
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
      for (const id of COUNTRY_ORDER) {
        localStorage.removeItem(`tnews-news-cache-${id}`);
      }
      localStorage.removeItem("tnews-news-cache");
    } catch {
      /* ignore */
    }
  }

  function clearWeatherCache() {
    try {
      for (const id of COUNTRY_ORDER) {
        localStorage.removeItem(`tnews-weather-cache-${id}`);
      }
      localStorage.removeItem("tnews-weather-cache");
    } catch {
      /* ignore */
    }
  }

  window.TnewsCountries = {
    COUNTRIES,
    COUNTRY_ORDER,
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
