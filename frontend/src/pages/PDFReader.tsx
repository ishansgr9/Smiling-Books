import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Book } from '../types';
import { ArrowLeft, Maximize2, Minimize2, Loader2, AlertCircle, Eye } from 'lucide-react';

export const PDFReader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
  const [pdfURL, setPdfURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    // If fullscreen is active, exit first
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
      className={`bg-stone-950 flex flex-col rounded-3xl overflow-hidden shadow-lg border border-brand-950/20 ${
        isFullscreen ? 'w-screen h-screen rounded-none' : 'w-full h-[82vh]'
      }`}
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
              By {book.author_name} • Reading Online
            </p>
          </div>
        </div>

        {/* Right Side: Options & Fullscreen */}
        <div className="flex items-center space-x-3">
          <span className="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-stone-800 border border-stone-700/50 rounded-full text-[10px] font-semibold text-brand-300 uppercase tracking-wider">
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

      {/* Embedded PDF Iframe Viewer */}
      <div className="flex-grow bg-stone-900 relative">
        <iframe
          src={pdfURL}
          title={`PDF Reader for ${book.title}`}
          className="w-full h-full border-none"
          loading="eager"
        />
      </div>

    </div>
  );
};
export default PDFReader;
