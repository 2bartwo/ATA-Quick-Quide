(function () {
  const canvas = document.getElementById("stars");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let stars = [];
  let w = 0;
  let h = 0;
  let raf = 0;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    w = Math.floor(cssW * dpr);
    h = Math.floor(cssH * dpr);
    canvas.width = w;
    canvas.height = h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(640, Math.floor((cssW * cssH) / 4800));
    const drift = reducedMotion ? 0.018 : 0.22;
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * cssW,
        y: Math.random() * cssH,
        z: Math.random(),
        r: Math.random() * 1.5 + 0.15,
        vx: (Math.random() - 0.5) * drift,
        vy: (Math.random() - 0.5) * drift,
        tw: Math.random() * Math.PI * 2,
        ts: reducedMotion ? 0.012 : 0.045 + Math.random() * 0.11,
        tw2: Math.random() * Math.PI * 2,
        ts2: reducedMotion ? 0.008 : 0.08 + Math.random() * 0.14,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function tick() {
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    const trail = reducedMotion ? 0.32 : 0.38;
    ctx.fillStyle = `rgba(0, 0, 0, ${trail})`;
    ctx.fillRect(0, 0, cssW, cssH);

    for (const s of stars) {
      s.x += s.vx;
      s.y += s.vy;
      s.tw += s.ts;
      s.tw2 += s.ts2;
      if (s.x < -6) s.x = cssW + 6;
      if (s.x > cssW + 6) s.x = -6;
      if (s.y < -6) s.y = cssH + 6;
      if (s.y > cssH + 6) s.y = -6;

      const slow = 0.5 + 0.5 * Math.sin(s.tw + s.phase);
      const fast = 0.5 + 0.5 * Math.sin(s.tw2 * 2.1 + s.phase * 1.7);
      const pulse = reducedMotion ? 0.55 + 0.45 * slow : 0.08 + 0.92 * slow * (0.65 + 0.35 * fast);
      const alpha = (0.06 + s.z * 0.62) * pulse;
      const radius = s.r * (0.55 + s.z * 0.65) * (0.85 + 0.15 * fast);
      ctx.beginPath();
      ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha)})`;
      ctx.fill();
    }

    raf = requestAnimationFrame(tick);
  }

  window.addEventListener("resize", () => {
    cancelAnimationFrame(raf);
    resize();
    tick();
  });

  resize();
  tick();
})();
