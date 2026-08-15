import React from 'react';
import { Link } from 'react-router-dom';
import type { Book } from '../types';
import { BookOpen } from 'lucide-react';

interface BookCardProps {
  book: Book;
}

export const BookCard: React.FC<BookCardProps> = ({ book }) => {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-orange-100/50 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group h-full">
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden flex items-center justify-center">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={`Cover of ${book.title}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-stone-400">
            <BookOpen size={48} className="stroke-[1.2] mb-3 text-stone-300" />
            <span className="font-serif text-sm font-semibold text-stone-600 block line-clamp-2">
              {book.title}
            </span>
            <span className="text-xs text-stone-400 block mt-1">
              {book.author_name}
            </span>
          </div>
        )}
        
        {/* Badges on Cover */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[calc(100%-24px)]">
          <span className="px-2.5 py-0.5 bg-white/90 backdrop-blur-sm text-brand-800 text-[10px] font-semibold tracking-wider uppercase rounded-full shadow-sm">
            {book.category_name}
          </span>
        </div>
      </div>

      {/* Info Content */}
      <div className="p-5 flex-grow flex flex-col justify-between">
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold text-stone-400 tracking-wider uppercase block">
            {book.language_name} • Age {book.age_group}
          </span>
          <h3 className="font-serif text-base font-bold text-stone-900 group-hover:text-brand-600 transition-colors line-clamp-1">
            {book.title}
          </h3>
          <p className="text-xs text-stone-500 font-medium">
            By {book.author_name}
          </p>
          <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed pt-1">
            {book.description || "No description provided."}
          </p>
        </div>

        {/* Read CTA */}
        <div className="pt-4 mt-auto">
          <Link
            to={`/books/${book.id}`}
            className="flex items-center justify-center space-x-1.5 w-full py-2 bg-brand-50 text-brand-700 font-semibold text-xs rounded-xl hover:bg-brand-500 hover:text-white transition-all duration-300"
          >
            <BookOpen size={12} />
            <span>View Details</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
export default BookCard;
