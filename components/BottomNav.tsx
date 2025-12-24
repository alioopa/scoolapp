import React from 'react';
import { Home, BrainCircuit, Settings, Bot, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

// إضافة تعريف لواجهة Telegram
declare global {
  interface Window {
    Telegram?: any;
  }
}

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const tg = window.Telegram?.WebApp;

  const isActive = (path: string) => location.pathname === path;

  const handleNav = (path: string) => {
    if (location.pathname !== path) {
        tg?.HapticFeedback.impactOccurred('light');
        navigate(path);
    }
  };

  const navItems = [
    { id: 'home', icon: Home, label: 'الرئيسية', path: '/' },
    { id: 'ai', icon: Bot, label: 'المعلم الذكي', path: '/ai', special: true }, // زر مميز
    { id: 'quiz', icon: BrainCircuit, label: 'الاختبارات', path: '/quizzes' },
    { id: 'settings', icon: Settings, label: 'الإعدادات', path: '/settings' },
  ];

  if (location.pathname.includes('/read/')) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto px-4 pb-4">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-gray-200 dark:border-slate-800 shadow-2xl rounded-2xl pointer-events-auto flex items-center justify-around py-2">
            {navItems.map((item) => (
                <button
                key={item.id}
                onClick={() => handleNav(item.path)}
                className={`relative flex flex-col items-center justify-center w-full transition-all duration-300 ${
                    isActive(item.path) 
                    ? 'text-primary-600 dark:text-primary-400' 
                    : 'text-slate-400 dark:text-slate-500'
                }`}
                >
                <div className={`
                    relative transition-all duration-300
                    ${item.special 
                        ? isActive(item.path)
                            ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white p-3.5 -mt-8 rounded-2xl shadow-lg shadow-indigo-500/30 scale-110' 
                            : 'bg-indigo-50 dark:bg-slate-800 text-indigo-600 p-2.5 rounded-xl'
                        : `p-1.5 rounded-xl ${isActive(item.path) ? 'bg-primary-50 dark:bg-primary-900/20 -translate-y-1' : ''}`
                    }
                `}>
                    <item.icon size={item.special ? 24 : 24} strokeWidth={isActive(item.path) ? 2.5 : 2} />
                    {item.special && !isActive(item.path) && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                    )}
                </div>
                <span className={`text-[10px] font-black mt-1 ${isActive(item.path) ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                    {item.label}
                </span>
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};