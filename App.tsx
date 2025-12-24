import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { 
  Book, FileText, ChevronLeft, Bot, BrainCircuit, 
  Trophy, PlayCircle, Home as HomeIcon, Brain, Key,
  Atom, Dna, FlaskConical, Sparkles
} from 'lucide-react';
import { Layout } from './components/Layout';
import { BottomNav } from './components/BottomNav';
import { PDFViewer } from './components/PDFViewer';
import { AIChat } from './components/AIChat';
import { SettingsPage } from './components/SettingsPage';
import { AdminPanel } from './components/AdminPanel';
import { getAllSubjects as getStaticSubjects } from './services/storageService';
import { fetchCustomMaterials, trackUserLogin } from './services/firebaseService';
import { generateQuiz, requestApiKey } from './services/geminiService';
import { QuizState, Subject } from './types';

// Telegram Init Logic
const initTelegram = () => {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
    if (window.Telegram.WebApp.setHeaderColor) {
        window.Telegram.WebApp.setHeaderColor('#ffffff');
    }
  }
};

const SubjectIcon = ({ name, size = 28 }: { name: string, size?: number }) => {
  const icons: Record<string, any> = {
    BookOpen: Book,
    ScrollText: FileText,
    Languages: Brain,
    Calculator: BrainCircuit,
    Globe: HomeIcon,
    FlaskConical: FlaskConical,
    Atom: Atom,
    Dna: Dna,
  };
  const IconComponent = icons[name] || Book;
  return <IconComponent size={size} />;
};

const Home = () => {
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const loadContent = async () => {
            setLoading(true);
            try {
                const staticSubjects = getStaticSubjects();
                const customMaterials = await fetchCustomMaterials();
                const mergedSubjects = staticSubjects.map(sub => {
                    const subCustom = customMaterials.filter((m: any) => m.subjectId === sub.id);
                    return {
                        ...sub,
                        materials: [...sub.materials, ...subCustom]
                    };
                });
                setSubjects(mergedSubjects);
            } catch (error) {
                console.error("Failed to load materials", error);
                setSubjects(getStaticSubjects());
            } finally {
                setLoading(false);
            }
        };
        loadContent();
    }, []);
    
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mb-4"></div>
                <p className="text-slate-400 font-bold text-sm">جاري جلب المكتبة...</p>
            </div>
        );
    }

    return (
        <div className="p-5 pb-32 overflow-y-auto">
            {/* بطاقة المعلم الذكي الجديدة */}
            <div 
                onClick={() => navigate('/ai')}
                className="mb-8 relative overflow-hidden bg-gradient-to-r from-indigo-600 to-violet-700 rounded-[2.5rem] p-6 text-white shadow-xl shadow-indigo-500/20 cursor-pointer active:scale-[0.98] transition-transform group"
            >
                <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -ml-10 -mt-10"></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black backdrop-blur-md border border-white/10 flex items-center gap-1">
                                <Sparkles size={10} className="text-yellow-300" />
                                ذكاء اصطناعي
                            </span>
                        </div>
                        <h2 className="text-xl font-black mb-1">عندك سؤال محيرك؟</h2>
                        <p className="text-indigo-100 text-xs font-bold opacity-90">
                           اضغط هنا واسأل المعلم الذكي عن أي شي ببالك! 🤖
                        </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg group-active:scale-110 transition-transform">
                        <Bot size={24} className="text-white" />
                    </div>
                </div>
            </div>

            <div className="mb-8 px-2 text-right">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">موادي الدراسية 📚</h2>
                <p className="text-slate-500 text-[10px] font-bold">المصادر المعتمدة للصف الثالث المتوسط</p>
            </div>
            
            <div className="grid gap-6">
                {subjects.length > 0 ? subjects.map(sub => (
                    <div key={sub.id} className="bg-white dark:bg-slate-800 p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center justify-end gap-4 mb-5 border-b dark:border-slate-700 pb-4">
                            <h3 className="text-lg font-black text-right">{sub.title}</h3>
                            <div className={`w-12 h-12 rounded-2xl ${sub.color} text-white flex items-center justify-center shadow-lg`}>
                                <SubjectIcon name={sub.icon} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            {sub.materials.map(m => (
                                <button 
                                    key={m.id} 
                                    onClick={() => navigate(`/read/${sub.id}/${m.id}`)}
                                    className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl active:bg-primary-50 dark:active:bg-slate-700 transition-all border border-transparent active:border-primary-200 group"
                                >
                                    <ChevronLeft size={14} className="text-slate-300 group-active:text-primary-500" />
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className="font-bold text-xs">{m.title}</div>
                                            {/* @ts-ignore */}
                                            {m.subjectId && <span className="text-[8px] text-emerald-500 font-bold">جديد</span>}
                                        </div>
                                        <div className="p-2 bg-white dark:bg-slate-800 rounded-xl text-primary-600 shadow-sm">
                                            <FileText size={16} />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[2.5rem]">
                        <p className="text-slate-400 font-bold">لا توجد مواد حالياً</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const Reader = () => {
    const { subjectId, materialId } = useParams();
    const navigate = useNavigate();
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [material, setMaterial] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const findMaterial = async () => {
            const staticSubjects = getStaticSubjects();
            const sub = staticSubjects.find(s => s.id === subjectId);
            const mat = sub?.materials.find(m => m.id === materialId);
            if (mat) {
                setMaterial(mat);
                setLoading(false);
                return;
            }
            try {
                const customMaterials = await fetchCustomMaterials();
                const customMat = customMaterials.find(m => m.id === materialId);
                if (customMat) setMaterial(customMat);
            } catch (e) { console.error(e); } 
            finally { setLoading(false); }
        };
        findMaterial();
    }, [subjectId, materialId]);

    const handleScanPage = (imageData: string) => {
        setCapturedImage(imageData);
        setIsChatOpen(true);
    };
  
    if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50"><div className="animate-spin h-8 w-8 border-2 border-primary-600 rounded-full"></div></div>;
    if (!material) return <div className="text-center p-10">عذراً، الملف غير موجود</div>;
  
    return (
      <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex flex-col">
        <PDFViewer 
            material={material} 
            onBack={() => navigate(-1)} 
            subjectId={subjectId} 
            onScanPage={handleScanPage} 
        />
        
        <AIChat 
            subjectName={material.title || ''} 
            isOpen={isChatOpen} 
            onClose={() => {
                setIsChatOpen(false);
                setCapturedImage(null);
            }} 
            initialImage={capturedImage} 
        />
      </div>
    );
};

const Quizzes = () => {
    const [state, setState] = useState<QuizState>({
        isActive: false, score: 0, currentQuestionIndex: 0,
        questions: [], selectedSubject: null, loading: false, showResult: false
    });
    const [needsKey, setNeedsKey] = useState(false);

    const startQuiz = async (subjectTitle: string) => {
        setState(prev => ({ ...prev, loading: true, selectedSubject: subjectTitle }));
        try {
            const questions = await generateQuiz(subjectTitle);
            if (questions && questions.length > 0) {
                setState(prev => ({ 
                    ...prev, loading: false, isActive: true, 
                    questions, currentQuestionIndex: 0, score: 0, showResult: false
                }));
            } else { throw new Error("No questions"); }
        } catch (error: any) {
            if (error.message === "API_KEY_ERROR") {
                setNeedsKey(true);
            } else {
                alert("عذراً، فشل الاتصال بالخادم. تأكد من الإنترنت.");
            }
            setState(prev => ({ ...prev, loading: false }));
        }
    };

    const handleActivateKey = async () => {
        await requestApiKey();
        setNeedsKey(false);
    };
    
    const handleAnswer = (idx: number) => {
        const isCorrect = idx === state.questions[state.currentQuestionIndex].correctAnswer;
        const newScore = isCorrect ? state.score + 1 : state.score;
        if (state.currentQuestionIndex + 1 < state.questions.length) {
            setState(prev => ({ ...prev, score: newScore, currentQuestionIndex: prev.currentQuestionIndex + 1 }));
        } else {
            setState(prev => ({ ...prev, score: newScore, showResult: true }));
        }
    };

    if (needsKey) return (
        <div className="p-8 text-center min-h-[70vh] flex flex-col justify-center items-center">
            <Key size={48} className="text-amber-500 mb-6" />
            <h2 className="text-2xl font-black mb-4">تفعيل الذكاء الاصطناعي</h2>
            <p className="text-slate-500 mb-8 font-bold leading-relaxed">يجب تحديث مفتاح API لتتمكن من استخدام الاختبارات</p>
            <button onClick={handleActivateKey} className="w-full bg-primary-600 text-white py-5 rounded-[2rem] font-black shadow-xl">تحديث الآن 🚀</button>
        </div>
    );

    if (state.loading) return <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center"><BrainCircuit size={48} className="text-primary-600 animate-pulse mb-4" /><h2 className="text-xl font-black">جاري التجهيز...</h2></div>;

    if (state.showResult) return (
        <div className="p-8 text-center min-h-[70vh] flex flex-col justify-center items-center">
            <Trophy size={64} className="text-yellow-500 mb-8 animate-bounce" />
            <h2 className="text-3xl font-black mb-2">النتيجة النهائية 🏆</h2>
            <div className="text-6xl font-black text-primary-600 mb-10">{state.score} / {state.questions.length}</div>
            <button onClick={() => setState(p => ({ ...p, isActive: false, showResult: false }))} className="w-full bg-primary-600 text-white py-5 rounded-[2rem] font-black shadow-xl">العودة</button>
        </div>
    );

    if (state.isActive && state.questions.length > 0) {
        const q = state.questions[state.currentQuestionIndex];
        return (
            <div className="p-6 pb-32 overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                    <span className="text-[10px] font-black text-slate-400 uppercase">سؤال {state.currentQuestionIndex + 1}</span>
                    <div className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black">صح: {state.score}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm mb-8 text-right border dark:border-slate-700">
                    <h3 className="text-lg font-black leading-relaxed">{q.question}</h3>
                </div>
                <div className="space-y-3">
                    {q.options.map((opt, i) => (
                        <button key={i} onClick={() => handleAnswer(i)} className="w-full p-5 text-right bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 font-bold active:bg-primary-600 active:text-white transition-all shadow-sm">
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 pb-32 text-right">
            <div className="mb-8 px-2">
                <h2 className="text-2xl font-black mb-1">اختبارات ذكية 🧠</h2>
                <p className="text-slate-500 text-[10px] font-bold">اختر مادة للبدء بالاختبار الوزاري</p>
            </div>
            <div className="grid gap-4">
                {getStaticSubjects().map(sub => (
                    <button key={sub.id} onClick={() => startQuiz(sub.title)} className="w-full flex items-center justify-between p-5 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border dark:border-slate-700 active:scale-[0.98] transition-all">
                        <PlayCircle size={24} className="text-primary-600" />
                        <div className="flex items-center gap-4">
                            <span className="font-black text-sm">{sub.title}</span>
                            <div className={`w-11 h-11 rounded-2xl ${sub.color} text-white flex items-center justify-center shadow-md`}>
                                <SubjectIcon name={sub.icon} size={20} />
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

const AIConversationPage = () => {
    const navigate = useNavigate();
    return (
        <div className="fixed inset-0 z-[200] bg-white dark:bg-slate-950">
            <AIChat 
                subjectName="المعلم الذكي" 
                isOpen={true} 
                onClose={() => navigate(-1)} 
            />
        </div>
    );
};

export default function App() {
  useEffect(() => {
    initTelegram();
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (user) trackUserLogin(user);
  }, []);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/read/:subjectId/:materialId" element={<Reader />} />
          <Route path="/quizzes" element={<Quizzes />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/ai" element={<AIConversationPage />} />
        </Routes>
        <BottomNav />
      </Layout>
    </Router>
  );
}