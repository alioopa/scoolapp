import React, { useState, useRef, useEffect } from 'react';
import { generateStudyHelp, requestApiKey } from '../services/geminiService';
import { logAnalyticsEvent } from '../services/firebaseService';
import { ChatMessage } from '../types';
import { Send, X, Loader2, Zap, Key } from 'lucide-react';

interface AIChatProps {
  subjectName: string;
  isOpen: boolean;
  onClose: () => void;
  initialImage?: string | null;
}

export const AIChat: React.FC<AIChatProps> = ({ subjectName, isOpen, onClose, initialImage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'model', text: `هلا بيك يا بطل! 🌟\nآني معلمك لمادة ${subjectName}.\nدزلي صورة السؤال أو الصفحة واشرحلكياها بالتفصيل مع المرشحات الوزارية! 🇮🇶` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsKey, setNeedsKey] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [viewportHeight, setViewportHeight] = useState('100%');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // التعامل مع لوحة المفاتيح في الموبايل بشكل دقيق
    if (!window.visualViewport) return;
    
    const handleResize = () => {
        // تحديث الارتفاع ليتناسب مع المساحة المرئية فقط (فوق الكيبورد)
        setViewportHeight(`${window.visualViewport!.height}px`);
        scrollToBottom();
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    
    // ضبط الارتفاع الأولي
    setViewportHeight(`${window.visualViewport.height}px`);
    
    return () => {
        window.visualViewport!.removeEventListener('resize', handleResize);
        window.visualViewport!.removeEventListener('scroll', handleResize);
    };
  }, []);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  };

  useEffect(() => {
    if (isOpen) {
        setTimeout(scrollToBottom, 100);
        setTimeout(() => inputRef.current?.focus(), 300);
        if (initialImage) setActiveImage(initialImage);
    }
  }, [isOpen, initialImage]);

  const handleSend = async () => {
    if ((!input.trim() && !activeImage) || isLoading) return;

    logAnalyticsEvent('ai_message', { subject: subjectName });
    
    const userText = input || (activeImage ? "اشرحلي هاي الصفحة واريد المرشحات" : "");
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    
    const imageToSend = activeImage;
    setActiveImage(null);
    setInput('');
    setIsLoading(true);

    setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
    }, 50);

    try {
        const responseText = await generateStudyHelp(userText, subjectName, imageToSend || undefined);
        
        if (responseText === "API_KEY_MISSING" || responseText === "API_KEY_ERROR") {
          setNeedsKey(true);
          setMessages(prev => [...prev, { id: 'key-req', role: 'model', text: "لازم تفعل مفتاح الذكاء الاصطناعي (API Key) من الإعدادات حتى أكدر أجاوبك 👇" }]);
        } else {
          const botId = (Date.now() + 1).toString();
          const botMsg: ChatMessage = { id: botId, role: 'model', text: responseText };
          setMessages(prev => [...prev, botMsg]);
        }
    } catch (err) {
        setMessages(prev => [...prev, { id: 'err', role: 'model', text: "صار خطأ بسيط، حاول مرة ثانية." }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleActivateKey = async () => {
    await requestApiKey();
    setNeedsKey(false);
    setMessages(prev => [...prev, { id: 'key-ok', role: 'model', text: "عاشت ايدك! تم التفعيل ✅" }]);
  };

  if (!isOpen) return null;

  return (
    <div 
        className="fixed top-0 left-0 w-full bg-white dark:bg-slate-900 z-[200] flex flex-col animate-in slide-in-from-bottom-full duration-300"
        style={{ height: viewportHeight, maxHeight: '-webkit-fill-available' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-slate-800 bg-slate-900 text-white shadow-xl shrink-0 z-20" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><Zap size={20} /></div>
          <div>
            <h3 className="font-black text-sm">المعلم العراقي 🇮🇶</h3>
            <p className="text-[10px] text-indigo-300 font-bold uppercase">مساعد {subjectName}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"><X size={20} /></button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-8 bg-gray-50 dark:bg-slate-950 no-scrollbar w-full relative z-10">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex w-full flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
            <div className={`max-w-[90%] rounded-[2rem] p-5 shadow-sm relative group ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-gray-100 dark:border-slate-700'}`}>
              <div className="text-sm font-bold leading-relaxed whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {needsKey && (
          <div className="flex justify-center p-4">
            <button onClick={handleActivateKey} className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl animate-bounce">
              <Key size={20} />
              تفعيل الذكاء الاصطناعي
            </button>
          </div>
        )}
        {isLoading && (
          <div className="flex justify-end w-full">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-[2rem] rounded-bl-none flex items-center gap-3 border dark:border-slate-700 shadow-sm">
              <Loader2 size={16} className="animate-spin text-indigo-500" />
              <span className="text-xs font-black text-slate-400">دا احضرلك الشرح والمرشحات...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div 
        className="p-3 bg-white dark:bg-slate-900 border-t dark:border-slate-800 shrink-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {activeImage && (
            <div className="mb-2 relative inline-block animate-in zoom-in duration-200">
                <img src={activeImage} alt="Snapshot" className="h-24 rounded-xl border-2 border-indigo-500 shadow-md object-cover" />
                <button 
                    onClick={() => setActiveImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-sm hover:bg-red-600"
                >
                    <X size={14} />
                </button>
            </div>
        )}

        <div className="flex items-center gap-3 bg-gray-100 dark:bg-slate-800 rounded-[2rem] px-5 py-2 border border-gray-200 dark:border-slate-700 shadow-inner">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={activeImage ? "شنو تحب تركز عليه بالشرح؟" : "اسأل المعلم العراقي..."}
            className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white font-bold text-base placeholder:text-slate-500 h-12"
            autoFocus
          />
          <button 
            onClick={handleSend} 
            disabled={(!input.trim() && !activeImage) || isLoading} 
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${((input.trim() || activeImage) && !isLoading) ? 'bg-indigo-600 text-white shadow-lg scale-100 hover:bg-indigo-700' : 'bg-gray-300 dark:bg-slate-700 text-gray-500 scale-95'}`}
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="rtl:rotate-180" />}
          </button>
        </div>
      </div>
    </div>
  );
};