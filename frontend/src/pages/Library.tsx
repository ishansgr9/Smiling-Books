import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Book, Category, Language } from '../types';
import api from '../services/api';
import BookCard from '../components/BookCard';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import { BookGridSkeleton } from '../components/Skeleton';
import { BookOpen, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export const Library: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter States
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(Number(searchParams.get('category')) || 0);
  const [selectedLanguage, setSelectedLanguage] = useState(Number(searchParams.get('language')) || 0);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState(searchParams.get('age_group') || 'All');
  const [selectedSort, setSelectedSort] = useState(searchParams.get('sort') || 'title');
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);

  // Data States
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [loading, setLoading] = useState(true);

  const booksPerPage = 12;

  // Sync state if URL search parameters change
  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
    setSelectedCategory(Number(searchParams.get('category')) || 0);
    setSelectedLanguage(Number(searchParams.get('language')) || 0);
    setSelectedAgeGroup(searchParams.get('age_group') || 'All');
    setSelectedSort(searchParams.get('sort') || 'title');
    setCurrentPage(Number(searchParams.get('page')) || 1);
  }, [searchParams]);

  // Load static filter data (Categories & Languages)
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [cats, langs] = await Promise.all([
          api.get<Category[]>('/api/categories'),
          api.get<Language[]>('/api/languages'),
        ]);
        setCategories(cats);
        setLanguages(langs);
      } catch (e) {
        console.error('Failed to load filters:', e);
      }
    };
    loadFilters();
  }, []);

  // Fetch books when search criteria changes
  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        // Build query string
        const params = new URLSearchParams();
        if (searchQuery) params.append('q', searchQuery);
        if (selectedCategory > 0) params.append('category', String(selectedCategory));
        if (selectedLanguage > 0) params.append('language', String(selectedLanguage));
        if (selectedAgeGroup !== 'All') params.append('age_group', selectedAgeGroup);
        if (selectedSort) params.append('sort', selectedSort);
        params.append('page', String(currentPage));
        params.append('limit', String(booksPerPage));

        const data = await api.get<{ books: Book[]; total: number }>(`/api/books?${params.toString()}`);
        setBooks(data.books || []);
        setTotalBooks(data.total || 0);
      } catch (e) {
        console.error('Failed to fetch books:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [searchQuery, selectedCategory, selectedLanguage, selectedAgeGroup, selectedSort, currentPage]);

  // Update URL Search Parameters
  const updateURLParams = (updates: Record<string, string | number | null>) => {
    const newParams = new URLSearchParams(searchParams);
    
    // Reset page to 1 on filter change, unless page is explicitly updated
    if (!updates.hasOwnProperty('page')) {
      newParams.set('page', '1');
      setCurrentPage(1);
    }

    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === '' || val === 0 || val === 'All') {
        newParams.delete(key);
      } else {
        newParams.set(key, String(val));
      }
    });

    setSearchParams(newParams);
  };

  const handleSearch = (q: string) => {
    updateURLParams({ q });
  };

  const handleCategoryChange = (category: number) => {
    updateURLParams({ category });
  };

  const handleLanguageChange = (language: number) => {
    updateURLParams({ language });
  };

  const handleAgeGroupChange = (age_group: string) => {
    updateURLParams({ age_group });
  };

  const handleSortChange = (sort: string) => {
    updateURLParams({ sort });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateURLParams({ page });
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setSearchParams(new URLSearchParams());
  };

  const totalPages = Math.ceil(totalBooks / booksPerPage);

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="text-center space-y-2">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">Library Catalog</h1>
        <p className="text-sm text-stone-500 max-w-lg mx-auto">
          Browse, search, and read online from our curated selection of child-safe and legally authorized books.
        </p>
      </div>

      {/* Search Bar */}
      <SearchBar value={searchQuery} onChange={handleSearch} />

      {/* Filters and Sorting */}
      <FilterPanel
        categories={categories}
        languages={languages}
        selectedCategory={selectedCategory}
        selectedLanguage={selectedLanguage}
        selectedAgeGroup={selectedAgeGroup}
        selectedSort={selectedSort}
        onCategoryChange={handleCategoryChange}
        onLanguageChange={handleLanguageChange}
        onAgeGroupChange={handleAgeGroupChange}
        onSortChange={handleSortChange}
        onReset={handleReset}
      />

      {/* Results Count & Loader status */}
      <div className="flex items-center justify-between border-b border-brand-100/50 pb-2">
        <span className="text-xs font-semibold text-stone-400 tracking-wider uppercase">
          {loading ? 'Searching...' : `${totalBooks} Books Available`}
        </span>
        {loading && <RefreshCw size={14} className="animate-spin text-brand-500" />}
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <BookGridSkeleton count={8} />
      ) : books.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-brand-100/40 max-w-xl mx-auto shadow-sm">
          <BookOpen size={48} className="mx-auto text-stone-300 stroke-[1.2] mb-4" />
          <h3 className="font-serif text-lg font-bold text-stone-800 mb-1">No Books Found</h3>
          <p className="text-sm text-stone-500 max-w-xs mx-auto mb-6">
            We couldn't find any books matching your search query or filter selection.
          </p>
          <button
            onClick={handleReset}
            className="px-5 py-2.5 bg-brand-500 text-white text-xs font-semibold rounded-full hover:bg-brand-600 shadow-sm transition-all"
            type="button"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 pt-6 border-t border-brand-100/30">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 bg-white rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:hover:bg-white shadow-sm transition-all"
            aria-label="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="flex items-center space-x-1.5">
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-9 h-9 rounded-xl text-xs font-semibold transition-all border ${
                    currentPage === pageNum
                      ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                  type="button"
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 bg-white rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:hover:bg-white shadow-sm transition-all"
            aria-label="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
export default Library;
