import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getApiBaseUrl } from '../services/api';
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
  ChevronRight,
  Maximize,
  BookOpen,
  FileText
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import EPUBViewer from '../components/EPUBViewer';

// Import local worker via Vite URL query to avoid external CDN requests and CSP blocks
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure the pdf.js worker using the same-origin bundled asset path
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

// Define options containing the JPX (JPEG 2000) WASM decoder CDN path for rendering PDF illustrations
const pdfOptions = {
  wasmUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/wasm/`,
};

// Lazy rendering wrapper for each PDF page to maintain document aspect ratio & optimize memory
const LazyPDFPage: React.FC<{
  pageNumber: number;
  width: number;
  onVisible: (pageNum: number) => void;
}> = ({ pageNumber, width, onVisible }) => {
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

  return (
    <div
      ref={elementRef}
      id={`pdf-page-${pageNumber}`}
      className="shadow-2xl border border-stone-800/80 rounded-lg bg-stone-900 overflow-hidden flex-shrink-0 flex items-center justify-center relative transition-all duration-200 my-3 sm:my-4"
      style={{
        width: `${width}px`,
        maxWidth: '100%',
        minHeight: `${Math.round(width * 1.25)}px`,
      }}
    >
      {isVisible ? (
        <>
          {renderError ? (
            <div className="flex flex-col items-center justify-center p-4 text-center space-y-2 text-red-400 select-none min-h-[300px]">
              <AlertCircle size={24} className="stroke-[1.5]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Page Render Error</span>
              <p className="text-[11px] font-mono bg-stone-950 px-3 py-1.5 rounded border border-stone-800 break-all max-w-[280px]">
                {renderError}
              </p>
            </div>
          ) : (
            <Page
              key={`page_${pageNumber}_${Math.round(width)}`}
              pageNumber={pageNumber}
              width={width}
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
                <div className="flex flex-col items-center justify-center w-full h-full bg-stone-900 min-h-[350px] space-y-2">
                  <Loader2 className="animate-spin text-brand-500" size={28} />
                  <span className="text-[10px] text-stone-500 font-medium">Rendering Page {pageNumber}...</span>
                </div>
              }
            />
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-2 text-stone-600 select-none min-h-[350px]">
          <Loader2 className="animate-spin text-stone-700" size={24} />
          <span className="text-[10px] font-semibold">Page {pageNumber}</span>
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
  const [epubURL, setEpubURL] = useState<string | null>(null);
  const [activeFormat, setActiveFormat] = useState<'pdf' | 'epub'>('pdf');
  const [hasPdf, setHasPdf] = useState(false);
  const [hasEpub, setHasEpub] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // PDF error state for diagnostics
  const [loadError, setLoadError] = useState<string | null>(null);

  // PDF reading states
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [inputPage, setInputPage] = useState<string>('1');

  // Dynamic responsive scaling & zoom states
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [fitMode, setFitMode] = useState<'width' | 'custom'>('width');
  const [zoomMultiplier, setZoomMultiplier] = useState<number>(1.0);

  // Touch Swipe tracking
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef<boolean>(false);

  // Measure scroll container width dynamically to adapt to any device viewport
  useEffect(() => {
    const updateDimensions = () => {
      if (scrollContainerRef.current) {
        const padding = window.innerWidth < 640 ? 24 : 48;
        const availableWidth = scrollContainerRef.current.clientWidth - padding;
        setContainerWidth(Math.max(260, availableWidth));
      } else {
        const padding = window.innerWidth < 640 ? 24 : 48;
        setContainerWidth(Math.max(260, window.innerWidth - padding));
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Compute effective pixel width for rendering pages comfortably
  const effectivePageWidth = useMemo(() => {
    if (fitMode === 'width') {
      const isMobile = window.innerWidth < 640;
      const targetWidth = isMobile ? containerWidth : Math.min(containerWidth, 800);
      return Math.max(260, targetWidth);
    }
    const baseWidth = window.innerWidth < 640 ? containerWidth : Math.min(containerWidth, 750);
    return Math.max(260, Math.round(baseWidth * zoomMultiplier));
  }, [containerWidth, fitMode, zoomMultiplier]);

  useEffect(() => {
    const loadBook = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        // Fetch book info
        const bookInfo = await api.get<Book>(`/api/books/${id}`);
        setBook(bookInfo);

        // Check format availability
        const readData = await api.get<{
          has_pdf?: boolean;
          has_epub?: boolean;
          pdf_url?: string;
          epub_url?: string;
          format?: 'pdf' | 'epub';
          url?: string;
        }>(`/api/books/${id}/read`);

        const pdfExists = !!(readData.has_pdf || bookInfo.pdf_object_key);
        const epubExists = !!(readData.has_epub || bookInfo.epub_object_key);

        setHasPdf(pdfExists);
        setHasEpub(epubExists);

        const apiBaseUrl = getApiBaseUrl();
        if (pdfExists) {
          // Always use the backend proxy for PDF — signed cloud storage URLs (GCS/S3)
          // block cross-origin requests from the pdf.js worker (CORS).
          // Our backend proxy route passes through the CORS middleware correctly.
          setPdfURL(`${apiBaseUrl}/api/books/${id}/pdf`);
        }
        if (epubExists) {
          // Always use the backend proxy for EPUB — same CORS reason as above.
          setEpubURL(`${apiBaseUrl}/api/books/${id}/epub`);
        }

        // Determine default format: EPUB preferred if available, or PDF
        if (epubExists && !pdfExists) {
          setActiveFormat('epub');
        } else if (pdfExists && !epubExists) {
          setActiveFormat('pdf');
        } else if (epubExists) {
          setActiveFormat('epub');
        } else {
          setActiveFormat('pdf');
        }
      } catch (e: any) {
        console.error('Failed to load book reader:', e);
        setError(e.message || 'The book document could not be fetched or loaded.');
      } finally {
        setLoading(false);
      }
    };

    loadBook();
  }, [id]);

  // Sync input string with current page number
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

      // PDF Page Navigation Shortcuts (ArrowRight/ArrowLeft)
      if (activeFormat === 'pdf') {
        if (e.key === 'ArrowRight') {
          setPageNumber((prev) => {
            const next = numPages ? Math.min(prev + 1, numPages) : prev;
            scrollToPage(next);
            return next;
          });
        } else if (e.key === 'ArrowLeft') {
          setPageNumber((prev) => {
            const next = Math.max(prev - 1, 1);
            scrollToPage(next);
            return next;
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [numPages, activeFormat]);

  // Handler passed to lazy pages to sync indicator on manual scrolls
  const handlePageVisible = (pageNum: number) => {
    if (!isProgrammaticScrollRef.current && pageNum !== pageNumber) {
      setPageNumber(pageNum);
    }
  };

  // Fullscreen toggle
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

  // Sync fullscreen state
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
  const handleZoomIn = () => {
    setFitMode('custom');
    setZoomMultiplier((prev) => Math.min(prev + 0.2, 2.2));
  };

  const handleZoomOut = () => {
    setFitMode('custom');
    setZoomMultiplier((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleFitToWidth = () => {
    setFitMode('width');
    setZoomMultiplier(1.0);
  };

  const handleZoomReset = () => {
    setFitMode('custom');
    setZoomMultiplier(1.0);
  };

  // Touch Swipe Navigation for mobile devices (PDF)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (activeFormat !== 'pdf') return;
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    if (Math.abs(diffX) > 55 && Math.abs(diffY) < 45) {
      if (diffX > 0) {
        handleNextPage();
      } else {
        handlePrevPage();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-brand-500" size={36} />
        <p className="text-sm font-medium text-stone-500">Preparing reading room...</p>
      </div>
    );
  }

  if (error || !book || (!pdfURL && !epubURL)) {
    return (
      <div className="h-[75vh] flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4 bg-white border border-brand-100 rounded-3xl p-8 shadow-sm">
          <AlertCircle size={44} className="mx-auto text-red-500 stroke-[1.2]" />
          <h2 className="font-serif text-xl font-bold text-stone-800">Reading Room Error</h2>
          <p className="text-sm text-stone-500 leading-relaxed">
            {error || 'Unable to load the book document. Please verify the file has been uploaded.'}
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
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="bg-stone-950 flex flex-col w-screen h-screen overflow-hidden select-none relative"
    >
      {/* Top Header bar controls */}
      <header className="bg-stone-900 text-stone-200 px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between border-b border-stone-800 select-none z-30 shadow-md gap-2">
        
        {/* Left Side: Back & title */}
        <div className="flex items-center space-x-2 sm:space-x-3.5 min-w-0 pr-2">
          <button
            onClick={handleBack}
            className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-all shrink-0"
            aria-label="Back to details"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h1 className="font-serif text-xs sm:text-sm font-bold text-white leading-tight truncate">
              {book.title}
            </h1>
            <p className="text-[9px] sm:text-[10px] text-stone-400 font-medium truncate mt-0.5">
              By {book.author_name}
            </p>
          </div>
        </div>

        {/* Center: Format switcher & PDF Zoom Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          
          {/* Dual Format Switcher (shown when both formats exist) */}
          {hasPdf && hasEpub && (
            <div className="flex items-center bg-stone-800 p-0.5 rounded-lg border border-stone-700">
              <button
                onClick={() => setActiveFormat('epub')}
                className={`flex items-center space-x-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                  activeFormat === 'epub'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-stone-400 hover:text-white'
                }`}
                title="Switch to EPUB View"
                type="button"
              >
                <BookOpen size={11} />
                <span>EPUB</span>
              </button>
              <button
                onClick={() => setActiveFormat('pdf')}
                className={`flex items-center space-x-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                  activeFormat === 'pdf'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-stone-400 hover:text-white'
                }`}
                title="Switch to PDF View"
                type="button"
              >
                <FileText size={11} />
                <span>PDF</span>
              </button>
            </div>
          )}

          {/* Single format badge if only 1 format exists */}
          {(!hasPdf || !hasEpub) && (
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${
              activeFormat === 'epub'
                ? 'bg-purple-950 text-purple-300 border-purple-800'
                : 'bg-red-950 text-red-300 border-red-800'
            }`}>
              {activeFormat.toUpperCase()} Mode
            </span>
          )}

          {/* PDF Zoom Controls (only shown in PDF mode) */}
          {activeFormat === 'pdf' && (
            <div className="hidden sm:flex items-center space-x-1 sm:space-x-2 bg-stone-800/80 border border-stone-700/80 px-2 py-1 rounded-full">
              <button
                onClick={handleFitToWidth}
                className={`p-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                  fitMode === 'width'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-stone-400 hover:text-white hover:bg-stone-700'
                }`}
                title="Fit to Device Width"
                type="button"
              >
                <Maximize size={12} />
                <span className="hidden md:inline text-[10px]">Fit Width</span>
              </button>

              <div className="w-[1px] h-3 bg-stone-700 mx-0.5" />

              <button
                onClick={handleZoomOut}
                disabled={fitMode === 'custom' && zoomMultiplier <= 0.5}
                className="p-1 text-stone-400 hover:text-white disabled:opacity-30 transition-all"
                title="Zoom Out"
                type="button"
              >
                <ZoomOut size={13} />
              </button>

              <span className="text-[10px] font-bold min-w-[36px] text-center text-stone-300">
                {fitMode === 'width' ? 'Auto' : `${Math.round(zoomMultiplier * 100)}%`}
              </span>

              <button
                onClick={handleZoomIn}
                disabled={fitMode === 'custom' && zoomMultiplier >= 2.2}
                className="p-1 text-stone-400 hover:text-white disabled:opacity-30 transition-all"
                title="Zoom In"
                type="button"
              >
                <ZoomIn size={13} />
              </button>

              {fitMode === 'custom' && (
                <button
                  onClick={handleZoomReset}
                  className="p-1 text-stone-400 hover:text-white transition-all"
                  title="Reset Zoom"
                  type="button"
                >
                  <RotateCcw size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Options & Fullscreen */}
        <div className="flex items-center space-x-2 shrink-0">
          <span className="hidden lg:flex items-center space-x-1.5 px-2.5 py-0.5 bg-stone-800 border border-stone-700/50 rounded-full text-[10px] font-semibold text-brand-300 uppercase tracking-wider">
            <Eye size={11} />
            <span>Read-Only Room</span>
          </span>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-all"
            aria-label="Toggle Fullscreen"
            title="Toggle Fullscreen"
            type="button"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>

      </header>

      {/* Main Content Area: EPUB or PDF */}
      <div className="flex-grow w-full h-full overflow-hidden relative">
        {activeFormat === 'epub' && epubURL ? (
          <EPUBViewer
            url={epubURL}
            bookTitle={book.title}
            authorName={book.author_name}
          />
        ) : (
          /* PDF Viewer */
          <div 
            ref={scrollContainerRef}
            className="w-full h-full bg-stone-950 overflow-auto flex items-start justify-center p-3 sm:p-6 relative scroll-smooth"
          >
            <Document
              file={pdfURL}
              options={pdfOptions}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex flex-col items-center justify-center space-y-4 py-32">
                  <Loader2 className="animate-spin text-stone-500" size={36} />
                  <p className="text-sm font-medium text-stone-500">Loading PDF document...</p>
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
                <div className="flex flex-col space-y-4 sm:space-y-6 pb-32 max-w-full items-center">
                  {Array.from(new Array(numPages), (_, index) => (
                    <LazyPDFPage
                      key={`page_${index + 1}`}
                      pageNumber={index + 1}
                      width={effectivePageWidth}
                      onVisible={handlePageVisible}
                    />
                  ))}
                </div>
              )}
            </Document>

            {/* Bottom Floating Navigation Bar for PDF */}
            {numPages && (
              <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 bg-stone-900/95 backdrop-blur-md border border-stone-800 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full flex items-center space-x-3 sm:space-x-5 shadow-2xl z-30 text-white select-none">
                <button
                  onClick={handlePrevPage}
                  disabled={pageNumber <= 1}
                  className="p-1.5 sm:p-2 hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-full transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                  aria-label="Previous Page"
                  title="Previous Page"
                  type="button"
                >
                  <ChevronLeft size={20} />
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
                    className="w-10 sm:w-11 bg-stone-800 border border-stone-700 focus:border-brand-500 focus:outline-none rounded-lg py-1 text-center text-white text-xs font-bold"
                  />
                  <span className="text-stone-500 font-bold">/</span>
                  <span className="font-bold">{numPages}</span>
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={pageNumber >= numPages}
                  className="p-1.5 sm:p-2 hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-full transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                  aria-label="Next Page"
                  title="Next Page"
                  type="button"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export const BookReader = PDFReader;
export default PDFReader;
