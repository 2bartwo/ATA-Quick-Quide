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
    const count = Math.min(520, Math.floor((cssW * cssH) / 5200));
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * cssW,
        y: Math.random() * cssH,
        z: Math.random(),
        r: Math.random() * 1.4 + 0.2,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        tw: Math.random() * Math.PI * 2,
        ts: 0.02 + Math.random() * 0.06,
      });
    }
  }

  function tick() {
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(0, 0, cssW, cssH);

    for (const s of stars) {
      s.x += s.vx;
      s.y += s.vy;
      s.tw += s.ts;
      if (s.x < -4) s.x = cssW + 4;
      if (s.x > cssW + 4) s.x = -4;
      if (s.y < -4) s.y = cssH + 4;
      if (s.y > cssH + 4) s.y = -4;

      const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.tw));
      const alpha = (0.08 + s.z * 0.55) * pulse;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * (0.65 + s.z * 0.55), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
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
