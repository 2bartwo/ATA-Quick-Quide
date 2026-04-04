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

  function formatDateTR(iso) {
    if (!iso) return "";
    const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("tr-TR", {
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
    const errEl = document.getElementById("releases-error");
    const latestRoot = document.getElementById("latest-root");
    const olderRoot = document.getElementById("older-root");
    const olderSection = document.getElementById("older-section");

    if (!latestRoot) return;

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
      row.innerHTML = `
        <span class="version-badge">Güncel sürüm</span>
        <span class="version-meta" id="latest-meta"></span>
      `;
      const meta = row.querySelector("#latest-meta");
      const sizePart = L.sizeBytes != null ? ` · ${formatBytes(L.sizeBytes)}` : "";
      meta.textContent = `Sürüm ${L.versionLabel || L.version} · ${formatDateTR(L.date)}${sizePart}`;

      const dl = document.createElement("a");
      dl.className = "btn-dl";
      dl.href = L.apkFile;
      dl.setAttribute("download", L.apkDisplayName || "");
      dl.textContent = "APK indir";

      card.appendChild(row);
      card.appendChild(dl);
      if (L.notes && L.notes.length) {
        const h3 = document.createElement("h3");
        h3.className = "subhead-ch";
        h3.textContent = "Yama notları (bu sürüm)";
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
          ht.textContent = `Sürüm ${ver.versionLabel || ver.version} (${formatDateTR(ver.date)})${sizeH}`;
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
          label.textContent = `Sürüm ${item.versionLabel || item.version} · ${formatDateTR(item.date)}${sizeO}`;
          const a = document.createElement("a");
          a.href = item.apkFile;
          a.setAttribute("download", item.apkDisplayName || "");
          a.textContent = "İndir";
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
        errEl.textContent =
          "Sürüm listesi yüklenemedi. Sayfayı yenileyin veya daha sonra tekrar deneyin.";
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
