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

  const EN_TOPICS = {
    sport: "Sport",
    economy: "Economy",
    politics: "Politics",
    culture: "Culture",
    world: "World",
    local: "Local",
    general: "General",
  };

  const ES_TOPICS = {
    sport: "Deportes",
    economy: "Economía",
    politics: "Política",
    culture: "Cultura",
    world: "Internacional",
    local: "España",
    general: "General",
  };

  const DE_TOPICS = {
    sport: "Sport",
    economy: "Wirtschaft",
    politics: "Politik",
    culture: "Kultur",
    world: "International",
    local: "Deutschland",
    general: "Allgemein",
  };

  const TR_TOPICS = {
    sport: "Spor",
    economy: "Ekonomi",
    politics: "Politika",
    culture: "Kültür",
    world: "Dünya",
    local: "Türkiye",
    general: "Genel",
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
      share: { accent: "#ca8a04", accentSoft: "#1d4ed8" },
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
    sa: {
      id: "sa",
      flag: "🇸🇦",
      brand: "Sanews",
      share: { accent: "#15803d", accentSoft: "#ca8a04" },
      defaultUiLang: "ar",
      pageDir: "rtl",
      order: 7,
      localPatterns: [/saudi/i, /arabie saoudite/i, /السعودية/i, /الرياض/i, /جدة/i],
      weather: {
        lat: 24.7136,
        lon: 46.6753,
        timezone: "Asia/Riyadh",
        city: { ar: "الرياض", en: "Riyadh", fr: "Riyad", tn: "الرياض" },
      },
      topics: { ...AR_TOPICS, local: "السعودية" },
      feeds: [
        { id: "aawsat-sa", label: "Asharq Al-Awsat", url: "https://english.aawsat.com/feed", locale: "ar", priority: true, independent: true },
        { id: "arabnews-sa", label: "Arab News", url: "https://www.arabnews.com/rss.xml", locale: "en", priority: true, independent: false },
        { id: "saudigazette", label: "Saudi Gazette", url: "https://saudigazette.com.sa/feed", locale: "en", priority: false, independent: false },
      ],
      labels: arLabels("السعودية", "Saudi Arabia", "Arabie saoudite", "السعودية"),
    },
    ae: {
      id: "ae",
      flag: "🇦🇪",
      brand: "Unews",
      share: { accent: "#0d9488", accentSoft: "#b45309" },
      defaultUiLang: "en",
      pageDir: "ltr",
      order: 8,
      localPatterns: [/émirats/i, /emirates/i, /الإمارات/i, /دبي/i, /أبوظبي/i],
      weather: {
        lat: 25.2048,
        lon: 55.2708,
        timezone: "Asia/Dubai",
        city: { ar: "دبي", en: "Dubai", fr: "Dubaï", tn: "دبي" },
      },
      topics: { ...EN_TOPICS, local: "UAE" },
      feeds: [
        { id: "emirates247", label: "Emirates 24/7", url: "https://www.emirates247.com/rss/", locale: "en", priority: true, independent: false },
        { id: "gulfnews-ae", label: "Gulf News", url: "https://gulfnews.com/rss.xml", locale: "en", priority: true, independent: false },
        { id: "zawya-ae", label: "Zawya", url: "https://www.zawya.com/en/rss", locale: "en", priority: false, independent: false },
      ],
      labels: arLabels("الإمارات", "UAE", "Émirats", "الإمارات"),
    },
    jo: {
      id: "jo",
      flag: "🇯🇴",
      brand: "Jnews",
      share: { accent: "#059669", accentSoft: "#b91c1c" },
      defaultUiLang: "ar",
      pageDir: "rtl",
      order: 9,
      localPatterns: [/jordan/i, /jordanie/i, /الأردن/i, /عمان\b/i],
      weather: {
        lat: 31.9454,
        lon: 35.9284,
        timezone: "Asia/Amman",
        city: { ar: "عمان", en: "Amman", fr: "Amman", tn: "عمان" },
      },
      topics: { ...AR_TOPICS, local: "الأردن" },
      feeds: [
        { id: "jo24", label: "Jo24", url: "https://www.jo24.net/feed", locale: "ar", priority: true, independent: true },
        { id: "petra-jo", label: "Petra", url: "https://petra.gov.jo/rss.aspx?lang=ar", locale: "ar", priority: true, independent: false },
        { id: "ammon-jo", label: "Ammon News", url: "https://www.ammonnews.net/rss.xml", locale: "ar", priority: false, independent: true },
      ],
      labels: arLabels("الأردن", "Jordan", "Jordanie", "الأردن"),
    },
    iq: {
      id: "iq",
      flag: "🇮🇶",
      brand: "Inews",
      share: { accent: "#dc2626", accentSoft: "#1d4ed8" },
      defaultUiLang: "ar",
      pageDir: "rtl",
      order: 10,
      localPatterns: [/iraq/i, /irak/i, /العراق/i, /بغداد/i],
      weather: {
        lat: 33.3152,
        lon: 44.3661,
        timezone: "Asia/Baghdad",
        city: { ar: "بغداد", en: "Baghdad", fr: "Bagdad", tn: "بغداد" },
      },
      topics: { ...AR_TOPICS, local: "العراق" },
      feeds: [
        { id: "iraqinews", label: "Iraqi News", url: "https://www.iraqinews.com/feed/", locale: "ar", priority: true, independent: true },
        { id: "rudaw-iq", label: "Rudaw", url: "https://www.rudaw.net/rss", locale: "en", priority: true, independent: true },
        { id: "baghdad-today", label: "Baghdad Today", url: "https://www.baghdad.today/feed/", locale: "ar", priority: false, independent: true },
      ],
      labels: arLabels("العراق", "Iraq", "Irak", "العراق"),
    },
    ly: {
      id: "ly",
      flag: "🇱🇾",
      brand: "Bnews",
      share: { accent: "#eab308", accentSoft: "#16a34a" },
      defaultUiLang: "ar",
      pageDir: "rtl",
      order: 11,
      localPatterns: [/liby/i, /libye/i, /ليبيا/i, /طرابلس/i],
      weather: {
        lat: 32.8872,
        lon: 13.1913,
        timezone: "Africa/Tripoli",
        city: { ar: "طرابلس", en: "Tripoli", fr: "Tripoli", tn: "طرابلس" },
      },
      topics: { ...AR_TOPICS, local: "ليبيا" },
      feeds: [
        { id: "libyaherald", label: "Libya Herald", url: "https://www.libyaherald.com/feed/", locale: "en", priority: true, independent: true },
        { id: "libya24", label: "Libya 24", url: "https://libya24.tv/feed/", locale: "ar", priority: true, independent: true },
        { id: "almarsad-ly", label: "Al Marsad", url: "https://almarsad.co/feed/", locale: "ar", priority: false, independent: true },
      ],
      labels: arLabels("ليبيا", "Libya", "Libye", "ليبيا"),
    },
    es: {
      id: "es",
      flag: "🇪🇸",
      brand: "Esnews",
      share: { accent: "#ea580c", accentSoft: "#b91c1c" },
      defaultUiLang: "fr",
      pageDir: "ltr",
      order: 12,
      localPatterns: [/españa/i, /spain/i, /madrid/i, /barcelona/i],
      weather: {
        lat: 40.4168,
        lon: -3.7038,
        timezone: "Europe/Madrid",
        city: { ar: "مدريد", en: "Madrid", fr: "Madrid", tn: "مدريد" },
      },
      topics: ES_TOPICS,
      feeds: [
        { id: "elpais", label: "El País", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada", locale: "es", priority: true, independent: true },
        { id: "elmundo", label: "El Mundo", url: "https://www.elmundo.es/rss/index.xml", locale: "es", priority: true, independent: false },
        { id: "abc-es", label: "ABC", url: "https://www.abc.es/rss/feeds/abc_ultima.xml", locale: "es", priority: false, independent: false },
      ],
      labels: arLabels("إسبانيا", "Spain", "Espagne", "إسبانيا"),
    },
    it: {
      id: "it",
      flag: "🇮🇹",
      brand: "Itnews",
      share: { accent: "#16a34a", accentSoft: "#dc2626" },
      defaultUiLang: "en",
      pageDir: "ltr",
      order: 13,
      localPatterns: [/ital/i, /rome\b/i, /roma\b/i, /milano/i],
      weather: {
        lat: 41.9028,
        lon: 12.4964,
        timezone: "Europe/Rome",
        city: { ar: "روما", en: "Rome", fr: "Rome", tn: "روما" },
      },
      topics: {
        sport: "Sport",
        economy: "Economia",
        politics: "Politica",
        culture: "Cultura",
        world: "Mondo",
        local: "Italia",
        general: "Generale",
      },
      feeds: [
        { id: "ansa", label: "ANSA", url: "https://www.ansa.it/sito/notizie/topnews/topnews_rss.xml", locale: "it", priority: true, independent: false },
        { id: "repubblica", label: "La Repubblica", url: "https://www.repubblica.it/rss/homepage/rss2.0.xml", locale: "it", priority: true, independent: true },
        { id: "corriere", label: "Corriere", url: "https://xml2.corriereobjects.it/rss/homepage.xml", locale: "it", priority: false, independent: false },
      ],
      labels: arLabels("إيطاليا", "Italy", "Italie", "إيطاليا"),
    },
    de: {
      id: "de",
      flag: "🇩🇪",
      brand: "Gnews",
      share: { accent: "#fbbf24", accentSoft: "#1f2937" },
      defaultUiLang: "de",
      pageDir: "ltr",
      order: 14,
      localPatterns: [/deutsch/i, /german/i, /allemagne/i, /berlin/i],
      weather: {
        lat: 52.52,
        lon: 13.405,
        timezone: "Europe/Berlin",
        city: { ar: "برلين", en: "Berlin", fr: "Berlin", tn: "برلين" },
      },
      topics: DE_TOPICS,
      feeds: [
        { id: "tagesschau", label: "Tagesschau", url: "https://www.tagesschau.de/xml/rss2", locale: "de", priority: true, independent: false },
        { id: "spiegel", label: "Der Spiegel", url: "https://www.spiegel.de/schlagzeilen/index.rss", locale: "de", priority: true, independent: true },
        { id: "dw-de", label: "DW", url: "https://rss.dw.com/rdf/rss-de-news", locale: "de", priority: false, independent: true },
      ],
      labels: arLabels("ألمانيا", "Germany", "Allemagne", "ألمانيا"),
    },
    us: {
      id: "us",
      flag: "🇺🇸",
      brand: "Wnews",
      share: { accent: "#2563eb", accentSoft: "#dc2626" },
      defaultUiLang: "en",
      pageDir: "ltr",
      order: 15,
      localPatterns: [/united states/i, /u\.s\./i, /america/i, /washington/i, /new york/i],
      weather: {
        lat: 38.9072,
        lon: -77.0369,
        timezone: "America/New_York",
        city: { ar: "واشنطن", en: "Washington", fr: "Washington", tn: "واشنطن" },
      },
      topics: { ...EN_TOPICS, local: "USA" },
      feeds: [
        { id: "npr", label: "NPR", url: "https://feeds.npr.org/1001/rss.xml", locale: "en", priority: true, independent: true },
        { id: "ap-us", label: "AP Top News", url: "https://apnews.com/apf-topnews", locale: "en", priority: false, independent: false },
        { id: "cnn-top", label: "CNN", url: "http://rss.cnn.com/rss/cnn_topstories.rss", locale: "en", priority: false, independent: false },
      ],
      labels: arLabels("الولايات المتحدة", "United States", "États-Unis", "أمريكا"),
    },
    tr: {
      id: "tr",
      flag: "🇹🇷",
      brand: "Trnews",
      share: { accent: "#dc2626", accentSoft: "#1d4ed8" },
      defaultUiLang: "en",
      pageDir: "ltr",
      order: 16,
      localPatterns: [/turk/i, /turquie/i, /تركيا/i, /إسطنبول/i, /istanbul/i],
      weather: {
        lat: 41.0082,
        lon: 28.9784,
        timezone: "Europe/Istanbul",
        city: { ar: "إسطنبول", en: "Istanbul", fr: "Istanbul", tn: "إسطنبول" },
      },
      topics: TR_TOPICS,
      feeds: [
        { id: "hurriyet-en", label: "Hürriyet Daily News", url: "https://www.hurriyetdailynews.com/rss", locale: "en", priority: true, independent: true },
        { id: "dailysabah", label: "Daily Sabah", url: "https://www.dailysabah.com/rss", locale: "en", priority: false, independent: false },
        { id: "trthaber", label: "TRT Haber", url: "https://www.trthaber.com/rss/sondakika.rss", locale: "tr", priority: false, independent: false },
      ],
      labels: arLabels("تركيا", "Turkey", "Turquie", "تركيا"),
    },
    ir: {
      id: "ir",
      flag: "🇮🇷",
      brand: "Irnews",
      share: { accent: "#16a34a", accentSoft: "#dc2626" },
      defaultUiLang: "ar",
      pageDir: "rtl",
      order: 17,
      localPatterns: [/iran/i, /téhéran/i, /tehran/i, /إيران/i, /طهران/i, /pers/i],
      weather: {
        lat: 35.6892,
        lon: 51.389,
        timezone: "Asia/Tehran",
        city: { ar: "طهران", en: "Tehran", fr: "Téhéran", tn: "طهران" },
      },
      topics: { ...AR_TOPICS, local: "إيران" },
      feeds: [
        {
          id: "fars",
          label: "Fars News",
          url: "https://www.farsnews.ir/rss/allnews",
          altUrls: [
            "https://farsnews.ir/rss",
            "https://www.farsnews.ir/rss",
            "https://www.farsnews.com/feed/",
            "https://www.farsnews.com/rss",
          ],
          locale: "ar",
          priority: true,
          independent: true,
        },
        {
          id: "tasnim",
          label: "Tasnim",
          url: "https://www.tasnimnews.com/fa/rss/feed/0/8/0/",
          altUrls: ["https://www.tasnimnews.com/fa/rss/feed/33/102/0/"],
          locale: "ar",
          priority: true,
          independent: true,
        },
        { id: "irna", label: "IRNA", url: "https://www.irna.ir/rss", locale: "ar", priority: false, independent: false },
        { id: "mehr", label: "Mehr News", url: "https://www.mehrnews.com/rss", locale: "ar", priority: false, independent: false },
      ],
      labels: arLabels("إيران", "Iran", "Iran", "إيران"),
    },
    ps: {
      id: "ps",
      flag: "🇵🇸",
      brand: "Palnews",
      share: { accent: "#15803d", accentSoft: "#b91c1c" },
      defaultUiLang: "ar",
      pageDir: "rtl",
      order: 18,
      localPatterns: [
        /palestin/i,
        /gaza/i,
        /west bank/i,
        /فلسطين/i,
        /غزة/i,
        /الضفة/i,
        /القدس/i,
        /jerusalem/i,
        /hebron/i,
        /ramallah/i,
        /bethlehem/i,
      ],
      weather: {
        lat: 31.9038,
        lon: 35.2034,
        timezone: "Asia/Hebron",
        city: { ar: "رام الله", en: "Ramallah", fr: "Ramallah", tn: "رام الله" },
      },
      topics: { ...AR_TOPICS, local: "فلسطين" },
      feeds: [
        {
          id: "mee-ps",
          label: "Middle East Monitor",
          url: "https://www.middleeastmonitor.com/feed/",
          locale: "en",
          priority: true,
          independent: true,
        },
        { id: "imemc-ps", label: "IMEMC", url: "https://imemc.org/rss", locale: "en", priority: true, independent: true },
        { id: "maannews-ps", label: "Ma'an News", url: "https://www.maannews.net/feed/", locale: "ar", priority: false, independent: true },
      ],
      labels: arLabels("فلسطين", "Palestine", "Palestine", "فلسطين"),
    },
    il: {
      id: "il",
      flag: "🇮🇱",
      brand: "Isnews",
      share: { accent: "#2563eb", accentSoft: "#1d4ed8" },
      defaultUiLang: "en",
      pageDir: "ltr",
      order: 19,
      localPatterns: [/israel/i, /israël/i, /إسرائيل/i, /tel aviv/i, /jerusalem/i, /القدس/i, /غزة/i],
      weather: {
        lat: 32.0853,
        lon: 34.7818,
        timezone: "Asia/Jerusalem",
        city: { ar: "تل أبيب", en: "Tel Aviv", fr: "Tel Aviv", tn: "تل أبيب" },
      },
      topics: { ...EN_TOPICS, local: "Israel" },
      feeds: [
        {
          id: "jpost",
          label: "Jerusalem Post",
          url: "https://www.jpost.com/rss/rssfeedsheadlines.aspx",
          locale: "en",
          priority: true,
          independent: false,
        },
        {
          id: "ynet",
          label: "Ynetnews",
          url: "https://www.ynetnews.com/Integration/StoryRss2.xml",
          locale: "en",
          priority: true,
          independent: false,
        },
        {
          id: "haaretz",
          label: "Haaretz",
          url: "https://www.haaretz.com/srv/rss-israel-news",
          locale: "en",
          priority: false,
          independent: true,
        },
      ],
      labels: arLabels("إسرائيل", "Israel", "Israël", "إسرائيل"),
    },
    sy: {
      id: "sy",
      flag: "🇸🇾",
      brand: "Snews",
      share: { accent: "#1d4ed8", accentSoft: "#dc2626" },
      defaultUiLang: "ar",
      pageDir: "rtl",
      order: 20,
      localPatterns: [/syri/i, /syrie/i, /سوريا/i, /دمشق/i],
      weather: {
        lat: 33.5138,
        lon: 36.2765,
        timezone: "Asia/Damascus",
        city: { ar: "دمشق", en: "Damascus", fr: "Damas", tn: "دمشق" },
      },
      topics: { ...AR_TOPICS, local: "سوريا" },
      feeds: [
        { id: "sana-ar", label: "SANA", url: "https://sana.sy/?feed=rss2", locale: "ar", priority: true, independent: false },
        { id: "sana-en", label: "SANA English", url: "https://sana.sy/en/?feed=rss2", locale: "en", priority: true, independent: false },
        { id: "syria-news", label: "Syria News", url: "https://syria.news/feed/", locale: "ar", priority: false, independent: true },
      ],
      labels: arLabels("سوريا", "Syria", "Syrie", "سوريا"),
    },
    ye: {
      id: "ye",
      flag: "🇾🇪",
      brand: "Ynews",
      share: { accent: "#b91c1c", accentSoft: "#ca8a04" },
      defaultUiLang: "ar",
      pageDir: "rtl",
      order: 21,
      localPatterns: [/yemen/i, /yémen/i, /اليمن/i, /صنعاء/i],
      weather: {
        lat: 15.3694,
        lon: 44.191,
        timezone: "Asia/Aden",
        city: { ar: "صنعاء", en: "Sanaa", fr: "Sanaa", tn: "صنعاء" },
      },
      topics: { ...AR_TOPICS, local: "اليمن" },
      feeds: [
        { id: "saba-ye", label: "Saba News", url: "https://www.saba.ye/ar/rss.xml", locale: "ar", priority: true, independent: false },
        { id: "alsahwa-ye", label: "Al Sahwa", url: "https://www.alsahwa-yemen.net/feed/", locale: "ar", priority: true, independent: true },
        { id: "yemenpress", label: "Yemen Press", url: "https://www.yemenpress.com/rss.xml", locale: "ar", priority: false, independent: true },
      ],
      labels: arLabels("اليمن", "Yemen", "Yémen", "اليمن"),
    },
    pk: {
      id: "pk",
      flag: "🇵🇰",
      brand: "Pnews",
      share: { accent: "#15803d", accentSoft: "#1d4ed8" },
      defaultUiLang: "en",
      pageDir: "ltr",
      order: 21,
      localPatterns: [/pakistan/i, /pakistan/i, /باكستان/i, /إسلام آباد/i, /karachi/i],
      weather: {
        lat: 33.6844,
        lon: 73.0479,
        timezone: "Asia/Karachi",
        city: { ar: "إسلام آباد", en: "Islamabad", fr: "Islamabad", tn: "إسلام آباد" },
      },
      topics: { ...EN_TOPICS, local: "Pakistan" },
      feeds: [
        { id: "dawn", label: "Dawn", url: "https://www.dawn.com/feeds/home", locale: "en", priority: true, independent: true },
        { id: "tribune-pk", label: "Express Tribune", url: "https://tribune.com.pk/feed/home", locale: "en", priority: true, independent: false },
        { id: "geo-pk", label: "Geo News", url: "https://www.geo.tv/rss/1/1", locale: "en", priority: false, independent: false },
      ],
      labels: arLabels("باكستان", "Pakistan", "Pakistan", "باكستان"),
    },
    in: {
      id: "in",
      flag: "🇮🇳",
      brand: "Indnews",
      share: { accent: "#ea580c", accentSoft: "#15803d" },
      defaultUiLang: "en",
      pageDir: "ltr",
      order: 22,
      localPatterns: [/india/i, /inde\b/i, /الهند/i, /مومباي/i, /delhi/i],
      weather: {
        lat: 28.6139,
        lon: 77.209,
        timezone: "Asia/Kolkata",
        city: { ar: "نيودلهي", en: "New Delhi", fr: "New Delhi", tn: "نيودلهي" },
      },
      topics: { ...EN_TOPICS, local: "India" },
      feeds: [
        { id: "hindu", label: "The Hindu", url: "https://www.thehindu.com/news/feeder/default.rss", locale: "en", priority: true, independent: true },
        { id: "toi", label: "Times of India", url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", locale: "en", priority: true, independent: false },
        { id: "indianexpress", label: "Indian Express", url: "https://indianexpress.com/feed/", locale: "en", priority: false, independent: true },
      ],
      labels: arLabels("الهند", "India", "Inde", "الهند"),
    },
    gb: {
      id: "gb",
      flag: "🇬🇧",
      brand: "Uknews",
      share: { accent: "#1d4ed8", accentSoft: "#dc2626" },
      defaultUiLang: "en",
      pageDir: "ltr",
      order: 23,
      localPatterns: [/britain/i, /united kingdom/i, /uk\b/i, /london/i, /بريطانيا/i],
      weather: {
        lat: 51.5074,
        lon: -0.1278,
        timezone: "Europe/London",
        city: { ar: "لندن", en: "London", fr: "Londres", tn: "لندن" },
      },
      topics: { ...EN_TOPICS, local: "UK" },
      feeds: [
        { id: "bbc-uk", label: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml", locale: "en", priority: true, independent: false },
        { id: "guardian-uk", label: "The Guardian", url: "https://www.theguardian.com/uk/rss", locale: "en", priority: true, independent: true },
        { id: "telegraph-uk", label: "The Telegraph", url: "https://www.telegraph.co.uk/rss.xml", locale: "en", priority: false, independent: false },
      ],
      labels: arLabels("بريطانيا", "United Kingdom", "Royaume-Uni", "بريطانيا"),
    },
    ca: {
      id: "ca",
      flag: "🇨🇦",
      brand: "Cnews",
      share: { accent: "#dc2626", accentSoft: "#1d4ed8" },
      defaultUiLang: "en",
      pageDir: "ltr",
      order: 24,
      localPatterns: [/canada/i, /canadien/i, /كندا/i, /ottawa/i, /toronto/i],
      weather: {
        lat: 45.4215,
        lon: -75.6972,
        timezone: "America/Toronto",
        city: { ar: "أوتاوا", en: "Ottawa", fr: "Ottawa", tn: "أوتاوا" },
      },
      topics: { ...EN_TOPICS, local: "Canada" },
      feeds: [
        {
          id: "cbc",
          label: "CBC",
          url: "https://www.cbc.ca/webfeed/rss/rss-topstories",
          locale: "en",
          priority: true,
          independent: false,
        },
        { id: "guardian-ca", label: "The Guardian World", url: "https://www.theguardian.com/world/rss", locale: "en", priority: false, independent: true },
        { id: "nationalpost-ca", label: "National Post", url: "https://nationalpost.com/feed/", locale: "en", priority: false, independent: true },
      ],
      labels: arLabels("كندا", "Canada", "Canada", "كندا"),
    },
    sd: {
      id: "sd",
      flag: "🇸🇩",
      brand: "Sdnews",
      share: { accent: "#ca8a04", accentSoft: "#16a34a" },
      defaultUiLang: "ar",
      pageDir: "rtl",
      order: 25,
      localPatterns: [/sudan/i, /soudan/i, /السودان/i, /خرطوم/i],
      weather: {
        lat: 15.5007,
        lon: 32.5599,
        timezone: "Africa/Khartoum",
        city: { ar: "الخرطوم", en: "Khartoum", fr: "Khartoum", tn: "الخرطوم" },
      },
      topics: { ...AR_TOPICS, local: "السودان" },
      feeds: [
        { id: "dabanga", label: "Dabanga", url: "https://www.dabangasudan.org/en/feed/", locale: "en", priority: true, independent: true },
        { id: "sudanakhbar", label: "Sudan Akhbar", url: "https://www.sudanakhbar.com/feed/", locale: "ar", priority: false, independent: true },
        { id: "sudantribune", label: "Sudan Tribune", url: "https://www.sudantribune.com/spip.php?page=backend", locale: "en", priority: false, independent: true },
      ],
      labels: arLabels("السودان", "Sudan", "Soudan", "السودان"),
    },
    br: {
      id: "br",
      flag: "🇧🇷",
      brand: "Brnews",
      share: { accent: "#16a34a", accentSoft: "#eab308" },
      defaultUiLang: "en",
      pageDir: "ltr",
      order: 26,
      localPatterns: [/brazil/i, /brésil/i, /البرازيل/i, /brasília/i, /são paulo/i],
      weather: {
        lat: -15.7939,
        lon: -47.8828,
        timezone: "America/Sao_Paulo",
        city: { ar: "برازيليا", en: "Brasília", fr: "Brasilia", tn: "برازيليا" },
      },
      topics: { ...EN_TOPICS, local: "Brazil" },
      feeds: [
        { id: "folha-br", label: "Folha", url: "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml", locale: "pt", priority: true, independent: true },
        { id: "g1-br", label: "G1", url: "https://g1.globo.com/rss/g1/", locale: "pt", priority: true, independent: false },
        { id: "uol-br", label: "UOL", url: "https://rss.uol.com.br/feed/index.xml", locale: "pt", priority: false, independent: false },
      ],
      labels: arLabels("البرازيل", "Brazil", "Brésil", "البرازيل"),
    },
  };

  const COUNTRY_ORDER = [
    "tn",
    "dz",
    "ma",
    "eg",
    "lb",
    "sa",
    "ae",
    "jo",
    "iq",
    "ly",
    "ir",
    "ps",
    "il",
    "sy",
    "ye",
    "fr",
    "es",
    "it",
    "de",
    "us",
    "tr",
    "pk",
    "in",
    "gb",
    "ca",
    "sd",
    "br",
  ];

  function getSelectedId() {
    let id = localStorage.getItem(STORAGE_KEY);
    if (id === "ot") {
      id = "ps";
      localStorage.setItem(STORAGE_KEY, id);
    }
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
