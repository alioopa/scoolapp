import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Material } from '../types';
import { 
  ArrowLeft, Bookmark as BookmarkIcon, 
  Loader2, AlertCircle, ScanEye, ZoomIn, ZoomOut
} from 'lucide-react';
import { getBookmark, saveBookmark, getAllSubjects } from '../services/storageService';
import * as pdfjsLib from 'pdfjs-dist';

// Use a specific version for the worker that matches the package to avoid mismatch errors.
const WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

interface PDFViewerProps {
  material: Material;
  onBack: () => void;
  subjectId?: string;
  onScanPage: (imageData: string) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ material, onBack, subjectId, onScanPage }) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  // حالة التكبير واللمس
  const [scale, setScale] = useState<number>(1.0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartDist = useRef<number>(0);
  const currentScaleRef = useRef<number>(1.0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const renderRequestId = useRef<number>(0);
  const pdfObjectUrl = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    const getLib = () => {
      const lib = pdfjsLib as any;
      return lib.default || lib; 
    };

    try {
      const lib = getLib();
      if (lib.GlobalWorkerOptions) {
        lib.GlobalWorkerOptions.workerSrc = WORKER_URL;
      }
    } catch (err) {
      console.warn("Failed to set worker source globally:", err);
    }

    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      
      if (!material.url) {
        setError("رابط الملف غير صالح");
        setLoading(false);
        return;
      }

      try {
        const lib = getLib();
        if (!lib.getDocument) {
            throw new Error("PDF.js library not loaded correctly (getDocument missing)");
        }

        const loadingParams: any = {
            cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
        };

        // --- معالجة الروابط لتحسين الأداء وتجاوز مشاكل CORS ---
        let urlToLoad = material.url;

        // 1. إذا كان رابط مباشر (Firebase)، نحاول جلبه كـ Blob أولاً
        // هذا يساعد في التعامل مع الملفات الكبيرة والتحويلات
        if (material.url.startsWith('http')) {
            try {
                const response = await fetch(material.url);
                if (!response.ok) throw new Error("فشل تحميل الملف من السيرفر");
                const blob = await response.blob();
                // إنشاء رابط محلي مؤقت
                urlToLoad = URL.createObjectURL(blob);
                pdfObjectUrl.current = urlToLoad;
            } catch (fetchErr) {
                console.error("Fetch failed, trying direct URL fallback", fetchErr);
                // إذا فشل الـ Fetch (بسبب CORS مثلاً)، نستخدم الرابط المباشر كمحاولة أخيرة
                urlToLoad = material.url;
            }
        } 
        // 2. إذا كان Base64 (رفع محلي)
        else if (material.url.startsWith('data:')) {
            try {
                const base64 = material.url.split(',')[1];
                const binaryString = atob(base64);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                loadingParams.data = bytes;
                urlToLoad = ''; // No URL needed if data is provided
            } catch (decodeErr) {
                console.warn("Manual base64 decode failed", decodeErr);
            }
        }

        if (urlToLoad) {
            loadingParams.url = urlToLoad;
        }

        const loadingTask = lib.getDocument(loadingParams);
        
        const pdf = await loadingTask.promise;
        if (!active) return;
        
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        const savedPage = getBookmark(material.id);
        setCurrentPage(savedPage > 0 ? savedPage : 1);

        // تعيين الحجم الافتراضي
        try {
            const firstPage = await pdf.getPage(1);
            const containerWidth = window.innerWidth > 0 ? window.innerWidth : 375;
            const viewport = firstPage.getViewport({ scale: 1 });
            const initialScale = (containerWidth / viewport.width) * 1.0; 
            setScale(initialScale);
            currentScaleRef.current = initialScale;
        } catch (e) {
            setScale(1.0);
        }

        setLoading(false);
      } catch (err: any) {
        if (active) {
          console.error("PDF Load Error:", err);
          let errorMsg = "عذراً، فشل فتح الكتاب.";
          if (err.name === 'MissingPDFException') errorMsg = "ملف الكتاب مفقود.";
          if (err.name === 'InvalidPDFException') errorMsg = "ملف الكتاب تالف.";
          if (err.message?.includes('Network')) errorMsg = "مشكلة في الاتصال، تأكد من الإنترنت.";
          
          setError(errorMsg + " (تأكد من إعدادات CORS في Firebase)");
          setLoading(false);
        }
      }
    };

    loadPdf();
    return () => { 
        active = false;
        // تنظيف الرابط المؤقت لتوفير الذاكرة
        if (pdfObjectUrl.current) {
            URL.revokeObjectURL(pdfObjectUrl.current);
        }
    };
  }, [material.url, material.id]);

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;
    
    renderRequestId.current += 1;
    const requestId = renderRequestId.current;

    try {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      
      const page = await pdfDoc.getPage(pageNum);
      
      if (renderRequestId.current !== requestId) return;
      
      const renderScale = scale < 1.5 ? 1.5 : scale; 
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: renderScale * dpr });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;
      canvas.style.transform = `scale(${scale / renderScale})`;
      canvas.style.transformOrigin = 'top left';

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      
      await renderTask.promise;
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.error("PDF Render Error:", err);
      }
    }
  }, [pdfDoc, scale]);

  useEffect(() => {
    if (pdfDoc) renderPage(currentPage);
    return () => { if (renderTaskRef.current) renderTaskRef.current.cancel(); };
  }, [currentPage, renderPage, pdfDoc]);

  // --- Pinch Zoom Logic (Same as before) ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      touchStartDist.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      const delta = dist / touchStartDist.current;
      let newScale = currentScaleRef.current * delta;
      newScale = Math.min(Math.max(newScale, 0.5), 4.0);
      if (canvasRef.current) {
         const renderScale = scale < 1.5 ? 1.5 : scale;
         canvasRef.current.style.transform = `scale(${newScale / renderScale})`;
      }
      touchStartDist.current = dist;
      currentScaleRef.current = newScale;
    }
  };

  const handleTouchEnd = () => {
    if (Math.abs(currentScaleRef.current - scale) > 0.1) setScale(currentScaleRef.current);
  };

  const handleSave = () => {
    const subjects = getAllSubjects();
    const subId = subjects.find(s => s.id === subjectId)?.id;
    saveBookmark(material.id, currentPage, material.title, subId);
    setShowSaveConfirm(true);
    setTimeout(() => setShowSaveConfirm(false), 2000);
  };

  const handleScreenshot = async () => {
      if (canvasRef.current) {
          setIsScanning(true);
          setTimeout(() => {
              try {
                  const imageData = canvasRef.current!.toDataURL('image/jpeg', 0.6);
                  onScanPage(imageData);
              } catch (e) { console.error("Screenshot failed", e); } finally { setIsScanning(false); }
          }, 50);
      }
  };

  const handleZoomIn = () => { const s = Math.min(scale + 0.25, 3.0); setScale(s); currentScaleRef.current = s; };
  const handleZoomOut = () => { const s = Math.max(scale - 0.25, 0.5); setScale(s); currentScaleRef.current = s; };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-100 dark:bg-slate-950">
      <div className="flex items-center justify-between p-3 bg-white/90 dark:bg-slate-900/90 border-b dark:border-slate-800 safe-top backdrop-blur-md">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft size={24} className="rtl:rotate-180" />
        </button>
        <div className="text-center flex-1">
          <h2 className="text-[11px] font-black truncate px-4 text-slate-900 dark:text-white">{material.title}</h2>
          <div className="text-[10px] font-bold text-slate-400">{currentPage} / {totalPages}</div>
        </div>
        <button onClick={handleSave} className={`p-2 rounded-xl transition-all ${showSaveConfirm ? "text-primary-600" : "text-slate-400"}`}>
          <BookmarkIcon size={20} className={showSaveConfirm ? "fill-current" : ""} />
        </button>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-auto relative p-4 flex justify-center items-start no-scrollbar touch-pan-x touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 z-20">
            <Loader2 className="animate-spin text-primary-600 mb-2" size={32} />
            <span className="text-[10px] font-bold text-slate-400">جاري تحميل الصفحات...</span>
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <AlertCircle size={40} className="text-red-500 mb-2"/>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed">{error}</p>
          </div>
        )}
        {!loading && !error && (
          <div className="origin-top-left transition-transform duration-75 ease-linear">
             <canvas ref={canvasRef} className="shadow-2xl bg-white rounded-sm" />
          </div>
        )}
      </div>

      {!loading && !error && (
          <button 
             onClick={handleScreenshot}
             disabled={isScanning}
             className="absolute bottom-40 left-6 z-[70] bg-indigo-600 text-white p-4 rounded-2xl shadow-xl shadow-indigo-600/30 active:scale-95 transition-transform flex items-center gap-2 disabled:bg-indigo-400"
          >
              {isScanning ? <Loader2 size={24} className="animate-spin" /> : <ScanEye size={24} />}
              <span className="font-black text-xs">{isScanning ? 'جاري المسح...' : 'شرح الصفحة'}</span>
          </button>
      )}

      <div className="bg-white/95 dark:bg-slate-900/95 border-t dark:border-slate-800 safe-bottom backdrop-blur-md">
        <div className="flex items-center justify-center gap-6 py-2 border-b border-gray-100 dark:border-slate-800">
             <button onClick={handleZoomOut} className="p-2 text-slate-500 active:scale-95 transition-transform bg-gray-100 dark:bg-slate-800 rounded-full"><ZoomOut size={18} /></button>
             <span className="text-[10px] font-black text-slate-400 min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
             <button onClick={handleZoomIn} className="p-2 text-slate-500 active:scale-95 transition-transform bg-gray-100 dark:bg-slate-800 rounded-full"><ZoomIn size={18} /></button>
        </div>
        <div className="p-3">
            <div className="flex items-center justify-between max-w-md mx-auto gap-4">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-black text-xs disabled:opacity-30 active:scale-95 transition-transform">السابقة</button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-black text-xs disabled:opacity-30 shadow-lg shadow-primary-600/20 active:scale-95 transition-transform">التالية</button>
            </div>
        </div>
      </div>
    </div>
  );
};