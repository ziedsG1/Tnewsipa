(function () {
  const STOP_WORDS = new Set([
    "في", "من", "إلى", "على", "أن", "ان", "هذا", "هذه", "التي", "الذي", "مع", "عن", "ما", "لا",
    "تم", "قد", "كان", "the", "and", "for", "with", "from", "that", "des", "les", "une", "dans",
  ]);

  const STATUS = {
    tn: { load: "قاعدين نجيبو المقال…", translate: "قاعدين نترجمو للدارجة/عربي…" },
    ar: { load: "جاري تحميل المقال…", translate: "جاري الترجمة للعربية…" },
    en: { load: "Loading article…", translate: "Translating to English…" },
    fr: { load: "Chargement de l'article…", translate: "Traduction en français…" },
  };

  function headers(summaryLangId) {
    return (
      window.TnewsTunisianStyle?.getLocalHeaders?.(summaryLangId) ||
      window.TnewsTunisianStyle?.LOCAL_HEADERS ||
      {}
    );
  }

  function cleanText(text) {
    const t = window.TnewsFreeTranslate?.decodeReadableText
      ? window.TnewsFreeTranslate.decodeReadableText(text)
      : String(text || "");
    return t.replace(/\s+/g, " ").trim();
  }

  function splitSentences(text) {
    const parts = cleanText(text)
      .split(/(?<=[.!?؟؛])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 35 && s.length <= 520);

    if (parts.length >= 2) return parts;

    return cleanText(text)
      .split(/(?<=،)\s+|(?<=[,;])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 40);
  }

  function tokenize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  }

  function scoreSentence(sentence, titleTokens, index) {
    const tokens = tokenize(sentence);
    let overlap = 0;
    for (const t of tokens) {
      if (titleTokens.has(t)) overlap += 1;
    }
    const positionBonus = index === 0 ? 3 : index < 4 ? 2 : 1;
    return overlap * 2.2 + positionBonus + Math.min(tokens.length, 12) * 0.1;
  }

  function pickTopSentences(sentences, title, maxCount) {
    const titleTokens = new Set(tokenize(title));
    const scored = sentences.map((sentence, index) => ({
      sentence,
      index,
      score: scoreSentence(sentence, titleTokens, index),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored
      .slice(0, maxCount)
      .sort((a, b) => a.index - b.index)
      .map((p) => p.sentence);
  }

  async function translateLines(lines, summaryLangId, fromLang, onStatus) {
    const tr = window.TnewsFreeTranslate;
    if (!tr) return lines;

    const to = tr.targetCode(summaryLangId);
    if (!tr.needsTranslation(lines.join(" "), summaryLangId, fromLang)) {
      return lines;
    }

    onStatus?.(STATUS[summaryLangId]?.translate || STATUS.ar.translate);
    return tr.translateLines(lines, fromLang, to, (n, total) => {
      onStatus?.(`${STATUS[summaryLangId]?.translate || ""} (${n}/${total})`);
    });
  }

  async function formatAuthorBlock(author, H, summaryLangId, fromLang, onStatus) {
    const name = cleanText(author);
    if (!name) return "";

    let displayName = name;
    const tr = window.TnewsFreeTranslate;
    if (tr?.needsTranslation?.(name, summaryLangId, fromLang)) {
      try {
        const translated = await tr.translateOne(name, fromLang, tr.targetCode(summaryLangId));
        if (tr.matchesTargetLang?.(translated, summaryLangId) || tr.targetCode(summaryLangId) === "ar") {
          displayName = translated;
        }
      } catch {
        displayName = name;
      }
    }

    return `**${H.authorLabel || "Author name"}**\n${displayName}\n\n`;
  }

  async function buildSummary(loaded, summaryLangId, onStatus) {
    const H = headers(summaryLangId);
    const title = cleanText(loaded.title);
    let body = cleanText(loaded.body);
    const fromPage = loaded.fromPage;

    const fromLang = window.TnewsFreeTranslate?.resolveSourceLang?.(
      body || title,
      loaded.sourceLang || loaded.locale || "",
    );

    const sourceNote = (() => {
      if (loaded.fromPage && loaded.source === "article") return H.fromArticle;
      if (loaded.fromPage) return H.fromArticlePartial || H.fromArticle;
      return H.fromRss;
    })();

    const tr = window.TnewsFreeTranslate;
    if (tr?.needsTranslation?.(body, summaryLangId, fromLang)) {
      body = await tr.translateText(body, summaryLangId, {
        sourceLang: fromLang,
        locale: loaded.locale,
        onProgress: (n, total) => {
          onStatus?.(`${STATUS[summaryLangId]?.translate || ""} (${n}/${total})`);
        },
      });
    }

    const sentences = splitSentences(body);
    const authorBlock = await formatAuthorBlock(
      loaded.author,
      H,
      summaryLangId,
      fromLang,
      onStatus,
    );

    if (!sentences.length) {
      let out = `${H.intro || "📰"}\n\n`;
      out += authorBlock;
      out += `**${H.empty || ""}**`;
      return { text: out, fromPage, sourceNote, summaryLangId };
    }

    let bullets = pickTopSentences(sentences, title, Math.min(4, sentences.length));

    if (tr && !tr.matchesTargetLang(bullets.join(" "), summaryLangId)) {
      bullets = await translateLines(bullets, summaryLangId, fromLang, onStatus);
    }

    let out = `${H.intro || "📰"}\n\n`;
    out += authorBlock;
    out += `**${H.points || ""}**\n`;
    out += bullets.length
      ? bullets.map((b) => `• ${b}`).join("\n")
      : `• ${title}`;
    out += `\n\n**${H.source || ""}**\n${sourceNote}`;

    return { text: out, fromPage, sourceNote, summaryLangId };
  }

  async function summarizeArticle(article, options) {
    if (!window.TnewsArticleContent?.loadFromArticlePage) {
      throw new Error("وحدة تحميل المقال غير متوفرة");
    }

    const onStatus = options?.onStatus;
    onStatus?.(STATUS.ar.load);

    const loaded = await window.TnewsArticleContent.loadFromArticlePage(article, onStatus);
    const langId = window.TnewsSummaryLanguage?.getLangId?.() || "tn";
    onStatus?.(STATUS[langId]?.load || STATUS.ar.load);
    return buildSummary(loaded, langId, onStatus);
  }

  function formatSummaryHtml(text) {
    const escaped = String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/_(.+?)_/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  }

  window.TnewsLocalSummary = {
    summarizeArticle,
    formatSummaryHtml,
    isFree: true,
    isOffline: true,
  };
})();
