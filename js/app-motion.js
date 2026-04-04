(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const dock = document.querySelector("[data-scroll-dock]");
  const dockTrigger = document.querySelector(".app-hero") || document.querySelector(".page-intro--hero");
  if (dock && dockTrigger) {
    const dockIo = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        const topVisible = e.isIntersecting;
        dock.classList.toggle("is-visible", !topVisible);
        dock.setAttribute("aria-hidden", topVisible ? "true" : "false");
      },
      { root: null, threshold: 0, rootMargin: "-100px 0px 0px 0px" }
    );
    dockIo.observe(dockTrigger);
  }

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
    { root: null, rootMargin: "0px 0px -6% 0px", threshold: 0.08 }
  );

  reveals.forEach((el) => io.observe(el));
})();
