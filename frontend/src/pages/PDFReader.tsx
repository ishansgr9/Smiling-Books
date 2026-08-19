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

// Configure the pdf.js worker using Vite asset resolution
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export const PDFReader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
  const [pdfURL, setPdfURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // PDF reading states
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [inputPage, setInputPage] = useState<string>('1');
  const [scale, setScale] = useState<number>(1.0);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadPDF = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        // Fetch book info first
        const bookInfo = await api.get<Book>(`/api/books/${id}`);
        setBook(bookInfo);

        // Fetch pre-signed/local file reading URL
        const data = await api.get<{ url: string }>(`/api/books/${id}/read`);
        setPdfURL(data.url);
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
        setPageNumber(prev => (numPages ? Math.min(prev + 1, numPages) : prev));
      } else if (e.key === 'ArrowLeft') {
        setPageNumber(prev => Math.max(prev - 1, 1));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [numPages]);

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

  // Document load callback
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  // Page navigation handlers
  const handlePrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPageNumber(prev => (numPages ? Math.min(prev + 1, numPages) : prev));
  };

  const handlePageJump = () => {
    const parsed = parseInt(inputPage, 10);
    if (!isNaN(parsed) && parsed >= 1 && numPages && parsed <= numPages) {
      setPageNumber(parsed);
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
      className="bg-stone-950 flex flex-col w-screen h-screen overflow-hidden select-none"
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

      {/* Canvas PDF Viewer Container */}
      <div className="flex-grow bg-stone-950 overflow-auto flex items-start justify-center p-6 relative">
        <Document
          file={pdfURL}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex flex-col items-center justify-center space-y-4 py-32">
              <Loader2 className="animate-spin text-stone-500" size={36} />
              <p className="text-sm font-medium text-stone-500">Loading document...</p>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center space-y-4 py-32 text-center max-w-sm px-4">
              <AlertCircle size={40} className="text-red-500 stroke-[1.2]" />
              <p className="text-sm font-medium text-stone-400">Failed to render book pages. Please reload or check the document format.</p>
            </div>
          }
        >
          {numPages && (
            <div className="shadow-2xl border border-stone-800 rounded bg-stone-900 overflow-hidden mb-24">
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={
                  <div className="flex items-center justify-center py-40 min-w-[320px] bg-stone-900">
                    <Loader2 className="animate-spin text-stone-500" size={28} />
                  </div>
                }
              />
            </div>
          )}
        </Document>

        {/* Bottom Floating Navigation Bar */}
        {numPages && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-stone-900/90 backdrop-blur-md border border-stone-800 px-4 py-2.5 rounded-full flex items-center space-x-4 shadow-xl z-10 text-white select-none">
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

    </div>
  );
};

export default PDFReader;
