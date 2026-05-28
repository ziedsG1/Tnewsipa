(function () {
  const LOCAL_HEADERS_TN = {
    intro: "📰 **هاو الخبر — من المقال**",
    authorLabel: "اسم الكاتب",
    lead: "شنوة اللي صاير (بالخلاصة)",
    points: "أهم الحاجات",
    context: "علاش هاذي تهمّ",
    source: "منين جابينا النص",
    empty: "ما لقيناش فقرات كافية — افتح المصدر.",
    fromArticle: "من صفحة المقال",
    fromArticlePartial: "من المقال (جزء)",
    fromRss: "من RSS",
  };

  const LOCAL_HEADERS_AR = {
    intro: "📰 **ملخص الخبر — من المقال**",
    authorLabel: "اسم الكاتب",
    lead: "الفكرة الرئيسية",
    points: "أهم النقاط",
    context: "السياق والأهمية",
    source: "المصدر",
    empty: "لم نجد نصاً كافياً في المقال.",
    fromArticle: "من صفحة المقال",
    fromArticlePartial: "من المقال (جزء)",
    fromRss: "من RSS",
  };

  const LOCAL_HEADERS_EN = {
    intro: "📰 **Summary from the article**",
    authorLabel: "Author name",
    lead: "Main idea",
    points: "Key points",
    context: "Why it matters",
    source: "Source",
    empty: "Not enough text in the article.",
    fromArticle: "From article page",
    fromArticlePartial: "From article (partial)",
    fromRss: "From RSS feed",
  };

  const LOCAL_HEADERS_FR = {
    intro: "📰 **Résumé tiré de l'article**",
    authorLabel: "Nom de l'auteur",
    lead: "L'essentiel",
    points: "Points clés",
    context: "Pourquoi c'est important",
    source: "Source",
    empty: "Pas assez de texte dans l'article.",
    fromArticle: "Page de l'article",
    fromArticlePartial: "Article (partiel)",
    fromRss: "Flux RSS",
  };

  const BASE_SYSTEM = "أنت مساعد أخبار يعتمد فقط على نص المقال.";

  function getStyle() {
    const lang = window.TnewsSummaryLanguage?.getLang?.();
    if (lang) {
      return {
        SYSTEM_PROMPT: `${BASE_SYSTEM}\n\n${lang.systemExtra}`,
        USER_SECTIONS: lang.sections,
      };
    }
    return { SYSTEM_PROMPT: BASE_SYSTEM, USER_SECTIONS: "" };
  }

  function getLocalHeaders(langId) {
    const id = langId || window.TnewsSummaryLanguage?.getLangId?.() || "tn";
    if (id === "ar") return LOCAL_HEADERS_AR;
    if (id === "en") return LOCAL_HEADERS_EN;
    if (id === "fr") return LOCAL_HEADERS_FR;
    return LOCAL_HEADERS_TN;
  }

  window.TnewsTunisianStyle = {
    getStyle,
    getLocalHeaders,
    LOCAL_HEADERS: LOCAL_HEADERS_TN,
  };
})();
