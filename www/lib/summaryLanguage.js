(function () {
  const STORAGE_KEY = "tnews-summary-lang";

  const LANGUAGES = {
    tn: {
      id: "tn",
      label: "🇹🇳 دارجة",
      analyzeBtn: "✨ فسّرلي بالدارجة",
      panelTitle: "الخبر بالدارجة",
      systemExtra:
        "اكتب بالدارجة التونسية (مش فصحى). الأسلوب كول وواضح كيف ما تحكي لصاحبك.",
      sections: `1) **شنوة اللي صاير (بالخلاصة)**
2) **أهم الحاجات**
3) **علاش هاذي تهمّ**
4) **شنية تتبّعها**`,
      translateNote: "ترجم العنوان والنص للدارجة التونسية في ردك كامل.",
    },
    ar: {
      id: "ar",
      label: "عربي",
      analyzeBtn: "✨ لخّص الخبر",
      panelTitle: "ملخص الخبر",
      systemExtra: "اكتب بالعربية الفصحى الحديثة الواضحة (ليست دارجة).",
      sections: `1) **الفكرة الرئيسية**
2) **أهم النقاط**
3) **السياق والأهمية**
4) **ما يجب متابعته**`,
      translateNote: "ترجم العنوان وجميع الجمل في الملخص إلى العربية الفصحى.",
    },
    en: {
      id: "en",
      label: "EN",
      analyzeBtn: "✨ Summarize",
      panelTitle: "News summary",
      systemExtra: "Write in clear, modern English. Casual but professional tone.",
      sections: `1) **Headline summary**
2) **Key points**
3) **Why it matters**
4) **What to watch**`,
      translateNote: "Translate the title and write the entire summary in English.",
    },
    fr: {
      id: "fr",
      label: "FR",
      analyzeBtn: "✨ Résumer",
      panelTitle: "Résumé de l'article",
      systemExtra: "Écris en français clair et moderne. Ton accessible et direct.",
      sections: `1) **L'essentiel**
2) **Points clés**
3) **Pourquoi c'est important**
4) **À suivre**`,
      translateNote: "Traduis le titre et rédige tout le résumé en français.",
    },
  };

  function getLang() {
    const id = localStorage.getItem(STORAGE_KEY) || "tn";
    return LANGUAGES[id] || LANGUAGES.tn;
  }

  function setLang(id) {
    if (LANGUAGES[id]) localStorage.setItem(STORAGE_KEY, id);
  }

  function getLangId() {
    return getLang().id;
  }

  function needsCloudForBestResult() {
    return true;
  }

  function getAnalyzeBtnLabel() {
    return getLang().analyzeBtn || LANGUAGES.tn.analyzeBtn;
  }

  window.TnewsSummaryLanguage = {
    LANGUAGES,
    getLang,
    setLang,
    getLangId,
    getAnalyzeBtnLabel,
    needsCloudForBestResult,
  };
})();
