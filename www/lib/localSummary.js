(function () {
  const STOP_WORDS = new Set([
    "في", "من", "إلى", "على", "أن", "ان", "هذا", "هذه", "التي", "الذي", "مع", "عن", "ما", "لا",
    "تم", "قد", "كان", "كانت", "بعد", "قبل", "أو", "او", "كل", "ذلك", "هو", "هي", "وفق", "حسب",
    "ضمن", "خلال", "لدى", "حول", "بين", "the", "and", "for", "with", "from", "that", "this",
    "des", "les", "une", "dans",
  ]);

  function tokenize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  }

  function splitSentences(text) {
    const parts = String(text || "")
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?؟؛])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 35 && s.length <= 520);

    if (parts.length >= 2) return parts;

    const chunks = String(text || "")
      .replace(/\s+/g, " ")
      .split(/(?<=،)\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 40);

    return chunks.length ? chunks : parts.length ? parts : [String(text || "").trim()].filter(Boolean);
  }

  function scoreSentence(sentence, titleTokens, index) {
    const tokens = tokenize(sentence);
    let overlap = 0;
    for (const t of tokens) {
      if (titleTokens.has(t)) overlap += 1;
    }
    const positionBonus = index === 0 ? 3 : index < 4 ? 2 : index < 10 ? 1 : 0;
    const lengthBonus = sentence.length >= 50 && sentence.length <= 320 ? 1.5 : 0;
    return overlap * 2.2 + positionBonus + lengthBonus + Math.min(tokens.length, 14) * 0.08;
  }

  function pickTopSentences(sentences, titleTokens, maxCount) {
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

  function buildLocalSummary(loaded) {
    const { title, body, fromPage } = loaded;
    const sentences = splitSentences(body);
    const titleTokens = new Set(tokenize(title));
    const sourceNote = window.TnewsArticleContent?.sourceLabelArabic
      ? window.TnewsArticleContent.sourceLabelArabic(loaded)
      : fromPage
        ? "من صفحة المقال"
        : "من RSS";

    if (!sentences.length) {
      return {
        text:
          `**الفكرة الرئيسية**\n${title}\n\n` +
          `**ملاحظة**\nتعذّر استخراج فقرات من المقال.`,
        fromPage,
        sourceNote,
      };
    }

    const top = pickTopSentences(sentences, titleTokens, Math.min(6, sentences.length));
    const lead = top[0] || title;
    const bullets = top.slice(1, 5);
    const extra = top[5];

    let out = `**الفكرة الرئيسية**\n${lead}\n\n**أهم النقاط**\n`;
    out += bullets.length ? bullets.map((b) => `• ${b}`).join("\n") : `• ${lead}`;
    out += `\n\n**السياق**\n${extra || bullets[bullets.length - 1] || lead}`;
    out += `\n\n**المصدر**\n${sourceNote} — جُمِع الملخص من نص المقال نفسه.`;

    return { text: out, fromPage, sourceNote };
  }

  async function summarizeArticle(article, options) {
    if (!window.TnewsArticleContent?.loadFromArticlePage) {
      throw new Error("وحدة تحميل المقال غير متوفرة");
    }
    const loaded = await window.TnewsArticleContent.loadFromArticlePage(article, options?.onStatus);
    return buildLocalSummary(loaded);
  }

  function formatSummaryHtml(text) {
    const escaped = String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  }

  window.TnewsLocalSummary = {
    summarizeArticle,
    formatSummaryHtml,
    isFree: true,
  };
})();
