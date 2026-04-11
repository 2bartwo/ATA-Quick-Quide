/**
 * Referans: Firebase Web yapılandırması (isteğe bağlı).
 * Ana sayfa bu dosyayı yüklemez. Site yanıtları: Firebase Console → Realtime Database
 * → feedback → ilgili kayıt → child ekle: reply = { "text": "...", "timestamp": 1730000000000 }
 *
 * Kurallar istemciden reply yazmayı engeller; Console yönetici oturumu kuralları bypass eder.
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
