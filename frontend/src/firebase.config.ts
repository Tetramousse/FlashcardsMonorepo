import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AlzaSyA8-wxpapsNmPXkn683MgGNjcy6nlwv6BY",
  authDomain: "flashcards-99474.firebaseapp.com",
  projectId: "flashcards-99474",
  storageBucket: "flashcards-99474.firebasestorage.app",
  messagingSenderId: "644803870246",
  appId: "1:644803870246:web:1007cceba198c24e16b0e7",
  measurementId: "G-D39D96Y13L"
};

// Inizializza l'app (funziona sia SSR che browser)
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Inizializza Auth (FUNZIONA SEMPRE, non serve window)
const auth = getAuth(app);

// Analytics solo lato browser (opzionale)
let analytics: Analytics | undefined;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    console.warn('Analytics not supported');
  });
}

export { app, auth, analytics };
