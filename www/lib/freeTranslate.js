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
    const sample = decodeReadableText(text).slice(0, 1200);
    const arChars = (sample.match(/[\u0600-\u06FF]/g) || []).length;
    const letters = sample.replace(/\s/g, "").length || 1;
    if (arChars / letters > 0.22) return "ar";
    if (/[éèêëàâùûçœæ«»]/i.test(sample) || /\b(le|la|les|des|une|dans|pour)\b/i.test(sample)) {
      return "fr";
    }
    return "en";
  }

  function resolveSourceLang(text, hint) {
    const h = String(hint || "").toLowerCase();
    if (h === "ar") return "ar";
    if (h === "fr") return "fr";
    if (h === "en") return "en";
    return detectLang(text);
  }

  function targetCode(summaryLangId) {
    return TARGET[summaryLangId] || "ar";
  }

  function needsTranslation(body, summaryLangId, sourceLangHint) {
    const from = resolveSourceLang(body, sourceLangHint);
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

  async function httpGetTextUrl(fullUrl) {
    if (window.Capacitor?.isNativePlatform?.()) {
      const http = window.Capacitor?.Plugins?.CapacitorHttp;
      if (http?.get) {
        const res = await http.get({
          url: fullUrl,
          responseType: "text",
          readTimeout: 25000,
          connectTimeout: 25000,
        });
        if (res.status >= 200 && res.status < 300) {
          return typeof res.data === "string" ? res.data : String(res.data ?? "");
        }
        throw new Error(`HTTP ${res.status}`);
      }
    }
    const res = await fetch(fullUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
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

    const unchanged = out === plain;
    const sameScript =
      from === "ar" &&
      to !== "ar" &&
      (out.match(/[\u0600-\u06FF]/g) || []).length > (out.replace(/\s/g, "").length || 1) * 0.2;
    if (unchanged || sameScript) {
      throw new Error("no translation");
    }

    return out;
  }

  async function translateViaGtx(text, from, to) {
    const plain = decodeReadableText(text).slice(0, MAX_CHARS);
    const url =
      "https://translate.googleapis.com/translate_a/single" +
      `?client=gtx&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&dt=t` +
      `&q=${encodeURIComponent(plain)}`;

    const raw = await httpGetTextUrl(url);
    const data = JSON.parse(raw);
    const parts = (data[0] || []).map((row) => row && row[0]).filter(Boolean);
    const out = decodeReadableText(parts.join("").trim());
    if (!out) throw new Error("empty gtx");
    if (from === "ar" && to !== "ar") {
      const arRatio = (out.match(/[\u0600-\u06FF]/g) || []).length / (out.replace(/\s/g, "").length || 1);
      if (arRatio > 0.35) throw new Error("still arabic");
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

    const providers = [
      () => translateViaMyMemory(clean, from, to),
      () => translateViaGtx(clean, from, to),
    ];

    let lastErr = null;
    for (const run of providers) {
      try {
        const translated = await run();
        try {
          sessionStorage.setItem(key, translated);
        } catch {
          /* ignore */
        }
        return translated;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("translate failed");
  }

  async function translateSentences(sentences, summaryLangId, onProgress, options = {}) {
    const cleaned = sentences.map((s) => decodeReadableText(s));
    const hint = options.sourceLang || options.locale || "";
    const from = resolveSourceLang(cleaned.join(" "), hint);
    const to = targetCode(summaryLangId);

    if (!needsTranslation(cleaned.join(" "), summaryLangId, hint)) {
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
    resolveSourceLang,
    needsTranslation,
    translateSentences,
    decodeReadableText,
    targetCode,
  };
})();
