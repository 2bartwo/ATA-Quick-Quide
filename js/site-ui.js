(function () {
  const THEME_KEY = "ata-theme";
  const LANG_KEY = "ata-lang";

  function getStoredTheme() {
    const s = localStorage.getItem(THEME_KEY);
    if (s === "light" || s === "dark") return s;
    return "dark";
  }

  function getStoredLang() {
    const s = localStorage.getItem(LANG_KEY);
    if (s === "en" || s === "tr") return s;
    return "en";
  }

  const COOKIE_MAX_AGE = 31536000;

  function setCookie(name, value) {
    document.cookie =
      name +
      "=" +
      encodeURIComponent(value) +
      ";path=/;max-age=" +
      COOKIE_MAX_AGE +
      ";SameSite=Lax";
  }

  function bridgeLang() {
    const a = document.documentElement.getAttribute("data-lang");
    if (a === "en" || a === "tr") return a;
    return getStoredLang();
  }

  function bridgeTheme() {
    const t = document.documentElement.getAttribute("data-theme");
    if (t === "dark" || t === "light") return t;
    return getStoredTheme();
  }

  function pushAppBridgePrefs() {
    const lang = bridgeLang();
    const theme = bridgeTheme();
    setCookie("ata_site_lang", lang);
    setCookie("ata_site_theme", theme);
    const payload = { lang, theme, v: 1, t: Date.now() };
    window.__ATA_APP_PREFS__ = payload;
    try {
      sessionStorage.setItem("ata-app-prefs", JSON.stringify(payload));
    } catch (e) {}
    let m = document.querySelector('meta[name="ata-pref-lang"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "ata-pref-lang");
      document.head.appendChild(m);
    }
    m.setAttribute("content", lang);
    m = document.querySelector('meta[name="ata-pref-theme"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "ata-pref-theme");
      document.head.appendChild(m);
    }
    m.setAttribute("content", theme);
    window.dispatchEvent(new CustomEvent("ata-app-sync", { detail: payload }));
  }

  const HERO_PREVIEW_V = "19";

  function siteRootUrl() {
    const b = document.baseURI || window.location.href;
    const r = document.body && document.body.getAttribute("data-site-root");
    if (!r) return new URL("./", b);
    let resolved = new URL(r, b);
    /* .../anasayfa/index.html + "../" → .../anasayfa/ (yanlış); bir "../" daha site kökü */
    const path = new URL(b).pathname || "";
    if (r === "../" && /\/[^/]+\.html$/i.test(path)) {
      resolved = new URL("../", resolved);
    }
    return resolved;
  }

  function heroPreviewUrls(theme, lang) {
    const base = new URL("images/", siteRootUrl());
    const primary = new URL(`app-preview-${theme}-${lang}.png`, base);
    primary.searchParams.set("v", HERO_PREVIEW_V);
    primary.searchParams.set("m", theme);
    const legacy = new URL("app-screenshot-1.png", base);
    legacy.searchParams.set("v", HERO_PREVIEW_V);
    return [primary.href, legacy.href];
  }

  function syncHeroScreens() {
    const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const lang = document.documentElement.getAttribute("data-lang") === "en" ? "en" : "tr";
    const urls = heroPreviewUrls(theme, lang);
    document.querySelectorAll("img[data-hero-preview]").forEach((img) => {
      let i = 0;
      function attempt() {
        if (i >= urls.length) return;
        const url = urls[i];
        i += 1;
        img.onerror = attempt;
        img.onload = () => {
          img.onerror = null;
        };
        img.src = url;
      }
      attempt();
    });
  }

  function resolveKey(dict, key) {
    return key.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), dict);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    syncHeroScreens();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "dark" ? "#0a0a0a" : "#e4eef8");
    }
    const lang = document.documentElement.getAttribute("data-lang") || "en";
    const tgl = document.querySelector("[data-theme-toggle]");
    if (tgl) {
      tgl.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      const dark = theme === "dark";
      tgl.setAttribute(
        "aria-label",
        lang === "en"
          ? dark
            ? "Switch to light mode"
            : "Switch to dark mode"
          : dark
            ? "Gündüz moduna geç"
            : "Gece moduna geç"
      );
    }
    window.dispatchEvent(new CustomEvent("ata-theme", { detail: { theme } }));
    pushAppBridgePrefs();
  }

  function replaceYear(html) {
    return html.replace(/__YEAR__/g, String(new Date().getFullYear()));
  }

  function applyPageMeta(dict) {
    const p = document.body.getAttribute("data-page");
    if (!dict.page || !p) return;
    if (p === "download") {
      if (dict.page.downloadTitle) document.title = dict.page.downloadTitle;
      const d = document.querySelector('meta[name="description"]');
      if (d && dict.page.downloadDesc) d.setAttribute("content", dict.page.downloadDesc);
    }
    if (p === "install") {
      if (dict.page.installTitle) document.title = dict.page.installTitle;
      const d = document.querySelector('meta[name="description"]');
      if (d && dict.page.installDesc) d.setAttribute("content", dict.page.installDesc);
    }
  }

  function applyDict(dict) {
    if (!dict) return;
    window.__ATA_I18N_DICT__ = dict;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const v = resolveKey(dict, key);
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      const v = resolveKey(dict, key);
      if (v != null) el.innerHTML = replaceYear(String(v));
    });
    document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
      const key = el.getAttribute("data-i18n-alt");
      const v = resolveKey(dict, key);
      if (v != null) el.setAttribute("alt", v);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      const v = resolveKey(dict, key);
      if (v != null) el.setAttribute("placeholder", v);
    });
    document.querySelectorAll("[data-i18n-src]").forEach((el) => {
      const key = el.getAttribute("data-i18n-src");
      const v = resolveKey(dict, key);
      if (v != null) el.setAttribute("src", String(v));
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria-label");
      const v = resolveKey(dict, key);
      if (v != null) el.setAttribute("aria-label", String(v));
    });
    const p = document.body.getAttribute("data-page");
    if (p === "index" && dict.meta) {
      if (dict.meta.title) document.title = dict.meta.title;
      const desc = document.querySelector('meta[name="description"]');
      if (desc && dict.meta.description) desc.setAttribute("content", dict.meta.description);
    }
    applyPageMeta(dict);
    window.__ATA_I18N_RELEASES = dict.releases || {};
  }

  async function loadLang(lang) {
    const path = new URL(`data/i18n-${lang}.json`, siteRootUrl()).href;
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  }

  function setLangButtons(lang) {
    document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
      const l = btn.getAttribute("data-lang-btn");
      const on = l === lang;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("is-active", on);
    });
  }

  function prefersReducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return true;
    }
  }

  function dictLookup(dict, key) {
    if (!dict || !key) return null;
    return key.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), dict);
  }

  function syncNavToggleAria(btn, isOpen) {
    const d = window.__ATA_I18N_DICT__;
    const key = isOpen ? "nav.menuClose" : "nav.menuOpen";
    const v = dictLookup(d, key);
    if (v != null) btn.setAttribute("aria-label", String(v));
  }

  function setAppNavOpen(top, open) {
    if (!top) return;
    top.classList.toggle("is-nav-open", !!open);
    document.body.classList.toggle("is-app-nav-open", !!open);
    const btn = top.querySelector(".app-nav-toggle");
    const bd = top.querySelector("[data-app-nav-backdrop]");
    if (btn) {
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      syncNavToggleAria(btn, !!open);
    }
    if (bd) {
      bd.hidden = !open;
      bd.setAttribute("aria-hidden", open ? "false" : "true");
    }
  }

  function closeAllAppNavs() {
    document.querySelectorAll(".app-top.is-nav-open").forEach((top) => setAppNavOpen(top, false));
  }

  function initMobileNav() {
    document.querySelectorAll(".app-top").forEach((top) => {
      const btn = top.querySelector(".app-nav-toggle");
      const menu = top.querySelector("#site-primary-nav");
      const bd = top.querySelector("[data-app-nav-backdrop]");
      if (!btn || !menu) return;

      btn.addEventListener("click", () => setAppNavOpen(top, !top.classList.contains("is-nav-open")));
      if (bd) bd.addEventListener("click", () => setAppNavOpen(top, false));
      menu.querySelectorAll("a").forEach((a) => {
        a.addEventListener("click", () => setAppNavOpen(top, false));
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAllAppNavs();
    });

    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 901px)").matches) closeAllAppNavs();
    });
  }

  function langSwapTargets() {
    const shell = document.querySelector(".app-shell");
    if (!shell) {
      const main = document.querySelector("main.app-content");
      return main ? [main] : [];
    }
    const out = [];
    const menu = shell.querySelector("header.app-top .app-menu");
    const main = shell.querySelector("main.app-content");
    const foot = shell.querySelector("footer.app-footer");
    if (menu) out.push(menu);
    if (main) out.push(main);
    if (foot) out.push(foot);
    return out;
  }

  function waitAnimationEnd(el, fallbackMs) {
    return new Promise((resolve) => {
      const t = window.setTimeout(resolve, fallbackMs);
      const done = () => {
        window.clearTimeout(t);
        resolve();
      };
      el.addEventListener("animationend", done, { once: true });
    });
  }

  async function applyLangWithTransition(lang) {
    const cur = document.documentElement.getAttribute("data-lang");
    if (cur === lang) return;

    closeAllAppNavs();

    const els = langSwapTargets();
    if (!els.length || prefersReducedMotion()) {
      await applyLang(lang);
      return;
    }

    els.forEach((el) => el.classList.add("ata-lang-swap-phase-out"));
    await Promise.all(els.map((el) => waitAnimationEnd(el, 400)));
    await applyLang(lang);
    els.forEach((el) => {
      el.classList.remove("ata-lang-swap-phase-out");
      el.classList.add("ata-lang-swap-phase-in");
    });
    const seg = document.querySelector(".lang-seg");
    if (seg) {
      seg.classList.remove("ata-lang-seg-nudge");
      void seg.offsetWidth;
      seg.classList.add("ata-lang-seg-nudge");
      seg.addEventListener(
        "animationend",
        () => seg.classList.remove("ata-lang-seg-nudge"),
        { once: true }
      );
    }
    await Promise.all(els.map((el) => waitAnimationEnd(el, 550)));
    els.forEach((el) => el.classList.remove("ata-lang-swap-phase-in"));
  }

  async function applyLang(lang) {
    document.documentElement.setAttribute("lang", lang === "en" ? "en" : "tr");
    document.documentElement.setAttribute("data-lang", lang);
    localStorage.setItem(LANG_KEY, lang);
    setLangButtons(lang);
    try {
      const dict = await loadLang(lang);
      applyDict(dict);
      applyTheme(document.documentElement.getAttribute("data-theme") || getStoredTheme());
    } catch (e) {
      console.warn("i18n load failed", e);
      window.__ATA_I18N_RELEASES = window.__ATA_I18N_RELEASES || {};
      window.__ATA_I18N_DICT__ = window.__ATA_I18N_DICT__ || {};
      pushAppBridgePrefs();
      syncHeroScreens();
    }
    window.dispatchEvent(new CustomEvent("ata-ready", { detail: { lang } }));
  }

  applyTheme(getStoredTheme());

  document.addEventListener("DOMContentLoaded", async () => {
    const lang = getStoredLang();
    await applyLang(lang);

    document.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      applyTheme(cur === "dark" ? "light" : "dark");
    });

    window.addEventListener("storage", (e) => {
      if (e.key !== THEME_KEY || e.newValue == null) return;
      if (e.newValue !== "light" && e.newValue !== "dark") return;
      if (e.newValue === document.documentElement.getAttribute("data-theme")) return;
      applyTheme(e.newValue);
    });


    document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const l = btn.getAttribute("data-lang-btn");
        if (l === "tr" || l === "en") applyLangWithTransition(l);
      });
    });

    initMobileNav();
  });
})();
