(function () {
  const W = 1080;
  const H = 1920;
  const BG = "#070b12";
  const GREEN = "#34d399";
  const WHITE = "#f8fafc";
  const MUTED = "#94a3b8";
  const LINE = "rgba(255,255,255,0.12)";

  const SOURCE_LABELS = {
    nawaat: "نواة — Nawaat",
    alqatiba: "الكتيبة — Al Katiba",
    "tap-tn-ar": "TAP — تونس afrique",
    "lapresse-tn-ar": "La Presse — العربية",
    "mosaique-ar": "موزاييك — Mosaique FM",
    businessnews: "Business News",
    "webdo-fr": "Webdo.tn",
  };

  function sourceLabel(article) {
    return SOURCE_LABELS[article.sourceId] || article.sourceLabel || "Tnews";
  }

  function formatShareDate(pubDate) {
    if (!pubDate) return "";
    const date = new Date(pubDate);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("ar-TN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
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

  function drawBrand(ctx, x, y, source, large) {
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `700 ${large ? 72 : 44}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = GREEN;
    ctx.fillText("TNEWS", x, y);

    ctx.font = `400 ${large ? 36 : 28}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = WHITE;
    ctx.fillText(source, x, y + (large ? 88 : 54));
  }

  function drawRightBlock(ctx, article, topY) {
    const pad = 72;
    const rightX = W - pad;
    const maxW = W - pad * 2;
    const source = sourceLabel(article);

    ctx.textAlign = "right";
    ctx.textBaseline = "top";

    ctx.font = '700 40px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = GREEN;
    ctx.fillText("TNEWS", rightX, topY);

    ctx.font = '400 30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = WHITE;
    ctx.fillText(source, rightX, topY + 52);

    let y = topY + 120;

    ctx.font = '700 52px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = WHITE;
    const titleLines = wrapLines(ctx, article.title, maxW, 4);
    const titleLineH = 68;
    for (const ln of titleLines) {
      ctx.fillText(ln, rightX, y);
      y += titleLineH;
    }

    y += 16;
    const dateStr = formatShareDate(article.pubDate);
    if (dateStr) {
      ctx.font = '400 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = MUTED;
      ctx.fillText(dateStr, rightX, y);
      y += 48;
    }

    const summary = shorten(article.summary || "", 380);
    if (summary) {
      ctx.font = '400 34px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = "rgba(248,250,252,0.92)";
      const sumLines = wrapLines(ctx, summary, maxW, 8);
      const sumLineH = 52;
      for (const ln of sumLines) {
        ctx.fillText(ln, rightX, y);
        y += sumLineH;
      }
    }
  }

  function renderShareCanvas(article) {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    const source = sourceLabel(article);
    drawBrand(ctx, W / 2, 120, source, true);

    const panelTop = Math.floor(H * 0.52);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(72, panelTop);
    ctx.lineTo(W - 72, panelTop);
    ctx.stroke();

    drawRightBlock(ctx, article, panelTop + 48);

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
    const canvas = renderShareCanvas(article);
    const blob = await canvasToBlob(canvas);

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
          title: "Tnews",
          files: [written.uri],
          dialogTitle: "مشاركة",
        });
        return;
      }
    }

    const file = new File([blob], "tnews-story.png", { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Tnews" });
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tnews-story.png";
    a.click();
    URL.revokeObjectURL(url);
  }

  window.TnewsShareCard = { shareArticleImage, sourceLabel };
})();
