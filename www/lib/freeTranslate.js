(function () {
  const CACHE_PREFIX = "tnews-tr:";
  const MAX_CHARS = 450;
  const CHUNK_CHARS = 380;

  const TARGET = { tn: "ar", ar: "ar", en: "en", fr: "fr" };
  const LOCALE_LANG = {
    ar: "ar",
    en: "en",
    fr: "fr",
    es: "es",
    de: "de",
    it: "it",
    pt: "pt",
    tr: "tr",
  };

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

  function articleLang(articleOrText, localeHint) {
    if (localeHint && LOCALE_LANG[localeHint]) return LOCALE_LANG[localeHint];
    if (typeof articleOrText === "object" && articleOrText?.locale) {
      const loc = LOCALE_LANG[articleOrText.locale];
      if (loc) return loc;
    }
    const text =
      typeof articleOrText === "string"
        ? articleOrText
        : `${articleOrText?.title || ""} ${articleOrText?.summary || ""}`;
    return detectLang(text);
  }

  function targetCode(uiLangId) {
    return TARGET[uiLangId] || "ar";
  }

  function needsTranslation(articleOrText, uiLangId, localeHint) {
    const from = articleLang(articleOrText, localeHint);
    const to = targetCode(uiLangId);
    if (uiLangId === "tn") return from !== "ar";
    return from !== to;
  }

  async function httpGetJson(url) {
    if (window.Capacitor?.isNativePlatform?.()) {
      const http = window.Capacitor?.Plugins?.CapacitorHttp;
      if (http?.get) {
        const res = await http.get({
          url,
          responseType: "json",
          readTimeout: 22000,
          connectTimeout: 22000,
        });
        if (res.status >= 200 && res.status < 300) {
          return typeof res.data === "object" ? res.data : JSON.parse(String(res.data || "{}"));
        }
        throw new Error(`HTTP ${res.status}`);
      }
    }
    if (window.TnewsHttp?.getText) {
      const body = await window.TnewsHttp.getText(url, { Accept: "application/json,*/*" });
      return JSON.parse(body);
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function httpGetText(url) {
    if (window.TnewsHttp?.getText) {
      return window.TnewsHttp.getText(url, { Accept: "*/*" });
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }

  function parseGtx(body) {
    try {
      const json = typeof body === "string" ? JSON.parse(body) : body;
      if (!Array.isArray(json) || !Array.isArray(json[0])) return "";
      return json[0]
        .map((seg) => (seg && seg[0] ? seg[0] : ""))
        .join("")
        .trim();
    } catch {
      return "";
    }
  }

  function splitChunks(text) {
    const t = String(text || "").trim();
    if (t.length <= CHUNK_CHARS) return [t];
    const parts = [];
    let rest = t;
    while (rest.length > CHUNK_CHARS) {
      let cut = rest.lastIndexOf(" ", CHUNK_CHARS);
      if (cut < CHUNK_CHARS * 0.4) cut = CHUNK_CHARS;
      parts.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) parts.push(rest);
    return parts;
  }

  async function translateViaGtx(text, from, to) {
    const chunks = splitChunks(text);
    const out = [];
    for (const chunk of chunks) {
      if (!chunk) continue;
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(chunk)}`;
      const raw = await httpGetText(url);
      const piece = parseGtx(raw);
      if (!piece) throw new Error("gtx failed");
      out.push(piece);
    }
    return out.join(" ");
  }

  async function translateViaMyMemory(text, from, to) {
    const q = encodeURIComponent(text.slice(0, MAX_CHARS));
    const pair = `${from}|${to}`;
    const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=${pair}`;
    const data = await httpGetJson(url);
    const out = data?.responseData?.translatedText;
    if (!out || /INVALID|MYMEMORY WARNING|QUERY LENGTH|RATE LIMIT|USED ALL AVAILABLE/i.test(out)) {
      throw new Error("mymemory failed");
    }
    return out.trim();
  }

  async function translateRaw(text, from, to) {
    const sentence = String(text || "").trim();
    if (!sentence || from === to) return sentence;

    try {
      return await translateViaMyMemory(sentence, from, to);
    } catch {
      return translateViaGtx(sentence, from, to);
    }
  }

  async function translateOne(text, from, to) {
    const sentence = String(text || "").trim();
    if (!sentence || from === to) return sentence;

    const key = cacheKey(sentence, from, to);
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) return cached;
    } catch {
      /* ignore */
    }

    const translated = await translateRaw(sentence, from, to);
    try {
      sessionStorage.setItem(key, translated);
    } catch {
      /* ignore */
    }
    return translated;
  }

  async function translateForUi(text, uiLangId, localeHint) {
    const from = articleLang(text, localeHint);
    const to = targetCode(uiLangId);
    if (!needsTranslation(text, uiLangId, localeHint)) return text;
    return translateOne(text, from, to);
  }

  window.TnewsFreeTranslate = {
    detectLang,
    articleLang,
    needsTranslation,
    translateOne,
    translateForUi,
    targetCode,
    LOCALE_LANG,
  };
})();
