(function () {
  if (document.body.getAttribute("data-page") !== "index") return;

  function prefersReducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  function apkNavigateDelayMs() {
    return prefersReducedMotion() ? 420 : 1880;
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
    if (prefersReducedMotion()) return;
    try {
      const ACtx = window.AudioContext || window.webkitAudioContext;
      if (!ACtx) return;
      const ctx = new ACtx();
      const t0 = ctx.currentTime;
      try {
        ctx.resume();
      } catch (e) {}

      const noiseDur = 0.42;
      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * noiseDur));
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
    } catch (e) {
      /* ses opsiyonel; asla gezinmeyi engelleme */
    }
  }

  function planeLayer() {
    const wrap = document.createElement("div");
    wrap.className = "ata-apk-fly";
    wrap.setAttribute("aria-hidden", "true");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "ata-apk-fly__plane");
    svg.setAttribute("viewBox", "0 0 100 108");
    svg.setAttribute("aria-hidden", "true");
    const body = document.createElementNS("http://www.w3.org/2000/svg", "path");
    body.setAttribute("fill", "currentColor");
    body.setAttribute(
      "d",
      "M50 4 L92 100 L50 74 L8 100 Z"
    );
    svg.appendChild(body);
    const crease = document.createElementNS("http://www.w3.org/2000/svg", "path");
    crease.setAttribute("fill", "none");
    crease.setAttribute("stroke", "currentColor");
    crease.setAttribute("stroke-width", "1.5");
    crease.setAttribute("stroke-linejoin", "miter");
    crease.setAttribute("opacity", "0.22");
    crease.setAttribute("d", "M50 4 L50 74 L8 100");
    svg.appendChild(crease);
    wrap.appendChild(svg);
    return wrap;
  }

  let apkFxBusy = false;

  function runApkFlyThenNavigate(href) {
    if (apkFxBusy) return;
    apkFxBusy = true;
    const delay = apkNavigateDelayMs();
    try {
      const layer = planeLayer();
      document.body.appendChild(layer);
      requestAnimationFrame(() => {
        try {
          playJetWhoosh();
        } catch (e) {}
      });
    } catch (e) {
      apkFxBusy = false;
      window.location.href = href;
      return;
    }
    window.setTimeout(() => {
      apkFxBusy = false;
      window.location.href = href;
    }, delay);
  }

  function isApkDownloadLink(a) {
    if (!a || !a.classList.contains("btn--primary")) return false;
    if (a.getAttribute("data-ata-apk-fly") === "1") return true;
    const h = a.getAttribute("href") || "";
    return /(^|\/)indir\.html([#?].*)?$/i.test(h) || h.endsWith("indir.html");
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
      const a = e.target.closest("a");
      if (!a || !isApkDownloadLink(a)) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (a.getAttribute("target") === "_blank") return;
      e.preventDefault();
      e.stopPropagation();
      const dest = a.href || a.getAttribute("href");
      runApkFlyThenNavigate(dest || "indir.html");
    },
    true
  );
})();
