(function () {
  const TUNIS = { lat: 36.8065, lon: 10.1815 };
  const CACHE_KEY = "tnews-weather-cache";
  const CACHE_MS = 20 * 60 * 1000;

  const WEATHER_AR = {
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
  };

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
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
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, cachedAt: Date.now() }));
    } catch {
      /* ignore */
    }
  }

  function labelForCode(code) {
    return WEATHER_AR[code] || "—";
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

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${TUNIS.lat}&longitude=${TUNIS.lon}` +
      "&current=temperature_2m,weather_code&timezone=Africa%2FTunis";

    const data = await nativeHttpGet(url);
    const current = data?.current;
    if (!current) throw new Error("no weather data");

    const payload = {
      temp: Math.round(current.temperature_2m),
      label: labelForCode(current.weather_code),
      city: "تونس",
    };
    writeCache(payload);
    return payload;
  }

  window.TnewsWeather = { fetchWeather };
})();
