(function () {
  const canvas = document.getElementById("vhs-noise");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  let w = 0;
  let h = 0;
  let raf = 0;
  let last = 0;
  const interval = mq.matches ? 240 : 72;

  function resize() {
    const scale = 0.28;
    const cssW = Math.max(1, Math.floor(window.innerWidth * scale));
    const cssH = Math.max(1, Math.floor(window.innerHeight * scale));
    if (cssW === w && cssH === h) return;
    w = cssW;
    h = cssH;
    canvas.width = w;
    canvas.height = h;
  }

  function draw(now) {
    raf = requestAnimationFrame(draw);
    if (now - last < interval) return;
    last = now;

    const id = ctx.createImageData(w, h);
    const data = id.data;
    const base = mq.matches ? 20 : 36;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() * 38 + 92) | 0;
      data[i] = n;
      data[i + 1] = n;
      data[i + 2] = n;
      data[i + 3] = base + ((Math.random() * 14) | 0);
    }
    ctx.putImageData(id, 0, 0);
  }

  function start() {
    cancelAnimationFrame(raf);
    resize();
    last = 0;
    raf = requestAnimationFrame(draw);
  }

  window.addEventListener("resize", start);
  mq.addEventListener("change", start);
  start();
})();
