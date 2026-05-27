(function () {
  const CACHE_PREFIX = "tnews-tr:";
  const MAX_CHARS = 480;

  const TARGET = { tn: "ar", ar: "ar", en: "en", fr: "fr" };
  const SOURCE = { ar: "ar", fr: "fr", en: "en" };

  function cacheKey(text, from, to) {
    return `${CACHE_PREFIX}${from}:${to}:${text.slice(0, 120)}`;
  }

  function detectLang(text) {
    const sample = String(text || "").slice(0, 800);
    const arChars = (sample.match(/[\u0600-\u06FF]/g) || []).length;
    const letters = sample.replace(/\s/g, "").length || 1;
    if (arChars / letters > 0.28) return "ar";
    if (/[éèêëàâùûçœæ]/i.test(sample) || /\b(le|la|les|des|une|dans|pour)\b/i.test(sample)) {
      return "fr";
    }
    return "en";
  }

  function targetCode(summaryLangId) {
    return TARGET[summaryLangId] || "ar";
  }

  function needsTranslation(body, summaryLangId) {
    const from = detectLang(body);
    const to = targetCode(summaryLangId);
    if (summaryLangId === "tn") return from !== "ar";
    return from !== to;
  }

  async function httpGetJson(url) {
    if (window.Capacitor?.isNativePlatform?.()) {
      const http = window.Capacitor?.Plugins?.CapacitorHttp;
      if (http?.get) {
        const res = await http.get({ url, responseType: "json", readTimeout: 20000, connectTimeout: 20000 });
        if (res.status >= 200 && res.status < 300) {
          return typeof res.data === "object" ? res.data : JSON.parse(String(res.data || "{}"));
        }
        throw new Error(`HTTP ${res.status}`);
      }
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function translateViaMyMemory(text, from, to) {
    const q = encodeURIComponent(text.slice(0, MAX_CHARS));
    const pair = `${from}|${to}`;
    const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=${pair}`;
    const data = await httpGetJson(url);
    const out = data?.responseData?.translatedText;
    if (!out || /INVALID|MYMEMORY WARNING|QUERY LENGTH/i.test(out)) {
      throw new Error("translate failed");
    }
    return out.trim();
  }

  async function translateOne(sentence, from, to) {
    const key = cacheKey(sentence, from, to);
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) return cached;
    } catch {
      /* ignore */
    }

    const translated = await translateViaMyMemory(sentence, from, to);
    try {
      sessionStorage.setItem(key, translated);
    } catch {
      /* ignore */
    }
    return translated;
  }

  async function translateSentences(sentences, summaryLangId, onProgress) {
    const from = detectLang(sentences.join(" "));
    const to = targetCode(summaryLangId);
    if (!needsTranslation(sentences.join(" "), summaryLangId)) {
      return sentences;
    }

    const out = [];
    for (let i = 0; i < sentences.length; i++) {
      onProgress?.(i + 1, sentences.length);
      try {
        out.push(await translateOne(sentences[i], from, to));
      } catch {
        out.push(sentences[i]);
      }
    }
    return out;
  }

  window.TnewsFreeTranslate = {
    detectLang,
    needsTranslation,
    translateSentences,
    targetCode,
  };
})();
