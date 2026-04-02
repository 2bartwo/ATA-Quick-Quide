(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SIZE = 48;

  const titleSteps = reduced
    ? [{ text: "bartwo", ms: 9999999 }]
    : [
        { text: "insta: 2bartwo", ms: 2800 },
        { text: "\u200b", ms: 750 },
        { text: "bartwo", ms: 2600 },
        { text: "\u200b", ms: 750 },
        { text: "\u26e4 \u26e4 \u26e4 \u26e4 \u26e4", ms: 2800 },
        { text: "\u200b", ms: 750 },
      ];

  let titleIndex = 0;
  function runTitleCycle() {
    const step = titleSteps[titleIndex];
    document.title = step.text;
    titleIndex = (titleIndex + 1) % titleSteps.length;
    setTimeout(runTitleCycle, step.ms);
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
    ctx.fillStyle = "#030308";
    ctx.fillRect(0, 0, SIZE, SIZE);
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const r = SIZE * 0.38;

    ctx.save();
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";
    ctx.miterLimit = 2;

    for (let pass = 0; pass < 3; pass++) {
      const blur = pass === 0 ? 10 : pass === 1 ? 4 : 0;
      const alpha = pass === 0 ? 0.35 : pass === 1 ? 0.65 : 1;
      ctx.strokeStyle =
        pass === 2 ? "rgba(220, 255, 255, 0.95)" : "rgba(120, 240, 255, " + alpha + ")";
      ctx.lineWidth = pass === 2 ? 1.6 : 2.2;
      ctx.shadowColor = "rgba(0, 255, 255, 0.9)";
      ctx.shadowBlur = blur;
      pentagramPath(ctx, cx, cy, r, angle);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 0.85;
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
