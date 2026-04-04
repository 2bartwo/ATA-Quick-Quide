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
    return s === "en" ? "en" : "tr";
  }

  function resolveKey(dict, key) {
    return key.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), dict);
  }

  function applyTheme(theme) {
    if (document.body && document.body.classList.contains("wix-template")) {
      document.documentElement.setAttribute("data-theme", "light");
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", "#ffffff");
      syncThemeIcon();
      window.dispatchEvent(new CustomEvent("ata-theme", { detail: { theme: "light" } }));
      return;
    }
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "dark" ? "#0a0a0a" : "#e4eef8");
    }
    const lang = document.documentElement.getAttribute("data-lang") || "tr";
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
    syncThemeIcon();
    window.dispatchEvent(new CustomEvent("ata-theme", { detail: { theme } }));
  }

  function syncThemeIcon() {
    const t = document.querySelector(".theme-toggle");
    if (!t) return;
    t.textContent = document.documentElement.getAttribute("data-theme") === "dark" ? "☀" : "☾";
  }

  function utteranceTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "github-dark" : "github-light";
  }

  function mountUtterances() {
    const host = document.getElementById("utterances-host");
    if (!host) return;
    host.innerHTML = "";
    const term = host.getAttribute("data-issue-term") || "pathname";
    const s = document.createElement("script");
    s.src = "https://utteranc.es/client.js";
    s.setAttribute("repo", "2bartwo/ATA-Quick-Quide");
    s.setAttribute("issue-term", term);
    s.setAttribute("theme", utteranceTheme());
    s.setAttribute("crossorigin", "anonymous");
    s.async = true;
    host.appendChild(s);
  }

  function remountUtterances() {
    if (document.getElementById("utterances-host")) mountUtterances();
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
    const path = `data/i18n-${lang}.json`;
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
    }
    window.dispatchEvent(new CustomEvent("ata-ready", { detail: { lang } }));
    remountUtterances();
  }

  applyTheme(getStoredTheme());

  document.addEventListener("DOMContentLoaded", async () => {
    const lang = getStoredLang();
    await applyLang(lang);

    document.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
      if (document.body.classList.contains("wix-template")) return;
      const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      applyTheme(cur === "dark" ? "light" : "dark");
    });

    window.addEventListener("ata-theme", remountUtterances);

    document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const l = btn.getAttribute("data-lang-btn");
        if (l === "tr" || l === "en") applyLang(l);
      });
    });

    syncThemeIcon();
  });
})();
