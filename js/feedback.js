/*
 * ATA Quick Guide — Geri bildirim (Firebase RTDB REST)
 */
(function () {
  "use strict";

  var FIREBASE_DB_URL = "https://ata-quick-guide-538b0-default-rtdb.europe-west1.firebasedatabase.app";
  var RATE_LIMIT_MS = 30000;
  var MAX_MSG_LEN = 500;
  var MIN_MSG_LEN = 3;
  var MAX_NAME_LEN = 40;
  var PAGE_SIZE = 30;
  var FETCH_TIMEOUT_MS = 18000;
  var VOTE_KEY = "ata-fb-vote-";
  var OWN_KEY = "ata-fb-own";

  var SVG_STAR_EMPTY =
    '<svg class="fb-star-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>';
  var SVG_STAR_FULL =
    '<svg class="fb-star-svg" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>';
  var SVG_THUMB_UP =
    '<svg class="fb-vote__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>';
  var SVG_THUMB_DOWN =
    '<svg class="fb-vote__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/></svg>';
  var SVG_EDIT =
    '<svg class="fb-act__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  var SVG_TRASH =
    '<svg class="fb-act__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

  var DISALLOWED_NAME_PARTS = {
    test:1,deneme:1,asd:1,xxx:1,aaa:1,abc:1,admin:1,user:1,
    isim:1,soyisim:1,ad:1,soyad:1,yarrak:1,siktir:1
  };
  var PROFANITY_SUBSTRINGS = [
    "siktir","sikerim","orospu","pezevenk","kahpe","yarrak",
    "amk","piç","göt","fuck","shit","bitch","asshole",
    "bastard","motherfucker","cunt","dickhead"
  ];

  var form = document.getElementById("fb-form");
  var nameInput = document.getElementById("fb-name");
  var msgInput = document.getElementById("fb-msg");
  var charCount = document.getElementById("fb-char-count");
  var submitBtn = document.getElementById("fb-submit");
  var listEl = document.getElementById("fb-list");
  var emptyEl = document.getElementById("fb-empty");
  var loadingEl = document.getElementById("fb-loading");
  var errorEl = document.getElementById("fb-error");
  var moreBtn = document.getElementById("fb-more");
  var starsInputRoot = document.getElementById("fb-stars-input");
  var ratingHidden = document.getElementById("fb-rating-value");

  if (!form || !listEl) return;

  var allItems = [];
  var visibleCount = PAGE_SIZE;
  var hoverStar = null;
  var editingKey = null;

  function getLang() { return document.documentElement.getAttribute("data-lang") || "tr"; }
  function dict(k, tr, en) {
    var d = window.__ATA_I18N_DICT__;
    if (d && d.feedback && d.feedback[k] != null) return d.feedback[k];
    return getLang() === "en" ? en : tr;
  }
  function timeAgo(ts) {
    var diff = Date.now() - ts, s = Math.floor(diff / 1000);
    if (s < 60) return dict("timeJust", "az önce", "just now");
    var m = Math.floor(s / 60);
    if (m < 60) return m + " " + dict("timeMin", "dk önce", "min ago");
    var h = Math.floor(m / 60);
    if (h < 24) return h + " " + dict("timeHr", "saat önce", "hr ago");
    var d = Math.floor(h / 24);
    if (d < 30) return d + " " + dict("timeDay", "gün önce", "days ago");
    return new Date(ts).toLocaleDateString(getLang() === "en" ? "en-GB" : "tr-TR", { day: "numeric", month: "short", year: "numeric" });
  }
  function escapeHtml(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  function escapeAttr(s) { return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;"); }
  function normalizeForProfanity(s) {
    return String(s).toLowerCase().replace(/ı/g,"i").replace(/ğ/g,"g").replace(/ü/g,"u")
      .replace(/ş/g,"s").replace(/ö/g,"o").replace(/ç/g,"c").replace(/0/g,"o")
      .replace(/1/g,"i").replace(/3/g,"e").replace(/4/g,"a").replace(/@/g,"a");
  }
  function hasProfanity(t) {
    var n = normalizeForProfanity(t);
    for (var i = 0; i < PROFANITY_SUBSTRINGS.length; i++) if (n.indexOf(PROFANITY_SUBSTRINGS[i]) !== -1) return true;
    return false;
  }
  function validateFullName(raw) {
    var s = String(raw || "").trim().replace(/\s+/g, " ");
    if (s.length < 5 || s.length > MAX_NAME_LEN) return false;
    var parts = s.split(" ").filter(function (p) { return p.length > 0; });
    if (parts.length < 2) return false;
    var re = /^[a-zA-ZğüşıöçĞÜŞİÖÇâêîôûÂÊÎÔÛ'\-]+$/;
    for (var j = 0; j < parts.length; j++) {
      var p = parts[j];
      if (p.length < 2 || p.length > 22 || !re.test(p) || /(.)\1{3,}/.test(p)) return false;
      if (DISALLOWED_NAME_PARTS[p.toLocaleLowerCase("tr-TR")]) return false;
    }
    return true;
  }

  function getOwnKeys() {
    try { return JSON.parse(localStorage.getItem(OWN_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveOwnKey(key) {
    var arr = getOwnKeys();
    if (arr.indexOf(key) === -1) { arr.push(key); localStorage.setItem(OWN_KEY, JSON.stringify(arr)); }
  }
  function removeOwnKey(key) {
    var arr = getOwnKeys().filter(function (k) { return k !== key; });
    localStorage.setItem(OWN_KEY, JSON.stringify(arr));
  }
  function isOwn(key) { return getOwnKeys().indexOf(key) !== -1; }

  function clampRating(n) {
    var x = Number(n);
    if (!isFinite(x) || x < 0.5 || x > 5) return null;
    return Math.round(x * 2) / 2;
  }
  function getDisplayRating(item) {
    var r = clampRating(item.rating);
    if (r != null) return r;
    if (item.sentiment === "like") return 5;
    if (item.sentiment === "dislike") return 1;
    return null;
  }

  /* ─── 10 yıldız sistemi ─── */
  function starVal(index) { return (index + 1) * 0.5; }

  function buildStarRow(count, opts) {
    var html = "";
    var val = opts.value || 0;
    for (var i = 0; i < count; i++) {
      var sv = starVal(i);
      var on = val >= sv;
      var cls = "fb-star" + (on ? " is-on" : "");
      if (opts.interactive) {
        html += '<button type="button" class="' + cls + '" data-star="' + i + '">' +
                (on ? SVG_STAR_FULL : SVG_STAR_EMPTY) + '</button>';
      } else {
        html += '<span class="' + cls + '">' + (on ? SVG_STAR_FULL : SVG_STAR_EMPTY) + '</span>';
      }
    }
    return html;
  }

  function syncInputStars() {
    if (!starsInputRoot) return;
    var committed = clampRating(ratingHidden ? ratingHidden.value : "");
    var display = (hoverStar !== null) ? starVal(hoverStar) : committed;
    var btns = starsInputRoot.querySelectorAll("[data-star]");
    for (var i = 0; i < btns.length; i++) {
      var sv = starVal(i);
      var on = display != null && display >= sv;
      btns[i].classList.toggle("is-on", on);
      btns[i].innerHTML = on ? SVG_STAR_FULL : SVG_STAR_EMPTY;
    }
    starsInputRoot.classList.toggle("has-value", display != null && display > 0);
  }

  function setRating(val) {
    hoverStar = null;
    var v = clampRating(val);
    if (ratingHidden) ratingHidden.value = v != null ? String(v) : "";
    syncInputStars();
  }

  function buildStarInput() {
    if (!starsInputRoot) return;
    starsInputRoot.innerHTML = buildStarRow(10, { value: 0, interactive: true });
    starsInputRoot.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("[data-star]") : null;
      if (!btn) return;
      setRating(starVal(parseInt(btn.getAttribute("data-star"), 10)));
    });
    starsInputRoot.addEventListener("mouseover", function (e) {
      var btn = e.target.closest ? e.target.closest("[data-star]") : null;
      if (!btn) return;
      hoverStar = parseInt(btn.getAttribute("data-star"), 10);
      syncInputStars();
    });
    starsInputRoot.addEventListener("mouseleave", function () {
      hoverStar = null;
      syncInputStars();
    });
  }
  buildStarInput();

  function readonlyStarsHtml(rating) {
    if (rating == null) return "";
    return '<span class="fb-stars-ro">' + buildStarRow(10, { value: rating, interactive: false }) + '</span>';
  }

  /* ─── Kart render ─── */
  function voteRowHtml(item) {
    var key = item._key;
    if (!key) return "";
    var likes = Math.max(0, Math.floor(Number(item.likes) || 0));
    var dislikes = Math.max(0, Math.floor(Number(item.dislikes) || 0));
    var prev = localStorage.getItem(VOTE_KEY + key) || "";
    return (
      '<div class="fb-card__votes">' +
      '<button type="button" class="fb-vote' + (prev === "up" ? " is-pressed" : "") +
        '" data-fb-vote="up" data-fb-key="' + escapeAttr(key) + '">' +
        SVG_THUMB_UP + '<span class="fb-vote__count">' + likes + '</span></button>' +
      '<button type="button" class="fb-vote' + (prev === "down" ? " is-pressed" : "") +
        '" data-fb-vote="down" data-fb-key="' + escapeAttr(key) + '">' +
        SVG_THUMB_DOWN + '<span class="fb-vote__count">' + dislikes + '</span></button>' +
      '</div>'
    );
  }

  function ownerActionsHtml(key) {
    if (!isOwn(key)) return "";
    return (
      '<div class="fb-card__owner">' +
      '<button type="button" class="fb-act fb-act--edit" data-fb-edit="' + escapeAttr(key) + '">' +
        SVG_EDIT + '<span>' + dict("edit", "Düzenle", "Edit") + '</span></button>' +
      '<button type="button" class="fb-act fb-act--del" data-fb-del="' + escapeAttr(key) + '">' +
        SVG_TRASH + '<span>' + dict("delete", "Sil", "Delete") + '</span></button>' +
      '</div>'
    );
  }

  function renderCard(item) {
    var card = document.createElement("div");
    card.className = "fb-card" + (isOwn(item._key) ? " fb-card--own" : "");
    var r = getDisplayRating(item);
    card.innerHTML =
      '<div class="fb-card__head">' +
        '<span class="fb-card__head-main">' +
          readonlyStarsHtml(r) +
          '<span class="fb-card__name">' + escapeHtml(item.name || dict("anon","Anonim","Anonymous")) + '</span>' +
        '</span>' +
        '<time class="fb-card__time">' + timeAgo(item.timestamp) + '</time>' +
      '</div>' +
      '<p class="fb-card__msg">' + escapeHtml(item.message) + '</p>' +
      '<div class="fb-card__bottom">' + voteRowHtml(item) + ownerActionsHtml(item._key) + '</div>';
    return card;
  }

  function setMoreVisible(show) { if (moreBtn) moreBtn.classList.toggle("is-hidden", !show); }
  function renderList() {
    listEl.innerHTML = "";
    if (!allItems.length) { if (emptyEl) emptyEl.hidden = false; setMoreVisible(false); visibleCount = PAGE_SIZE; return; }
    if (emptyEl) emptyEl.hidden = true;
    var end = Math.min(visibleCount, allItems.length);
    for (var i = 0; i < end; i++) listEl.appendChild(renderCard(allItems[i]));
    setMoreVisible(end < allItems.length);
  }
  function setLoading(on) { if (!loadingEl) return; loadingEl.classList.toggle("is-busy", !!on); loadingEl.setAttribute("aria-busy", on ? "true" : "false"); }
  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg; errorEl.hidden = false;
    setTimeout(function () { errorEl.hidden = true; }, 6000);
  }
  function fetchT(url, opts) {
    var ctrl = new AbortController();
    var tid = setTimeout(function () { ctrl.abort(); }, FETCH_TIMEOUT_MS);
    var o = opts || {}; o.signal = ctrl.signal;
    return fetch(url, o).finally(function () { clearTimeout(tid); });
  }

  function loadFeedback() {
    setLoading(true); if (errorEl) errorEl.hidden = true;
    fetchT(FIREBASE_DB_URL + "/feedback.json")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        allItems = [];
        if (data) Object.keys(data).forEach(function (k) {
          var it = data[k]; if (it && it.message && it.hidden !== true) { it._key = k; allItems.push(it); }
        });
        allItems.sort(function (a, b) { return b.timestamp - a.timestamp; });
        renderList();
      })
      .catch(function () { showError(dict("loadErr","Geri bildirimler yüklenemedi.","Could not load feedback.")); })
      .finally(function () { setLoading(false); });
  }

  function canSubmit() { return Date.now() - parseInt(localStorage.getItem("ata-fb-last") || "0", 10) >= RATE_LIMIT_MS; }
  function updateCharCount() {
    if (!charCount || !msgInput) return;
    var rem = MAX_MSG_LEN - msgInput.value.length;
    charCount.textContent = rem;
    charCount.classList.toggle("is-warn", rem < 50);
    charCount.classList.toggle("is-over", rem < 0);
  }
  if (msgInput) { msgInput.addEventListener("input", updateCharCount); updateCharCount(); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = (nameInput ? nameInput.value.trim() : "").substring(0, MAX_NAME_LEN);
    var message = (msgInput ? msgInput.value.trim() : "");
    var rating = clampRating(ratingHidden ? ratingHidden.value : "");

    if (!validateFullName(name)) { showError(dict("errName","Geçerli ad soyad girin.","Enter a valid name.")); if (nameInput) nameInput.focus(); return; }
    if (rating == null) { showError(dict("errRating","Yıldız puanı seçin.","Pick a star rating.")); return; }
    if (!message) { msgInput.focus(); return; }
    if (message.length < MIN_MSG_LEN) { showError(dict("errMsgShort","Mesaj en az 3 karakter.","At least 3 chars.")); msgInput.focus(); return; }
    if (message.length > MAX_MSG_LEN) { showError(dict("msgTooLong","Mesaj en fazla 500 karakter.","Max 500 chars.")); return; }
    if (hasProfanity(message) || hasProfanity(name)) { showError(dict("errProfanity","Uygunsuz içerik.","Disallowed language.")); return; }
    if (!canSubmit()) { showError(dict("rateLimit","Biraz bekleyin.","Please wait.")); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = dict("sending", "Gönderiliyor…", "Sending…");

    if (editingKey) {
      fetchT(FIREBASE_DB_URL + "/feedback/" + encodeURIComponent(editingKey) + ".json", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, message: message, rating: Number(rating) }),
      })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function () {
          editingKey = null;
          form.reset(); setRating(null); updateCharCount(); loadFeedback();
          if (submitBtn) submitBtn.textContent = dict("send", "Gönder", "Send");
        })
        .catch(function () { showError(dict("sendErr","Düzenleme başarısız.","Edit failed.")); })
        .finally(function () { submitBtn.disabled = false; submitBtn.textContent = dict("send", "Gönder", "Send"); });
      return;
    }

    var payload = { name: name, message: message, timestamp: Date.now(), rating: Number(rating), likes: 0, dislikes: 0 };
    fetch(FIREBASE_DB_URL + "/feedback.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (res) {
        if (res && res.name) saveOwnKey(res.name);
        localStorage.setItem("ata-fb-last", String(Date.now()));
        form.reset(); setRating(null); updateCharCount(); loadFeedback();
      })
      .catch(function () { showError(dict("sendErr","Gönderilemedi.","Could not send.")); })
      .finally(function () { submitBtn.disabled = false; submitBtn.textContent = dict("send", "Gönder", "Send"); });
  });

  if (moreBtn) moreBtn.addEventListener("click", function () { visibleCount += PAGE_SIZE; renderList(); });

  function applyVote(key, dir) {
    var sk = VOTE_KEY + key, prev = localStorage.getItem(sk) || "";
    if (dir === prev) return Promise.resolve();
    var url = FIREBASE_DB_URL + "/feedback/" + encodeURIComponent(key) + ".json";
    return fetchT(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        if (!d) throw new Error("x");
        var l = Math.max(0, Math.floor(Number(d.likes)||0)), dl = Math.max(0, Math.floor(Number(d.dislikes)||0));
        if (dir === "up") { if (prev === "down") dl = Math.max(0, dl - 1); l++; }
        else { if (prev === "up") l = Math.max(0, l - 1); dl++; }
        return fetchT(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ likes: l, dislikes: dl }) })
          .then(function (r2) { if (!r2.ok) throw new Error(r2.status); localStorage.setItem(sk, dir); });
      });
  }

  listEl.addEventListener("click", function (e) {
    var voteBtn = e.target.closest ? e.target.closest("[data-fb-vote]") : null;
    if (voteBtn && !voteBtn.disabled) {
      var key = voteBtn.getAttribute("data-fb-key"), dir = voteBtn.getAttribute("data-fb-vote");
      if (!key || (dir !== "up" && dir !== "down")) return;
      voteBtn.disabled = true;
      applyVote(key, dir).then(loadFeedback)
        .catch(function () { showError(dict("voteErr","Oy kaydedilemedi.","Vote failed.")); })
        .finally(function () { voteBtn.disabled = false; });
      return;
    }

    var delBtn = e.target.closest ? e.target.closest("[data-fb-del]") : null;
    if (delBtn) {
      var dk = delBtn.getAttribute("data-fb-del");
      if (!dk || !isOwn(dk)) return;
      if (!confirm(dict("confirmDel","Yorumu silmek istediğinize emin misiniz?","Delete this comment?"))) return;
      fetchT(FIREBASE_DB_URL + "/feedback/" + encodeURIComponent(dk) + ".json", { method: "DELETE" })
        .then(function (r) { if (!r.ok) throw new Error(r.status); removeOwnKey(dk); loadFeedback(); })
        .catch(function () { showError(dict("delErr","Silinemedi.","Could not delete.")); });
      return;
    }

    var editBtn = e.target.closest ? e.target.closest("[data-fb-edit]") : null;
    if (editBtn) {
      var ek = editBtn.getAttribute("data-fb-edit");
      if (!ek || !isOwn(ek)) return;
      var item = allItems.filter(function (it) { return it._key === ek; })[0];
      if (!item) return;
      editingKey = ek;
      if (nameInput) nameInput.value = item.name || "";
      if (msgInput) msgInput.value = item.message || "";
      setRating(getDisplayRating(item));
      updateCharCount();
      submitBtn.textContent = dict("save","Kaydet","Save");
      form.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  window.addEventListener("ata-ready", function () {
    if (submitBtn) submitBtn.textContent = dict("send","Gönder","Send");
    if (nameInput) nameInput.placeholder = dict("phName","Örn. Ayşe Yılmaz","e.g. Jane Doe");
    if (msgInput) msgInput.placeholder = dict("phMsg","Geri bildiriminizi yazın…","Write your feedback…");
    renderList();
  });

  setMoreVisible(false);
  loadFeedback();
})();
