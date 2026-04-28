(function () {
  var page = document.body.getAttribute("data-page");
  if (page !== "index" && page !== "chapters") return;

  function t(key, fallback) {
    var d = window.__ATA_I18N_DICT__;
    if (!d) return fallback;
    var cur = d;
    var parts = key.split(".");
    for (var i = 0; i < parts.length; i++) {
      if (cur && cur[parts[i]] != null) cur = cur[parts[i]];
      else return fallback;
    }
    return cur == null ? fallback : cur;
  }

  function splitColumns(items) {
    var per = Math.ceil(items.length / 3);
    return [items.slice(0, per), items.slice(per, per * 2), items.slice(per * 2)];
  }

  function parseAtaData(raw) {
    var m = raw.match(/final\s+ataData\s*=\s*(\[[\s\S]*?\]);/);
    if (!m || !m[1]) return [];
    var arrText = m[1];
    var ata;
    try {
      ata = Function("return " + arrText)();
    } catch (e) {
      return [];
    }
    if (!Array.isArray(ata)) return [];
    var lang = (document.documentElement.getAttribute("data-lang") || "en") === "tr" ? "tr" : "en";
    var out = [];
    ata.forEach(function (sec) {
      var secName = sec && sec.section ? sec.section[lang] || sec.section.en || "" : "";
      var list = sec && Array.isArray(sec.chapters) ? sec.chapters : [];
      list.forEach(function (ch) {
        out.push({
          code: ch.num || "",
          title: ch.title ? ch.title[lang] || ch.title.en || "" : "",
          section: secName,
          sub: Array.isArray(ch.subs) ? ch.subs : [],
        });
      });
    });
    return out;
  }

  function renderFromItems(items) {
    var root = document.getElementById("chapter-browser");
    if (!root) return;
    var cols = splitColumns(items);
    var subPrefix = t("chapters.subPrefix", "Subchapters");
    root.innerHTML = cols
      .map(function (group) {
        return (
          '<div class="chapter-col">' +
          group
            .map(function (ch) {
              return (
                '<details class="chapter-item">' +
                '<summary><span class="chapter-item__code">' +
                ch.code +
                "</span><span>" +
                ch.title +
                "</span></summary>" +
                '<div class="chapter-item__section">' +
                ch.section +
                "</div>" +
                '<div class="chapter-item__sub"><p class="chapter-item__subhead">' +
                subPrefix +
                "</p>" +
                '<ul class="chapter-item__list">' +
                (ch.sub || [])
                  .map(function (s) {
                    return "<li>" + s + "</li>";
                  })
                  .join("") +
                "</ul></div></details>"
              );
            })
            .join("") +
          "</div>"
        );
      })
      .join("");
  }

  function render() {
    var sourcePath = page === "chapters" ? "data/ata-source.txt" : "../data/ata-source.txt";
    fetch(sourcePath, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then(function (txt) {
        var items = parseAtaData(txt);
        renderFromItems(items);
      })
      .catch(function () {
        var root = document.getElementById("chapter-browser");
        if (root) root.innerHTML = '<p class="muted">Chapter verisi yüklenemedi.</p>';
      });
  }

  window.addEventListener("ata-ready", render);
  window.setTimeout(render, 700);
})();
