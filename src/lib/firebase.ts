import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBaZinumOWa2jd5b2NPVThwqaz01oiDFuY",
  authDomain: "ramadankareem-3be27.firebaseapp.com",
  projectId: "ramadankareem-3be27",
  storageBucket: "ramadankareem-3be27.firebasestorage.app",
  messagingSenderId: "220520680311",
  appId: "1:220520680311:web:7de32843f37d46c2eaaf72",
  measurementId: "G-0YMB01TBSS"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export const googleProvider = new GoogleAuthProvider();

export default app;
