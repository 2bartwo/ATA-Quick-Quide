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
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-inview");
        io.unobserve(entry.target);
      });
    },
    {
      root: null,
      rootMargin: "0px 0px 12% 0px",
      threshold: [0, 0.02, 0.06],
    }
  );

  reveals.forEach((el) => io.observe(el));

  /* Geniş ekranda IO bazen geç tetiklenir; içerik görünmez kalmasın */
  window.setTimeout(() => {
    reveals.forEach((el) => {
      if (!el.classList.contains("is-inview")) {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight + 120 && r.bottom > -120) {
          el.classList.add("is-inview");
          io.unobserve(el);
        }
      }
    });
  }, 100);

  window.setTimeout(() => {
    reveals.forEach((el) => {
      if (!el.classList.contains("is-inview")) {
        el.classList.add("is-inview");
        try {
          io.unobserve(el);
        } catch (e) {}
      }
    });
  }, 3200);
})();
