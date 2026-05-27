(function () {
  function buildLocalSummary(loaded) {
    const sourceNote = window.TnewsArticleContent?.sourceLabelArabic
      ? window.TnewsArticleContent.sourceLabelArabic(loaded)
      : "";

    const langLabel = window.TnewsSummaryLanguage?.getLang?.()?.label || "";
    return {
      text:
        `**${langLabel || "Groq"} — مفتاح Groq مطلوب**\n\n` +
        `الملخص المترجم يعمل فقط مع Groq (مفتاح \`gsk_\`).\n\n` +
        `أضف \`GROQ_API_KEY\` في GitHub Actions وأعد بناء الـ IPA، أو محلياً:\n` +
        `\`$env:GROQ_API_KEY = "gsk_..."; npm run ai:config\``,
      fromPage: loaded.fromPage,
      sourceNote,
    };
  }

  async function summarizeArticle(article, options) {
    if (!window.TnewsArticleContent?.loadFromArticlePage) {
      throw new Error("وحدة تحميل المقال ما تهيأتش");
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
      .replace(/_(.+?)_/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  }

  window.TnewsLocalSummary = {
    summarizeArticle,
    formatSummaryHtml,
    isFree: true,
  };
})();
