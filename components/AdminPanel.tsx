import React, { useState, useEffect } from 'react';
import { 
    Users, TrendingUp, Upload, Lock, LogOut, ShieldAlert,
    Eye, Play, MessageCircle, Plus, Trash2, Link as LinkIcon, FileText, CheckCircle2, FolderOpen, BookOpen, Globe, Loader2, AlertTriangle
} from 'lucide-react';
import { getAdminStats, fetchAppConfig, uploadMaterial, updateAppConfig, removeMaterial, fetchCustomMaterials } from '../services/firebaseService';
import { isFirebaseConfigured } from '../services/firebaseConfig';
import { getAllSubjects } from '../services/storageService';
import { AdminStats, AppConfig, Subject } from '../types';
import { useNavigate } from 'react-router-dom';

export const AdminPanel = () => {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Data State
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    
    // Upload State
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [materialTitle, setMaterialTitle] = useState('');
    const [materialType, setMaterialType] = useState<'book' | 'summary'>('summary');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    
    // Action Feedback
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Channels State
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelUrl, setNewChannelUrl] = useState('');

    const [activeTab, setActiveTab] = useState<'stats' | 'upload' | 'materials' | 'channels'>('stats');

    // Load data on mount/auth
    useEffect(() => {
        if (isAuthenticated) loadData();
    }, [isAuthenticated, activeTab]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (email.trim() === 'alifakarr' && password === 'Aliliwaa00') {
            setIsAuthenticated(true);
        } else {
            alert("⚠️ بيانات الدخول غير صحيحة! يرجى المحاولة مرة أخرى.");
        }
    };

    const loadData = async () => {
        try {
            const s = await getAdminStats();
            const c = await fetchAppConfig();
            setStats(s);
            setConfig(c);
            
            // 1. Get Static Subjects
            const staticSubjects = getAllSubjects();
            
            // 2. Get Custom Materials (From Firebase OR LocalStorage fallback)
            const customMaterials = await fetchCustomMaterials();
            
            // 3. Merge for Admin View
            const mergedSubjects = staticSubjects.map(sub => {
                const subCustom = customMaterials.filter((m: any) => m.subjectId === sub.id);
                return {
                    ...sub,
                    materials: [...sub.materials, ...subCustom]
                };
            });

            setSubjects(mergedSubjects);
            
            if (!selectedSubject && mergedSubjects.length > 0) {
                setSelectedSubject(mergedSubjects[0].id);
            }
        } catch (err) {
            console.error("Failed to load admin data", err);
        }
    };

    // --- File Handling ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type !== 'application/pdf') {
                alert('يرجى اختيار ملف PDF فقط');
                return;
            }
            setSelectedFile(file);
        }
    };

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSubject || !materialTitle || !selectedFile) {
            alert("يرجى ملء جميع الحقول واختيار ملف");
            return;
        }

        setUploading(true);
        setUploadProgress(10); // Start progress

        try {
            const base64Url = await convertFileToBase64(selectedFile);
            setUploadProgress(40);
            
            // This will use Firebase OR LocalStorage depending on config
            await uploadMaterial(selectedSubject, materialTitle, materialType, base64Url);
            setUploadProgress(100);
            
            setTimeout(() => {
                alert(isFirebaseConfigured ? "✅ تم رفع الملف بنجاح إلى السحابة!" : "✅ تم الحفظ محلياً (وضع العرض)");
                setMaterialTitle('');
                setSelectedFile(null);
                setUploadProgress(0);
                loadData();
            }, 500);

        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء رفع الملف");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteMaterial = async (subjectId: string, materialId: string, title: string, storagePath?: string) => {
        // حذف مباشر ونهائي بدون رسالة تأكيد (Window.confirm removed)
        setDeletingId(materialId);

        // تحديث الواجهة فورياً (Optimistic UI)
        setSubjects(prev => prev.map(sub => {
            if (sub.id === subjectId) {
                return { ...sub, materials: sub.materials.filter(m => m.id !== materialId) };
            }
            return sub;
        }));

        try {
            await removeMaterial(subjectId, materialId, storagePath);
        } catch (error) {
            console.error("Delete failed", error);
            // في حالة الفشل، نعيد تحميل البيانات لإصلاح الواجهة
            loadData();
        } finally {
            setDeletingId(null);
        }
    };

    const handleAddChannel = async () => {
        if (!config || !newChannelName || !newChannelUrl) return;
        const newChannels = [...config.requiredChannels, { id: `ch-${Date.now()}`, name: newChannelName, url: newChannelUrl }];
        const newConfig = { ...config, requiredChannels: newChannels };
        await updateAppConfig(newConfig);
        setConfig(newConfig);
        setNewChannelName('');
        setNewChannelUrl('');
    };

    const handleRemoveChannel = async (id: string) => {
        if (!config) return;
        // Direct delete for channels too as per "final" request intent
        const newChannels = config.requiredChannels.filter(c => c.id !== id);
        const newConfig = { ...config, requiredChannels: newChannels };
        await updateAppConfig(newConfig);
        setConfig(newConfig);
    };

    // --- Render Login ---
    if (!isAuthenticated) {
        return (
            <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                <button onClick={() => navigate('/settings')} className="absolute top-6 right-6 p-2 text-slate-400"><LogOut size={24} /></button>
                <div className="w-full max-w-sm space-y-8">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-red-600 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-6 shadow-2xl shadow-red-500/40 rotate-6">
                            <ShieldAlert size={40} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white">منطقة محظورة</h2>
                        <p className="text-slate-500 text-xs mt-2 font-bold">يرجى إثبات هويتك للوصول للوحة التحكم</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">البريد الإلكتروني</label>
                            <input 
                                type="text" 
                                placeholder="Admin ID" 
                                className="w-full p-5 rounded-3xl bg-gray-50 dark:bg-slate-900 border-2 border-transparent focus:border-red-500 outline-none transition-all font-bold"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">كلمة السر</label>
                            <input 
                                type="password" 
                                placeholder="••••••••" 
                                className="w-full p-5 rounded-3xl bg-gray-50 dark:bg-slate-900 border-2 border-transparent focus:border-red-500 outline-none transition-all font-bold"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="w-full bg-red-600 text-white py-5 rounded-3xl font-black shadow-xl shadow-red-500/30 active:scale-95 transition-transform flex items-center justify-center gap-2">
                            <Lock size={20} />
                            فتح لوحة الإدارة
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- Render Dashboard ---
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-24 overflow-y-auto h-full">
            {/* Header */}
            <div className="bg-slate-900 text-white p-6 pt-12 rounded-b-[3rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative z-10 flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-black">لوحة التحكم</h2>
                        <p className="text-slate-400 text-[10px] font-bold">أهلاً بك يا علي فكار 🌹</p>
                    </div>
                    <button onClick={() => setIsAuthenticated(false)} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors">
                        <LogOut size={20} />
                    </button>
                </div>

                <div className="flex gap-2 relative z-10 overflow-x-auto no-scrollbar pb-2">
                    {['stats', 'upload', 'materials', 'channels'].map((tab) => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-shrink-0 px-6 py-4 rounded-2xl text-[10px] font-black transition-all ${activeTab === tab ? 'bg-primary-600 text-white shadow-lg' : 'bg-white/10 text-white/60'}`}
                        >
                            {tab === 'stats' ? 'الإحصائيات' : tab === 'upload' ? 'رفع ملف' : tab === 'materials' ? 'إدارة المواد' : 'القنوات'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-6 space-y-6">
                {!isFirebaseConfigured && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border-r-4 border-amber-500 p-4 rounded-lg flex gap-3 animate-in fade-in slide-in-from-top-4">
                        <AlertTriangle className="text-amber-500 shrink-0" />
                        <div>
                            <h4 className="font-bold text-sm text-amber-800 dark:text-amber-200">وضع العرض التجريبي (Local Mode)</h4>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                لم يتم ربط قاعدة بيانات Firebase بعد. سيتم حفظ جميع التغييرات محلياً في المتصفح فقط ولن تظهر للمستخدمين الآخرين.
                            </p>
                            <p className="text-[10px] font-mono mt-2 bg-white/50 dark:bg-black/20 p-2 rounded text-slate-500">
                                Update `services/firebaseConfig.ts` with your API keys.
                            </p>
                        </div>
                    </div>
                )}

                {/* --- STATS TAB --- */}
                {activeTab === 'stats' && stats && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800">
                                <Users className="text-blue-500 mb-2" size={24} />
                                <div className="text-2xl font-black">{stats.totalUsers.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">إجمالي الطلاب</div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800">
                                <Globe className="text-emerald-500 mb-2" size={24} />
                                <div className="text-2xl font-black">{stats.totalMaterials}</div>
                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">إجمالي المواد</div>
                            </div>
                        </div>
                        {/* ... (Engagement Stats) ... */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800">
                            <h4 className="font-black text-sm mb-6 flex items-center gap-2">
                                <TrendingUp size={18} className="text-primary-500" />
                                تحليلات التفاعل
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="text-center">
                                    <div className="text-xs font-black">{stats.engagement.pdfOpens}</div>
                                    <div className="text-[8px] text-slate-400 font-bold uppercase">قراءة</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs font-black">{stats.engagement.quizAttempts}</div>
                                    <div className="text-[8px] text-slate-400 font-bold uppercase">اختبار</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs font-black">{stats.engagement.aiMessages}</div>
                                    <div className="text-[8px] text-slate-400 font-bold uppercase">رسالة AI</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- UPLOAD TAB --- */}
                {activeTab === 'upload' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-slate-800 text-center relative overflow-hidden">
                            {uploading && (
                                <div className="absolute inset-0 bg-white/90 dark:bg-slate-800/90 z-20 flex flex-col items-center justify-center p-8">
                                    <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full mb-4 overflow-hidden">
                                        <div 
                                            className="h-full bg-primary-600 transition-all duration-300 rounded-full" 
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                    <div className="text-primary-600 font-black animate-pulse">
                                        {isFirebaseConfigured ? 'جاري الرفع للسحابة...' : 'جاري الحفظ محلياً...'} {uploadProgress}%
                                    </div>
                                </div>
                            )}

                            <div className="w-20 h-20 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                                <Upload size={40} />
                            </div>
                            <h3 className="font-black text-xl mb-2 text-slate-900 dark:text-white">رفع مادة جديدة</h3>
                            <p className="text-slate-400 text-xs font-bold mb-6">اختر ملف PDF من جهازك لإضافته</p>
                            
                            <form onSubmit={handleUpload} className="space-y-4 text-right">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">المادة الدراسية</label>
                                    <select 
                                        value={selectedSubject} 
                                        onChange={(e) => setSelectedSubject(e.target.value)}
                                        className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border-none outline-none font-bold text-sm appearance-none"
                                    >
                                        {subjects.map(sub => (
                                            <option key={sub.id} value={sub.id}>{sub.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">نوع الملف</label>
                                        <select 
                                            value={materialType}
                                            onChange={(e) => setMaterialType(e.target.value as any)}
                                            className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border-none outline-none font-bold text-sm"
                                        >
                                            <option value="book">كتاب منهجي</option>
                                            <option value="summary">ملزمة / ملخص</option>
                                        </select>
                                    </div>
                                    <div className="flex-[2]">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">عنوان الملف</label>
                                        <input 
                                            type="text" 
                                            placeholder="مثال: ملزمة الفصل الأول"
                                            value={materialTitle}
                                            onChange={(e) => setMaterialTitle(e.target.value)}
                                            className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border-none outline-none font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">اختيار الملف (PDF)</label>
                                    <div className="relative">
                                        <input 
                                            type="file" 
                                            accept="application/pdf"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="file-upload"
                                        />
                                        <label htmlFor="file-upload" className={`w-full p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border-2 border-dashed ${selectedFile ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-slate-700'} flex items-center justify-center gap-3 cursor-pointer transition-all`}>
                                            {selectedFile ? (
                                                <>
                                                    <CheckCircle2 size={20} className="text-emerald-500" />
                                                    <span className="text-emerald-600 font-bold text-sm truncate max-w-[200px]">{selectedFile.name}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FileText size={20} className="text-slate-400" />
                                                    <span className="text-slate-500 font-bold text-sm">اضغط لاختيار ملف PDF</span>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={uploading || !selectedFile}
                                    className="w-full mt-4 bg-primary-600 text-white py-5 rounded-3xl font-black shadow-xl shadow-primary-500/20 active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
                                >
                                    {isFirebaseConfigured ? 'نشر المادة الآن 🚀' : 'حفظ المادة محلياً 💾'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* --- MATERIALS MANAGEMENT TAB --- */}
                {activeTab === 'materials' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {subjects.map(subject => (
                            <div key={subject.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-10 h-10 rounded-xl ${subject.color} text-white flex items-center justify-center`}>
                                        <BookOpen size={20} />
                                    </div>
                                    <h3 className="font-black text-lg">{subject.title}</h3>
                                </div>

                                <div className="space-y-3">
                                    {subject.materials.length === 0 ? (
                                        <div className="text-center py-4 text-slate-400 text-xs font-bold">لا توجد مواد مضافة</div>
                                    ) : (
                                        subject.materials.map(mat => (
                                            <div key={mat.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-xl text-primary-500 shadow-sm shrink-0">
                                                        {deletingId === mat.id ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                                                    </div>
                                                    <div className="truncate">
                                                        <div className="font-bold text-sm truncate">{mat.title}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase">
                                                            {mat.type === 'book' ? 'كتاب منهجي' : 'ملزمة'} 
                                                            {/* @ts-ignore */}
                                                            {mat.subjectId && (isFirebaseConfigured ? ' • سحابي' : ' • محلي')}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <button 
                                                    // @ts-ignore - passing storagePath
                                                    onClick={() => handleDeleteMaterial(subject.id, mat.id, mat.title, mat.storagePath)}
                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors active:scale-95"
                                                    title="حذف نهائي مباشر"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {/* Channels Tab Implementation remains same... */}
                 {activeTab === 'channels' && config && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                         <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800">
                            <h4 className="font-black text-sm mb-6 flex items-center gap-2">
                                <Plus size={18} className="text-primary-500" />
                                إضافة قناة جديدة
                            </h4>
                            <div className="space-y-3">
                                <input 
                                    type="text" 
                                    placeholder="اسم القناة (مثال: قناة الوزارة)"
                                    value={newChannelName}
                                    onChange={(e) => setNewChannelName(e.target.value)}
                                    className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border-none outline-none font-bold text-sm"
                                />
                                <input 
                                    type="url" 
                                    placeholder="رابط القناة (https://t.me/...)"
                                    value={newChannelUrl}
                                    onChange={(e) => setNewChannelUrl(e.target.value)}
                                    className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border-none outline-none font-bold text-sm dir-ltr"
                                />
                                <button onClick={handleAddChannel} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-4 rounded-2xl font-black active:scale-95 transition-transform">
                                    إضافة القائمة
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-black text-xs text-slate-400 px-4 uppercase tracking-widest">القنوات الحالية</h4>
                            {config.requiredChannels.map(ch => (
                                <div key={ch.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                                            <LinkIcon size={20} />
                                        </div>
                                        <div className="truncate">
                                            <div className="font-bold text-sm truncate">{ch.name}</div>
                                            <div className="text-[10px] text-slate-400 truncate">{ch.url}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveChannel(ch.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};