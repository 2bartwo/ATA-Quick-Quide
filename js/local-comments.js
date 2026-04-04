(function () {
  const STORAGE_KEY = "ata-feedback-comments-v1";
  const MAX_COMMENTS = 60;
  const MAX_NAME = 80;
  const MAX_BODY = 2000;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const a = JSON.parse(raw);
      return Array.isArray(a) ? a : [];
    } catch {
      return [];
    }
  }

  function save(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_COMMENTS)));
  }

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function formatDate(ts) {
    const lang = document.documentElement.getAttribute("data-lang") === "en" ? "en" : "tr";
    return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ts));
  }

  function setEmptyVisible(show) {
    const el = document.getElementById("local-comments-empty");
    if (el) el.hidden = !show;
  }

  function render() {
    const root = document.getElementById("local-comments-list");
    if (!root) return;
    const items = load();
    if (!items.length) {
      root.innerHTML = "";
      setEmptyVisible(true);
      return;
    }
    setEmptyVisible(false);
    root.innerHTML = items
      .map(
        (c) =>
          `<article class="local-comment-card"><header class="local-comment-card__head"><strong class="local-comment-card__name">${esc(
            c.name
          )}</strong><time class="local-comment-card__time" datetime="${new Date(c.ts).toISOString()}">${esc(
            formatDate(c.ts)
          )}</time></header><div class="local-comment-card__body">${esc(c.body).replace(/\n/g, "<br>")}</div></article>`
      )
      .join("");
  }

  function bindForm() {
    const form = document.getElementById("local-comment-form");
    if (!form || form.dataset.bound === "1") return;
    form.dataset.bound = "1";
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const nameIn = form.querySelector('[name="comment-name"]');
      const bodyIn = form.querySelector('[name="comment-body"]');
      const name = (nameIn && nameIn.value.trim()) || "";
      const body = (bodyIn && bodyIn.value.trim()) || "";
      if (!name || !body) return;
      const list = load();
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      list.unshift({
        id,
        name: name.slice(0, MAX_NAME),
        body: body.slice(0, MAX_BODY),
        ts: Date.now(),
      });
      save(list);
      form.reset();
      render();
    });
  }

  window.addEventListener("ata-ready", () => {
    bindForm();
    render();
  });
})();
