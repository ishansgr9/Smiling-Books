import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Book } from '../types';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Loader2,
  AlertCircle,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

// Import local worker via Vite URL query to avoid external CDN requests and CSP blocks
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure the pdf.js worker using the same-origin bundled asset path
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

// Define options containing the JPX (JPEG 2000) WASM decoder CDN path for rendering PDF illustrations
const pdfOptions = {
  wasmUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/wasm/`,
};

// Lazy rendering wrapper for each PDF page to avoid canvas memory limits in browsers
const LazyPDFPage: React.FC<{
  pageNumber: number;
  scale: number;
  onVisible: (pageNum: number) => void;
}> = ({ pageNumber, scale, onVisible }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            onVisible(pageNumber);
          } else {
            // Unmount canvas when out of view to release GPU/Canvas memory
            setIsVisible(false);
            setRenderError(null);
          }
        });
      },
      {
        root: null, // relative to browser viewport
        rootMargin: '600px 0px', // preload 600px before/after scroll for smooth reading
        threshold: 0.1,
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [pageNumber, onVisible]);

  // Approximate heights based on standard A4 aspect ratio (~1.41)
  const width = scale * 600;
  const height = scale * 840;

  return (
    <div
      ref={elementRef}
      id={`pdf-page-${pageNumber}`}
      className="shadow-2xl border border-stone-850 rounded bg-stone-900 overflow-hidden flex-shrink-0 flex items-center justify-center relative transition-all duration-200"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: '100%',
      }}
    >
      {isVisible ? (
        <>
          {renderError ? (
            <div className="flex flex-col items-center justify-center p-4 text-center space-y-2 text-red-400 select-none">
              <AlertCircle size={22} className="stroke-[1.5]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Page Render Error</span>
              <p className="text-[11px] font-mono bg-stone-950 px-3 py-1.5 rounded border border-stone-800 break-all max-w-[280px]">
                {renderError}
              </p>
            </div>
          ) : (
            <Page
              key={`page_${pageNumber}_${scale}`}
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onRenderError={(err: any) => {
                console.error(`Page ${pageNumber} render error:`, err);
                setRenderError(err.message || String(err));
              }}
              onLoadError={(err: any) => {
                console.error(`Page ${pageNumber} load error:`, err);
                setRenderError(err.message || String(err));
              }}
              loading={
                <div className="flex items-center justify-center w-full h-full bg-stone-900">
                  <Loader2 className="animate-spin text-stone-500" size={28} />
                </div>
              }
            />
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-2 text-stone-600 select-none">
          <Loader2 className="animate-spin text-stone-700" size={24} />
          <span className="text-[10px] font-semibold">Loading Page {pageNumber}...</span>
        </div>
      )}
    </div>
  );
};

export const PDFReader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
  const [pdfURL, setPdfURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // PDF error state for diagnostics
  const [loadError, setLoadError] = useState<string | null>(null);

  // In-browser Developer Logs overlay for production debugging
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(false);

  // PDF reading states
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [inputPage, setInputPage] = useState<string>('1');
  const [scale, setScale] = useState<number>(1.0);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef<boolean>(false);

  // Intercept console errors/warnings and render on screen to debug production
  useEffect(() => {
    const handleLog = (type: 'ERROR' | 'WARN', ...args: any[]) => {
      const msg = args.map(arg => {
        if (arg instanceof Error) return arg.stack || arg.message;
        if (typeof arg === 'object') {
          try { return JSON.stringify(arg); } catch { return String(arg); }
        }
        return String(arg);
      }).join(' ');

      setConsoleLogs(prev => [...prev.slice(-49), `[${type} ${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      handleLog('ERROR', ...args);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      handleLog('WARN', ...args);
      originalWarn.apply(console, args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  useEffect(() => {
    const loadPDF = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        // Fetch book info first
        const bookInfo = await api.get<Book>(`/api/books/${id}`);
        setBook(bookInfo);

        // Fetch pre-signed/local file reading URL to verify permissions and log reading event
        await api.get<{ url: string }>(`/api/books/${id}/read`);

        // Use backend stream proxy URL directly to avoid CORS issues on presigned Cloudflare R2 / S3 URLs
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
        setPdfURL(`${apiBaseUrl}/api/books/${id}/pdf`);
      } catch (e: any) {
        console.error('Failed to load PDF reader:', e);
        setError(e.message || 'The PDF document could not be fetched or loaded.');
      } finally {
        setLoading(false);
      }
    };

    loadPDF();
  }, [id]);

  // Sync keyboard input page number with actual pageNumber
  useEffect(() => {
    setInputPage(String(pageNumber));
  }, [pageNumber]);

  // Programmatic scroll helper
  const scrollToPage = (pageNum: number) => {
    if (!numPages || pageNum < 1 || pageNum > numPages) return;
    const el = document.getElementById(`pdf-page-${pageNum}`);
    if (el) {
      isProgrammaticScrollRef.current = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Reset the programmatic scroll flag after smooth scroll completes
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 800);
    }
  };

  // Keyboard shortcut overrides & navigation handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Disable Print (Ctrl+P / Cmd+P)
      if (isCmdOrCtrl && key === 'p') {
        e.preventDefault();
        e.stopPropagation();
        alert('Printing is disabled in this reading room.');
        return;
      }

      // Disable Download/Save (Ctrl+S / Cmd+S)
      if (isCmdOrCtrl && key === 's') {
        e.preventDefault();
        e.stopPropagation();
        alert('Downloading is disabled in this reading room.');
        return;
      }

      // Disable View Source (Ctrl+U / Cmd+U)
      if (isCmdOrCtrl && key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Page Navigation Shortcuts (ArrowRight/ArrowLeft)
      if (e.key === 'ArrowRight') {
        setPageNumber(prev => {
          const next = numPages ? Math.min(prev + 1, numPages) : prev;
          scrollToPage(next);
          return next;
        });
      } else if (e.key === 'ArrowLeft') {
        setPageNumber(prev => {
          const next = Math.max(prev - 1, 1);
          scrollToPage(next);
          return next;
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [numPages]);

  // Handler passed to lazy pages to sync indicator on manual scrolls
  const handlePageVisible = (pageNum: number) => {
    if (!isProgrammaticScrollRef.current && pageNum !== pageNumber) {
      setPageNumber(pageNum);
    }
  };

  // Handle Fullscreen toggle
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

  // Sync fullscreen state if changed via escape key
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
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

  // Document load callbacks
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setLoadError(null);
  };

  const onDocumentLoadError = (err: any) => {
    console.error('Failed to load PDF document:', err);
    setLoadError(err.message || String(err));
  };

  // Page navigation handlers
  const handlePrevPage = () => {
    const next = Math.max(pageNumber - 1, 1);
    setPageNumber(next);
    scrollToPage(next);
  };

  const handleNextPage = () => {
    const next = numPages ? Math.min(pageNumber + 1, numPages) : pageNumber;
    setPageNumber(next);
    scrollToPage(next);
  };

  const handlePageJump = () => {
    const parsed = parseInt(inputPage, 10);
    if (!isNaN(parsed) && parsed >= 1 && numPages && parsed <= numPages) {
      setPageNumber(parsed);
      scrollToPage(parsed);
    } else {
      setInputPage(String(pageNumber));
    }
  };

  // Zoom controls
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleZoomReset = () => setScale(1.0);

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-brand-500" size={36} />
        <p className="text-sm font-medium text-stone-500">Preparing reading room...</p>
      </div>
    );
  }

  if (error || !book || !pdfURL) {
    return (
      <div className="h-[75vh] flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4 bg-white border border-brand-100 rounded-3xl p-8 shadow-sm">
          <AlertCircle size={44} className="mx-auto text-red-500 stroke-[1.2]" />
          <h2 className="font-serif text-xl font-bold text-stone-800">Reading Room Error</h2>
          <p className="text-sm text-stone-500 leading-relaxed">
            {error || 'Unable to load the book text. Please verify the file exists.'}
          </p>
          <button
            onClick={handleBack}
            className="px-5 py-2.5 bg-stone-900 text-white text-xs font-semibold rounded-full hover:bg-stone-800 transition-all flex items-center justify-center space-x-1.5 mx-auto"
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
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className="bg-stone-950 flex flex-col w-screen h-screen overflow-hidden select-none relative"
    >
      {/* Header bar controls */}
      <header className="bg-stone-900 text-stone-200 px-6 py-4 flex items-center justify-between border-b border-stone-800 select-none z-10 shadow-md">
        
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
              By {book.author_name} • Reading Online
            </p>
          </div>
        </div>

        {/* Center: Zoom Controls */}
        <div className="flex items-center space-x-2 bg-stone-800/80 border border-stone-700 px-2.5 py-1 rounded-full">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className="p-1 text-stone-400 hover:text-white disabled:opacity-30 disabled:hover:text-stone-400 transition-all"
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <span className="text-[11px] font-bold min-w-[40px] text-center text-stone-300">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={scale >= 2.5}
            className="p-1 text-stone-400 hover:text-white disabled:opacity-30 disabled:hover:text-stone-400 transition-all"
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <div className="w-[1px] h-3 bg-stone-700 mx-1" />
          <button
            onClick={handleZoomReset}
            className="p-1 text-stone-400 hover:text-white transition-all"
            title="Reset Zoom"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Right Side: Options & Fullscreen */}
        <div className="flex items-center space-x-3">
          <span className="hidden md:flex items-center space-x-1.5 px-3 py-1 bg-stone-800 border border-stone-700/50 rounded-full text-[10px] font-semibold text-brand-300 uppercase tracking-wider">
            <Eye size={12} />
            <span>Read-Only Room</span>
          </span>
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-all"
            aria-label="Toggle Fullscreen"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>

      </header>

      {/* Scrollable PDF Viewer Container */}
      <div 
        ref={scrollContainerRef}
        className="flex-grow bg-stone-950 overflow-auto flex items-start justify-center p-6 relative"
      >
        <Document
          file={pdfURL}
          options={pdfOptions}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex flex-col items-center justify-center space-y-4 py-32">
              <Loader2 className="animate-spin text-stone-500" size={36} />
              <p className="text-sm font-medium text-stone-500">Loading document...</p>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center space-y-4 py-32 text-center max-w-md px-4">
              <AlertCircle size={40} className="text-red-500 stroke-[1.2]" />
              <p className="text-sm font-medium text-stone-400">Failed to render book pages. Please reload or check the document format.</p>
              {loadError && (
                <div className="mt-2 text-left w-full">
                  <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1">Error Diagnostics:</p>
                  <p className="text-[11px] text-red-400 bg-stone-900 border border-stone-800 px-3 py-2 rounded-lg font-mono break-all max-h-32 overflow-y-auto">
                    {loadError}
                  </p>
                </div>
              )}
            </div>
          }
        >
          {numPages && (
            <div className="flex flex-col space-y-8 pb-32 max-w-full">
              {Array.from(new Array(numPages), (_, index) => (
                <LazyPDFPage
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  scale={scale}
                  onVisible={handlePageVisible}
                />
              ))}
            </div>
          )}
        </Document>

        {/* Bottom Floating Navigation Bar */}
        {numPages && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-stone-900/90 backdrop-blur-md border border-stone-800 px-4 py-2.5 rounded-full flex items-center space-x-4 shadow-xl z-20 text-white select-none">
            <button
              onClick={handlePrevPage}
              disabled={pageNumber <= 1}
              className="p-1.5 hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-full transition-all"
              aria-label="Previous Page"
              title="Previous Page"
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-stone-300">
              <input
                type="text"
                value={inputPage}
                onChange={(e) => setInputPage(e.target.value)}
                onBlur={handlePageJump}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePageJump();
                  }
                }}
                className="w-10 bg-stone-800 border border-stone-700 focus:border-brand-500 focus:outline-none rounded py-0.5 text-center text-white text-xs font-bold"
              />
              <span className="text-stone-500">/</span>
              <span>{numPages}</span>
            </div>

            <button
              onClick={handleNextPage}
              disabled={pageNumber >= numPages}
              className="p-1.5 hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-full transition-all"
              aria-label="Next Page"
              title="Next Page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Floating diagnostics toggle button */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowConsole(prev => !prev)}
          className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold px-3.5 py-2 rounded-full shadow-2xl border border-amber-500 flex items-center space-x-1 cursor-pointer select-none transition-all active:scale-95"
        >
          <span>Logs Console ({consoleLogs.length})</span>
        </button>
      </div>

      {/* Diagnostics Console Panel */}
      {showConsole && (
        <div className="fixed bottom-16 right-4 left-4 md:left-auto md:w-96 max-h-72 bg-stone-900/95 backdrop-blur-md border border-stone-800 rounded-xl shadow-2xl z-50 p-4 flex flex-col select-text">
          <div className="flex items-center justify-between border-b border-stone-855 pb-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">In-Browser Logs Console</span>
            <button 
              onClick={() => setConsoleLogs([])}
              className="text-[10px] text-stone-500 hover:text-white transition-all cursor-pointer font-semibold"
            >
              Clear Logs
            </button>
          </div>
          <div className="flex-grow overflow-auto font-mono text-[9px] text-stone-300 space-y-1.5 bg-stone-950 p-2.5 rounded border border-stone-850 h-48 select-text">
            {consoleLogs.length === 0 ? (
              <span className="text-stone-600 italic">No console errors/warnings intercepted yet...</span>
            ) : (
              consoleLogs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap break-all border-b border-stone-900/30 pb-1 text-amber-400 last:border-0">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default PDFReader;
