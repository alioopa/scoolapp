import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Material } from '../types';
import { 
  ArrowLeft, Bookmark as BookmarkIcon, 
  Loader2, RefreshCw, ScanEye, ZoomIn, ZoomOut, Maximize, Minimize
} from 'lucide-react';
import { getBookmark, saveBookmark } from '../services/storageService';
import * as pdfjsLib from 'pdfjs-dist';

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
  const [error, setError] = useState<boolean>(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  const [scale, setScale] = useState<number>(1.0);
  const [initialFitScale, setInitialFitScale] = useState<number>(1.0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartDist = useRef<number>(0);
  const currentScaleRef = useRef<number>(1.0);
  const lastTapTime = useRef<number>(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const renderRequestId = useRef<number>(0);
  const pdfObjectUrl = useRef<string | null>(null);

  // Load PDF Logic
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

        // Try Loading via Blob for stability
        if (material.url.startsWith('http')) {
            try {
                const response = await fetch(material.url);
                if (!response.ok) throw new Error("Network response was not ok");
                const blob = await response.blob();
                urlToLoad = URL.createObjectURL(blob);
                pdfObjectUrl.current = urlToLoad;
            } catch (fetchErr) {
                urlToLoad = material.url;
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

  useEffect(() => {
    loadPdf();
    return () => { 
        if (pdfObjectUrl.current) URL.revokeObjectURL(pdfObjectUrl.current);
    };
  }, [material.url, material.id]);

  // Calculate Scale for "Fit Width"
  useEffect(() => {
      if (!pdfDoc) return;
      const calculateInitialScale = async () => {
          try {
              const page = await pdfDoc.getPage(currentPage);
              const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
              const unscaledViewport = page.getViewport({ scale: 1 });
              // Add a small margin (e.g., 32px total) calculation
              const fitScale = (containerWidth - 32) / unscaledViewport.width;
              setInitialFitScale(fitScale);
              setScale(fitScale);
              currentScaleRef.current = fitScale;
          } catch(e) {}
      };
      calculateInitialScale();
  }, [pdfDoc, currentPage]);

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
      
      // High Quality Rendering
      const dpr = window.devicePixelRatio || 1;
      // We render at a higher resolution if zoomed in, but cap it to avoid memory issues
      const outputScale = Math.min(scale * dpr, 3.0); 
      const viewport = page.getViewport({ scale: outputScale });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // CSS Scaling to fit layout
      // The canvas style width/height should match the intended display size based on current scale
      const displayViewport = page.getViewport({ scale: scale });
      canvas.style.width = `${displayViewport.width}px`;
      canvas.style.height = `${displayViewport.height}px`;

      const renderContext = { 
          canvasContext: context, 
          viewport: viewport,
          transform: outputScale !== scale ? [outputScale / scale, 0, 0, outputScale / scale, 0, 0] : undefined
      };
      
      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      await renderTask.promise;
    } catch (err) {}
  }, [pdfDoc, scale]);

  useEffect(() => {
    if (pdfDoc) renderPage(currentPage);
  }, [currentPage, renderPage, pdfDoc, scale]);

  // Touch Logic
  const handleTouchStart = (e: React.TouchEvent) => {
    // Double Tap Logic
    const currentTime = Date.now();
    const tapLength = currentTime - lastTapTime.current;
    if (tapLength < 300 && tapLength > 0) {
        // Double tap detected
        if (scale > initialFitScale * 1.5) {
            handleResetZoom();
        } else {
            handleZoomIn();
        }
        e.preventDefault();
    }
    lastTapTime.current = currentTime;

    if (e.touches.length === 2) {
      touchStartDist.current = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      const delta = dist / touchStartDist.current;
      let newScale = currentScaleRef.current * delta;
      newScale = Math.min(Math.max(newScale, initialFitScale * 0.5), initialFitScale * 4.0);
      
      // Real-time transform for smoothness before re-render
      if (canvasRef.current) {
         canvasRef.current.style.transformOrigin = 'center';
         // Note: We don't transform here to avoid blur, we wait for end to setScale. 
         // But for better UX we could. For now, let's keep it simple by just updating ref
      }
      touchStartDist.current = dist;
      currentScaleRef.current = newScale;
      // We debounce setScale in a real app, but here we can just set it on end
      setScale(newScale);
    }
  };

  const handleSave = () => {
    saveBookmark(material.id, currentPage, material.title, subjectId);
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
              } catch (e) { console.error(e); } finally { setIsScanning(false); }
          }, 50);
      }
  };

  const handleZoomIn = () => { 
      const s = Math.min(scale * 1.5, initialFitScale * 4.0); 
      setScale(s); 
      currentScaleRef.current = s; 
  };
  
  const handleZoomOut = () => { 
      const s = Math.max(scale / 1.5, initialFitScale * 0.8); 
      setScale(s); 
      currentScaleRef.current = s; 
  };
  
  const handleResetZoom = () => {
      setScale(initialFitScale);
      currentScaleRef.current = initialFitScale;
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-100 dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-white/95 dark:bg-slate-900/95 border-b dark:border-slate-800 safe-top backdrop-blur-md shadow-sm z-50">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft size={24} className="rtl:rotate-180" />
        </button>
        <div className="text-center flex-1 overflow-hidden">
          <h2 className="text-xs font-black truncate px-2 text-slate-900 dark:text-white">{material.title}</h2>
          <div className="text-[10px] font-bold text-slate-400 mt-0.5">{currentPage} / {totalPages}</div>
        </div>
        <button onClick={handleSave} className={`p-2 rounded-xl transition-all ${showSaveConfirm ? "text-primary-600 bg-primary-50" : "text-slate-400"}`}>
          <BookmarkIcon size={20} className={showSaveConfirm ? "fill-current" : ""} />
        </button>
      </div>

      {/* PDF Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto relative bg-slate-200/50 dark:bg-slate-950 flex justify-center items-start pt-4 pb-32 touch-pan-x touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 z-20">
            <Loader2 className="animate-spin text-primary-600 mb-2" size={32} />
            <span className="text-[10px] font-bold text-slate-400">جاري تجهيز الكتاب...</span>
          </div>
        )}
        
        {error && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                 <ScanEye size={32} className="text-red-500" />
            </div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">فشل عرض الملف</p>
            <button onClick={loadPdf} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black flex items-center gap-2">
                <RefreshCw size={14} /> إعادة
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="shadow-2xl rounded-lg overflow-hidden transition-all duration-200 ease-out bg-white">
             <canvas ref={canvasRef} />
          </div>
        )}
      </div>

      {/* Floating Controls */}
      {!loading && !error && (
          <>
            <button 
                onClick={handleScreenshot}
                disabled={isScanning}
                className="absolute bottom-44 right-4 z-[70] bg-indigo-600 text-white p-3 rounded-2xl shadow-xl shadow-indigo-600/30 active:scale-95 transition-transform flex items-center gap-2"
            >
                {isScanning ? <Loader2 size={20} className="animate-spin" /> : <ScanEye size={20} />}
                <span className="font-black text-[10px]">{isScanning ? 'تحليل...' : 'شرح'}</span>
            </button>

            <div className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 border-t dark:border-slate-800 safe-bottom backdrop-blur-md z-50 p-2">
                {/* Zoom Controls */}
                <div className="flex items-center justify-center gap-4 mb-3">
                    <button onClick={handleZoomOut} className="p-2 text-slate-500 bg-gray-100 dark:bg-slate-800 rounded-full active:scale-90 transition-transform"><ZoomOut size={16} /></button>
                    <button onClick={handleResetZoom} className="px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500">
                        {Math.round((scale / initialFitScale) * 100)}%
                    </button>
                    <button onClick={handleZoomIn} className="p-2 text-slate-500 bg-gray-100 dark:bg-slate-800 rounded-full active:scale-90 transition-transform"><ZoomIn size={16} /></button>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center gap-3 max-w-sm mx-auto">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-black text-xs disabled:opacity-30 active:scale-95 transition-transform">
                        السابقة
                    </button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-black text-xs disabled:opacity-30 shadow-lg shadow-primary-600/20 active:scale-95 transition-transform">
                        التالية
                    </button>
                </div>
            </div>
          </>
      )}
    </div>
  );
};