(function () {
  const CACHE_PREFIX = "tnews-tr:";
  const MAX_CHARS = 450;

  const TARGET = { tn: "ar", ar: "ar", en: "en", fr: "fr" };

  function looksPercentEncoded(text) {
    return /%(?:[0-9A-Fa-f]{2})/.test(text) || /(?:[0-9A-F]{2}){2,}%20/i.test(text);
  }

  /** Fix MyMemory / URL bugs where % was stripped (C2%AB%20 → %C2%AB%20). */
  function decodeReadableText(text) {
    let t = String(text || "").trim();
    if (!t) return t;

    if (!looksPercentEncoded(t)) return t;

    if (!/%[0-9A-Fa-f]{2}/.test(t) && /[0-9A-F]{2}%/i.test(t)) {
      t = `%${t}`;
    }

    try {
      const decoded = decodeURIComponent(t.replace(/\+/g, " "));
      if (decoded && !looksPercentEncoded(decoded)) return decoded;
    } catch {
      /* try partial */
    }

    try {
      return t.replace(/%[0-9A-Fa-f]{2}/g, (seq) => {
        try {
          return decodeURIComponent(seq);
        } catch {
          return seq;
        }
      });
    } catch {
      return text;
    }
  }

  function cacheKey(text, from, to) {
    return `${CACHE_PREFIX}${from}:${to}:${text.slice(0, 100)}`;
  }

  function detectLang(text) {
    const sample = decodeReadableText(text).slice(0, 800);
    const arChars = (sample.match(/[\u0600-\u06FF]/g) || []).length;
    const letters = sample.replace(/\s/g, "").length || 1;
    if (arChars / letters > 0.28) return "ar";
    if (/[éèêëàâùûçœæ«»]/i.test(sample) || /\b(le|la|les|des|une|dans|pour)\b/i.test(sample)) {
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

  async function httpGetJson(url, params) {
    if (window.Capacitor?.isNativePlatform?.()) {
      const http = window.Capacitor?.Plugins?.CapacitorHttp;
      if (http?.get) {
        const res = await http.get({
          url,
          params,
          responseType: "json",
          readTimeout: 25000,
          connectTimeout: 25000,
        });
        if (res.status >= 200 && res.status < 300) {
          return typeof res.data === "object" ? res.data : JSON.parse(String(res.data || "{}"));
        }
        throw new Error(`HTTP ${res.status}`);
      }
    }

    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${url}?${qs}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function translateViaMyMemory(text, from, to) {
    const plain = decodeReadableText(text).slice(0, MAX_CHARS);
    const data = await httpGetJson("https://api.mymemory.translated.net/get", {
      q: plain,
      langpair: `${from}|${to}`,
    });

    let out = data?.responseData?.translatedText;
    if (!out || /INVALID|MYMEMORY WARNING|QUERY LENGTH/i.test(out)) {
      throw new Error("translate failed");
    }

    out = decodeReadableText(out.trim());
    if (looksPercentEncoded(out)) {
      throw new Error("encoded response");
    }
    return out;
  }

  async function translateOne(sentence, from, to) {
    const clean = decodeReadableText(sentence);
    const key = cacheKey(clean, from, to);
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) return decodeReadableText(cached);
    } catch {
      /* ignore */
    }

    const translated = await translateViaMyMemory(clean, from, to);
    try {
      sessionStorage.setItem(key, translated);
    } catch {
      /* ignore */
    }
    return translated;
  }

  async function translateSentences(sentences, summaryLangId, onProgress) {
    const cleaned = sentences.map((s) => decodeReadableText(s));
    const from = detectLang(cleaned.join(" "));
    const to = targetCode(summaryLangId);
    if (!needsTranslation(cleaned.join(" "), summaryLangId)) {
      return cleaned;
    }

    const out = [];
    for (let i = 0; i < cleaned.length; i++) {
      onProgress?.(i + 1, cleaned.length);
      try {
        out.push(await translateOne(cleaned[i], from, to));
      } catch {
        out.push(cleaned[i]);
      }
    }
    return out;
  }

  window.TnewsFreeTranslate = {
    detectLang,
    needsTranslation,
    translateSentences,
    decodeReadableText,
    targetCode,
  };
})();
