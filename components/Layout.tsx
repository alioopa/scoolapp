import React, { useEffect } from 'react';
import { getTheme, saveTheme } from '../services/storageService';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  useEffect(() => {
    const theme = getTheme();
    if (theme === 'dark') document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 pb-20 overflow-x-hidden">
      {/* Container fits full height of Telegram window */}
      <main className="max-w-md mx-auto min-h-[100vh] relative shadow-2xl bg-white/50 dark:bg-slate-900/50 sm:border-x dark:border-slate-800">
        {children}
      </main>
    </div>
  );
};