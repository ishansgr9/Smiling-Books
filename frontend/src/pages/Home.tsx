import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Book, Category, Language } from '../types';
import api from '../services/api';
import BookCard from '../components/BookCard';
import { BookGridSkeleton } from '../components/Skeleton';
import { ArrowRight, BookOpen, Compass, ShieldCheck, Heart } from 'lucide-react';

export const Home: React.FC = () => {
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const booksData = await api.get<{ books: Book[] }>('/api/books?sort=newest&limit=4');
        setRecentBooks(booksData.books);

        const cats = await api.get<Category[]>('/api/categories');
        setCategories(cats.slice(0, 6)); // Display top 6

        const langs = await api.get<Language[]>('/api/languages');
        setLanguages(langs.slice(0, 6)); // Display top 6
      } catch (e) {
        console.error('Failed to load home page content:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-16">
      
      {/* Hero Section */}
      <section className="relative rounded-3xl bg-gradient-to-br from-brand-900 to-stone-900 text-white overflow-hidden shadow-lg p-8 sm:p-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(161,113,98,0.15),transparent)] pointer-events-none" />
        <div className="space-y-6 max-w-2xl text-center md:text-left z-10">
          <span className="px-3.5 py-1.5 bg-brand-500/25 border border-brand-500/40 text-brand-300 text-xs font-semibold tracking-wider uppercase rounded-full inline-block">
            NGO Initiative
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
            <span className="text-white">SMILING </span>
            <span className="text-pink-500 font-extrabold">BOOKS</span> <br />
            <span className="text-brand-300">Digital Library</span>
          </h1>
          <p className="text-base sm:text-lg text-stone-300 leading-relaxed font-sans font-light">
            Stories, knowledge, and imagination — accessible to everyone. An initiative by Akshar Paaul NGO to digitize and share authorized books with children and communities.
          </p>
          <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4 pt-2">
            <Link
              to="/library"
              className="px-6 py-3 bg-brand-500 text-white font-semibold rounded-full hover:bg-brand-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
            >
              <span>Explore the Library</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Typographic Artwork */}
        <div className="hidden lg:flex flex-col items-center justify-center border-4 border-dashed border-brand-500/30 rounded-2xl p-8 aspect-square w-72 text-center text-brand-200 select-none opacity-85 shrink-0">
          <BookOpen size={48} className="text-brand-400 mb-4" />
          <h3 className="font-serif text-lg font-bold text-white">Read & Grow</h3>
          <p className="text-xs text-stone-400 mt-2 leading-relaxed">
            "The more that you read, the more things you will know."
          </p>
        </div>
      </section>

      {/* Pillars of Content Rights */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-brand-100/30 shadow-sm space-y-3">
          <div className="p-3 bg-brand-50 text-brand-600 rounded-xl w-fit">
            <ShieldCheck size={24} />
          </div>
          <h3 className="font-serif text-lg font-bold text-stone-900">Copyright Compliant</h3>
          <p className="text-sm text-stone-500 leading-relaxed">
            Every book in our digital repository is thoroughly checked to guarantee distribution rights. Read with peace of mind.
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-brand-100/30 shadow-sm space-y-3">
          <div className="p-3 bg-brand-50 text-brand-600 rounded-xl w-fit">
            <Compass size={24} />
          </div>
          <h3 className="font-serif text-lg font-bold text-stone-900">Completely Public</h3>
          <p className="text-sm text-stone-500 leading-relaxed">
            Free access for normal readers. No signup, no forms, no logins. Just pick a book, open it, and begin reading.
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-brand-100/30 shadow-sm space-y-3">
          <div className="p-3 bg-brand-50 text-brand-600 rounded-xl w-fit">
            <Heart size={24} />
          </div>
          <h3 className="font-serif text-lg font-bold text-stone-900">Community Driven</h3>
          <p className="text-sm text-stone-500 leading-relaxed">
            Built as a service-learning project to support the physical Smiling Books libraries maintained by Akshar Paaul NGO.
          </p>
        </div>
      </section>

      {/* Recently Added Section */}
      <section className="space-y-6">
        <div className="flex justify-between items-end border-b border-brand-100/50 pb-3">
          <div>
            <h2 className="font-serif text-2xl font-bold text-stone-900">Recently Added</h2>
            <p className="text-sm text-stone-500">Discover the latest books uploaded to our catalog</p>
          </div>
          <Link
            to="/library?sort=newest"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <BookGridSkeleton count={4} />
        ) : recentBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {recentBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-brand-100/30">
            <BookOpen size={40} className="mx-auto text-stone-300 mb-2" />
            <p className="text-stone-500">No books found in the library catalog yet.</p>
          </div>
        )}
      </section>

      {/* Browse by Category & Language */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Categories */}
        <div className="bg-white p-8 rounded-2xl border border-brand-100/30 shadow-sm space-y-4">
          <h3 className="font-serif text-lg font-bold text-stone-900">Browse by Category</h3>
          <div className="flex flex-wrap gap-2.5">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/library?category=${cat.id}`}
                className="px-4 py-2 bg-stone-50 hover:bg-brand-50 hover:text-brand-700 text-stone-700 font-medium text-xs rounded-xl border border-stone-200/50 transition-all"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div className="bg-white p-8 rounded-2xl border border-brand-100/30 shadow-sm space-y-4">
          <h3 className="font-serif text-lg font-bold text-stone-900">Browse by Language</h3>
          <div className="flex flex-wrap gap-2.5">
            {languages.map((lang) => (
              <Link
                key={lang.id}
                to={`/library?language=${lang.id}`}
                className="px-4 py-2 bg-stone-50 hover:bg-brand-50 hover:text-brand-700 text-stone-700 font-medium text-xs rounded-xl border border-stone-200/50 transition-all"
              >
                {lang.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};
export default Home;
