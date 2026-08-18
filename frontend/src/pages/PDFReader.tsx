import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Book } from '../types';
import { ArrowLeft, Maximize2, Minimize2, Loader2, AlertCircle, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Helper to load external scripts dynamically
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));
    document.head.appendChild(script);
  });
};

interface PDFPageProps {
  pageNum: number;
  pdfDoc: any;
  scale: number;
  onVisible: (pageNum: number) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

const PDFPage: React.FC<PDFPageProps> = ({ pageNum, pdfDoc, scale, onVisible, scrollContainerRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  const onVisibleRef = useRef(onVisible);
  useEffect(() => {
    onVisibleRef.current = onVisible;
  }, [onVisible]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            onVisibleRef.current(pageNum);
          } else {
            setIsVisible(false);
          }
        });
      },
      { 
        root: scrollContainerRef.current, // Set the scroll container as the viewport boundary
        threshold: 0.05 
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [pageNum, scrollContainerRef]);

  useEffect(() => {
    let active = true;

    const render = async () => {
      if (!isVisible || !pdfDoc || !canvasRef.current) return;

      // Cancel any ongoing rendering task
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // ignore
        }
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        if (!active || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        const viewport = page.getViewport({ scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        
        if (active) {
          renderTaskRef.current = null;
        }
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNum}:`, err);
        }
      }
    };

    render();

    return () => {
      active = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [isVisible, pdfDoc, scale, pageNum]);

  return (
    <div 
      ref={containerRef}
      className="mb-8 shadow-2xl border border-stone-800 bg-white select-none pointer-events-none flex justify-center"
      data-page={pageNum}
      style={{ minHeight: `${scale * 800}px` }}
    >
      <canvas ref={canvasRef} className="max-w-full block" />
    </div>
  );
};

export const PDFReader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Intercept and store console.error, error, and promise rejection events
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      setDebugLogs((prev) => [...prev, `[Error] ${e.message} (${e.filename}:${e.lineno})`]);
    };
    const handleRejection = (e: PromiseRejectionEvent) => {
      setDebugLogs((prev) => [...prev, `[Rejection] ${e.reason}`]);
    };
    
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      setDebugLogs((prev) => [
        ...prev, 
        `[Console Error] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`
      ]);
      originalConsoleError.apply(console, args);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      console.error = originalConsoleError;
    };
  }, []);

  // PDF.js State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [pageInput, setPageInput] = useState<string>('1');

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Block keyboard shortcuts (Ctrl+P, Cmd+P, Ctrl+S, Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        alert("Printing is disabled in the Reading Room to protect copyright.");
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        alert("Downloading the book is disabled in the Reading Room.");
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load PDF.js and the PDF Document
  useEffect(() => {
    const initializePDF = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch book metadata
        const bookInfo = await api.get<Book>(`/api/books/${id}`);
        setBook(bookInfo);

        // 2. Load PDF.js scripts from CDN
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
        const pdfjsLib = (window as any).pdfjsLib;
        
        try {
          // Fetch worker as blob to bypass cross-origin worker restriction (CORS)
          const workerResponse = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js');
          const workerBlob = await workerResponse.blob();
          const workerUrl = URL.createObjectURL(workerBlob);
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        } catch (workerErr) {
          console.error("Failed to load worker via Blob URL, falling back to CDN url", workerErr);
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        // 3. Fetch PDF binary data directly in memory (CORS-proof)
        const pdfURL = `${API_BASE_URL}/api/books/${id}/pdf`;
        const pdfResponse = await fetch(pdfURL);
        if (!pdfResponse.ok) {
          throw new Error(`Failed to download book: Server returned status ${pdfResponse.status}`);
        }
        const arrayBuffer = await pdfResponse.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // 4. Load the Uint8Array document bytes directly in PDF.js
        const loadingTask = pdfjsLib.getDocument({
          data: uint8Array
        });
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
        setPageInput('1');
      } catch (e: any) {
        console.error('Failed to initialize PDF reader:', e);
        setError(e.message || 'The digital book document could not be loaded.');
      } finally {
        setLoading(false);
      }
    };

    initializePDF();
  }, [id]);

  const handlePageVisible = (pageNum: number) => {
    setCurrentPage(pageNum);
    setPageInput(pageNum.toString());
  };

  const scrollToPage = (pageNum: number) => {
    const pageEl = scrollContainerRef.current?.querySelector(`[data-page="${pageNum}"]`);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Navigation handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      setPageInput(prev.toString());
      scrollToPage(prev);
    }
  };

  const handleNextPage = () => {
    if (pdfDoc && currentPage < totalPages) {
      const next = currentPage + 1;
      setCurrentPage(next);
      setPageInput(next.toString());
      scrollToPage(next);
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      scrollToPage(pageNum);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.6));
  };

  const handleFitWidth = () => {
    setScale(1.2);
  };

  // Fullscreen sync
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleBack = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().finally(() => {
        navigate(`/books/${id}`);
      });
    } else {
      navigate(`/books/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-brand-500" size={36} />
        <p className="text-sm font-medium text-stone-500">Preparing secure reading room...</p>
      </div>
    );
  }

  if (error || !book || !pdfDoc) {
    return (
      <div className="h-[75vh] flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4 bg-white border border-brand-100 rounded-3xl p-8 shadow-sm">
          <AlertCircle size={44} className="mx-auto text-red-500 stroke-[1.2]" />
          <h2 className="font-serif text-xl font-bold text-stone-800">Secure Reader Error</h2>
          <p className="text-sm text-stone-500 leading-relaxed">
            {error || 'Unable to load the book text safely. Please verify the file exists.'}
          </p>
          <button
            onClick={handleBack}
            className="px-5 py-2.5 bg-stone-900 text-white text-xs font-semibold rounded-full hover:bg-stone-800 flex items-center justify-center space-x-1.5 mx-auto"
            type="button"
          >
            <ArrowLeft size={14} />
            <span>Return to Details</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* CSS Block to completely disable browser prints */}
      <style>{`
        @media print {
          body {
            display: none !important;
          }
        }
      `}</style>

      <div 
        ref={containerRef}
        className="bg-stone-950 flex flex-col w-screen h-screen overflow-hidden select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Header bar controls */}
        <header className="bg-stone-900 text-stone-200 px-6 py-4 flex items-center justify-between border-b border-stone-800 select-none">
          
          {/* Left Side: Back & title */}
          <div className="flex items-center space-x-4 min-w-0 pr-4">
            <button
              onClick={handleBack}
              className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-all"
              aria-label="Back to details"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <h1 className="font-serif text-sm font-bold text-white leading-tight truncate">
                {book.title}
              </h1>
              <p className="text-[10px] text-stone-400 font-medium truncate mt-0.5">
                By {book.author_name} • Secure Reading Room
              </p>
            </div>
          </div>

          {/* Center: Page Controls */}
          <div className="flex items-center space-x-4 bg-stone-950 px-4 py-1.5 rounded-full border border-stone-800">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-1 text-stone-400 hover:text-white disabled:opacity-30 disabled:hover:text-stone-400 transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            
            <form onSubmit={handlePageInputSubmit} className="flex items-center space-x-1.5">
              <input
                type="text"
                value={pageInput}
                onChange={handlePageInputChange}
                className="w-10 bg-stone-800 border border-stone-700 rounded text-center text-xs font-semibold text-white py-0.5 focus:border-brand-500 focus:outline-none"
              />
              <span className="text-xs text-stone-400">/ {totalPages}</span>
            </form>

            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="p-1 text-stone-400 hover:text-white disabled:opacity-30 disabled:hover:text-stone-400 transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Right Side: Zoom & Fullscreen */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-stone-800 rounded-lg border border-stone-700/50 p-0.5 text-xs text-stone-300">
              <button
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-stone-700 hover:text-white rounded cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="px-2 font-mono text-[10px]">{Math.round(scale * 100)}%</span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-stone-700 hover:text-white rounded cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={handleFitWidth}
                className="p-1.5 hover:bg-stone-700 hover:text-white rounded border-l border-stone-700/50 cursor-pointer"
                title="Reset Zoom"
              >
                Reset Zoom
              </button>
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-all cursor-pointer"
              aria-label="Toggle Fullscreen"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>

        </header>

        {/* Scrollable PDF Canvas Pages List Container */}
        <div 
          ref={scrollContainerRef}
          className="flex-grow bg-stone-900 overflow-y-auto flex flex-col items-center p-6 relative scroll-smooth"
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <PDFPage
              key={pageNum}
              pageNum={pageNum}
              pdfDoc={pdfDoc}
              scale={scale}
              onVisible={handlePageVisible}
              scrollContainerRef={scrollContainerRef}
            />
          ))}
        </div>

        {/* Debug Logs Panel for troubleshooting live issues */}
        {debugLogs.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-red-950/95 text-red-200 p-4 max-h-40 overflow-y-auto text-xs font-mono z-50 border-t border-red-800 pointer-events-auto">
            <div className="flex justify-between items-center mb-1 pb-1 border-b border-red-900">
              <h4 className="font-bold text-red-400">Secure Reader Debug Logs (Active):</h4>
              <button 
                onClick={() => setDebugLogs([])} 
                className="px-2 py-0.5 bg-red-900 hover:bg-red-800 rounded text-[10px] text-white"
              >
                Clear Logs
              </button>
            </div>
            {debugLogs.map((log, idx) => (
              <div key={idx} className="py-0.5 border-b border-red-950/30 whitespace-pre-wrap">{log}</div>
            ))}
          </div>
        )}

      </div>
    </>
  );
};
export default PDFReader;
