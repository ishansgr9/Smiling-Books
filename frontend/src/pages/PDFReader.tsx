import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Book } from '../types';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const PDFReader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBook = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const bookInfo = await api.get<Book>(`/api/books/${id}`);
        setBook(bookInfo);
      } catch (e: any) {
        console.error('Failed to load book metadata:', e);
        setError(e.message || 'The digital book metadata could not be loaded.');
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [id]);

  const handleBack = () => {
    navigate(`/books/${id}`);
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-brand-500" size={36} />
        <p className="text-sm font-medium text-stone-500">Preparing secure reading room...</p>
      </div>
    );
  }

  if (error || !book) {
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

  // Construct the URL to stream the PDF file from the backend
  const pdfURL = `${API_BASE_URL}/api/books/${id}/pdf`;
  
  // Construct the iframe URL using our customized local PDF.js viewer
  const viewerURL = `/pdfjs/web/viewer.html?file=${encodeURIComponent(pdfURL)}`;

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

      <div className="bg-stone-950 flex flex-col w-screen h-screen overflow-hidden relative">
        {/* Floating Custom Back Button */}
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 z-50 flex items-center space-x-2 bg-stone-900/90 hover:bg-stone-800 text-stone-200 hover:text-white px-3 py-1.5 rounded-full border border-stone-800 shadow-lg text-xs font-semibold backdrop-blur transition-all cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Details</span>
        </button>

        {/* Embedded Customized PDF.js Viewer */}
        <iframe
          src={viewerURL}
          className="w-full h-full border-none select-none"
          title={book.title}
          allow="fullscreen"
        />
      </div>
    </>
  );
};

export default PDFReader;
