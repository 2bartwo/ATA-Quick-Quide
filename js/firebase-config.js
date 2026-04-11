/**
 * Firebase — yönetici yanıtları (Auth). Konsoldan kopyalanan web yapılandırması.
 * __ATA_FB_OWNER_UID ve database.rules.json içindeki UID hâlâ senin doldurman gerekiyor.
 */
window.__FIREBASE_CONFIG__ = {
  apiKey: "AIzaSyAZjf8SY-pO-ovIRUaz6xzEFRiiaJ1FqxU",
  authDomain: "ata-quick-guide-538b0.firebaseapp.com",
  databaseURL: "https://ata-quick-guide-538b0-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ata-quick-guide-538b0",
  storageBucket: "ata-quick-guide-538b0.firebasestorage.app",
  messagingSenderId: "3251106926",
  appId: "1:3251106926:web:57ccab57917f2f4935e27f",
  measurementId: "G-RR5BTB4FQ9",
};

/** Authentication → Users → satırdaki UID — Realtime Database kurallarındaki REPLACE_WITH_YOUR_FIREBASE_AUTH_UID ile aynı olmalı */
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
