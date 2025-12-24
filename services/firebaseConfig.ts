import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ⚠️ هام جداً: قم باستبدال القيم أدناه ببيانات مشروعك من Firebase Console
// اذهب إلى Project Settings > General > Your apps > SDK setup and configuration > Config
const firebaseConfig = {
 apiKey: "AIzaSyCU87wlzYeOzJzJ_q4PzvctK1UlrVs66Jg",
  authDomain: "scoolali-41f04.firebaseapp.com",
  projectId: "scoolali-41f04",
  storageBucket: "scoolali-41f04.firebasestorage.app",
  messagingSenderId: "319297101601",
  appId: "1:319297101601:web:fce6eb9ff7e215a73e2860",
};

// التحقق مما إذا تم إعداد Firebase بشكل صحيح أم لا تزال القيم الافتراضية
export const isFirebaseConfigured = firebaseConfig.projectId !== "scoolali-41f04";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;