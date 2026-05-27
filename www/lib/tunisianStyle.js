(function () {
  const BASE_SYSTEM = `أنت صحفي ومحلّل أخبار تونسي. تلخّص الأخبار بوضوح دون اختراع معلومات — اعتمد فقط على نص المقال المعطى.`;

  const LOCAL_HEADERS_TN = {
    intro: "📰 **هاو الخبر — شرح بالدارجة**",
    lead: "شنوة اللي صاير (بالخلاصة)",
    points: "أهم الحاجات",
    context: "علاش هاذي تهمّ",
    source: "منين جابينا النص",
    empty: "ما لقيناش فقرات كافية في المقال — جرّب تفتح المصدر.",
    fromArticle: "من المقال نفسه على الموقع",
    fromRss: "من RSS برك (الصفحة ما تحمّتش)",
  };

  const LOCAL_HEADERS_AR = {
    intro: "📰 **ملخص الخبر**",
    lead: "الفكرة الرئيسية",
    points: "أهم النقاط",
    context: "السياق والأهمية",
    source: "المصدر",
    empty: "لم نجد نصاً كافياً في المقال.",
    fromArticle: "من صفحة المقال",
    fromRss: "من RSS فقط",
  };

  function getStyle() {
    const lang = window.TnewsSummaryLanguage?.getLang?.();
    if (lang) {
      return {
        SYSTEM_PROMPT: `${BASE_SYSTEM}\n\n${lang.systemExtra}`,
        USER_SECTIONS: lang.sections,
        translateNote: lang.translateNote,
      };
    }
    return {
      SYSTEM_PROMPT: `${BASE_SYSTEM}\n\nاكتب بالدارجة التونسية (مش فصحى).`,
      USER_SECTIONS: `1) **شنوة اللي صاير (بالخلاصة)**
2) **أهم الحاجات**
3) **علاش هاذي تهمّ**
4) **شنية تتبّعها**`,
      translateNote: "ترجم العنوان والنص للدارجة التونسية في ردك كامل.",
    };
  }

  function getLocalHeaders() {
    const id = window.TnewsSummaryLanguage?.getLangId?.() || "tn";
    if (id === "ar") return LOCAL_HEADERS_AR;
    return LOCAL_HEADERS_TN;
  }

  window.TnewsTunisianStyle = {
    getStyle,
    getLocalHeaders,
    LOCAL_HEADERS: LOCAL_HEADERS_TN,
  };
})();
