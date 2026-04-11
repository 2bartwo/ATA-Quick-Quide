/**
 * Firebase — yönetici yanıtları için Auth + web yapılandırması.
 *
 * Kurulum (bir kez):
 * 1) Firebase Console → Project settings → Your apps → Web → apiKey, appId, messagingSenderId değerlerini aşağıya yapıştır.
 * 2) Authentication → Sign-in method → Email/Password aç.
 * 3) Authentication → Users → kendi hesabını ekle; kullanıcı satırındaki UID'yi kopyala → __ATA_FB_OWNER_UID ve database.rules.json içindeki REPLACE_WITH_YOUR_FIREBASE_AUTH_UID ile aynı yap.
 * 4) Authentication → Settings → Authorized domains → canlı site alanını ekle (localhost gelir).
 * 5) Realtime Database → Rules → güncellenmiş kuralları yayınla.
 */
window.__FIREBASE_CONFIG__ = {
  apiKey: "",
  authDomain: "ata-quick-guide-538b0.firebaseapp.com",
  projectId: "ata-quick-guide-538b0",
  storageBucket: "ata-quick-guide-538b0.appspot.com",
  messagingSenderId: "",
  appId: "",
};

/** Giriş yapan hesabın UID’si — kurallardaki REPLACE_WITH_YOUR_FIREBASE_AUTH_UID ile birebir aynı olmalı */
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
