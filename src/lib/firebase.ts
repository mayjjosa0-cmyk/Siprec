import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB3h89QN30Fjrbjcli8nuls7TKR6vam4oc",
  authDomain: "siprec-c7dfa.firebaseapp.com",
  projectId: "siprec-c7dfa",
  storageBucket: "siprec-c7dfa.firebasestorage.app",
  messagingSenderId: "1059435533938",
  appId: "1:1059435533938:web:333f4b530a7af26385d4eb",
  measurementId: "G-1632JE8MFT"
};

// Evita inicializar Firebase más de una vez en Next.js
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Exportamos los servicios para usarlos en el resto de las pantallas
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);