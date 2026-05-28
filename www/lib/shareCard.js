(function () {
  const W = 1080;
  const H = 1920;
  const BG = "#070b12";
  const WHITE = "#f8fafc";
  const MUTED = "#94a3b8";
  const LINE = "rgba(255,255,255,0.12)";

  function getCountry() {
    return window.TnewsCountries?.getCurrent?.() || window.TnewsCountries?.COUNTRIES?.tn;
  }

  function shareColors(country) {
    const c = country || getCountry();
    return {
      accent: c?.share?.accent || "#34d399",
      accentSoft: c?.share?.accentSoft || "#0ea5e9",
      bg: BG,
    };
  }

  function sourceLabel(article) {
    return article.sourceLabel || getCountry()?.brand || "Tnews";
  }

  function formatShareDate(pubDate, country) {
    if (!pubDate) return "";
    const date = new Date(pubDate);
    if (Number.isNaN(date.getTime())) return "";
    const locale =
      country?.defaultUiLang === "fr"
        ? "fr-FR"
        : country?.pageDir === "rtl"
          ? "ar"
          : "en";
    return date.toLocaleString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function shorten(text, max = 320) {
    const t = String(text || "").trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1).trim()}…`;
  }

  function wrapLines(ctx, text, maxWidth, maxLines) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";

    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
      if (lines.length >= maxLines) break;
    }

    if (line && lines.length < maxLines) lines.push(line);

    if (words.length && lines.length === maxLines) {
      const last = lines[maxLines - 1];
      let trimmed = last;
      while (ctx.measureText(`${trimmed}…`).width > maxWidth && trimmed.length > 0) {
        trimmed = trimmed.slice(0, -1);
      }
      lines[maxLines - 1] = `${trimmed}…`;
    }

    return lines;
  }

  function drawImageCover(ctx, img, x, y, w, h) {
    const scale = Math.max(w / img.width, h / img.height);
    const sw = img.width * scale;
    const sh = img.height * scale;
    const sx = x + (w - sw) / 2;
    const sy = y + (h - sh) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 24);
    ctx.clip();
    ctx.drawImage(img, sx, sy, sw, sh);
    ctx.restore();
  }

  function drawBrandHeader(ctx, country, colors, y) {
    const pad = 72;
    const isRtl = country?.pageDir === "rtl";
    const x = isRtl ? W - pad : pad;
    ctx.textAlign = isRtl ? "right" : "left";
    ctx.textBaseline = "top";

    ctx.font =
      '700 56px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = colors.accent;
    ctx.fillText(String(country.brand || "Tnews").toUpperCase(), x, y);
  }

  function drawArticleBlock(ctx, article, country, colors, topY, heroBottom) {
    const pad = 72;
    const isRtl = country?.pageDir === "rtl";
    const alignX = isRtl ? W - pad : pad;
    const maxW = W - pad * 2;
    const source = sourceLabel(article);

    ctx.textAlign = isRtl ? "right" : "left";
    ctx.textBaseline = "top";

    let y = Math.max(topY, heroBottom + 40);

    ctx.font =
      '700 48px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = WHITE;
    const titleLines = wrapLines(ctx, article.title, maxW, 4);
    for (const ln of titleLines) {
      ctx.fillText(ln, alignX, y);
      y += 62;
    }

    y += 12;
    ctx.font =
      '400 30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = colors.accentSoft;
    ctx.fillText(source, alignX, y);
    y += 44;

    const dateStr = formatShareDate(article.pubDate, country);
    if (dateStr) {
      ctx.fillStyle = MUTED;
      ctx.fillText(dateStr, alignX, y);
      y += 40;
    }

    const summary = shorten(article.summary || "", 360);
    if (summary) {
      y += 8;
      ctx.font =
        '400 34px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = "rgba(248,250,252,0.92)";
      const sumLines = wrapLines(ctx, summary, maxW, 6);
      for (const ln of sumLines) {
        ctx.fillText(ln, alignX, y);
        y += 50;
      }
    }
  }

  function renderShareCanvas(article, heroImage) {
    const country = getCountry();
    const colors = shareColors(country);
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, W, H);

    const headerY = 96;
    drawBrandHeader(ctx, country, colors, headerY);

    const heroX = 72;
    const heroY = 280;
    const heroW = W - 144;
    const heroH = heroImage ? 720 : 0;

    if (heroImage) {
      drawImageCover(ctx, heroImage, heroX, heroY, heroW, heroH);
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 2;
      ctx.strokeRect(heroX, heroY, heroW, heroH);
    } else {
      const placeholderY = heroY;
      const placeholderH = 480;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.roundRect(heroX, placeholderY, heroW, placeholderH, 24);
      ctx.fill();
      ctx.font =
        '700 40px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = colors.accent;
      ctx.textAlign = "center";
      ctx.fillText(
        String(country?.brand || "Tnews").toUpperCase(),
        W / 2,
        placeholderY + placeholderH / 2 - 20,
      );
      drawArticleBlock(
        ctx,
        article,
        country,
        colors,
        placeholderY + placeholderH + 32,
        placeholderY + placeholderH,
      );
      return canvas;
    }

    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(72, heroY + heroH + 32);
    ctx.lineTo(W - 72, heroY + heroH + 32);
    ctx.stroke();

    drawArticleBlock(ctx, article, country, colors, heroY + heroH + 56, heroY + heroH);

    return canvas;
  }

  async function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create image"));
      }, "image/png", 1);
    });
  }

  async function shareArticleImage(article) {
    const country = getCountry();
    let heroImage = null;

    if (window.TnewsArticleImage?.fetchArticleImageUrl) {
      const imageUrl = await window.TnewsArticleImage.fetchArticleImageUrl(article);
      if (imageUrl && window.TnewsArticleImage.loadImageElement) {
        heroImage = await window.TnewsArticleImage.loadImageElement(imageUrl);
      }
    }

    const canvas = renderShareCanvas(article, heroImage);
    const blob = await canvasToBlob(canvas);
    const brand = country?.brand || "Tnews";

    if (window.Capacitor?.isNativePlatform?.()) {
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const fs = window.Capacitor.Plugins.Filesystem;
      const share = window.Capacitor.Plugins.Share;
      const fileName = `tnews-share-${Date.now()}.png`;

      if (fs?.writeFile && share?.share) {
        const written = await fs.writeFile({
          path: fileName,
          data: base64,
          directory: "CACHE",
        });
        await share.share({
          title: brand,
          files: [written.uri],
          dialogTitle: "مشاركة",
        });
        return;
      }
    }

    const file = new File([blob], `${brand}-story.png`, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: brand });
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brand}-story.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  window.TnewsShareCard = { shareArticleImage, sourceLabel };
})();
