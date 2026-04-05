(function () {
  if (document.body.getAttribute("data-page") !== "index") return;

  function prefersReducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return true;
    }
  }

  function headerOffset() {
    const bar = document.querySelector(".app-top");
    return bar ? bar.getBoundingClientRect().height + 10 : 72;
  }

  function smoothScrollToId(id, durationMs) {
    const el = document.getElementById(id);
    if (!el) return false;
    const targetY = el.getBoundingClientRect().top + window.scrollY - headerOffset();
    const startY = window.scrollY;
    const dist = targetY - startY;
    if (Math.abs(dist) < 2) return true;

    const reduced = prefersReducedMotion();
    if (reduced) {
      window.scrollTo(0, targetY);
      try {
        history.replaceState(null, "", "#" + encodeURIComponent(id));
      } catch (e) {}
      return true;
    }

    const t0 = performance.now();
    const dur = Math.max(480, Math.min(durationMs, 1600));

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function step(now) {
      const t = Math.min((now - t0) / dur, 1);
      const y = startY + dist * easeOutCubic(t);
      window.scrollTo(0, y);
      if (t < 1) requestAnimationFrame(step);
      else {
        try {
          history.replaceState(null, "", "#" + encodeURIComponent(id));
        } catch (e) {}
      }
    }
    requestAnimationFrame(step);
    return true;
  }

  function playJetWhoosh() {
    const ACtx = window.AudioContext || window.webkitAudioContext;
    if (!ACtx) return;
    const ctx = new ACtx();
    const t0 = ctx.currentTime;
    try {
      ctx.resume();
    } catch (e) {}

    const noiseDur = 0.42;
    const bufferSize = ctx.sampleRate * noiseDur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(2400, t0);
    filter.frequency.exponentialRampToValueAtTime(180, t0 + noiseDur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.09, t0 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t0);
    noise.stop(t0 + noiseDur + 0.02);

    window.setTimeout(() => {
      try {
        ctx.close();
      } catch (e) {}
    }, 800);
  }

  function planeSvg() {
    const wrap = document.createElement("div");
    wrap.className = "ata-apk-fly";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML =
      '<svg class="ata-apk-fly__plane" viewBox="0 0 240 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M8 52 L72 38 L118 42 L198 28 L228 18 L236 50 L228 82 L198 72 L118 58 L72 62 Z"/>' +
      '<path d="M108 38 L108 18 L128 14 L132 38 Z"/>' +
      '<ellipse cx="52" cy="50" rx="10" ry="6" opacity="0.35"/>' +
      "</svg>";
    return wrap;
  }

  let apkFxBusy = false;

  function runApkFlyThenNavigate(href) {
    if (apkFxBusy) return;
    apkFxBusy = true;
    const layer = planeSvg();
    document.body.appendChild(layer);
    playJetWhoosh();
    window.setTimeout(() => {
      apkFxBusy = false;
      window.location.href = href;
    }, 1880);
  }

  document.addEventListener(
    "click",
    function (e) {
      const a = e.target.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.charAt(0) !== "#") return;
      const id = href.slice(1);
      if (!id || !document.getElementById(id)) return;
      e.preventDefault();
      smoothScrollToId(id, prefersReducedMotion() ? 0 : 1050);
    },
    true
  );

  document.addEventListener(
    "click",
    function (e) {
      if (prefersReducedMotion()) return;
      const a = e.target.closest("a.btn--primary[href$='indir.html']");
      if (!a) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.getAttribute("target") === "_blank")
        return;
      e.preventDefault();
      runApkFlyThenNavigate(a.href || "indir.html");
    },
    true
  );
})();
