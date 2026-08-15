import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { Book } from '../types';
import api from '../services/api';
import BookCard from '../components/BookCard';
import { Skeleton } from '../components/Skeleton';
import { ArrowLeft, BookOpen, Scale, Calendar, HelpCircle, AlertCircle } from 'lucide-react';

export const BookDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [relatedBooks, setRelatedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookDetails = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<Book>(`/api/books/${id}`);
        setBook(data);

        // Fetch related books in the same category
        if (data.category_id) {
          const related = await api.get<{ books: Book[] }>(`/api/books?category=${data.category_id}&limit=5`);
          // Filter out the current book
          const filtered = (related.books || []).filter((b) => b.id !== id).slice(0, 4);
          setRelatedBooks(filtered);
        }
      } catch (e: any) {
        console.error('Failed to load book details:', e);
        setError(e.message || 'The requested book details could not be loaded.');
      } finally {
        setLoading(false);
      }
    };

    fetchBookDetails();
  }, [id]);

  const getRightsText = (status: string) => {
    switch (status) {
      case 'PUBLIC_DOMAIN':
        return 'Public Domain';
      case 'LICENSED':
        return 'Licensed Digitally';
      case 'PERMISSION_GRANTED':
        return 'Author Permission Granted';
      case 'PENDING_REVIEW':
        return 'Pending Review';
      default:
        return status;
    }
  };

  const getRightsColor = (status: string) => {
    switch (status) {
      case 'PUBLIC_DOMAIN':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/50';
      case 'LICENSED':
      case 'PERMISSION_GRANTED':
        return 'bg-blue-50 text-blue-700 border-blue-200/50';
      case 'PENDING_REVIEW':
        return 'bg-amber-50 text-amber-700 border-amber-200/50';
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200/50';
    }
  };

  if (loading) {
    return (
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Cover Skeleton */}
          <div className="w-full md:w-80 shrink-0">
            <Skeleton className="aspect-[3/4] rounded-2xl animate-shimmer" />
          </div>
          {/* Content Skeleton */}
          <div className="flex-grow space-y-4">
            <Skeleton className="h-10 w-2/3 animate-shimmer" />
            <Skeleton className="h-4 w-1/4 animate-shimmer" />
            <div className="space-y-2 pt-4">
              <Skeleton className="h-3 w-full animate-shimmer" />
              <Skeleton className="h-3 w-5/6 animate-shimmer" />
              <Skeleton className="h-3 w-4/5 animate-shimmer" />
            </div>
            <div className="flex gap-4 pt-6">
              <Skeleton className="h-12 w-40 rounded-full animate-shimmer" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="text-center py-20 max-w-md mx-auto space-y-4">
        <AlertCircle size={48} className="mx-auto text-red-500 stroke-[1.2]" />
        <h2 className="font-serif text-2xl font-bold text-stone-800">Book Unavailable</h2>
        <p className="text-sm text-stone-500 leading-relaxed">
          {error || "The book you are looking for does not exist or has not been published yet."}
        </p>
        <button
          onClick={() => navigate('/library')}
          className="px-5 py-2.5 bg-stone-900 text-white text-xs font-semibold rounded-full hover:bg-stone-800 transition-all flex items-center justify-center space-x-1.5 mx-auto shadow"
          type="button"
        >
          <ArrowLeft size={14} />
          <span>Back to Library</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      
      {/* Back link */}
      <div>
        <Link
          to="/library"
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-stone-500 hover:text-brand-600 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft size={14} />
          <span>Back to Catalog</span>
        </Link>
      </div>

      {/* Main Details Panel */}
      <section className="bg-white rounded-3xl border border-brand-100/50 p-6 sm:p-8 md:p-10 shadow-sm flex flex-col md:flex-row gap-8 md:gap-12">
        
        {/* Large Cover */}
        <div className="w-full md:w-80 shrink-0 bg-stone-100 rounded-2xl overflow-hidden aspect-[3/4] relative border border-stone-200/50 shadow-sm flex items-center justify-center">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={`Cover image of ${book.title}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center p-6 text-stone-400">
              <BookOpen size={64} className="stroke-[1.2] mb-3 text-stone-300" />
              <span className="text-xs font-semibold text-stone-500 text-center uppercase tracking-wider block">
                {book.title}
              </span>
            </div>
          )}
        </div>

        {/* Text Information details */}
        <div className="flex-grow flex flex-col justify-between">
          <div className="space-y-6">
            
            {/* Title & Author */}
            <div className="space-y-2 border-b border-stone-100 pb-4">
              <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-stone-900 leading-tight">
                {book.title}
              </h1>
              <p className="text-stone-600 text-base font-semibold">
                By {book.author_name}
              </p>
            </div>

            {/* Badges Panel */}
            <div className="flex flex-wrap gap-2.5">
              <span className="px-3.5 py-1 bg-stone-100 text-stone-700 text-xs font-semibold rounded-full">
                {book.category_name}
              </span>
              <span className="px-3.5 py-1 bg-stone-100 text-stone-700 text-xs font-semibold rounded-full">
                {book.language_name}
              </span>
              <span className="px-3.5 py-1 bg-stone-100 text-stone-700 text-xs font-semibold rounded-full">
                Age: {book.age_group}
              </span>
              <span className={`px-3 py-1 border text-xs font-semibold rounded-full flex items-center space-x-1.5 ${getRightsColor(book.rights_status)}`}>
                <Scale size={12} />
                <span>{getRightsText(book.rights_status)}</span>
              </span>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-stone-500">
                Description
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed font-sans font-light">
                {book.description || "No description available for this book."}
              </p>
            </div>

            {/* Minor Metadata Row */}
            <div className="flex flex-wrap gap-8 text-xs text-stone-500 pt-2">
              {book.publication_year && (
                <div className="flex items-center space-x-1.5">
                  <Calendar size={14} className="text-stone-400" />
                  <span>Published: {book.publication_year}</span>
                </div>
              )}
              <div className="flex items-center space-x-1.5">
                <HelpCircle size={14} className="text-stone-400" />
                <span>Digital Library Access: Free Online Reading</span>
              </div>
            </div>

          </div>

          {/* Primary Action Button */}
          <div className="pt-8 border-t border-stone-100 mt-8 flex flex-col sm:flex-row gap-4">
            <Link
              to={`/books/${book.id}/read`}
              className="px-8 py-3.5 bg-brand-500 text-white font-bold text-sm tracking-wider uppercase rounded-full hover:bg-brand-600 transition-all text-center flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
            >
              <BookOpen size={16} />
              <span>Read Online</span>
            </Link>
          </div>

        </div>

      </section>

      {/* Related Books */}
      {relatedBooks.length > 0 && (
        <section className="space-y-6">
          <div className="border-b border-brand-100/50 pb-3">
            <h2 className="font-serif text-xl font-bold text-stone-900">Related Books</h2>
            <p className="text-xs text-stone-500">Explore other books in the category "{book.category_name}"</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {relatedBooks.map((related) => (
              <BookCard key={related.id} book={related} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
};
export default BookDetails;
