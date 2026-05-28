(function () {
  const CACHE_PREFIX = "tnews-tr6:";
  const MAX_CHARS = 450;

  const TARGET = { tn: "ar", ar: "ar", en: "en", fr: "fr" };

  const LINGVA_HOSTS = [
    "https://lingva.garudalinux.org",
    "https://lingva.ml",
  ];

  function looksPercentEncoded(text) {
    return /%(?:[0-9A-Fa-f]{2})/.test(text) || /(?:[0-9A-F]{2}){2,}%20/i.test(text);
  }

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

  function arabicRatio(text) {
    const sample = String(text || "").replace(/\s/g, "");
    if (!sample.length) return 0;
    return (sample.match(/[\u0600-\u06FF]/g) || []).length / sample.length;
  }

  function frenchRatio(text) {
    const sample = String(text || "").slice(0, 2500);
    const letters = sample.replace(/\s/g, "").length || 1;
    const accents = (sample.match(/[àâäéèêëïîôùûüçœæ«»]/gi) || []).length;
    const frWords = (
      sample.match(
        /\b(le|la|les|des|du|de|un|une|dans|pour|avec|est|sont|qui|que|pas|plus|sur|au|aux)\b/gi,
      ) || []
    ).length;
    return (accents * 2 + frWords * 8) / letters;
  }

  function cacheKey(text, from, to) {
    return `${CACHE_PREFIX}${from}:${to}:${text.slice(0, 100)}`;
  }

  function detectLang(text) {
    const sample = decodeReadableText(text).slice(0, 2500);
    if (arabicRatio(sample) > 0.12) return "ar";
    if (frenchRatio(sample) > 0.06) return "fr";
    return "en";
  }

  function resolveSourceLang(text, hint) {
    const h = String(hint || "").toLowerCase();
    if (h === "ar" || h === "fr" || h === "en") {
      const detected = detectLang(text);
      if (h === detected) return h;
      if (h === "fr" && frenchRatio(text) > 0.04) return "fr";
      if (h === "ar" && arabicRatio(text) > 0.1) return "ar";
      if (h === "en" && arabicRatio(text) < 0.08 && frenchRatio(text) < 0.04) return "en";
    }
    return detectLang(text);
  }

  function targetCode(summaryLangId) {
    return TARGET[summaryLangId] || "ar";
  }

  function needsTranslation(body, summaryLangId, sourceLangHint) {
    const to = targetCode(summaryLangId);
    if (summaryLangId === "tn") {
      return resolveSourceLang(body, sourceLangHint) !== "ar";
    }
    const from = resolveSourceLang(body, sourceLangHint);
    return from !== to;
  }

  function matchesTargetLang(text, summaryLangId) {
    const to = targetCode(summaryLangId);
    if (summaryLangId === "tn") return arabicRatio(text) > 0.1;
    if (to === "ar") return arabicRatio(text) > 0.18;
    if (to === "fr") return frenchRatio(text) > 0.05 && arabicRatio(text) < 0.1;
    if (to === "en") return frenchRatio(text) < 0.04 && arabicRatio(text) < 0.08;
    return true;
  }

  function translationLooksValid(original, translated, from, to) {
    const out = decodeReadableText(translated).trim();
    const plain = decodeReadableText(original).trim();
    if (!out || out === plain) return false;
    if (looksPercentEncoded(out)) return false;

    if (to === "ar" && arabicRatio(out) < 0.12) return false;
    if (from === "ar" && to !== "ar" && arabicRatio(out) > 0.25) return false;
    if (from === "fr" && to === "en" && (arabicRatio(out) > 0.15 || frenchRatio(out) > 0.07)) {
      return false;
    }
    if (from === "fr" && to === "ar" && arabicRatio(out) < 0.12) return false;

    return true;
  }

  function chunkForTranslate(text, maxLen) {
    const plain = decodeReadableText(text);
    if (plain.length <= maxLen) return [plain];

    const parts = plain.split(/(?<=[.!?؟؛،])\s+/);
    const chunks = [];
    let buf = "";

    for (const part of parts) {
      const next = buf ? `${buf} ${part}` : part;
      if (next.length <= maxLen) {
        buf = next;
      } else {
        if (buf) chunks.push(buf.trim());
        buf = part.length > maxLen ? part.slice(0, maxLen) : part;
      }
    }
    if (buf) chunks.push(buf.trim());
    return chunks.length ? chunks : [plain.slice(0, maxLen)];
  }

  async function httpGetJson(url, params) {
    if (window.Capacitor?.isNativePlatform?.()) {
      const http = window.Capacitor?.Plugins?.CapacitorHttp;
      if (http?.get) {
        const res = await http.get({
          url,
          params,
          responseType: "json",
          readTimeout: 30000,
          connectTimeout: 30000,
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

  async function httpPostJson(url, bodyObj) {
    if (window.Capacitor?.isNativePlatform?.()) {
      const http = window.Capacitor?.Plugins?.CapacitorHttp;
      if (http?.post) {
        const res = await http.post({
          url,
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          data: bodyObj,
          responseType: "json",
          readTimeout: 30000,
          connectTimeout: 30000,
        });
        if (res.status >= 200 && res.status < 300) {
          return typeof res.data === "object" ? res.data : JSON.parse(String(res.data || "{}"));
        }
        throw new Error(`HTTP ${res.status}`);
      }
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(bodyObj),
    });
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
          readTimeout: 30000,
          connectTimeout: 30000,
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

  async function translateViaLibre(text, from, to) {
    const plain = decodeReadableText(text).slice(0, MAX_CHARS);
    const data = await httpPostJson("https://translate.argosopentech.com/translate", {
      q: plain,
      source: from,
      target: to,
      format: "text",
    });
    const out = decodeReadableText(String(data?.translatedText || "").trim());
    if (!translationLooksValid(plain, out, from, to)) {
      throw new Error("libre invalid");
    }
    return out;
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
    if (!translationLooksValid(plain, out, from, to)) {
      throw new Error("no translation");
    }
    return out;
  }

  function parseGtxResponse(raw) {
    try {
      return JSON.parse(raw);
    } catch {
      const start = raw.indexOf("[[");
      const end = raw.lastIndexOf("]");
      if (start >= 0 && end > start) {
        return JSON.parse(raw.slice(start, end + 1));
      }
      throw new Error("gtx parse");
    }
  }

  async function translateViaGtx(text, from, to) {
    const plain = decodeReadableText(text).slice(0, MAX_CHARS);
    const url =
      "https://translate.googleapis.com/translate_a/single" +
      `?client=gtx&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&dt=t` +
      `&q=${encodeURIComponent(plain)}`;

    const raw = await httpGetTextUrl(url);
    const data = parseGtxResponse(raw);
    const parts = (data[0] || []).map((row) => row && row[0]).filter(Boolean);
    const out = decodeReadableText(parts.join("").trim());
    if (!translationLooksValid(plain, out, from, to)) {
      throw new Error("gtx invalid");
    }
    return out;
  }

  async function translateViaLingva(text, from, to) {
    const plain = decodeReadableText(text).slice(0, MAX_CHARS);
    let lastErr = null;

    for (const host of LINGVA_HOSTS) {
      try {
        const url = `${host}/api/v1/${encodeURIComponent(from)}/${encodeURIComponent(to)}/${encodeURIComponent(plain)}`;
        const raw = await httpGetTextUrl(url);
        const data = JSON.parse(raw);
        const out = decodeReadableText(String(data?.translation || "").trim());
        if (translationLooksValid(plain, out, from, to)) return out;
        lastErr = new Error("lingva invalid");
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("lingva failed");
  }

  function providersForPair(from, to) {
    return [
      (t, f, tl) => translateViaGtx(t, f, tl),
      (t, f, tl) => translateViaLibre(t, f, tl),
      (t, f, tl) => translateViaMyMemory(t, f, tl),
      (t, f, tl) => translateViaLingva(t, f, tl),
    ];
  }

  async function translateOne(sentence, from, to) {
    const clean = decodeReadableText(sentence);
    if (!clean) return clean;

    const key = cacheKey(clean, from, to);
    try {
      const cached = sessionStorage.getItem(key);
      if (cached && translationLooksValid(clean, cached, from, to)) {
        return decodeReadableText(cached);
      }
    } catch {
      /* ignore */
    }

    let lastErr = null;
    for (const run of providersForPair(from, to)) {
      try {
        const translated = await run(clean, from, to);
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

  async function translateLines(lines, from, to, onProgress) {
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      onProgress?.(i + 1, lines.length);
      const line = decodeReadableText(lines[i]);
      if (!line) continue;
      try {
        out.push(await translateOne(line, from, to));
      } catch {
        out.push(line);
      }
    }
    return out;
  }

  async function translateText(text, summaryLangId, options = {}) {
    const plain = decodeReadableText(text);
    if (!plain) return plain;

    const hint = options.sourceLang || options.locale || "";
    if (!needsTranslation(plain, summaryLangId, hint)) return plain;

    const from = resolveSourceLang(plain, hint);
    const to = targetCode(summaryLangId);
    const chunks = chunkForTranslate(plain, MAX_CHARS);

    let parts = await translateLines(chunks, from, to, options.onProgress);
    let out = parts.join(" ").replace(/\s+/g, " ").trim();

    if (!matchesTargetLang(out, summaryLangId)) {
      parts = await translateLines(chunks, from, to, options.onProgress);
      const retry = parts.join(" ").replace(/\s+/g, " ").trim();
      if (matchesTargetLang(retry, summaryLangId)) out = retry;
    }

    return out;
  }

  window.TnewsFreeTranslate = {
    detectLang,
    resolveSourceLang,
    needsTranslation,
    matchesTargetLang,
    translateText,
    translateOne,
    translateLines,
    decodeReadableText,
    targetCode,
  };
})();
