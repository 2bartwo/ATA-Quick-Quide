(function () {
  function prefs() {
    const lang = document.documentElement.getAttribute("data-lang") || localStorage.getItem("ata-lang") || "en";
    const theme = document.documentElement.getAttribute("data-theme") || localStorage.getItem("ata-theme") || "dark";
    return { lang, theme };
  }

  function update() {
    const { lang, theme } = prefs();
    const out = document.getElementById("sync-prefs-out");
    const dl = document.getElementById("sync-deeplink-out");
    const a = document.getElementById("sync-open-app");
    if (out) {
      out.textContent = JSON.stringify({ lang, theme, localStorageKeys: ["ata-lang", "ata-theme"] }, null, 2);
    }
    const link = `ataquickguide://sync?lang=${encodeURIComponent(lang)}&theme=${encodeURIComponent(theme)}`;
    if (dl) dl.textContent = link;
    if (a) a.setAttribute("href", link);
  }

  document.addEventListener("ata-ready", update);
  document.addEventListener("ata-app-sync", update);
  document.addEventListener("ata-theme", update);

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(update, 100);
  });
})();
