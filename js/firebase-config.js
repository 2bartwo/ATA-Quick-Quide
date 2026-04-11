/**
 * Firebase Web SDK (Auth) — geri bildirim moderasyonu için gerekli.
 * Konsol: Project settings → Your apps → Web → yapılandırmayı kopyala.
 * apiKey boşsa moderatör girişi devre dışı kalır; anonim geri bildirim yine RTDB ile çalışır (kurallara bağlı).
 */
window.__FIREBASE_CONFIG__ = {
  apiKey: "",
  authDomain: "ata-quick-guide-538b0.firebaseapp.com",
  projectId: "ata-quick-guide-538b0",
  storageBucket: "ata-quick-guide-538b0.appspot.com",
  messagingSenderId: "",
  appId: "",
};

(function () {
  if (typeof firebase === "undefined") return;
  var c = window.__FIREBASE_CONFIG__;
  if (!c || !c.apiKey || !c.projectId) return;
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(c);
    }
  } catch (e) {
    console.warn("Firebase init", e);
  }
})();
