import { db, storage, isFirebaseConfigured } from './firebaseConfig';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { AdminStats, AppConfig, Material } from '../types';
import { getAllSubjects as getLocalSubjects, hideDefaultMaterial } from './storageService';

/**
 * خدمة Firebase المحسنة مع دعم الوضع التجريبي (Local Storage Fallback)
 */

const ANALYTICS_KEY = 'haqiba_analytics_local';
const MOCK_STORAGE_KEY = 'haqiba_custom_materials'; // Fallback for demo mode

// --- Helper for Mock Data ---
const getMockMaterials = (): Material[] => {
    try {
        const data = localStorage.getItem(MOCK_STORAGE_KEY);
        // التخزين المحلي يحفظ البيانات كـ Record<subjectId, Material[]> في storageService، 
        // لكن هنا للتبسيط في الوضع التجريبي سنتعامل معها كمصفوفة مسطحة أو نعيد هيكلتها
        if (data) {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) return parsed; // If stored as flat array
            // If stored as Record (from storageService logic), flatten it
            return Object.values(parsed).flat() as Material[];
        }
    } catch (e) {}
    return [];
};

const saveMockMaterial = (material: Material) => {
    const current = getMockMaterials();
    // في الوضع التجريبي، سنحفظها كمصفوفة مسطحة مع خاصية subjectId
    current.push(material);
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(current));
};

export const logAnalyticsEvent = (event: 'pdf_open' | 'quiz_start' | 'ai_message', metadata?: any) => {
    try {
        const currentData = localStorage.getItem(ANALYTICS_KEY);
        const stats = currentData ? JSON.parse(currentData) : { pdfOpens: 0, quizAttempts: 0, aiMessages: 0 };
        
        if (event === 'pdf_open') stats.pdfOpens++;
        if (event === 'quiz_start') stats.quizAttempts++;
        if (event === 'ai_message') stats.aiMessages++;
        
        localStorage.setItem(ANALYTICS_KEY, JSON.stringify(stats));
    } catch (e) { console.error(e); }
};

// --- Admin Stats ---
export const getAdminStats = async (): Promise<AdminStats> => {
    // 1. حساب المواد الافتراضية
    const defaultSubjects = getLocalSubjects();
    const defaultCount = defaultSubjects.reduce((acc, sub) => acc + sub.materials.length, 0);
    
    // 2. جلب الإحصائيات المحلية
    const localStatsData = localStorage.getItem(ANALYTICS_KEY);
    const localStats = localStatsData ? JSON.parse(localStatsData) : { pdfOpens: 0, quizAttempts: 0, aiMessages: 0 };

    let customCount = 0;

    if (isFirebaseConfigured) {
        try {
            const materialsSnapshot = await getDocs(collection(db, 'materials'));
            customCount = materialsSnapshot.size;
        } catch (error) {
            console.warn("Firebase connect failed, using 0 for custom count");
        }
    } else {
        customCount = getMockMaterials().length;
    }

    return {
        totalUsers: 1540,
        totalMaterials: defaultCount + customCount,
        activeToday: 120,
        engagement: {
            ...localStats,
            popularSubjects: {},
            activeUsersLastHour: 5
        }
    };
};

// --- Config (Channels, etc) ---
export const fetchAppConfig = async (): Promise<AppConfig> => {
    if (isFirebaseConfigured) {
        try {
            const configDoc = await getDoc(doc(db, 'config', 'main_config'));
            if (configDoc.exists()) {
                return configDoc.data() as AppConfig;
            }
        } catch (e) { console.warn("Config fetch failed", e); }
    }
    
    // Default fallback
    return {
        requiredChannels: [{ id: "iq_3rd", name: "قناة الثالث متوسط", url: "https://t.me/iq_3rd" }],
        adminIds: [123456],
        isMaintenance: false
    };
};

export const updateAppConfig = async (newConfig: AppConfig): Promise<void> => {
    if (!isFirebaseConfigured) {
        console.warn("Firebase not configured. Config not saved to cloud.");
        return;
    }
    try {
        const configRef = doc(db, 'config', 'main_config');
        await updateDoc(configRef, newConfig as any);
    } catch (e) {
        console.error("Config Update Error:", e);
    }
};

// --- Materials Operations ---

export const fetchCustomMaterials = async (): Promise<Material[]> => {
    if (!isFirebaseConfigured) {
        return getMockMaterials();
    }

    try {
        const querySnapshot = await getDocs(collection(db, 'materials'));
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Material[];
    } catch (error) {
        console.error("Error fetching custom materials:", error);
        // Fallback on error to allow app to work
        return getMockMaterials();
    }
};

export const uploadMaterial = async (subjectId: string, title: string, type: 'book' | 'summary', base64Data: string) => {
    // Demo Mode: Save to LocalStorage
    if (!isFirebaseConfigured) {
        const newMaterial: Material = {
            id: `custom-${Date.now()}`,
            title,
            type,
            url: base64Data, // Save base64 directly as URL for local demo
            addedAt: Date.now(),
            // @ts-ignore
            subjectId: subjectId
        };
        saveMockMaterial(newMaterial);
        return true;
    }

    try {
        const response = await fetch(base64Data);
        const blob = await response.blob();
        const fileName = `${Date.now()}_${title.replace(/\s+/g, '_')}.pdf`;
        const storageRef = ref(storage, `materials/${subjectId}/${fileName}`);

        const snapshot = await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(snapshot.ref);

        const newMaterial: Omit<Material, 'id'> = {
            title,
            type,
            url: downloadURL,
            addedAt: Date.now(),
            // @ts-ignore
            subjectId: subjectId, 
            storagePath: snapshot.metadata.fullPath
        };

        await addDoc(collection(db, 'materials'), newMaterial);
        return true;

    } catch (error) {
        console.error("Upload Error:", error);
        throw error;
    }
};

export const removeMaterial = async (subjectId: string, materialId: string, storagePath?: string) => {
    // 1. دائماً قم بإخفاء المادة محلياً في حالة كانت من المواد الأساسية (Static)
    // هذا يضمن اختفاء الكتب الافتراضية عند الضغط على حذف
    hideDefaultMaterial(materialId);

    // Demo Mode: Remove from LocalStorage Custom Materials
    if (!isFirebaseConfigured) {
        const current = getMockMaterials();
        const filtered = current.filter(m => m.id !== materialId);
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(filtered));
        return true;
    }

    // Firebase Mode
    try {
        // محاولة الحذف من Firestore (للمواد المرفوعة)
        // قد تفشل إذا كانت المادة أساسية (غير موجودة في قاعدة البيانات)، وهذا طبيعي ويتم تجاهله
        await deleteDoc(doc(db, 'materials', materialId)).catch(() => {});

        if (storagePath) {
            const fileRef = ref(storage, storagePath);
            await deleteObject(fileRef).catch(err => console.log("File not found in storage or static", err));
        }

        return true;
    } catch (error) {
        console.error("Remove Error (might be static material):", error);
        return true; // نرجع True لأننا قمنا بإخفائها محلياً في الخطوة 1
    }
};