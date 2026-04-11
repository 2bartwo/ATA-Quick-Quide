/*
 * Ata Chapters — Geri bildirim (Firebase RTDB REST).
 * Yönetici: Alt+Shift+Y ile gizli giriş; yanıt / yönetici silme yalnızca tanımlı yönetici hesaplarında. Silme RTDB’de auth + UID ile sınırlıdır.
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
  var MAX_REPLY_LEN = 2000;
  var VOTE_KEY = "ata-fb-vote-";
  var OWN_KEY = "ata-fb-own";
  var TG_TOKEN = "8698825579:AAGzF_5Snqa-ZP0TU8NMOxYfBsiwbMcBoeo";
  var TG_CHAT = "6538936434";

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
  var adminModal = document.getElementById("fb-admin-modal");
  var adminModalForm = document.getElementById("fb-admin-modal-form");
  var adminModalSigned = document.getElementById("fb-admin-modal-signed");
  var adminEmailInput = document.getElementById("fb-admin-email");
  var adminPassInput = document.getElementById("fb-admin-pass");
  var adminModalOut = document.getElementById("fb-admin-modal-out");
  var adminListEl = document.getElementById("fb-admin-list");
  var profileNameInput = document.getElementById("fb-profile-name");
  var profileRankSelect = document.getElementById("fb-profile-rank");
  var profileSaveBtn = document.getElementById("fb-profile-save");
  var profileStatusEl = document.getElementById("fb-profile-status");
  var rankLegendEl = document.getElementById("fb-rank-legend");

  if (!form || !listEl) return;

  var allItems = [];
  var teamProfiles = {};
  var visibleCount = PAGE_SIZE;
  var hoverStar = null;
  var editingKey = null;

  function getLang() { return document.documentElement.getAttribute("data-lang") || "en"; }
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

  function isFirebaseReady() {
    return typeof firebase !== "undefined" && firebase.apps && firebase.apps.length > 0 && firebase.auth;
  }

  function getOwnerUid() {
    var u = window.__ATA_FB_OWNER_UID;
    return typeof u === "string" && u.length > 8 ? u : "";
  }

  function getAdminUids() {
    var seen = {};
    var out = [];
    function add(uid) {
      if (typeof uid !== "string" || uid.length < 9 || seen[uid]) return;
      seen[uid] = 1;
      out.push(uid);
    }
    add(getOwnerUid());
    var list = window.__ATA_FB_ADMIN_LIST;
    if (list && list.length) {
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].uid) add(String(list[i].uid));
      }
    }
    return out;
  }

  function isSiteAdmin() {
    if (!isFirebaseReady()) return false;
    var u = firebase.auth().currentUser;
    if (!u) return false;
    return getAdminUids().indexOf(u.uid) !== -1;
  }

  function getAdminListForDisplay() {
    var list = window.__ATA_FB_ADMIN_LIST;
    if (list && list.length) {
      var f = list.filter(function (it) {
        return it && it.uid;
      });
      if (f.length) return f;
    }
    var ou = getOwnerUid();
    if (!ou) return [];
    return [
      {
        uid: ou,
        name: dict("adminDefaultName", "Site yöneticisi", "Site administrator"),
        defaultRank: "developer",
      },
    ];
  }

  function getTeamRanks() {
    return window.__ATA_FB_TEAM_RANKS || {};
  }

  function getRankMeta(rankKey) {
    var R = getTeamRanks();
    return R[rankKey] || null;
  }

  function getDefaultRankForUid(uid) {
    var list = window.__ATA_FB_ADMIN_LIST;
    if (!list || !uid) return "developer";
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].uid === uid && list[i].defaultRank) return list[i].defaultRank;
    }
    return "developer";
  }

  function loadTeamProfiles() {
    return fetchT(FIREBASE_DB_URL + "/teamProfiles.json")
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(function (data) {
        teamProfiles = data && typeof data === "object" && !Array.isArray(data) ? data : {};
      })
      .catch(function () {
        teamProfiles = {};
      });
  }

  function ensureRankSelectOptions() {
    if (!profileRankSelect || profileRankSelect.options.length) return;
    var R = getTeamRanks();
    Object.keys(R).forEach(function (k) {
      var o = document.createElement("option");
      o.value = k;
      o.textContent = getLang() === "en" ? R[k].labelEn : R[k].labelTr;
      profileRankSelect.appendChild(o);
    });
  }

  function renderRankLegend() {
    if (!rankLegendEl) return;
    var R = getTeamRanks();
    var lng = getLang() === "en" ? "labelEn" : "labelTr";
    rankLegendEl.innerHTML = Object.keys(R)
      .map(function (k) {
        var m = R[k];
        return (
          '<span class="fb-rank-legend__chip" style="--fb-rank-c:' +
          escapeAttr(m.color) +
          ";--fb-rank-g:" +
          escapeAttr(m.glow) +
          '">' +
          escapeHtml(m[lng]) +
          "</span>"
        );
      })
      .join("");
  }

  function syncTeamProfileForm() {
    if (!profileNameInput || !profileRankSelect) return;
    if (!isFirebaseReady() || !firebase.auth().currentUser) return;
    var uid = firebase.auth().currentUser.uid;
    var p = teamProfiles[uid] || {};
    profileNameInput.value = p.badgeName || "";
    var defR = getDefaultRankForUid(uid);
    profileRankSelect.value = p.rank && getRankMeta(p.rank) ? p.rank : defR;
  }

  function renderAdminListHtml() {
    if (!adminListEl || !isSiteAdmin()) return;
    var rows = getAdminListForDisplay();
    adminListEl.innerHTML = rows
      .map(function (it) {
        var uid = it.uid ? String(it.uid) : "";
        var prof = uid ? teamProfiles[uid] : null;
        var displayName = escapeHtml(
          (prof && prof.badgeName) || it.name || it.note || dict("adminNoName", "Yönetici", "Admin")
        );
        var chip = "";
        if (prof && prof.rank && getRankMeta(prof.rank)) {
          var m = getRankMeta(prof.rank);
          var lbl = getLang() === "en" ? m.labelEn : m.labelTr;
          chip =
            '<span class="fb-admin-list__rank" style="--fb-rank-c:' +
            escapeAttr(m.color) +
            ";--fb-rank-g:" +
            escapeAttr(m.glow) +
            '">' +
            escapeHtml(lbl) +
            "</span>";
        }
        var uidHtml =
          '<code class="fb-admin-list__uid" title="' +
          escapeAttr(dict("adminUidTitle", "Firebase kullanıcı UID", "Firebase user UID")) +
          '">' +
          escapeHtml(uid) +
          "</code>";
        return (
          '<li class="fb-admin-list__item"><span class="fb-admin-list__name">' +
          displayName +
          "</span>" +
          chip +
          uidHtml +
          "</li>"
        );
      })
      .join("");
  }

  function syncAdminModalUi() {
    if (!adminModalForm || !adminModalSigned) return;
    var ok = isSiteAdmin();
    adminModalForm.hidden = ok;
    adminModalSigned.hidden = !ok;
    if (!ok) {
      if (adminListEl) adminListEl.innerHTML = "";
      if (profileStatusEl) profileStatusEl.hidden = true;
      return;
    }
    ensureRankSelectOptions();
    loadTeamProfiles().then(function () {
      renderRankLegend();
      syncTeamProfileForm();
      renderAdminListHtml();
    });
  }

  function setAdminModal(open) {
    if (!adminModal) return;
    adminModal.hidden = !open;
    adminModal.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) {
      syncAdminModalUi();
      if (!isSiteAdmin() && adminEmailInput) adminEmailInput.focus();
    }
  }

  function clampRating(n) {
    var x = Math.round(Number(n));
    if (!isFinite(x) || x < 1 || x > 5) return null;
    return x;
  }
  function getDisplayRating(item) {
    var r = clampRating(item.rating);
    if (r != null) return r;
    if (item.sentiment === "like") return 5;
    if (item.sentiment === "dislike") return 1;
    return null;
  }

  function findStarBtn(el) {
    while (el && el !== starsInputRoot) {
      if (el.getAttribute && el.getAttribute("data-star") != null) return el;
      el = el.parentNode;
    }
    return null;
  }

  /* ─── 5 yıldız sistemi (1-5 puan) ─── */
  function buildStarRow(count, opts) {
    var html = "";
    var val = opts.value || 0;
    for (var i = 1; i <= count; i++) {
      var on = val >= i;
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
    var display = (hoverStar !== null) ? hoverStar : committed;
    var btns = starsInputRoot.querySelectorAll("[data-star]");
    for (var i = 0; i < btns.length; i++) {
      var sv = parseInt(btns[i].getAttribute("data-star"), 10);
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
    while (starsInputRoot.firstChild) starsInputRoot.removeChild(starsInputRoot.firstChild);
    for (var i = 1; i <= 5; i++) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fb-star";
      btn.setAttribute("data-star", String(i));
      btn.innerHTML = SVG_STAR_EMPTY;
      (function (val) {
        btn.addEventListener("click", function () { setRating(val); });
        btn.addEventListener("mouseenter", function () { hoverStar = val; syncInputStars(); });
      })(i);
      starsInputRoot.appendChild(btn);
    }
    starsInputRoot.addEventListener("mouseleave", function () {
      hoverStar = null;
      syncInputStars();
    });
  }
  buildStarInput();

  function readonlyStarsHtml(rating) {
    if (rating == null) return "";
    return '<span class="fb-stars-ro">' + buildStarRow(5, { value: rating, interactive: false }) + '</span>';
  }

  function replyBlockHtml(item) {
    var rp = item.reply;
    if (!rp || typeof rp.text !== "string" || !String(rp.text).trim()) return "";
    var ts = rp.timestamp ? timeAgo(Number(rp.timestamp)) : "";
    return (
      '<aside class="fb-reply" aria-label="' +
      escapeAttr(dict("replyLabel", "Yanıt (site)", "Site reply")) +
      '"><div class="fb-reply__badge">' +
      escapeHtml(dict("replyLabel", "Yanıt (site)", "Site reply")) +
      '</div><p class="fb-reply__text">' +
      escapeHtml(rp.text) +
      "</p>" +
      (ts ? '<time class="fb-reply__time">' + escapeHtml(ts) + "</time>" : "") +
      "</aside>"
    );
  }

  function adminReplyEditorHtml(key) {
    if (!key || !isSiteAdmin()) return "";
    return (
      '<div class="fb-reply-editor">' +
      '<label class="fb-reply-editor__label">' +
      escapeHtml(dict("replyYour", "Yanıtınız", "Your reply")) +
      '</label><textarea class="fb-reply-editor__input fb-form__textarea" rows="3" maxlength="' +
      MAX_REPLY_LEN +
      '" data-fb-reply-ta="' +
      escapeAttr(key) +
      '" placeholder="' +
      escapeAttr(dict("replyPh", "Yanıt metni…", "Reply text…")) +
      '"></textarea><button type="button" class="btn btn--outline fb-reply-editor__btn" data-fb-reply-send="' +
      escapeAttr(key) +
      '">' +
      escapeHtml(dict("replySend", "Yanıtı yayınla", "Publish reply")) +
      "</button></div>"
    );
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
      "</div>"
    );
  }

  function adminActionsHtml(key) {
    if (!key || !isSiteAdmin()) return "";
    return (
      '<div class="fb-card__admin">' +
      '<button type="button" class="fb-act fb-act--del" data-fb-admin-del="' +
      escapeAttr(key) +
      '" title="' +
      escapeAttr(dict("adminDelTitle", "Yorumu sil (geri alınamaz)", "Delete comment (cannot undo)")) +
      '">' +
      SVG_TRASH +
      '<span>' +
      dict("adminDel", "Sil (yönetici)", "Delete (admin)") +
      "</span></button>" +
      "</div>"
    );
  }

  function displayNameForCard(item) {
    var uid = item.authorUid;
    if (uid && teamProfiles[uid] && teamProfiles[uid].badgeName) return teamProfiles[uid].badgeName;
    return item.name || dict("anon", "Anonim", "Anonymous");
  }

  function rankBadgeForCard(item) {
    var uid = item.authorUid;
    if (!uid) return "";
    var rk = (teamProfiles[uid] && teamProfiles[uid].rank) || getDefaultRankForUid(uid);
    var m = getRankMeta(rk);
    if (!m) return "";
    var label = getLang() === "en" ? m.labelEn : m.labelTr;
    return (
      '<span class="fb-team-badge" style="--fb-rank-color:' +
      escapeAttr(m.color) +
      ";--fb-rank-glow:" +
      escapeAttr(m.glow) +
      '">' +
      escapeHtml(label) +
      "</span>"
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
          '<span class="fb-card__name-wrap">' +
          '<span class="fb-card__name">' + escapeHtml(displayNameForCard(item)) + "</span>" +
          rankBadgeForCard(item) +
          "</span>" +
        '</span>' +
        '<time class="fb-card__time">' + timeAgo(item.timestamp) + '</time>' +
      '</div>' +
      '<p class="fb-card__msg">' + escapeHtml(item.message) + '</p>' +
      replyBlockHtml(item) +
      adminReplyEditorHtml(item._key) +
      '<div class="fb-card__bottom">' +
      voteRowHtml(item) +
      ownerActionsHtml(item._key) +
      adminActionsHtml(item._key) +
      "</div>";
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

  function sendReplyForKey(key, ta) {
    if (!key || !ta || !isSiteAdmin()) return Promise.resolve();
    var text = String(ta.value || "").trim();
    if (!text) {
      showError(dict("replyEmpty", "Yanıt metni yazın.", "Enter reply text."));
      return Promise.resolve();
    }
    if (text.length > MAX_REPLY_LEN) return Promise.resolve();
    if (!isFirebaseReady()) return Promise.resolve();
    return firebase.auth()
      .currentUser.getIdToken(false)
      .then(function (token) {
        var url =
          FIREBASE_DB_URL +
          "/feedback/" +
          encodeURIComponent(key) +
          ".json?auth=" +
          encodeURIComponent(token);
        return fetchT(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reply: { text: text, timestamp: Date.now() } }),
        }).then(function (r) {
          if (!r.ok) throw new Error(String(r.status));
          ta.value = "";
          loadFeedback();
        });
      })
      .catch(function () {
        showError(dict("replyErr", "Yanıt kaydedilemedi.", "Could not save reply."));
      });
  }

  function notifyTelegram(name, rating, message) {
    var stars = "";
    for (var i = 0; i < rating; i++) stars += "⭐";
    var text = "📩 *Ata Chapters — Yeni geri bildirim*\n\n" +
      "👤 *İsim:* " + name + "\n" +
      stars + " (" + rating + "/5)\n\n" +
      "💬 " + message;
    try {
      fetch("https://api.telegram.org/bot" + TG_TOKEN + "/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TG_CHAT, text: text, parse_mode: "Markdown" }),
      });
    } catch (e) {}
  }

  function loadFeedback() {
    setLoading(true);
    if (errorEl) errorEl.hidden = true;
    Promise.all([fetchT(FIREBASE_DB_URL + "/feedback.json"), loadTeamProfiles()])
      .then(function (results) {
        var r = results[0];
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(function (data) {
        allItems = [];
        if (data) {
          Object.keys(data).forEach(function (k) {
            var it = data[k];
            if (it && it.message && it.hidden !== true) {
              it._key = k;
              allItems.push(it);
            }
          });
        }
        allItems.sort(function (a, b) {
          return b.timestamp - a.timestamp;
        });
        renderList();
      })
      .catch(function () {
        showError(dict("loadErr", "Geri bildirimler yüklenemedi.", "Could not load feedback."));
      })
      .finally(function () {
        setLoading(false);
      });
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

    function postFeedback(url, body) {
      return fetchT(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      });
    }

    if (isSiteAdmin() && isFirebaseReady() && firebase.auth().currentUser) {
      firebase.auth()
        .currentUser.getIdToken(false)
        .then(function (token) {
          payload.authorUid = firebase.auth().currentUser.uid;
          var url = FIREBASE_DB_URL + "/feedback.json?auth=" + encodeURIComponent(token);
          return postFeedback(url, payload);
        })
        .then(function (res) {
          if (res && res.name) saveOwnKey(res.name);
          localStorage.setItem("ata-fb-last", String(Date.now()));
          notifyTelegram(name, rating, message);
          form.reset();
          setRating(null);
          updateCharCount();
          loadFeedback();
        })
        .catch(function () {
          showError(dict("sendErr", "Gönderilemedi.", "Could not send."));
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = dict("send", "Gönder", "Send");
        });
    } else {
      postFeedback(FIREBASE_DB_URL + "/feedback.json", payload)
        .then(function (res) {
          if (res && res.name) saveOwnKey(res.name);
          localStorage.setItem("ata-fb-last", String(Date.now()));
          notifyTelegram(name, rating, message);
          form.reset();
          setRating(null);
          updateCharCount();
          loadFeedback();
        })
        .catch(function () {
          showError(dict("sendErr", "Gönderilemedi.", "Could not send."));
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = dict("send", "Gönder", "Send");
        });
    }
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
    var replySend = e.target.closest ? e.target.closest("[data-fb-reply-send]") : null;
    if (replySend && !replySend.disabled) {
      var rk = replySend.getAttribute("data-fb-reply-send");
      if (!rk) return;
      var card = replySend.closest ? replySend.closest(".fb-card") : null;
      var ta = card && card.querySelector ? card.querySelector('[data-fb-reply-ta="' + rk + '"]') : null;
      if (!ta) return;
      replySend.disabled = true;
      var pr = sendReplyForKey(rk, ta);
      if (pr && typeof pr.finally === "function") {
        pr.finally(function () {
          replySend.disabled = false;
        });
      } else {
        replySend.disabled = false;
      }
      return;
    }

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

    var adminDel = e.target.closest ? e.target.closest("[data-fb-admin-del]") : null;
    if (adminDel) {
      var ak = adminDel.getAttribute("data-fb-admin-del");
      if (!ak || !isSiteAdmin()) return;
      if (!confirm(dict("confirmAdminDel", "Bu yorumu kalıcı olarak silmek istiyor musunuz?", "Permanently delete this comment?"))) return;
      if (!isFirebaseReady()) return;
      adminDel.disabled = true;
      firebase.auth()
        .currentUser.getIdToken(false)
        .then(function (token) {
          var url =
            FIREBASE_DB_URL +
            "/feedback/" +
            encodeURIComponent(ak) +
            ".json?auth=" +
            encodeURIComponent(token);
          return fetchT(url, { method: "DELETE" }).then(function (r) {
            if (!r.ok) throw new Error(String(r.status));
            removeOwnKey(ak);
            loadFeedback();
          });
        })
        .catch(function () {
          showError(dict("adminDelErr", "Silinemedi. Giriş veya veritabanı kurallarını kontrol edin.", "Could not delete. Check sign-in and database rules."));
        })
        .finally(function () {
          adminDel.disabled = false;
        });
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
    if (submitBtn) submitBtn.textContent = dict("send", "Gönder", "Send");
    if (nameInput) nameInput.placeholder = dict("phName", "Örn. Ayşe Yılmaz", "e.g. Jane Doe");
    if (msgInput) msgInput.placeholder = dict("phMsg", "Geri bildiriminizi yazın…", "Write your feedback…");
    if (profileRankSelect) {
      while (profileRankSelect.options.length) profileRankSelect.remove(0);
    }
    ensureRankSelectOptions();
    renderRankLegend();
    loadTeamProfiles().finally(function () {
      syncTeamProfileForm();
      renderAdminListHtml();
      renderList();
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && adminModal && !adminModal.hidden) {
      setAdminModal(false);
      return;
    }
    if (!e.altKey || !e.shiftKey || e.code !== "KeyY") return;
    if (e.repeat) return;
    e.preventDefault();
    if (!adminModal) return;
    setAdminModal(adminModal.hidden);
  });

  if (adminModal) {
    adminModal.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("[data-fb-admin-close]") : null;
      if (t) setAdminModal(false);
    });
  }

  if (adminModalForm) {
    adminModalForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!isFirebaseReady()) return;
      var em = adminEmailInput ? adminEmailInput.value.trim() : "";
      var pw = adminPassInput ? adminPassInput.value : "";
      firebase.auth().signInWithEmailAndPassword(em, pw).then(function () {
        setAdminModal(false);
        renderList();
      }).catch(function () {
        showError(dict("adminSignInErr", "Giriş başarısız.", "Sign-in failed."));
      });
    });
  }
  if (adminModalOut) {
    adminModalOut.addEventListener("click", function () {
      if (isFirebaseReady()) firebase.auth().signOut();
      syncAdminModalUi();
      renderList();
    });
  }

  if (profileSaveBtn) {
    profileSaveBtn.addEventListener("click", function () {
      if (!isSiteAdmin() || !isFirebaseReady()) return;
      var nm = profileNameInput ? profileNameInput.value.trim() : "";
      var rk = profileRankSelect ? profileRankSelect.value : "";
      if (!validateFullName(nm)) {
        showError(dict("errName", "Geçerli bir ad soyad girin.", "Enter a valid name."));
        return;
      }
      if (!getRankMeta(rk)) {
        showError(dict("teamProfileRankErr", "Geçerli bir rütbe seçin.", "Pick a valid rank."));
        return;
      }
      profileSaveBtn.disabled = true;
      firebase.auth()
        .currentUser.getIdToken(false)
        .then(function (token) {
          var uid = firebase.auth().currentUser.uid;
          var url =
            FIREBASE_DB_URL +
            "/teamProfiles/" +
            encodeURIComponent(uid) +
            ".json?auth=" +
            encodeURIComponent(token);
          return fetchT(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rank: rk, badgeName: nm }),
          }).then(function (r) {
            if (!r.ok) throw new Error(String(r.status));
            teamProfiles[uid] = { rank: rk, badgeName: nm };
            if (profileStatusEl) {
              profileStatusEl.textContent = dict("teamProfileSaved", "Profil kaydedildi.", "Profile saved.");
              profileStatusEl.hidden = false;
              setTimeout(function () {
                if (profileStatusEl) profileStatusEl.hidden = true;
              }, 4000);
            }
            renderAdminListHtml();
            renderList();
          });
        })
        .catch(function () {
          showError(dict("teamProfileErr", "Profil kaydedilemedi. Kuralları kontrol edin.", "Could not save profile. Check rules."));
        })
        .finally(function () {
          profileSaveBtn.disabled = false;
        });
    });
  }

  if (isFirebaseReady()) {
    firebase.auth().onAuthStateChanged(function () {
      loadTeamProfiles().finally(function () {
        syncAdminModalUi();
        renderList();
      });
    });
  }
  syncAdminModalUi();

  setMoreVisible(false);
  loadFeedback();
})();
