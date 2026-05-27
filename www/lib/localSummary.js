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

  function headers() {
    return window.TnewsTunisianStyle?.getLocalHeaders?.() || window.TnewsTunisianStyle?.LOCAL_HEADERS || {};
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
      .split(/(?<=،)\s+/)
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

  function leadSectionTitle(author, H) {
    const name = cleanText(author);
    return name || H.lead || "";
  }

  async function buildSummary(loaded, summaryLangId, onStatus) {
    const H = headers();
    const title = cleanText(loaded.title);
    const body = cleanText(loaded.body);
    const fromPage = loaded.fromPage;
    const sourceLangHint = loaded.locale || loaded.sourceLang || "";
    const sentences = splitSentences(body);

    const sourceNote = window.TnewsArticleContent?.sourceLabelArabic
      ? window.TnewsArticleContent.sourceLabelArabic(loaded)
      : fromPage
        ? H.fromArticle
        : H.fromRss;

    const sectionLead = leadSectionTitle(loaded.author, H);

    if (!sentences.length) {
      return {
        text:
          `${H.intro || "📰"}\n\n**${sectionLead}**\n${title}\n\n**${H.empty || ""}**`,
        fromPage,
        sourceNote,
      };
    }

    let picked = pickTopSentences(sentences, title, Math.min(5, sentences.length));

    const translateOpts = { sourceLang: sourceLangHint };
    if (window.TnewsFreeTranslate?.needsTranslation?.(body, summaryLangId, sourceLangHint)) {
      onStatus?.(STATUS[summaryLangId]?.translate || STATUS.ar.translate);
      picked = await window.TnewsFreeTranslate.translateSentences(
        picked,
        summaryLangId,
        (n, total) => {
          onStatus?.(`${STATUS[summaryLangId]?.translate || ""} (${n}/${total})`);
        },
        translateOpts,
      );
    }

    const lead = picked[0] || title;
    const bullets = picked.slice(1, 4);
    const extra = picked[4];

    let out = `${H.intro || "📰"}\n\n`;
    out += `**${sectionLead}**\n${lead}\n\n`;
    out += `**${H.points || ""}**\n`;
    out += bullets.length ? bullets.map((b) => `• ${b}`).join("\n") : `• ${lead}`;
    out += `\n\n**${H.context || ""}**\n${extra || bullets[bullets.length - 1] || lead}`;
    out += `\n\n**${H.source || ""}**\n${sourceNote}`;

    return { text: out, fromPage, sourceNote };
  }

  async function summarizeArticle(article, options) {
    if (!window.TnewsArticleContent?.loadFromArticlePage) {
      throw new Error("وحدة تحميل المقال غير متوفرة");
    }

    const langId = window.TnewsSummaryLanguage?.getLangId?.() || "tn";
    const onStatus = options?.onStatus;
    onStatus?.(STATUS[langId]?.load || STATUS.ar.load);

    const loaded = await window.TnewsArticleContent.loadFromArticlePage(article, onStatus);
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
