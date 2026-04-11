(function () {
  const COLLECTION = "public_comments";
  const MAX_LIST = 45;
  const FB_APP = "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
  const FB_FS = "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function cfgOk(c) {
    return c && typeof c.projectId === "string" && c.projectId.length > 0 && c.apiKey;
  }

  function lang() {
    const a = document.documentElement.getAttribute("data-lang");
    return a === "en" || a === "tr" ? a : "en";
  }

  function formatTs(ms) {
    return new Intl.DateTimeFormat(lang() === "en" ? "en" : "tr", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ms));
  }

  function t(key) {
    const dict = window.__ATA_I18N_DICT__;
    if (!dict || !dict.feedback) return key;
    const v = dict.feedback[key];
    return v != null ? v : key;
  }

  let unsubscribe = null;
  let dbRef = null;

  async function loadModules() {
    const [{ initializeApp }, fs] = await Promise.all([import(FB_APP), import(FB_FS)]);
    return {
      initializeApp,
      getFirestore: fs.getFirestore,
      collection: fs.collection,
      query: fs.query,
      orderBy: fs.orderBy,
      limit: fs.limit,
      onSnapshot: fs.onSnapshot,
      addDoc: fs.addDoc,
    };
  }

  function tearDown() {
    if (typeof unsubscribe === "function") {
      unsubscribe();
      unsubscribe = null;
    }
    dbRef = null;
  }

  async function mount() {
    const root = document.getElementById("public-comments-root");
    if (!root) return;

    const hint = document.getElementById("firebase-setup-hint");
    const ui = document.getElementById("firebase-comments-ui");
    const cfg = window.__FIREBASE_CONFIG__ || {};

    tearDown();

    if (!cfgOk(cfg)) {
      if (hint) hint.hidden = false;
      if (ui) ui.hidden = true;
      return;
    }

    if (hint) hint.hidden = true;
    if (ui) ui.hidden = false;

    const listEl = document.getElementById("public-comments-list");
    const form = document.getElementById("public-comment-form");
    const statusEl = document.getElementById("public-comment-status");

    let mod;
    try {
      mod = await loadModules();
      const app = mod.initializeApp(cfg);
      dbRef = mod.getFirestore(app);
    } catch (e) {
      console.warn("Firebase init failed", e);
      if (hint) {
        hint.hidden = false;
        hint.removeAttribute("data-i18n-html");
        hint.textContent = t("loadError");
      }
      if (ui) ui.hidden = true;
      return;
    }

    const q = mod.query(
      mod.collection(dbRef, COLLECTION),
      mod.orderBy("createdAt", "desc"),
      mod.limit(MAX_LIST)
    );

    unsubscribe = mod.onSnapshot(
      q,
      (snap) => {
        if (!listEl) return;
        const rows = [];
        snap.forEach((doc) => {
          const d = doc.data();
          const name = typeof d.name === "string" ? d.name : "?";
          const body = typeof d.body === "string" ? d.body : "";
          const createdAt = typeof d.createdAt === "number" ? d.createdAt : 0;
          rows.push(
            `<article class="public-comment-card"><header class="public-comment-card__head"><strong class="public-comment-card__name">${esc(
              name
            )}</strong><time class="public-comment-card__time" datetime="${new Date(createdAt).toISOString()}">${esc(
              formatTs(createdAt)
            )}</time></header><div class="public-comment-card__body">${esc(body).replace(/\n/g, "<br>")}</div></article>`
          );
        });
        listEl.innerHTML = rows.length
          ? rows.join("")
          : `<p class="public-comments__empty">${esc(t("noComments"))}</p>`;
      },
      (err) => {
        console.warn("Firestore listen", err);
        if (listEl) listEl.innerHTML = `<p class="alert-soft" role="alert">${esc(t("listenError"))}</p>`;
      }
    );

    if (form && !form.dataset.bound) {
      form.dataset.bound = "1";
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nameIn = form.querySelector('[name="comment-name"]');
        const bodyIn = form.querySelector('[name="comment-body"]');
        const name = (nameIn && nameIn.value.trim()) || "";
        const body = (bodyIn && bodyIn.value.trim()) || "";
        if (!name || !body) return;

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        if (statusEl) {
          statusEl.hidden = false;
          statusEl.textContent = t("sending");
          statusEl.className = "comments-status comments-status--pending";
        }

        try {
          await mod.addDoc(mod.collection(dbRef, COLLECTION), {
            name: name.slice(0, 80),
            body: body.slice(0, 2000),
            createdAt: Date.now(),
          });
          form.reset();
          if (statusEl) {
            statusEl.textContent = t("sentOk");
            statusEl.className = "comments-status comments-status--ok";
          }
        } catch (err) {
          console.warn("Firestore add", err);
          if (statusEl) {
            statusEl.textContent = t("sentError");
            statusEl.className = "comments-status comments-status--err";
          }
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }
  }

  window.addEventListener("ata-ready", () => {
    mount();
  });
})();
