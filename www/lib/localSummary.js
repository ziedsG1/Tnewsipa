(function () {
  const STOP_WORDS = new Set([
    "في", "من", "إلى", "على", "أن", "ان", "هذا", "هذه", "التي", "الذي", "مع", "عن", "ما", "لا",
    "تم", "قد", "كان", "the", "and", "for", "with", "from", "that", "des", "les", "une", "dans",
  ]);

  const STATUS = {
    ar: "جاري تحميل المقال…",
    fr: "Chargement de l'article…",
    en: "Loading article…",
    tn: "قاعدين نجيبو المقال…",
  };

  function cleanText(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function arabicRatio(text) {
    const sample = String(text || "").replace(/\s/g, "");
    if (!sample.length) return 0;
    return (sample.match(/[\u0600-\u06FF]/g) || []).length / sample.length;
  }

  function frenchRatio(text) {
    const sample = String(text || "").slice(0, 2500);
    const letters = sample.replace(/\s/g, "").length || 1;
    const frWords = (
      sample.match(
        /\b(le|la|les|des|du|de|un|une|dans|pour|avec|est|sont|qui|que)\b|[àâäéèêëïîôùûüçœæ]/gi,
      ) || []
    ).length;
    return frWords / letters;
  }

  function articleLangId(loaded) {
    const hint = loaded.sourceLang || loaded.locale || "";
    if (hint === "fr" || hint === "en" || hint === "ar") return hint;

    const sample = `${loaded.title || ""} ${loaded.body || ""}`;
    if (arabicRatio(sample) > 0.12) return "ar";
    if (frenchRatio(sample) > 0.05) return "fr";
    return "ar";
  }

  function headers(articleLang) {
    return (
      window.TnewsTunisianStyle?.getLocalHeaders?.(articleLang) ||
      window.TnewsTunisianStyle?.LOCAL_HEADERS ||
      {}
    );
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

  function formatAuthorBlock(author, H) {
    const name = cleanText(author);
    if (!name) return "";
    return `**${H.authorLabel || "Author name"}**\n${name}\n\n`;
  }

  function buildSummary(loaded, onStatus) {
    const lang = articleLangId(loaded);
    const H = headers(lang);
    const title = cleanText(loaded.title);
    const body = cleanText(loaded.body);
    const fromPage = loaded.fromPage;

    onStatus?.(STATUS[lang] || STATUS.ar);

    const sourceNote = (() => {
      if (loaded.fromPage && loaded.source === "article") return H.fromArticle;
      if (loaded.fromPage) return H.fromArticlePartial || H.fromArticle;
      return H.fromRss;
    })();

    const sentences = splitSentences(body);
    const authorBlock = formatAuthorBlock(loaded.author, H);

    if (!sentences.length) {
      let out = `${H.intro || "📰"}\n\n`;
      out += authorBlock;
      out += `**${H.empty || ""}**`;
      return { text: out, fromPage, sourceNote, articleLang: lang };
    }

    const bullets = pickTopSentences(sentences, title, Math.min(4, sentences.length));

    let out = `${H.intro || "📰"}\n\n`;
    out += authorBlock;
    out += `**${H.points || ""}**\n`;
    out += bullets.length
      ? bullets.map((b) => `• ${b}`).join("\n")
      : `• ${title}`;
    out += `\n\n**${H.source || ""}**\n${sourceNote}`;

    return { text: out, fromPage, sourceNote, articleLang: lang };
  }

  async function summarizeArticle(article, options) {
    if (!window.TnewsArticleContent?.loadFromArticlePage) {
      throw new Error("وحدة تحميل المقال غير متوفرة");
    }

    const onStatus = options?.onStatus;
    const loaded = await window.TnewsArticleContent.loadFromArticlePage(article, onStatus);
    return buildSummary(loaded, onStatus);
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
    articleLangId,
    isFree: true,
    isOffline: true,
  };
})();
