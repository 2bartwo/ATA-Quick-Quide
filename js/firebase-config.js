/**
 * Firebase web config (Firestore). Public keys are OK to ship; lock down with Firestore rules.
 * 1) Firebase Console → Project → Web app → copy config
 * 2) Firestore Database → create DB → paste rules from firestore.rules in repo root
 */
window.__FIREBASE_CONFIG__ = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};
