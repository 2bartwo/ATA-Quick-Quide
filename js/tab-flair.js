(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SIZE = 48;
  const CURSOR = "|";

  const phrases = reduced
    ? ["Ata Chapters"]
    : ["Ata Chapters", "ata-quick-guide.bartwo.me", "\u26e4 \u26e4 \u26e4 \u26e4 \u26e4"];

  function toChars(s) {
    return Array.from(s);
  }

  function sliceUpto(s, count) {
    return toChars(s)
      .slice(0, count)
      .join("");
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function typeIn(str) {
    const ch = toChars(str);
    for (let i = 0; i <= ch.length; i++) {
      document.title = sliceUpto(str, i) + CURSOR;
      await sleep(i === ch.length ? 0 : 52 + (Math.random() * 28) | 0);
    }
  }

  async function typeOut(str) {
    const n = toChars(str).length;
    for (let len = n; len >= 0; len--) {
      document.title = sliceUpto(str, len) + (len === 0 ? "" : CURSOR);
      await sleep(len === 0 ? 0 : 38 + ((Math.random() * 22) | 0));
    }
  }

  async function holdWithBlink(str, totalMs) {
    const end = Date.now() + totalMs;
    let showCursor = true;
    while (Date.now() < end) {
      document.title = showCursor ? str + CURSOR : str;
      showCursor = !showCursor;
      await sleep(420);
    }
    document.title = str + CURSOR;
  }

  async function runTitleCycle() {
    if (reduced) {
      document.title = phrases[0];
      return;
    }
    while (true) {
      for (const phrase of phrases) {
        await typeIn(phrase);
        await holdWithBlink(phrase, 2000);
        await typeOut(phrase);
        await sleep(380);
      }
    }
  }

  function pentagramPath(ctx, cx, cy, r, rotation) {
    const outer = [];
    for (let i = 0; i < 5; i++) {
      const a = rotation + -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      outer.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    const order = [0, 2, 4, 1, 3, 0];
    ctx.beginPath();
    for (let k = 0; k < order.length; k++) {
      const [x, y] = outer[order[k]];
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawFrame(ctx, angle) {
    ctx.fillStyle = "#050508";
    ctx.fillRect(0, 0, SIZE, SIZE);
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const r = SIZE * 0.38;

    ctx.save();
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";
    ctx.miterLimit = 2;

    for (let pass = 0; pass < 3; pass++) {
      const blur = pass === 0 ? 11 : pass === 1 ? 5 : 0;
      const alpha = pass === 0 ? 0.28 : pass === 1 ? 0.55 : 1;
      ctx.strokeStyle =
        pass === 2
          ? "rgba(255, 255, 255, 0.98)"
          : "rgba(255, 255, 255, " + alpha + ")";
      ctx.lineWidth = pass === 2 ? 1.55 : 2.1;
      ctx.shadowColor = "rgba(255, 255, 255, 0.95)";
      ctx.shadowBlur = blur;
      pentagramPath(ctx, cx, cy, r, angle);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255, 255, 255, 1)";
    ctx.lineWidth = 0.9;
    pentagramPath(ctx, cx, cy, r * 0.92, angle);
    ctx.stroke();
    ctx.restore();
  }

  let link =
    document.getElementById("favicon-dynamic") ||
    document.querySelector('link[rel="icon"]') ||
    document.querySelector('link[rel="shortcut icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    document.head.appendChild(link);
  }
  link.type = "image/png";

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");

  if (reduced) {
    drawFrame(ctx, 0);
    link.href = canvas.toDataURL("image/png");
  } else {
    let angle = 0;
    function faviconTick() {
      angle += 0.09;
      drawFrame(ctx, angle);
      try {
        link.href = canvas.toDataURL("image/png");
      } catch (_) {}
      setTimeout(faviconTick, 90);
    }
    faviconTick();
  }

  runTitleCycle();
})();
