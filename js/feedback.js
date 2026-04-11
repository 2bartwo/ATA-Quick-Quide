/*
 * ATA Quick Guide — Feedback (Firebase Realtime Database REST API)
 *
 * Rules örneği (sadece feedback yolu):
 * { "rules": { "feedback": { ".read": true, ".write": true } } }
 */
(function () {
  "use strict";

  var FIREBASE_DB_URL = "https://ata-quick-guide-538b0-default-rtdb.europe-west1.firebasedatabase.app";

  var RATE_LIMIT_MS = 30000;
  var MAX_MSG_LEN = 500;
  var MAX_NAME_LEN = 40;
  var PAGE_SIZE = 30;

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

  function t(tr, en) {
    return getLang() === "en" ? en : tr;
  }

  function timeAgo(ts) {
    var diff = Date.now() - ts;
    var s = Math.floor(diff / 1000);
    if (s < 60) return t("az önce", "just now");
    var m = Math.floor(s / 60);
    if (m < 60) return m + " " + t("dk önce", "min ago");
    var h = Math.floor(m / 60);
    if (h < 24) return h + " " + t("saat önce", "hr ago");
    var d = Math.floor(h / 24);
    if (d < 30) return d + " " + t("gün önce", "days ago");
    var date = new Date(ts);
    return date.toLocaleDateString(getLang() === "en" ? "en-GB" : "tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderCard(item) {
    var card = document.createElement("div");
    card.className = "fb-card";
    card.innerHTML =
      '<div class="fb-card__head">' +
      '<span class="fb-card__name">' + escapeHtml(item.name || t("Anonim", "Anonymous")) + "</span>" +
      '<time class="fb-card__time">' + timeAgo(item.timestamp) + "</time>" +
      "</div>" +
      '<p class="fb-card__msg">' + escapeHtml(item.message) + "</p>";
    return card;
  }

  function renderList() {
    listEl.innerHTML = "";
    if (allItems.length === 0) {
      if (emptyEl) emptyEl.hidden = false;
      if (moreBtn) moreBtn.hidden = true;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    var end = Math.min(visibleCount, allItems.length);
    for (var i = 0; i < end; i++) {
      listEl.appendChild(renderCard(allItems[i]));
    }
    if (moreBtn) moreBtn.hidden = end >= allItems.length;
  }

  function setLoading(on) {
    if (loadingEl) loadingEl.hidden = !on;
  }

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
      setTimeout(function () { errorEl.hidden = true; }, 5000);
    }
  }

  function loadFeedback() {
    setLoading(true);
    if (errorEl) errorEl.hidden = true;

    fetch(FIREBASE_DB_URL + "/feedback.json")
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
        showError(t(
          "Geri bildirimler yüklenemedi. Lütfen sayfayı yenileyin.",
          "Could not load feedback. Please refresh."
        ));
      })
      .finally(function () { setLoading(false); });
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

    if (!message) {
      msgInput.focus();
      return;
    }
    if (message.length > MAX_MSG_LEN) {
      showError(t(
        "Mesaj en fazla " + MAX_MSG_LEN + " karakter olabilir.",
        "Message cannot exceed " + MAX_MSG_LEN + " characters."
      ));
      return;
    }
    if (!canSubmit()) {
      showError(t(
        "Lütfen biraz bekleyin, çok sık gönderim yapılamaz.",
        "Please wait a moment before submitting again."
      ));
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = t("Gönderiliyor…", "Sending…");

    var payload = {
      name: name || null,
      message: message,
      timestamp: Date.now(),
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
        updateCharCount();
        loadFeedback();
      })
      .catch(function () {
        showError(t(
          "Gönderilemedi. Lütfen tekrar deneyin.",
          "Could not send. Please try again."
        ));
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = t("Gönder", "Send");
      });
  });

  if (moreBtn) {
    moreBtn.addEventListener("click", function () {
      visibleCount += PAGE_SIZE;
      renderList();
    });
  }

  window.addEventListener("ata-ready", function () {
    if (submitBtn) submitBtn.textContent = t("Gönder", "Send");
    if (nameInput) nameInput.placeholder = t("İsim (isteğe bağlı)", "Name (optional)");
    if (msgInput) msgInput.placeholder = t("Geri bildiriminizi yazın…", "Write your feedback…");
    renderList();
  });

  loadFeedback();
})();
