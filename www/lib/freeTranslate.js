(function () {
  const CACHE_PREFIX = "tnews-tr4:";
  const MAX_CHARS = 480;

  const TARGET = { tn: "ar", ar: "ar", en: "en", fr: "fr" };

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

  function cacheKey(text, from, to) {
    return `${CACHE_PREFIX}${from}:${to}:${text.slice(0, 100)}`;
  }

  function detectLang(text) {
    const sample = decodeReadableText(text).slice(0, 2000);
    if (arabicRatio(sample) > 0.18) return "ar";
    if (/[éèêëàâùûçœæ«»]/i.test(sample) || /\b(le|la|les|des|une|dans|pour)\b/i.test(sample)) {
      return "fr";
    }
    return "en";
  }

  function resolveSourceLang(text, hint) {
    if (arabicRatio(text) > 0.18) return "ar";
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

  function translationLooksValid(original, translated, from, to) {
    const out = decodeReadableText(translated).trim();
    const plain = decodeReadableText(original).trim();
    if (!out || out === plain) return false;
    if (looksPercentEncoded(out)) return false;
    if (from === "ar" && to !== "ar" && arabicRatio(out) > 0.28) return false;
    if (from === "fr" && to === "en" && arabicRatio(out) > 0.4) return false;
    return true;
  }

  function chunkForTranslate(text, maxLen) {
    const plain = decodeReadableText(text);
    if (plain.length <= maxLen) return [plain];

    const parts = plain.split(/(?<=[.!?؟؛])\s+/);
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
          readTimeout: 28000,
          connectTimeout: 28000,
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
          readTimeout: 28000,
          connectTimeout: 28000,
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
    const url = `https://lingva.ml/api/v1/${encodeURIComponent(from)}/${encodeURIComponent(to)}/${encodeURIComponent(plain)}`;
    const raw = await httpGetTextUrl(url);
    const data = JSON.parse(raw);
    const out = decodeReadableText(String(data?.translation || "").trim());
    if (!translationLooksValid(plain, out, from, to)) {
      throw new Error("lingva invalid");
    }
    return out;
  }

  function providersForPair(from, to) {
    if (from === "ar" && to !== "ar") {
      return [
        (t, f, tl) => translateViaGtx(t, f, tl),
        (t, f, tl) => translateViaLingva(t, f, tl),
        (t, f, tl) => translateViaMyMemory(t, f, tl),
      ];
    }
    return [
      (t, f, tl) => translateViaGtx(t, f, tl),
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

    const runners = providersForPair(from, to);
    let lastErr = null;

    for (const run of runners) {
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

  async function translateText(text, summaryLangId, options = {}) {
    const plain = decodeReadableText(text);
    if (!plain) return plain;

    const hint = options.sourceLang || options.locale || "";
    if (!needsTranslation(plain, summaryLangId, hint)) return plain;

    const from = resolveSourceLang(plain, hint);
    const to = targetCode(summaryLangId);
    const chunks = chunkForTranslate(plain, MAX_CHARS);
    const parts = [];

    for (let i = 0; i < chunks.length; i++) {
      options.onProgress?.(i + 1, chunks.length);
      try {
        parts.push(await translateOne(chunks[i], from, to));
      } catch {
        parts.push(chunks[i]);
      }
    }

    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  async function translateSentences(sentences, summaryLangId, onProgress, options = {}) {
    const joined = sentences.map((s) => decodeReadableText(s)).join(" ");
    const translated = await translateText(joined, summaryLangId, {
      ...options,
      onProgress,
    });
    const parts = translated
      .split(/(?<=[.!?؟؛])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 20);

    if (parts.length >= sentences.length) {
      return parts.slice(0, sentences.length);
    }

    return sentences.map((s, i) => parts[i] || s);
  }

  window.TnewsFreeTranslate = {
    detectLang,
    resolveSourceLang,
    needsTranslation,
    translateText,
    translateOne,
    translateSentences,
    decodeReadableText,
    targetCode,
  };
})();
