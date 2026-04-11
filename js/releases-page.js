(function () {
  function formatBytes(n) {
    if (n == null || Number.isNaN(n)) return "";
    const u = ["B", "KB", "MB", "GB"];
    let i = 0;
    let v = n;
    while (v >= 1024 && i < u.length - 1) {
      v /= 1024;
      i++;
    }
    return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${u[i]}`;
  }

  function lang() {
    return document.documentElement.getAttribute("data-lang") || "en";
  }

  function t(k, fallback) {
    const b = window.__ATA_I18N_RELEASES || {};
    return b[k] || fallback;
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(lang() === "en" ? "en-US" : "tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function elNotesList(notes) {
    const ul = document.createElement("ul");
    ul.className = "changelog-list";
    (notes || []).forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      ul.appendChild(li);
    });
    return ul;
  }

  async function init() {
    const latestRoot = document.getElementById("latest-root");
    if (!latestRoot) return;

    const errEl = document.getElementById("releases-error");
    const olderRoot = document.getElementById("older-root");
    const olderSection = document.getElementById("older-section");

    try {
      const res = await fetch("data/changelog.json", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const L = data.latest;
      if (!L) throw new Error("latest yok");

      latestRoot.innerHTML = "";
      const card = document.createElement("div");
      card.className = "version-card version-card--latest";

      const row = document.createElement("div");
      row.className = "version-card__row";
      const badge = document.createElement("span");
      badge.className = "version-badge";
      badge.textContent = t("badgeLatest", "Güncel sürüm");
      const meta = document.createElement("span");
      meta.className = "version-meta";
      const sizePart = L.sizeBytes != null ? ` · ${formatBytes(L.sizeBytes)}` : "";
      const vw = t("versionWord", "Sürüm");
      meta.textContent = `${vw} ${L.versionLabel || L.version} · ${formatDate(L.date)}${sizePart}`;
      row.appendChild(badge);
      row.appendChild(meta);

      const dl = document.createElement("a");
      dl.className = "btn-dl";
      dl.href = L.apkFile;
      dl.setAttribute("download", L.apkDisplayName || "");
      dl.textContent = t("downloadApk", "APK indir");

      card.appendChild(row);
      card.appendChild(dl);
      if (L.notes && L.notes.length) {
        const h3 = document.createElement("h3");
        h3.className = "subhead-ch";
        h3.textContent = t("notesTitle", "Yama notları (bu sürüm)");
        card.appendChild(h3);
        card.appendChild(elNotesList(L.notes));
      }
      latestRoot.appendChild(card);

      const historyRoot = document.getElementById("history-root");
      const historySection = document.getElementById("history-section");
      if (historyRoot && historySection) {
        historyRoot.innerHTML = "";
        const past = (data.older || []).slice().reverse();
        past.forEach((ver) => {
          if (!ver.notes || !ver.notes.length) return;
          const block = document.createElement("div");
          block.className = "history-block";
          const ht = document.createElement("h3");
          ht.className = "history-block__title";
          const sizeH = ver.sizeBytes != null ? ` · ${formatBytes(ver.sizeBytes)}` : "";
          const vw2 = t("versionWord", "Sürüm");
          ht.textContent = `${vw2} ${ver.versionLabel || ver.version} (${formatDate(ver.date)})${sizeH}`;
          block.appendChild(ht);
          block.appendChild(elNotesList(ver.notes));
          historyRoot.appendChild(block);
        });
        historySection.style.display = historyRoot.children.length ? "" : "none";
      }

      const older = data.older || [];
      if (!older.length) {
        if (olderSection) olderSection.style.display = "none";
      } else {
        if (olderSection) olderSection.style.display = "";
        olderRoot.innerHTML = "";
        const ul = document.createElement("ul");
        ul.className = "older-list";
        older.forEach((item) => {
          const li = document.createElement("li");
          li.className = "older-item";
          const top = document.createElement("div");
          top.className = "older-item__top";
          const label = document.createElement("span");
          label.className = "version-meta";
          const sizeO = item.sizeBytes != null ? ` · ${formatBytes(item.sizeBytes)}` : "";
          const vw3 = t("versionWord", "Sürüm");
          label.textContent = `${vw3} ${item.versionLabel || item.version} · ${formatDate(item.date)}${sizeO}`;
          const a = document.createElement("a");
          a.href = item.apkFile;
          a.setAttribute("download", item.apkDisplayName || "");
          a.textContent = t("download", "İndir");
          top.appendChild(label);
          top.appendChild(a);
          li.appendChild(top);
          if (item.notes && item.notes.length) li.appendChild(elNotesList(item.notes));
          ul.appendChild(li);
        });
        olderRoot.appendChild(ul);
      }

      if (errEl) errEl.hidden = true;
    } catch (e) {
      if (errEl) {
        errEl.hidden = false;
        errEl.textContent = t("errLoad", "Sürüm listesi yüklenemedi. Sayfayı yenileyin veya daha sonra tekrar deneyin.");
      }
    }
  }

  window.addEventListener("ata-ready", () => {
    if (document.getElementById("latest-root")) init();
  });
})();
