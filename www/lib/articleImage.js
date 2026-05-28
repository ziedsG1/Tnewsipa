(function () {
  function extractOgImageUrl(html, pageUrl) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (doc.querySelector("parsererror")) return "";

    const candidates = [
      doc.querySelector('meta[property="og:image"]')?.getAttribute("content"),
      doc.querySelector('meta[property="og:image:url"]')?.getAttribute("content"),
      doc.querySelector('meta[name="twitter:image"]')?.getAttribute("content"),
      doc.querySelector('meta[name="twitter:image:src"]')?.getAttribute("content"),
    ];

    for (const raw of candidates) {
      const u = String(raw || "").trim();
      if (!u) continue;
      try {
        const abs = new URL(u, pageUrl).href;
        if (/^https?:\/\//i.test(abs)) return abs;
      } catch {
        /* next */
      }
    }
    return "";
  }

  async function fetchArticleImageUrl(article) {
    const link = article?.link;
    if (!link || !/^https?:\/\//i.test(link)) return "";

    try {
      const html = await window.TnewsHttp.getText(link, {
        Accept: "text/html,application/xhtml+xml,*/*",
      });
      return extractOgImageUrl(html, link);
    } catch {
      return "";
    }
  }

  async function loadImageElement(imageUrl) {
    if (!imageUrl) return null;

    if (window.Capacitor?.isNativePlatform?.()) {
      try {
        const blob = await window.TnewsHttp.getBlob(imageUrl, { Accept: "image/*,*/*" });
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        return await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = dataUrl;
        });
      } catch {
        /* fall through */
      }
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = imageUrl;
    });
  }

  window.TnewsArticleImage = {
    fetchArticleImageUrl,
    loadImageElement,
    extractOgImageUrl,
  };
})();
