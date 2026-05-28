(function () {
  const CACHE_MS = 20 * 60 * 1000;

  const WEATHER_LABELS = {
    ar: {
      0: "صافٍ",
      1: "صافٍ",
      2: "غائم جزئياً",
      3: "غائم",
      45: "ضباب",
      48: "ضباب",
      51: "رذاذ",
      53: "رذاذ",
      55: "رذاذ",
      61: "مطر",
      63: "مطر",
      65: "مطر غزير",
      71: "ثلج",
      80: "زخات",
      95: "عاصفة",
    },
    fr: {
      0: "Dégagé",
      1: "Ensoleillé",
      2: "Partiellement nuageux",
      3: "Nuageux",
      45: "Brouillard",
      48: "Brouillard",
      51: "Bruine",
      53: "Bruine",
      55: "Bruine",
      61: "Pluie",
      63: "Pluie",
      65: "Forte pluie",
      71: "Neige",
      80: "Averses",
      95: "Orage",
    },
    en: {
      0: "Clear",
      1: "Sunny",
      2: "Partly cloudy",
      3: "Cloudy",
      45: "Fog",
      48: "Fog",
      51: "Drizzle",
      53: "Drizzle",
      55: "Drizzle",
      61: "Rain",
      63: "Rain",
      65: "Heavy rain",
      71: "Snow",
      80: "Showers",
      95: "Storm",
    },
  };

  function cacheKey() {
    const id = window.TnewsCountries?.getSelectedId?.() || "tn";
    return `tnews-weather-cache-${id}`;
  }

  function weatherConfig() {
    return window.TnewsCountries?.getCurrent?.()?.weather || window.TnewsCountries?.COUNTRIES?.tn?.weather;
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(cacheKey());
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.cachedAt > CACHE_MS) return null;
      return data;
    } catch {
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(cacheKey(), JSON.stringify({ ...data, cachedAt: Date.now() }));
    } catch {
      /* ignore */
    }
  }

  function labelForCode(code) {
    const uiLang = window.TnewsUi?.getUiLangId?.() || window.TnewsCountries?.getCurrent?.()?.defaultUiLang || "en";
    const table = WEATHER_LABELS[uiLang] || WEATHER_LABELS.en;
    return table[code] || "—";
  }

  function cityName() {
    const cfg = weatherConfig();
    const uiLang = window.TnewsUi?.getUiLangId?.() || "en";
    return cfg?.city?.[uiLang] || cfg?.city?.en || "";
  }

  async function nativeHttpGet(url) {
    if (window.Capacitor?.isNativePlatform?.()) {
      const http = window.Capacitor.Plugins.CapacitorHttp;
      if (http?.get) {
        const res = await http.get({ url, responseType: "json" });
        if (res.status >= 200 && res.status < 300) return res.data;
      }
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("weather fetch failed");
    return res.json();
  }

  async function fetchWeather() {
    const cached = readCache();
    if (cached) return cached;

    const cfg = weatherConfig();
    if (!cfg) throw new Error("no weather config");

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${cfg.lat}&longitude=${cfg.lon}` +
      `&current=temperature_2m,weather_code&timezone=${encodeURIComponent(cfg.timezone)}`;

    const data = await nativeHttpGet(url);
    const current = data?.current;
    if (!current) throw new Error("no weather data");

    const payload = {
      temp: Math.round(current.temperature_2m),
      label: labelForCode(current.weather_code),
      city: cityName(),
    };
    writeCache(payload);
    return payload;
  }

  window.TnewsWeather = { fetchWeather };
})();
