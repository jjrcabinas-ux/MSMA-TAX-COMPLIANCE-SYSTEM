/* ============================================================
   Firebase configuration — MSMA Tax Compliance System
   ============================================================
   SETUP INSTRUCTIONS
   ------------------
   1. Go to https://console.firebase.google.com and create a project
      (or open your existing MSMA project).

   2. In the Firebase Console:
      a. Build → Realtime Database → Create database
         · Choose location: asia-southeast1 (Singapore) for best PH latency
         · Start in LOCKED mode, then update the Rules to:
           {
             "rules": {
               ".read":  "auth != null",
               ".write": "auth != null"
             }
           }
      b. Build → Authentication → Sign-in method → Anonymous → Enable

   3. Go to Project Settings (⚙️) → Your apps → Add web app (</> icon).
      Copy the firebaseConfig object values into FIREBASE_CONFIG below.

   4. That's it — the app will sync across all devices automatically.

   NOTE: Web API keys are safe to commit. Security is enforced by
   Firebase Security Rules (authenticated writes only).
============================================================ */

// Replace each placeholder value with values from your Firebase project.
// Leave this object unchanged if you have not set up Firebase yet —
// the app will continue to work with localStorage only.
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
