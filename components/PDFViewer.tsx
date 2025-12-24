import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Material } from '../types';
import { 
  ArrowLeft, Bookmark as BookmarkIcon, 
  Loader2, RefreshCw, ScanEye, ZoomIn, ZoomOut, Maximize
} from 'lucide-react';
import { getBookmark, saveBookmark } from '../services/storageService';
import * as pdfjsLib from 'pdfjs-dist';

// Use a stable worker version
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
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<boolean>(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  // Zoom State
  const [scale, setScale] = useState<number>(1.0);
  const [fitScale, setFitScale] = useState<number>(1.0);
  const [previewScale, setPreviewScale] = useState<number>(1.0); // CSS scale for smooth pinching
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const pdfObjectUrl = useRef<string | null>(null);
  
  // Touch Handling Refs
  const touchStartDist = useRef<number>(0);
  const startScaleRef = useRef<number>(1.0);
  const lastTapTime = useRef<number>(0);

  // 1. Initialize PDF
  useEffect(() => {
    const loadPdf = async () => {
      setLoading(true);
      setError(false);
      
      try {
        const lib = pdfjsLib as any;
        const pdfLib = lib.default || lib;
        
        if (pdfLib.GlobalWorkerOptions) {
            pdfLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
        }

        const loadingParams: any = {
            cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
        };

        let urlToLoad = material.url;

        // Handle Blob/Data URLs
        if (material.url.startsWith('http')) {
            try {
                const response = await fetch(material.url);
                if (!response.ok) throw new Error("Network response was not ok");
                const blob = await response.blob();
                urlToLoad = URL.createObjectURL(blob);
                pdfObjectUrl.current = urlToLoad;
            } catch (fetchErr) {
                urlToLoad = material.url; // Fallback
            }
        } else if (material.url.startsWith('data:')) {
             try {
                const base64 = material.url.split(',')[1];
                const binaryString = atob(base64);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                loadingParams.data = bytes;
                urlToLoad = ''; 
            } catch (e) {}
        }

        if (urlToLoad) loadingParams.url = urlToLoad;

        const loadingTask = pdfLib.getDocument(loadingParams);
        const pdf = await loadingTask.promise;
        
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        const savedPage = getBookmark(material.id);
        setCurrentPage(savedPage > 0 ? savedPage : 1);
        setLoading(false);
      } catch (err: any) {
        console.error("PDF Fail:", err);
        setError(true);
        setLoading(false);
      }
    };

    loadPdf();
    return () => { 
        if (pdfObjectUrl.current) URL.revokeObjectURL(pdfObjectUrl.current);
    };
  }, [material.url, material.id]);

  // 2. Calculate "Fit Width" Scale
  useEffect(() => {
      if (!pdfDoc || loading) return;
      
      const calcFit = async () => {
          try {
              const page = await pdfDoc.getPage(currentPage);
              // Use slightly less than full width for padding
              const containerWidth = (containerRef.current?.clientWidth || window.innerWidth) - 24; 
              const viewport = page.getViewport({ scale: 1.0 });
              const optimalScale = containerWidth / viewport.width;
              
              setFitScale(optimalScale);
              setScale(optimalScale);
          } catch (e) {}
      };
      
      // Small delay to ensure layout is ready
      setTimeout(calcFit, 100);
  }, [pdfDoc, currentPage, loading]);

  // 3. Render Page Logic
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    
    setRendering(true);

    try {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      
      const page = await pdfDoc.getPage(currentPage);
      
      // High DPI Rendering
      const dpr = window.devicePixelRatio || 1;
      // Limit max render resolution to avoid crashing mobile browsers
      const maxDpr = scale > 2 ? 1.5 : 2; 
      const outputScale = scale * Math.min(dpr, maxDpr);
      
      const viewport = page.getViewport({ scale: outputScale });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      // Set Physical Canvas Dimensions (High Res)
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Set CSS Dimensions (Logical Size)
      const cssViewport = page.getViewport({ scale: scale });
      canvas.style.width = `${cssViewport.width}px`;
      canvas.style.height = `${cssViewport.height}px`;

      const renderContext = { 
          canvasContext: context, 
          viewport: viewport
      };
      
      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      
      await renderTask.promise;
      setRendering(false);
    } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
            console.error(err);
            setRendering(false);
        }
    }
  }, [pdfDoc, currentPage, scale]);

  // Trigger render when scale or page changes
  useEffect(() => {
      renderPage();
  }, [renderPage]);


  // 4. Touch Gestures (Pinch to Zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    const now = Date.now();
    
    // Double Tap
    if (now - lastTapTime.current < 300) {
        if (scale > fitScale * 1.1) {
            setScale(fitScale); // Reset
        } else {
            setScale(fitScale * 2.5); // Zoom In
        }
    }
    lastTapTime.current = now;

    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      touchStartDist.current = dist;
      startScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault(); // Prevent browser native zoom
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      
      const delta = dist / touchStartDist.current;
      const newPreviewScale = Math.max(0.5, Math.min(delta, 5.0)); // Constrain visual zoom
      setPreviewScale(newPreviewScale);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (previewScale !== 1.0) {
        // Commit the zoom
        let finalScale = startScaleRef.current * previewScale;
        // Clamp limits
        finalScale = Math.max(fitScale * 0.5, Math.min(finalScale, fitScale * 4.0));
        
        setScale(finalScale);
        setPreviewScale(1.0); // Reset preview
    }
  };

  // Helper Controls
  const handleZoomIn = () => setScale(s => Math.min(s * 1.25, fitScale * 4));
  const handleZoomOut = () => setScale(s => Math.max(s / 1.25, fitScale * 0.5));
  const handleReset = () => setScale(fitScale);
  
  const handleSave = () => {
    saveBookmark(material.id, currentPage, material.title, subjectId);
    setShowSaveConfirm(true);
    setTimeout(() => setShowSaveConfirm(false), 2000);
  };

  const handleScreenshot = async () => {
    if (canvasRef.current) {
        setIsScanning(true);
        // Small delay to allow UI to update if needed
        setTimeout(() => {
            try {
                // Use a reasonable quality for AI analysis
                const imageData = canvasRef.current!.toDataURL('image/jpeg', 0.8);
                onScanPage(imageData);
            } catch (e) { console.error(e); } 
            finally { setIsScanning(false); }
        }, 50);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-100 dark:bg-slate-950">
      
      {/* Top Header */}
      <div className="flex items-center justify-between p-3 bg-white/95 dark:bg-slate-900/95 border-b dark:border-slate-800 safe-top backdrop-blur-md shadow-sm z-50">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft size={24} className="rtl:rotate-180" />
        </button>
        <div className="text-center flex-1 overflow-hidden">
          <h2 className="text-xs font-black truncate px-2 text-slate-900 dark:text-white">{material.title}</h2>
          <div className="text-[10px] font-bold text-slate-400 mt-0.5">
            صفحة {currentPage} من {totalPages}
          </div>
        </div>
        <button onClick={handleSave} className={`p-2 rounded-xl transition-all ${showSaveConfirm ? "text-primary-600 bg-primary-50" : "text-slate-400"}`}>
          <BookmarkIcon size={20} className={showSaveConfirm ? "fill-current" : ""} />
        </button>
      </div>

      {/* Main Viewport */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto relative bg-slate-200/50 dark:bg-slate-950 touch-pan-x touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
            <Loader2 className="animate-spin text-primary-600 mb-2" size={32} />
            <span className="text-[10px] font-bold text-slate-400">جاري تحميل الكتاب...</span>
          </div>
        )}
        
        {error && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <ScanEye size={40} className="text-red-400" />
                <p className="text-sm font-bold text-slate-500">حدث خطأ في عرض الملف</p>
                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-black">تحديث الصفحة</button>
            </div>
        )}

        <div 
            className="min-h-full flex items-center justify-center p-4 transition-transform duration-75 origin-center"
            style={{ 
                transform: `scale(${previewScale})`,
                width: previewScale !== 1 ? '100%' : 'auto', 
                height: previewScale !== 1 ? '100%' : 'auto'
            }}
        >
             <div className="relative shadow-2xl rounded-sm bg-white">
                 <canvas ref={canvasRef} className="block max-w-none" />
                 {rendering && (
                     <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center backdrop-blur-[1px]">
                         <Loader2 className="animate-spin text-primary-600" size={24} />
                     </div>
                 )}
             </div>
        </div>
      </div>

      {/* Bottom Controls */}
      {!loading && !error && (
          <>
            {/* AI Analyze Button */}
            <button 
                onClick={handleScreenshot}
                disabled={isScanning}
                className="absolute bottom-44 right-4 z-[70] bg-indigo-600 text-white p-3 rounded-2xl shadow-xl shadow-indigo-600/30 active:scale-95 transition-transform flex items-center gap-2 animate-in zoom-in duration-300"
            >
                {isScanning ? <Loader2 size={20} className="animate-spin" /> : <ScanEye size={20} />}
                <span className="font-black text-[10px]">{isScanning ? 'تحليل...' : 'شرح'}</span>
            </button>

            {/* Navigation Bar */}
            <div className="bg-white/95 dark:bg-slate-900/95 border-t dark:border-slate-800 safe-bottom backdrop-blur-md z-50 p-3 space-y-3">
                {/* Zoom Tools */}
                <div className="flex items-center justify-center gap-6">
                    <button onClick={handleZoomOut} className="p-2 text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-full active:scale-90 transition-transform"><ZoomOut size={18} /></button>
                    <button onClick={handleReset} className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500 min-w-[3rem]">
                        {Math.round((scale / fitScale) * 100)}%
                    </button>
                    <button onClick={handleZoomIn} className="p-2 text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-full active:scale-90 transition-transform"><ZoomIn size={18} /></button>
                </div>

                {/* Page Nav */}
                <div className="flex items-center gap-3 max-w-md mx-auto">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                        disabled={currentPage === 1} 
                        className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-black text-xs disabled:opacity-30 active:scale-95 transition-transform"
                    >
                        السابقة
                    </button>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                        disabled={currentPage === totalPages} 
                        className="flex-1 py-3.5 bg-primary-600 text-white rounded-2xl font-black text-xs disabled:opacity-30 shadow-lg shadow-primary-600/20 active:scale-95 transition-transform"
                    >
                        التالية
                    </button>
                </div>
            </div>
          </>
      )}
    </div>
  );
};