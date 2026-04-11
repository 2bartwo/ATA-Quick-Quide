/**
 * Firebase — yönetici yanıtları için Auth.
 *
 * apiKey nerede?
 * Firebase Console → sol üst dişli (Project settings) → Genel → aşağı in
 * → "Uygulamalarınız" / Your apps → Web (</>) uygulaması yoksa "Web ekle"
 * → "Firebase SDK ekle" / npm yerine yapılandırma nesnesi (firebaseConfig)
 * → oradaki apiKey: "AIzaSy……" satırını aynen kopyala (genelde AIza ile başlar).
 *
 * Diğer adımlar: Authentication → E-posta/Şifre aç; Users’tan UID → __ATA_FB_OWNER_UID + database.rules.json
 */
window.__FIREBASE_CONFIG__ = {
  apiKey: "",
  authDomain: "ata-quick-guide-538b0.firebaseapp.com",
  projectId: "ata-quick-guide-538b0",
  storageBucket: "ata-quick-guide-538b0.appspot.com",
  messagingSenderId: "3251106926",
  /** Konsoldaki firebaseConfig içindeki appId (genelde 1:3251106926:web:… şeklinde) */
  appId: "",
};

/** Authentication → Users → satırdaki UID — kurallardaki REPLACE_WITH_YOUR_FIREBASE_AUTH_UID ile aynı */
window.__ATA_FB_OWNER_UID = "";

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
