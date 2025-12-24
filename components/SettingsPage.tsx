import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Bell, Info, ExternalLink, ChevronLeft, Award, Star, BookMarked, HelpCircle, LogOut, ArrowRight, Lock, MessagesSquare, Mail } from 'lucide-react';
import { getBookmarks } from '../services/storageService';

declare global {
  interface Window {
    Telegram?: any;
  }
}

type SettingsView = 'main' | 'privacy' | 'support';

export const SettingsPage = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<SettingsView>('main');
  const [tapCount, setTapCount] = useState(0);
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;
  const bookmarks = getBookmarks();

  const handleSecretTap = () => {
      const newCount = tapCount + 1;
      setTapCount(newCount);
      
      // Feedback logic
      if (newCount > 5) {
          tg?.HapticFeedback.impactOccurred('medium');
      } else {
          tg?.HapticFeedback.impactOccurred('light');
      }

      if (newCount >= 10) {
          tg?.HapticFeedback.notificationOccurred('success');
          setTapCount(0);
          navigate('/admin');
      }
  };

  // --- Sub Views Components ---

  const PrivacyView = () => (
    <div className="animate-in slide-in-from-left duration-300 min-h-full">
        <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setView('main')} className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm"><ArrowRight size={20} /></button>
            <h2 className="text-xl font-black">الخصوصية والأمان</h2>
        </div>
        
        <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-emerald-100 dark:border-slate-700">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                    <Lock size={24} />
                </div>
                <h3 className="font-black text-lg mb-2">بياناتك آمنة 100%</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-bold">
                    نحن لا نقوم بتخزين أي بيانات شخصية على خوادم خارجية. جميع الكتب والملازم التي تقوم بتحميلها أو حفظها يتم تخزينها محلياً على جهازك فقط.
                </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm">
                <h3 className="font-black text-sm mb-3">الصلاحيات المطلوبة</h3>
                <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-xs font-bold text-slate-500">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        الوصول للتخزين المحلي (لحفظ الملازم)
                    </li>
                    <li className="flex items-center gap-3 text-xs font-bold text-slate-500">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        معلومات تليجرام الأساسية (الاسم والصورة فقط)
                    </li>
                </ul>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-3xl text-center">
                <p className="text-blue-600 dark:text-blue-400 text-xs font-black">
                    تم تطوير هذا التطبيق لخدمة الطلاب بشكل مجاني وآمن تماماً.
                </p>
            </div>
        </div>
    </div>
  );

  const SupportView = () => (
    <div className="animate-in slide-in-from-left duration-300 min-h-full">
        <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setView('main')} className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm"><ArrowRight size={20} /></button>
            <h2 className="text-xl font-black">مركز المساعدة</h2>
        </div>

        <div className="space-y-4">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm">
                <h3 className="font-black text-lg mb-4">الأسئلة الشائعة</h3>
                <div className="space-y-4">
                    <details className="group">
                        <summary className="flex items-center justify-between font-bold text-sm cursor-pointer list-none">
                            <span>كيف أحمل الملازم؟</span>
                            <ChevronLeft size={16} className="transition-transform group-open:-rotate-90" />
                        </summary>
                        <p className="text-slate-500 text-xs mt-2 leading-relaxed px-2">
                            فقط ادخل على المادة، اضغط على الملزمة، وسيتم فتحها. يمكنك الضغط على علامة الحفظ 🔖 للرجوع إليها لاحقاً بدون إنترنت.
                        </p>
                    </details>
                    <div className="h-px bg-slate-100 dark:bg-slate-700"></div>
                    <details className="group">
                        <summary className="flex items-center justify-between font-bold text-sm cursor-pointer list-none">
                            <span>هل الأسئلة الوزارية محدثة؟</span>
                            <ChevronLeft size={16} className="transition-transform group-open:-rotate-90" />
                        </summary>
                        <p className="text-slate-500 text-xs mt-2 leading-relaxed px-2">
                            نعم، نقوم بتحديث بنك الأسئلة والملازم دورياً لضمان توافقها مع المنهج الجديد لوزارة التربية.
                        </p>
                    </details>
                </div>
            </div>

            <div className="bg-indigo-600 text-white p-6 rounded-[2.5rem] shadow-xl shadow-indigo-500/20 text-center relative overflow-hidden">
                <div className="relative z-10">
                    <MessagesSquare className="mx-auto mb-3 text-indigo-200" size={32} />
                    <h3 className="font-black text-lg mb-1">تواصل مع الدعم</h3>
                    <p className="text-indigo-200 text-xs font-bold mb-4">واجهت مشكلة؟ احنا موجودين للمساعدة</p>
                    <a href="https://t.me/ExampleSupport" target="_blank" className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black text-xs hover:bg-indigo-50 transition-colors">
                        <Mail size={14} />
                        مراسلة المطور
                    </a>
                </div>
            </div>
        </div>
    </div>
  );

  return (
    <div className="pb-28 overflow-y-auto h-full px-6 pt-8">
      {view === 'main' ? (
          <div className="animate-in fade-in duration-300">
            <div className="relative mb-10 text-center">
                <div className="relative inline-block group">
                    <div className="w-28 h-28 rounded-[2.5rem] border-4 border-white dark:border-slate-800 shadow-2xl overflow-hidden bg-slate-200 mx-auto">
                        {user?.photo_url ? (
                            <img src={user.photo_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary-600 text-white font-black text-4xl">
                                {user?.first_name?.charAt(0) || 'S'}
                            </div>
                        )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-yellow-400 p-2 rounded-2xl border-4 border-white dark:border-slate-800 shadow-lg">
                        <Star size={16} className="text-white fill-current" />
                    </div>
                </div>
                <h2 className="mt-6 text-2xl font-black text-slate-900 dark:text-white">
                    {user?.first_name || 'طالبنا العزيز'} {user?.last_name || ''}
                </h2>
                <div className="mt-2 inline-block px-4 py-1.5 bg-primary-50 dark:bg-primary-900/30 rounded-full text-[10px] font-black text-primary-600 uppercase tracking-widest">
                    الصف الثالث المتوسط
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl flex items-center justify-center mb-3">
                        <BookMarked size={20} />
                    </div>
                    <div className="text-2xl font-black">{bookmarks.length}</div>
                    <div className="text-[10px] text-slate-400 font-bold">المصادر المحفوظة</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800">
                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl flex items-center justify-center mb-3">
                        <Award size={20} />
                    </div>
                    <div className="text-2xl font-black">100%</div>
                    <div className="text-[10px] text-slate-400 font-bold">حالة الحساب</div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 
                    onClick={handleSecretTap}
                    className="text-[10px] font-black text-slate-400 px-4 uppercase tracking-[0.2em] cursor-pointer select-none active:text-primary-600 transition-colors"
                >
                    الإعدادات العامة
                </h3>
                
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
                    <button 
                        onClick={() => setView('privacy')}
                        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors border-b dark:border-slate-700 active:bg-gray-100"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl">
                                <ShieldCheck size={20} />
                            </div>
                            <span className="font-bold text-sm">حماية التطبيق والخصوصية</span>
                        </div>
                        <ChevronLeft size={16} className="rtl:rotate-180 text-slate-300" />
                    </button>

                    <button className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors border-b dark:border-slate-700">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-orange-50 dark:bg-orange-900/30 text-orange-600 rounded-2xl">
                                <Bell size={20} />
                            </div>
                            <span className="font-bold text-sm">إشعارات الوزارة</span>
                        </div>
                        <div className="px-2 py-1 bg-green-100 text-green-600 text-[10px] font-black rounded-lg">مفعل</div>
                    </button>

                    <button 
                        onClick={() => setView('support')}
                        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl">
                                <HelpCircle size={20} />
                            </div>
                            <span className="font-bold text-sm">مركز المساعدة والدعم</span>
                        </div>
                        <ChevronLeft size={16} className="rtl:rotate-180 text-slate-300" />
                    </button>
                </div>

                <div className="pt-6 flex flex-col items-center gap-4">
                    <a href="https://t.me/example" target="_blank" className="flex items-center gap-2 text-primary-600 dark:text-primary-400 text-xs font-black bg-primary-50 dark:bg-primary-900/20 px-4 py-2 rounded-xl">
                        <ExternalLink size={14} />
                        انضم لقناتنا الرسمية
                    </a>
                    <div className="text-[10px] text-slate-400 font-bold">حقيبة الثالث المتوسط v3.1.0</div>
                </div>
            </div>
          </div>
      ) : view === 'privacy' ? (
          <PrivacyView />
      ) : (
          <SupportView />
      )}
    </div>
  );
};