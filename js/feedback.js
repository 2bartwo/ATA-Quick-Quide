/*
 * ATA Quick Guide — Geri bildirim (Firebase RTDB REST, kurallar: database.rules.json)
 */
(function () {
  "use strict";

  var FIREBASE_DB_URL = "https://ata-quick-guide-538b0-default-rtdb.europe-west1.firebasedatabase.app";

  var RATE_LIMIT_MS = 30000;
  var MAX_MSG_LEN = 500;
  var MAX_NAME_LEN = 40;
  var PAGE_SIZE = 30;
  var FETCH_TIMEOUT_MS = 18000;
  var VOTE_STORAGE_PREFIX = "ata-fb-vote-";

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
  var msgInput = document.getElementById("fb-msg");
  var charCount = document.getElementById("fb-char-count");
  var submitBtn = document.getElementById("fb-submit");
  var listEl = document.getElementById("fb-list");
  var emptyEl = document.getElementById("fb-empty");
  var loadingEl = document.getElementById("fb-loading");
  var errorEl = document.getElementById("fb-error");
  var moreBtn = document.getElementById("fb-more");

  if (!form || !listEl) return;

  var allItems = [];
  var visibleCount = PAGE_SIZE;

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

  function authorThumbHtml(item) {
    var sent = item.sentiment;
    if (sent !== "like" && sent !== "dislike") return "";
    var label =
      sent === "like"
        ? dict("authorLikeAria", "Genel değerlendirme: olumlu", "Overall: positive")
        : dict("authorDislikeAria", "Genel değerlendirme: olumsuz", "Overall: negative");
    var icon = sent === "like" ? "👍" : "👎";
    return (
      '<span class="fb-card__author-thumb" role="img" aria-label="' +
      escapeAttr(label) +
      '"><span aria-hidden="true">' +
      icon +
      "</span></span>"
    );
  }

  function voteRowHtml(item) {
    var key = item._key;
    if (!key) return "";
    var likes = Math.max(0, Math.floor(Number(item.likes) || 0));
    var dislikes = Math.max(0, Math.floor(Number(item.dislikes) || 0));
    var prev = localStorage.getItem(VOTE_STORAGE_PREFIX + key) || "";
    var upPressed = prev === "up" ? " is-pressed" : "";
    var downPressed = prev === "down" ? " is-pressed" : "";
    return (
      '<div class="fb-card__votes">' +
      '<button type="button" class="fb-vote' +
      upPressed +
      '" data-fb-vote="up" data-fb-key="' +
      escapeAttr(key) +
      '" aria-label="' +
      escapeAttr(dict("voteUpAria", "Beğen", "Like")) +
      '">' +
      '<span class="fb-vote__icon" aria-hidden="true">👍</span>' +
      '<span class="fb-vote__count">' +
      likes +
      "</span></button>" +
      '<button type="button" class="fb-vote' +
      downPressed +
      '" data-fb-vote="down" data-fb-key="' +
      escapeAttr(key) +
      '" aria-label="' +
      escapeAttr(dict("voteDownAria", "Beğenme", "Dislike")) +
      '">' +
      '<span class="fb-vote__icon" aria-hidden="true">👎</span>' +
      '<span class="fb-vote__count">' +
      dislikes +
      "</span></button></div>"
    );
  }

  function renderCard(item) {
    var card = document.createElement("div");
    card.className = "fb-card";
    var thumb = authorThumbHtml(item);
    card.innerHTML =
      '<div class="fb-card__head">' +
      '<span class="fb-card__head-main">' +
      thumb +
      '<span class="fb-card__name">' +
      escapeHtml(item.name || dict("anon", "Anonim", "Anonymous")) +
      "</span></span>" +
      '<time class="fb-card__time">' +
      timeAgo(item.timestamp) +
      "</time>" +
      "</div>" +
      '<p class="fb-card__msg">' +
      escapeHtml(item.message) +
      "</p>" +
      voteRowHtml(item);
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
      setTimeout(function () {
        errorEl.hidden = true;
      }, 6000);
    }
  }

  function fetchWithTimeout(url, options) {
    var ctrl = new AbortController();
    var tid = setTimeout(function () {
      ctrl.abort();
    }, FETCH_TIMEOUT_MS);
    var opts = options || {};
    opts.signal = ctrl.signal;
    return fetch(url, opts).finally(function () {
      clearTimeout(tid);
    });
  }

  function loadFeedback() {
    setLoading(true);
    if (errorEl) errorEl.hidden = true;

    fetchWithTimeout(FIREBASE_DB_URL + "/feedback.json")
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (data) {
        allItems = [];
        if (data) {
          Object.keys(data).forEach(function (key) {
            var item = data[key];
            if (item && item.message && item.hidden !== true) {
              item._key = key;
              allItems.push(item);
            }
          });
        }
        allItems.sort(function (a, b) {
          return b.timestamp - a.timestamp;
        });
        renderList();
      })
      .catch(function () {
        showError(
          dict(
            "loadErr",
            "Geri bildirimler yüklenemedi. Lütfen sayfayı yenileyin.",
            "Could not load feedback. Please refresh."
          )
        );
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
    var sentInput = form.querySelector('input[name="fb-sentiment"]:checked');
    var sentiment = sentInput ? sentInput.value : "";

    if (!validateFullName(name)) {
      showError(
        dict(
          "errName",
          "Geçerli bir ad soyad girin (en az iki kelime, yalnızca harf).",
          "Enter a valid first and last name (at least two words, letters only)."
        )
      );
      if (nameInput) nameInput.focus();
      return;
    }
    if (sentiment !== "like" && sentiment !== "dislike") {
      showError(dict("errSentiment", "Olumlu veya olumsuz seçin.", "Choose thumbs up or down."));
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
      showError(
        dict(
          "rateLimit",
          "Lütfen biraz bekleyin, çok sık gönderim yapılamaz.",
          "Please wait a moment before submitting again."
        )
      );
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = dict("sending", "Gönderiliyor…", "Sending…");

    var payload = {
      name: name,
      message: message,
      timestamp: Date.now(),
      sentiment: sentiment,
      likes: 0,
      dislikes: 0,
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
        var radios = form.querySelectorAll('input[name="fb-sentiment"]');
        for (var ri = 0; ri < radios.length; ri++) radios[ri].checked = false;
        updateCharCount();
        loadFeedback();
      })
      .catch(function () {
        showError(
          dict(
            "sendErr",
            "Gönderilemedi. Kuralları veya alanları kontrol edin.",
            "Could not send. Check fields or database rules."
          )
        );
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

  function applyPublicVote(key, direction) {
    var storageKey = VOTE_STORAGE_PREFIX + key;
    var prev = localStorage.getItem(storageKey) || "";

    if (direction === "up" && prev === "up") return Promise.resolve();
    if (direction === "down" && prev === "down") return Promise.resolve();

    var url = FIREBASE_DB_URL + "/feedback/" + encodeURIComponent(key) + ".json";

    return fetchWithTimeout(url)
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(function (data) {
        if (!data || typeof data.message !== "string") throw new Error("missing");
        var likes = Math.max(0, Math.floor(Number(data.likes) || 0));
        var dislikes = Math.max(0, Math.floor(Number(data.dislikes) || 0));
        var next = prev;
        if (direction === "up") {
          if (prev === "down") {
            likes++;
            dislikes = Math.max(0, dislikes - 1);
          } else {
            likes++;
          }
          next = "up";
        } else {
          if (prev === "up") {
            likes = Math.max(0, likes - 1);
            dislikes++;
          } else {
            dislikes++;
          }
          next = "down";
        }
        return fetchWithTimeout(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ likes: likes, dislikes: dislikes }),
        }).then(function (patchR) {
          if (!patchR.ok) throw new Error(String(patchR.status));
          localStorage.setItem(storageKey, next);
        });
      });
  }

  listEl.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest ? e.target.closest("[data-fb-vote]") : null;
    if (!btn || btn.disabled) return;
    var key = btn.getAttribute("data-fb-key");
    var direction = btn.getAttribute("data-fb-vote");
    if (!key || (direction !== "up" && direction !== "down")) return;

    btn.disabled = true;
    var row = btn.closest(".fb-card__votes");
    if (row) row.classList.add("is-busy");

    applyPublicVote(key, direction)
      .then(function () {
        loadFeedback();
      })
      .catch(function () {
        showError(dict("voteErr", "Oy kaydedilemedi. Bağlantıyı deneyin.", "Could not save your vote. Try again."));
      })
      .finally(function () {
        btn.disabled = false;
        if (row) row.classList.remove("is-busy");
      });
  });

  window.addEventListener("ata-ready", function () {
    if (submitBtn) submitBtn.textContent = dict("send", "Gönder", "Send");
    if (nameInput) nameInput.placeholder = dict("phName", "Örn. Ayşe Yılmaz", "e.g. Jane Doe");
    if (msgInput) msgInput.placeholder = dict("phMsg", "Geri bildiriminizi yazın…", "Write your feedback…");
    renderList();
  });

  setMoreVisible(false);
  loadFeedback();
})();
