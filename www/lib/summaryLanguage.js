(function () {
  /** Summary follows article language — no user-facing summary-lang picker. */
  function getAnalyzeBtnLabel() {
    if (window.TnewsUi?.t) return window.TnewsUi.t("summarizeArticle");
    return "✨ ملخص";
  }

  window.TnewsSummaryLanguage = {
    getAnalyzeBtnLabel,
  };
})();
