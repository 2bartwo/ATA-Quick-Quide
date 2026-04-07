(function () {
  if (document.body.getAttribute("data-page") !== "index") return;

  const HOME_RELEASE_DISMISS_KEY = "ata-home-release-dismissed";

  function prefersReducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  function smoothScrollToId(id) {
    const el = document.getElementById(id);
    if (!el) return false;

    const reduced = prefersReducedMotion();
    el.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });

    const commitHash = () => {
      try {
        history.replaceState(null, "", "#" + encodeURIComponent(id));
      } catch (e) {}
    };

    if (reduced) {
      commitHash();
      return true;
    }

    let settled = false;
    function finish() {
      if (settled) return;
      settled = true;
      commitHash();
    }
    const t = window.setTimeout(finish, 800);
    window.addEventListener(
      "scrollend",
      () => {
        window.clearTimeout(t);
        finish();
      },
      { once: true }
    );
    return true;
  }

  /** İmleç etrafında çok partikül, yerçekimiyle aşağı; tam süre ekranda (iptal/taşma). */
  function apkParticleBurst(clientX, clientY) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx =
      typeof clientX === "number" && clientX > 0 ? clientX : Math.min(w * 0.5, w - 8);
    const cy =
      typeof clientY === "number" && clientY > 0 ? clientY : Math.min(h * 0.4, h - 8);

    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    const colors = dark
      ? ["#409cff", "#64d2ff", "#ffd60a", "#ff9f0a", "#ff375f", "#bf5af2", "#30d158", "#ffffff", "#a1a1a6"]
      : [
          "#0d6efd",
          "#6ea8fe",
          "#ffc107",
          "#fd7e14",
          "#dc3545",
          "#6f42c1",
          "#198754",
          "#0dcaf0",
          "#212529",
        ];

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement("canvas");
    canvas.className = "ata-apk-burst";
    canvas.setAttribute("aria-hidden", "true");
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      canvas.remove();
      return;
    }
    ctx.scale(dpr, dpr);

    const DURATION_MS = 1600;
    const n = 160;
    const particles = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const burst = 220 + Math.random() * 380;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * burst * 0.42 + (Math.random() - 0.5) * 100,
        vy: Math.sin(a) * burst * 0.38 - Math.random() * 260,
        g: 480 + Math.random() * 220,
        drag: 0.992,
        size: 2 + Math.random() * 5,
        color: colors[(i + ((Math.random() * 6) | 0)) % colors.length],
        spin: (Math.random() - 0.5) * 8,
        rot: Math.random() * Math.PI * 2,
      });
    }

    let last = performance.now();
    const t0 = last;

    function tick(now) {
      const dt = Math.min(0.038, (now - last) / 1000);
      last = now;
      const elapsed = now - t0;

      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= p.drag;
        p.rot += p.spin * dt;
        const life = Math.max(0, 1 - elapsed / DURATION_MS);
        const alpha = life * (p.y > h + 40 ? 0.15 : 1);
        ctx.save();
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        const s = p.size * (0.85 + 0.15 * life);
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      }

      if (elapsed < DURATION_MS) {
        requestAnimationFrame(tick);
      } else {
        try {
          canvas.remove();
        } catch (e) {}
      }
    }

    requestAnimationFrame(tick);
  }

  let apkFxBusy = false;

  function runApkBurstThenNavigate(href, clientX, clientY) {
    if (apkFxBusy) return;
    apkFxBusy = true;
    const reduced = prefersReducedMotion();
    /** Erken yönlendirme: uzun gecikme siteyi donmuş gösterir; animasyon yine ilk ~1 sn görünür. */
    const delay = reduced ? 80 : 900;
    if (!reduced) {
      apkParticleBurst(clientX, clientY);
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
      if (isApkDownloadLink(a)) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        if (a.getAttribute("target") === "_blank") return;
        e.preventDefault();
        e.stopPropagation();
        runApkBurstThenNavigate(a.href || a.getAttribute("href") || "indir.html", e.clientX, e.clientY);
        return;
      }
      const href = a.getAttribute("href");
      if (!href || href.charAt(0) !== "#") return;
      const id = href.slice(1);
      if (!id || !document.getElementById(id)) return;
      e.preventDefault();
      smoothScrollToId(id);
    },
    true
  );

  function initHomeReleaseCallout() {
    const box = document.getElementById("home-release-callout");
    if (!box || box.getAttribute("data-init") === "1") return;
    try {
      if (localStorage.getItem(HOME_RELEASE_DISMISS_KEY) === "1") return;
    } catch (e) {}

    box.removeAttribute("hidden");
    box.setAttribute("data-init", "1");
    const btn = box.querySelector("[data-home-release-close]");
    if (!btn) return;
    btn.addEventListener(
      "click",
      () => {
        box.setAttribute("hidden", "");
        try {
          localStorage.setItem(HOME_RELEASE_DISMISS_KEY, "1");
        } catch (e) {}
      },
      { once: true }
    );
  }

  window.addEventListener("ata-ready", initHomeReleaseCallout, { once: true });
  window.setTimeout(initHomeReleaseCallout, 2500);
})();
