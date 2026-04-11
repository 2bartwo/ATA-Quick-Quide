(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const top = document.querySelector(".app-top");
  if (top && !reduced) {
    let ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          top.classList.toggle("is-scrolled", window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  if (reduced) return;

  const reveals = document.querySelectorAll(".reveal");
  if (!reveals.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-inview");
        io.unobserve(entry.target);
      }
    },
    {
      root: null,
      rootMargin: "0px 0px 8% 0px",
      threshold: 0.06,
    }
  );

  reveals.forEach((el) => io.observe(el));

  /* IO gecikirse (bayraklı tarayıcılar) tek raf ile yedek */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      reveals.forEach((el) => {
        if (el.classList.contains("is-inview")) return;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight + 100 && r.bottom > -80) {
          el.classList.add("is-inview");
          try {
            io.unobserve(el);
          } catch (e) {}
        }
      });
    });
  });

  /* Çok geç kalırsa erişilebilirlik için kısa sürede göster (3.2s yerine) */
  window.setTimeout(() => {
    reveals.forEach((el) => {
      if (el.classList.contains("is-inview")) return;
      el.classList.add("is-inview");
      try {
        io.unobserve(el);
      } catch (e) {}
    });
  }, 900);
})();
