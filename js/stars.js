(function () {
  const canvas = document.getElementById("stars");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let stars = [];
  let w = 0;
  let h = 0;
  let raf = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    w = Math.floor(cssW * dpr);
    h = Math.floor(cssH * dpr);
    canvas.width = w;
    canvas.height = h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(420, Math.floor((cssW * cssH) / 6500));
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * cssW,
        y: Math.random() * cssH,
        z: Math.random(),
        r: Math.random() * 1.4 + 0.2,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        tw: Math.random() * Math.PI * 2,
        ts: 0.015 + Math.random() * 0.04,
      });
    }
  }

  function tick() {
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(0, 0, cssW, cssH);

    for (const s of stars) {
      s.x += s.vx;
      s.y += s.vy;
      s.tw += s.ts;
      if (s.x < -4) s.x = cssW + 4;
      if (s.x > cssW + 4) s.x = -4;
      if (s.y < -4) s.y = cssH + 4;
      if (s.y > cssH + 4) s.y = -4;

      const pulse = 0.45 + Math.sin(s.tw) * 0.35;
      const alpha = (0.12 + s.z * 0.5) * pulse;
      const neon = s.z > 0.62;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * (0.7 + s.z * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = neon
        ? `rgba(100, 255, 245, ${alpha * 0.95})`
        : `rgba(255, 255, 255, ${alpha})`;
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
