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

/**
 * Ekip rütbeleri (yorum kartında neon rozet + renk). rank anahtarı teamProfiles ve database.rules ile eşleşmeli.
 * Diğer ekip üyeleri için: Firebase Auth UID ekleyin → __ATA_FB_ADMIN_LIST + rules (teamProfiles + feedback authorUid) içinde aynı UID’yi tanımlayın.
 */
window.__ATA_FB_TEAM_RANKS = {
  developer: {
    labelTr: "Geliştirici",
    labelEn: "Developer",
    color: "#7F1D1D",
    glow: "rgba(248, 113, 113, 0.9)",
  },
  assistant: {
    labelTr: "Site yardımcı geliştirici",
    labelEn: "Site assistant developer",
    color: "#3B82F6",
    glow: "rgba(96, 165, 250, 0.95)",
  },
  mentor: {
    labelTr: "Mentor",
    labelEn: "Mentor",
    color: "#8B5CF6",
    glow: "rgba(167, 139, 250, 0.95)",
  },
  test: {
    labelTr: "Test ekibi",
    labelEn: "Test team",
    color: "#F97316",
    glow: "rgba(251, 146, 60, 0.95)",
  },
};

/**
 * Firebase Auth UID → varsayılan görünen isim (teamProfiles ile üzerine yazılabilir).
 * Yeni ekip üyesi: UID’yi buraya + database.rules (teamProfiles + feedback authorUid) içine ekleyin.
 */
window.__ATA_FB_ADMIN_LIST = [
  { uid: "Utzc1cGvuPhzSBismyiTQ28pvYf2", name: "Yusuf Mirza Sökmen", defaultRank: "developer" },
  { uid: "dCemgBrqxEX1sKBU52eYHfDBNyI3", name: "Bartu Yıldız", defaultRank: "assistant" },
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
