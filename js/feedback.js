/*
 * ATA Quick Guide — Feedback (Firebase RTDB REST) + moderasyon (Firebase Auth)
 *
 * Firebase kuralları: repo kökündeki database.rules.json
 */
(function () {
  "use strict";

  var FIREBASE_DB_URL = "https://ata-quick-guide-538b0-default-rtdb.europe-west1.firebasedatabase.app";

  var RATE_LIMIT_MS = 30000;
  var MAX_MSG_LEN = 500;
  var MAX_NAME_LEN = 40;
  var PAGE_SIZE = 30;
  var FETCH_TIMEOUT_MS = 18000;

  var ALLOWED_CATEGORIES = {
    app_in_app: true,
    app_advice: true,
    app_user_fb: true,
    site_general: true,
    site_complaint: true,
    site_user_fb: true,
  };

  var DISALLOWED_NAME_PARTS = {
    test: true,
    deneme: true,
    asd: true,
    xxx: true,
    aaa: true,
    abc: true,
    admin: true,
    user: true,
    isim: true,
    soyisim: true,
    ad: true,
    soyad: true,
    yarrak: true,
    siktir: true,
  };

  var PROFANITY_SUBSTRINGS = [
    "siktir",
    "sikerim",
    "orospu",
    "pezevenk",
    "kahpe",
    "yarrak",
    "amk",
    "piç",
    "göt",
    "fuck",
    "shit",
    "bitch",
    "asshole",
    "bastard",
    "motherfucker",
    "cunt",
    "dickhead",
  ];

  var form = document.getElementById("fb-form");
  var nameInput = document.getElementById("fb-name");
  var categorySelect = document.getElementById("fb-category");
  var msgInput = document.getElementById("fb-msg");
  var charCount = document.getElementById("fb-char-count");
  var submitBtn = document.getElementById("fb-submit");
  var listEl = document.getElementById("fb-list");
  var emptyEl = document.getElementById("fb-empty");
  var loadingEl = document.getElementById("fb-loading");
  var errorEl = document.getElementById("fb-error");
  var moreBtn = document.getElementById("fb-more");

  var modPanel = document.getElementById("fb-mod-panel");
  var modNeedConfig = document.getElementById("fb-mod-need-config");
  var modForm = document.getElementById("fb-mod-form");
  var modSigned = document.getElementById("fb-mod-signed");
  var modEmailLabel = document.getElementById("fb-mod-email-label");
  var modStatus = document.getElementById("fb-mod-status");
  var modEmailIn = document.getElementById("fb-mod-email");
  var modPassIn = document.getElementById("fb-mod-password");
  var modSignInBtn = document.getElementById("fb-mod-signin");
  var modSignOutBtn = document.getElementById("fb-mod-signout");

  if (!form || !listEl) return;

  var allItems = [];
  var visibleCount = PAGE_SIZE;
  var isMod = false;

  function getLang() {
    return document.documentElement.getAttribute("data-lang") || "tr";
  }

  function dict(key, fallbackTr, fallbackEn) {
    var d = window.__ATA_I18N_DICT__;
    if (d && d.feedback && d.feedback[key] != null) return d.feedback[key];
    return getLang() === "en" ? fallbackEn : fallbackTr;
  }

  function timeAgo(ts) {
    var diff = Date.now() - ts;
    var s = Math.floor(diff / 1000);
    if (s < 60) return dict("timeJust", "az önce", "just now");
    var m = Math.floor(s / 60);
    if (m < 60) return m + " " + dict("timeMin", "dk önce", "min ago");
    var h = Math.floor(m / 60);
    if (h < 24) return h + " " + dict("timeHr", "saat önce", "hr ago");
    var d = Math.floor(h / 24);
    if (d < 30) return d + " " + dict("timeDay", "gün önce", "days ago");
    var date = new Date(ts);
    return date.toLocaleDateString(getLang() === "en" ? "en-GB" : "tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function firebaseReady() {
    return typeof firebase !== "undefined" && firebase.apps && firebase.apps.length > 0;
  }

  function authCfgOk() {
    var c = window.__FIREBASE_CONFIG__;
    return c && typeof c.apiKey === "string" && c.apiKey.length > 0;
  }

  function showModStatus(htmlOrText, isHtml) {
    if (!modStatus) return;
    if (htmlOrText) {
      modStatus.hidden = false;
      if (isHtml) modStatus.innerHTML = htmlOrText;
      else modStatus.textContent = htmlOrText;
    } else {
      modStatus.hidden = true;
      modStatus.textContent = "";
    }
  }

  function syncModPanel() {
    if (!modPanel) return;
    var ready = firebaseReady() && authCfgOk();
    if (!ready) {
      if (modNeedConfig) modNeedConfig.hidden = false;
      if (modForm) modForm.hidden = true;
      if (modSigned) modSigned.hidden = true;
      return;
    }
    if (modNeedConfig) modNeedConfig.hidden = true;
    var u = firebase.auth().currentUser;
    if (u && isMod) {
      if (modForm) modForm.hidden = true;
      if (modSigned) modSigned.hidden = false;
      if (modEmailLabel) modEmailLabel.textContent = u.email || u.uid;
    } else {
      if (modForm) modForm.hidden = false;
      if (modSigned) modSigned.hidden = true;
    }
  }

  function checkModerator(user) {
    if (!user) return Promise.resolve(false);
    return user.getIdToken().then(function (token) {
      return fetch(
        FIREBASE_DB_URL + "/moderators/" + user.uid + ".json?auth=" + encodeURIComponent(token)
      ).then(function (r) {
        if (!r.ok) return false;
        return r.json().then(function (v) { return v === true; });
      });
    });
  }

  function normalizeForProfanity(s) {
    return String(s)
      .toLowerCase()
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/0/g, "o")
      .replace(/1/g, "i")
      .replace(/3/g, "e")
      .replace(/4/g, "a")
      .replace(/@/g, "a");
  }

  function hasProfanity(text) {
    var n = normalizeForProfanity(text);
    for (var i = 0; i < PROFANITY_SUBSTRINGS.length; i++) {
      if (n.indexOf(PROFANITY_SUBSTRINGS[i]) !== -1) return true;
    }
    return false;
  }

  function validateFullName(raw) {
    var s = String(raw || "")
      .trim()
      .replace(/\s+/g, " ");
    if (s.length < 5 || s.length > MAX_NAME_LEN) return false;
    var parts = s.split(" ").filter(function (p) { return p.length > 0; });
    if (parts.length < 2) return false;
    var nameRe = /^[a-zA-ZğüşıöçĞÜŞİÖÇâêîôûÂÊÎÔÛ'\-]+$/;
    for (var j = 0; j < parts.length; j++) {
      var p = parts[j];
      if (p.length < 2 || p.length > 22) return false;
      if (!nameRe.test(p)) return false;
      if (/(.)\1{3,}/.test(p)) return false;
      var low = p.toLocaleLowerCase("tr-TR");
      if (DISALLOWED_NAME_PARTS[low]) return false;
    }
    return true;
  }

  function categoryLabel(key) {
    if (!key || !ALLOWED_CATEGORIES[key]) return dict("catUnknown", "Diğer", "Other");
    return dict("cat_" + key, key, key);
  }

  function metaPillsHtml(item) {
    var cat = item.category;
    var sent = item.sentiment;
    var parts = [];
    if (cat && ALLOWED_CATEGORIES[cat]) {
      parts.push(
        '<span class="fb-card__pill">' + escapeHtml(categoryLabel(cat)) + "</span>"
      );
    }
    if (sent === "like") {
      parts.push(
        '<span class="fb-card__pill fb-card__pill--like">' +
          escapeHtml(dict("like", "Beğendim", "Like")) +
          "</span>"
      );
    } else if (sent === "dislike") {
      parts.push(
        '<span class="fb-card__pill fb-card__pill--dislike">' +
          escapeHtml(dict("dislike", "Beğenmedim", "Dislike")) +
          "</span>"
      );
    }
    if (!parts.length) return "";
    return '<div class="fb-card__meta">' + parts.join("") + "</div>";
  }

  function renderCard(item) {
    var card = document.createElement("div");
    card.className = "fb-card" + (isMod && item.hidden ? " fb-card--hidden" : "");
    var badge =
      isMod && item.hidden
        ? '<span class="fb-card__badge">' + escapeHtml(dict("modHiddenBadge", "Gizli", "Hidden")) + "</span>"
        : "";
    var actions = "";
    if (isMod) {
      var key = item._key;
      var hid = !!item.hidden;
      actions =
        '<div class="fb-card__actions">' +
        (hid
          ? '<button type="button" data-fb-action="show" data-fb-key="' +
            escapeAttr(key) +
            '">' +
            escapeHtml(dict("modShow", "Göster", "Show")) +
            "</button>"
          : '<button type="button" data-fb-action="hide" data-fb-key="' +
            escapeAttr(key) +
            '">' +
            escapeHtml(dict("modHide", "Gizle", "Hide")) +
            "</button>") +
        '<button type="button" class="fb-card__btn--danger" data-fb-action="delete" data-fb-key="' +
        escapeAttr(key) +
        '">' +
        escapeHtml(dict("modDelete", "Sil", "Delete")) +
        "</button></div>";
    }
    card.innerHTML =
      metaPillsHtml(item) +
      '<div class="fb-card__head">' +
      '<span class="fb-card__name">' +
      escapeHtml(item.name || dict("anon", "Anonim", "Anonymous")) +
      badge +
      "</span>" +
      '<time class="fb-card__time">' +
      timeAgo(item.timestamp) +
      "</time>" +
      "</div>" +
      '<p class="fb-card__msg">' +
      escapeHtml(item.message) +
      "</p>" +
      actions;
    return card;
  }

  function setMoreVisible(show) {
    if (!moreBtn) return;
    moreBtn.classList.toggle("is-hidden", !show);
  }

  function renderList() {
    listEl.innerHTML = "";
    if (allItems.length === 0) {
      if (emptyEl) emptyEl.hidden = false;
      setMoreVisible(false);
      visibleCount = PAGE_SIZE;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    var end = Math.min(visibleCount, allItems.length);
    for (var i = 0; i < end; i++) {
      listEl.appendChild(renderCard(allItems[i]));
    }
    setMoreVisible(end < allItems.length);
  }

  function setLoading(on) {
    if (!loadingEl) return;
    loadingEl.classList.toggle("is-busy", !!on);
    loadingEl.setAttribute("aria-busy", on ? "true" : "false");
  }

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
      setTimeout(function () { errorEl.hidden = true; }, 6000);
    }
  }

  function fetchWithTimeout(url, options) {
    var ctrl = new AbortController();
    var tid = setTimeout(function () { ctrl.abort(); }, FETCH_TIMEOUT_MS);
    var opts = options || {};
    opts.signal = ctrl.signal;
    return fetch(url, opts).finally(function () {
      clearTimeout(tid);
    });
  }

  function loadFeedback() {
    setLoading(true);
    if (errorEl) errorEl.hidden = true;

    var authPart;
    if (isMod && firebaseReady()) {
      var u = firebase.auth().currentUser;
      if (u) {
        authPart = u
          .getIdToken()
          .then(function (t) {
            return "?auth=" + encodeURIComponent(t);
          })
          .catch(function () {
            return "";
          });
      } else {
        authPart = Promise.resolve("");
      }
    } else {
      authPart = Promise.resolve("");
    }

    authPart
      .then(function (q) {
        var suffix = typeof q === "string" ? q : "";
        return fetchWithTimeout(FIREBASE_DB_URL + "/feedback.json" + suffix);
      })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (data) {
        allItems = [];
        if (data) {
          Object.keys(data).forEach(function (key) {
            var item = data[key];
            if (item && item.message) {
              item._key = key;
              allItems.push(item);
            }
          });
        }
        allItems.sort(function (a, b) { return b.timestamp - a.timestamp; });
        renderList();
      })
      .catch(function () {
        showError(dict("loadErr", "Geri bildirimler yüklenemedi. Lütfen sayfayı yenileyin.", "Could not load feedback. Please refresh."));
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function canSubmit() {
    var last = parseInt(localStorage.getItem("ata-fb-last") || "0", 10);
    return Date.now() - last >= RATE_LIMIT_MS;
  }

  function updateCharCount() {
    if (!charCount || !msgInput) return;
    var remaining = MAX_MSG_LEN - msgInput.value.length;
    charCount.textContent = remaining;
    charCount.classList.toggle("is-warn", remaining < 50);
    charCount.classList.toggle("is-over", remaining < 0);
  }

  if (msgInput) {
    msgInput.addEventListener("input", updateCharCount);
    updateCharCount();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var name = (nameInput ? nameInput.value.trim() : "").substring(0, MAX_NAME_LEN);
    var message = (msgInput ? msgInput.value.trim() : "");
    var category = categorySelect ? categorySelect.value : "";
    var sentInput = form.querySelector('input[name="fb-sentiment"]:checked');
    var sentiment = sentInput ? sentInput.value : "";

    if (!validateFullName(name)) {
      showError(dict("errName", "Geçerli bir ad soyad girin (en az iki kelime, yalnızca harf).", "Enter a valid first and last name (at least two words, letters only)."));
      if (nameInput) nameInput.focus();
      return;
    }
    if (!category || !ALLOWED_CATEGORIES[category]) {
      showError(dict("errCategory", "Lütfen bir kategori seçin.", "Please choose a category."));
      return;
    }
    if (sentiment !== "like" && sentiment !== "dislike") {
      showError(dict("errSentiment", "Beğendim veya beğenmedim seçin.", "Choose like or dislike."));
      return;
    }
    if (!message) {
      msgInput.focus();
      return;
    }
    if (message.length > MAX_MSG_LEN) {
      showError(dict("msgTooLong", "Mesaj en fazla 500 karakter olabilir.", "Message cannot exceed 500 characters."));
      return;
    }
    if (hasProfanity(message) || hasProfanity(name)) {
      showError(dict("errProfanity", "Mesaj veya isim uygun değil.", "Message or name contains disallowed language."));
      return;
    }
    if (!canSubmit()) {
      showError(dict("rateLimit", "Lütfen biraz bekleyin, çok sık gönderim yapılamaz.", "Please wait a moment before submitting again."));
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = dict("sending", "Gönderiliyor…", "Sending…");

    var payload = {
      name: name,
      message: message,
      timestamp: Date.now(),
      sentiment: sentiment,
      category: category,
    };

    fetch(FIREBASE_DB_URL + "/feedback.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function () {
        localStorage.setItem("ata-fb-last", String(Date.now()));
        if (msgInput) msgInput.value = "";
        if (nameInput) nameInput.value = "";
        if (categorySelect) categorySelect.value = "";
        var radios = form.querySelectorAll('input[name="fb-sentiment"]');
        for (var ri = 0; ri < radios.length; ri++) radios[ri].checked = false;
        updateCharCount();
        loadFeedback();
      })
      .catch(function () {
        showError(dict("sendErr", "Gönderilemedi. Kuralları veya alanları kontrol edin.", "Could not send. Check fields or database rules."));
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = dict("send", "Gönder", "Send");
      });
  });

  if (moreBtn) {
    moreBtn.addEventListener("click", function () {
      visibleCount += PAGE_SIZE;
      renderList();
    });
  }

  listEl.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest ? e.target.closest("[data-fb-action]") : null;
    if (!btn || !isMod || !firebaseReady()) return;
    var key = btn.getAttribute("data-fb-key");
    var action = btn.getAttribute("data-fb-action");
    if (!key || !action) return;

    var u = firebase.auth().currentUser;
    if (!u) return;

    u.getIdToken()
      .then(function (token) {
        var url = FIREBASE_DB_URL + "/feedback/" + encodeURIComponent(key) + ".json?auth=" + encodeURIComponent(token);
        if (action === "delete") {
          return fetch(url, { method: "DELETE" }).then(function (r) {
            if (!r.ok) throw new Error(String(r.status));
          });
        }
        if (action === "hide") {
          return fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hidden: true }),
          }).then(function (r) {
            if (!r.ok) throw new Error(String(r.status));
          });
        }
        if (action === "show") {
          return fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hidden: false }),
          }).then(function (r) {
            if (!r.ok) throw new Error(String(r.status));
          });
        }
      })
      .then(function () {
        if (action === "hide") showModStatus(dict("modOkHide", "Yorum gizlendi.", "Comment hidden."), false);
        else if (action === "show") showModStatus(dict("modOkShow", "Yorum tekrar görünür.", "Comment is visible again."), false);
        else if (action === "delete") showModStatus(dict("modOkDelete", "Yorum silindi.", "Comment deleted."), false);
        loadFeedback();
      })
      .catch(function () {
        showModStatus(dict("modActionError", "İşlem yapılamadı.", "Action failed."), false);
      });
  });

  if (modForm) {
    modForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!firebaseReady()) return;
      showModStatus("", false);
      var email = modEmailIn ? modEmailIn.value.trim() : "";
      var pass = modPassIn ? modPassIn.value : "";
      firebase
        .auth()
        .signInWithEmailAndPassword(email, pass)
        .catch(function () {
          showModStatus(dict("modAuthError", "Giriş başarısız.", "Sign-in failed."), false);
        });
    });
  }

  if (modSignOutBtn) {
    modSignOutBtn.addEventListener("click", function () {
      if (firebaseReady()) firebase.auth().signOut();
      showModStatus("", false);
    });
  }

  function onAuth(user) {
    if (!user) {
      isMod = false;
      syncModPanel();
      loadFeedback();
      return;
    }
    checkModerator(user).then(function (mod) {
      isMod = mod;
      if (!mod) {
        firebase
          .auth()
          .signOut()
          .then(function () {
            isMod = false;
            syncModPanel();
            showModStatus(dict("modNotInList", "Bu hesap moderatör değil.", "This account is not a moderator."), false);
            loadFeedback();
          });
      } else {
        syncModPanel();
        loadFeedback();
      }
    });
  }

  if (firebaseReady()) {
    firebase.auth().onAuthStateChanged(onAuth);
  } else {
    syncModPanel();
  }

  function translateCategoryGroups() {
    var sel = document.getElementById("fb-category");
    if (!sel) return;
    var ogs = sel.getElementsByTagName("optgroup");
    if (ogs[0]) ogs[0].label = dict("catGroupApp", "Uygulama", "App");
    if (ogs[1]) ogs[1].label = dict("catGroupSite", "Site", "Website");
  }

  window.addEventListener("ata-ready", function () {
    translateCategoryGroups();
    if (submitBtn) submitBtn.textContent = dict("send", "Gönder", "Send");
    if (nameInput) nameInput.placeholder = dict("phName", "Örn. Ayşe Yılmaz", "e.g. Jane Doe");
    if (msgInput) msgInput.placeholder = dict("phMsg", "Geri bildiriminizi yazın…", "Write your feedback…");
    if (modSignInBtn) modSignInBtn.textContent = dict("modSignIn", "Giriş yap", "Sign in");
    if (modSignOutBtn) modSignOutBtn.textContent = dict("modSignOut", "Çıkış", "Sign out");
    syncModPanel();
    renderList();
  });

  setMoreVisible(false);
  syncModPanel();
  loadFeedback();
})();
