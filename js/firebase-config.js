/**
 * Firebase Web — Auth (gizli yönetici girişi için).
 * __ATA_FB_OWNER_UID = Authentication → Users listesindeki kullanıcı UID (kurallardaki REPLACE_OWNER_FIREBASE_AUTH_UID ile aynı olmalı).
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

window.__ATA_FB_OWNER_UID = "Utzc1cGvuPhzSBismyiTQ28pvYf2";

/** Giriş yapan yönetici ile aynı UID’ler; modalda “Yöneticiler” listesi. Silme/yanıt kurallarında da bu UID kullanılır — yeni yönetici eklerken hem burayı hem database.rules içindeki auth.uid koşulunu güncelleyin. */
window.__ATA_FB_ADMIN_LIST = [
  { uid: "Utzc1cGvuPhzSBismyiTQ28pvYf2", name: "Site yöneticisi" },
];

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
