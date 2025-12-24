import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ⚠️ هام جداً: قم باستبدال القيم أدناه ببيانات مشروعك من Firebase Console
// اذهب إلى Project Settings > General > Your apps > SDK setup and configuration > Config
const firebaseConfig = {
  apiKey: "AIzaSyCU87wlzYeOzJzJ_q4PzvctK1UlrVs66Jg", // استبدل هذا
  authDomain: "scoolali-41f04.firebaseapp.com", // استبدل هذا
  projectId: "scoolali-41f04", // استبدل هذا
  storageBucket: "scoolali-41f04.firebasestorage.app", // استبدل هذا
  messagingSenderId: "319297101601", // استبدل هذا
  appId: "1:319297101601:web:81bb2581e66888773e2860" // استبدل هذا
};

// التحقق مما إذا تم إعداد Firebase بشكل صحيح أم لا تزال القيم الافتراضية
export const isFirebaseConfigured = firebaseConfig.projectId !== "your-project-id";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;