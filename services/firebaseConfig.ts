import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ⚠️⚠️⚠️ هام جداً جداً ⚠️⚠️⚠️
// يجب عليك استبدال البيانات في الأسفل ببيانات مشروعك الحقيقية من موقع Firebase
// الخطوات:
// 1. اذهب إلى https://console.firebase.google.com/
// 2. اضغط على أيقونة الإعدادات (الترس) > Project Settings
// 3. انزل للأسفل واختر تطبيق الويب (Web App)
// 4. انسخ القيم الموجودة في firebaseConfig وضعها هنا بدلاً من القيم الوهمية

const firebaseConfig = {
  // 👇 استبدل هذه القيم بقيم مشروعك الحقيقية 👇
  apiKey: "AIzaSyCU87wlzYeOzJzJ_q4PzvctK1UlrVs66Jg", // استبدل هذا
  authDomain: "scoolali-41f04.firebaseapp.com", // استبدل هذا
  projectId: "scoolali-41f04", // استبدل هذا
  storageBucket: "scoolali-41f04.firebasestorage.app", // استبدل هذا
  messagingSenderId: "319297101601", // استبدل هذا
  appId: "1:319297101601:web:81bb2581e66888773e2860" // استبدل هذا
};

// التحقق مما إذا تم إعداد Firebase بشكل صحيح أم لا تزال القيم الافتراضية
// إذا كان projectId لا يزال "your-project-id"، فالتطبيق سيعمل في وضع (Offline Demo)
export const isFirebaseConfigured = firebaseConfig.projectId !== "your-project-id";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;