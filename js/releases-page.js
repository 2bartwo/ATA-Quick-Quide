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

  function buildMetaLine(ver) {
    const sizePart = ver.sizeBytes != null ? ` · ${formatBytes(ver.sizeBytes)}` : "";
    const vw = t("versionWord", "Sürüm");
    return `${vw} ${ver.versionLabel || ver.version} · ${formatDate(ver.date)}${sizePart}`;
  }

  async function init() {
    const latestSlot = document.getElementById("release-box-latest");
    if (!latestSlot) return;

    const errEl = document.getElementById("releases-error");
    const olderSlot = document.getElementById("release-box-older");

    try {
      const res = await fetch("data/changelog.json", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const L = data.latest;
      if (!L) throw new Error("latest yok");

      latestSlot.innerHTML = "";
      const current = document.createElement("div");
      current.className = "version-card version-card--latest";
      const row = document.createElement("div");
      row.className = "version-card__row";
      const badge = document.createElement("span");
      badge.className = "version-badge";
      badge.textContent = t("badgeLatest", "Güncel sürüm");
      const meta = document.createElement("span");
      meta.className = "version-meta";
      meta.textContent = buildMetaLine(L);
      row.appendChild(badge);
      row.appendChild(meta);
      const dl = document.createElement("a");
      dl.className = "btn-dl";
      dl.href = L.apkFile;
      dl.setAttribute("download", L.apkDisplayName || "");
      dl.textContent = t("downloadApk", "APK indir");
      current.appendChild(row);
      current.appendChild(dl);
      if (L.notes && L.notes.length) {
        const h3 = document.createElement("h3");
        h3.className = "subhead-ch";
        h3.textContent = t("notesTitle", "Yama notları (bu sürüm)");
        current.appendChild(h3);
        current.appendChild(elNotesList(L.notes));
      }
      latestSlot.appendChild(current);

      const older = data.older || [];
      if (!olderSlot) {
        /* no-op */
      } else if (!older.length) {
        olderSlot.setAttribute("hidden", "");
        olderSlot.innerHTML = "";
      } else {
        olderSlot.removeAttribute("hidden");
        olderSlot.innerHTML = "";
        older.forEach((item) => {
          const archived = document.createElement("div");
          archived.className = "version-card version-card--archived";
          const rowO = document.createElement("div");
          rowO.className = "version-card__row";
          const badgeO = document.createElement("span");
          badgeO.className = "version-badge version-badge--muted";
          badgeO.textContent = t("badgeArchived", "Eski sürüm");
          const metaO = document.createElement("span");
          metaO.className = "version-meta";
          metaO.textContent = buildMetaLine(item);
          rowO.appendChild(badgeO);
          rowO.appendChild(metaO);
          const off = document.createElement("span");
          off.className = "btn-dl btn-dl--disabled";
          off.setAttribute("aria-disabled", "true");
          off.textContent = t("downloadUnavailable", "İndirilemez");
          archived.appendChild(rowO);
          archived.appendChild(off);
          if (item.notes && item.notes.length) {
            const h3o = document.createElement("h3");
            h3o.className = "subhead-ch";
            h3o.textContent = t("notesTitle", "Yama notları (bu sürüm)");
            archived.appendChild(h3o);
            archived.appendChild(elNotesList(item.notes));
          }
          olderSlot.appendChild(archived);
        });
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
    if (document.getElementById("release-box-latest")) init();
  });
})();
