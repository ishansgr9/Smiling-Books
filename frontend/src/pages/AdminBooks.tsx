import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Book } from '../types';
import api from '../services/api';
import { Edit2, Trash2, CheckCircle2, XCircle, Search, BookOpen, AlertTriangle, Loader2 } from 'lucide-react';

export const AdminBooks: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal deletion tracking
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchBooks = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all books (including unpublished)
      const data = await api.get<{ books: Book[]; total: number }>(
        `/api/admin/books?q=${encodeURIComponent(searchQuery)}`
      );
      setBooks(data.books || []);
      setTotalBooks(data.total || 0);
    } catch (e: any) {
      console.error('Failed to load admin books listing:', e);
      setError(e.message || 'Could not retrieve catalog list.Please confirm again');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search slightly
    const delayDebounceFn = setTimeout(() => {
      fetchBooks();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Publish toggle
  const handlePublishToggle = async (book: Book) => {
    try {
      if (book.published) {
        const updated = await api.post<Book>(`/api/admin/books/${book.id}/unpublish`);
        setBooks(books.map((b) => (b.id === book.id ? updated : b)));
      } else {
        const updated = await api.post<Book>(`/api/admin/books/${book.id}/publish`);
        setBooks(books.map((b) => (b.id === book.id ? updated : b)));
      }
    } catch (e: any) {
      alert(e.message || 'Failed to update publication status.');
    }
  };

  // Delete execution
  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.delete(`/api/admin/books/${confirmDeleteId}`);
      setBooks(books.filter((b) => b.id !== confirmDeleteId));
      setTotalBooks((prev) => prev - 1);
    } catch (e: any) {
      alert(e.message || 'Failed to delete book.');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const getRightsLabel = (status: string) => {
    switch (status) {
      case 'PUBLIC_DOMAIN': return 'Public Domain';
      case 'LICENSED': return 'Licensed';
      case 'PERMISSION_GRANTED': return 'Permission';
      case 'PENDING_REVIEW': return 'Pending';
      default: return status;
    }
  };

  return (
    <div className="space-y-8">

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-black text-stone-900 leading-tight">
            Manage Books
          </h1>
          <p className="text-xs text-stone-400 font-medium uppercase tracking-wider mt-0.5">
            Smiling Books Library Catalog Control • {totalBooks} Books
          </p>
        </div>
        <Link
          to="/admin/books/new"
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow transition-all"
        >
          Add New Book
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md bg-white border border-stone-200/50 rounded-xl overflow-hidden shadow-sm">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search title, author, category..."
          className="w-full pl-10 pr-4 py-2.5 text-xs focus:ring-1 focus:ring-brand-500 focus:border-brand-500 border-none outline-none font-sans"
        />
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
          <Search size={14} />
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bg-white rounded-2xl border border-stone-200/50 shadow-sm overflow-hidden">

        {loading && books.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-stone-500">
            <Loader2 className="animate-spin text-brand-500" size={24} />
            <p className="text-xs">Fetching library books...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-red-500 py-12">
            <p>Error retrieving catalog data</p>
            <p className="text-stone-400 mt-1">{error}</p>
          </div>
        ) : books.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100 text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-4">Book Title</th>
                  <th scope="col" className="px-6 py-4">Author</th>
                  <th scope="col" className="px-6 py-4">Category</th>
                  <th scope="col" className="px-6 py-4">Language</th>
                  <th scope="col" className="px-6 py-4">Rights Status</th>
                  <th scope="col" className="px-6 py-4 text-center">Published</th>
                  <th scope="col" className="px-6 py-4 text-center">Files</th>
                  <th scope="col" className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-sans">
                {books.map((book) => (
                  <tr key={book.id} className="hover:bg-stone-50/50 transition-colors">

                    {/* Cover & Title */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3 max-w-sm">
                        <div className="w-9 h-12 bg-stone-100 rounded overflow-hidden relative shrink-0 border border-stone-200/30 flex items-center justify-center">
                          {book.cover_url ? (
                            <img src={book.cover_url} alt="" className="object-cover w-full h-full" />
                          ) : (
                            <BookOpen size={14} className="text-stone-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 truncate">{book.title}</p>
                          <p className="text-[10px] text-stone-400 mt-0.5 truncate">ID: {book.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Author */}
                    <td className="px-6 py-4 font-medium text-stone-900">{book.author_name}</td>

                    {/* Category */}
                    <td className="px-6 py-4">{book.category_name}</td>

                    {/* Language */}
                    <td className="px-6 py-4">{book.language_name}</td>

                    {/* Rights status */}
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${book.rights_status === 'PUBLIC_DOMAIN'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : book.rights_status === 'PENDING_REVIEW'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-blue-50 text-blue-700 border-blue-100'
                        }`}>
                        {getRightsLabel(book.rights_status)}
                      </span>
                    </td>

                    {/* Published status */}
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handlePublishToggle(book)}
                        disabled={book.rights_status === 'PENDING_REVIEW'}
                        className={`inline-flex items-center justify-center p-1 rounded-full transition-all ${book.published
                            ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                            : 'text-stone-400 bg-stone-50 hover:bg-stone-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={book.rights_status === 'PENDING_REVIEW' ? 'Pending review books cannot be published' : 'Toggle publish status'}
                      >
                        {book.published ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      </button>
                    </td>

                    {/* PDF File uploaded indicator */}
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${book.pdf_object_key ? 'bg-emerald-500' : 'bg-red-400 animate-pulse'
                        }`} title={book.pdf_object_key ? 'PDF Uploaded' : 'PDF Missing'} />
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/admin/books/${book.id}/edit`}
                          className="p-1.5 bg-stone-50 text-stone-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg border border-stone-200/40 transition-all"
                          title="Edit Metadata"
                        >
                          <Edit2 size={12} />
                        </Link>
                        <button
                          onClick={() => setConfirmDeleteId(book.id)}
                          className="p-1.5 bg-stone-50 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-stone-200/40 transition-all"
                          title="Delete Book"
                          type="button"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 bg-white p-6">
            <BookOpen size={40} className="mx-auto text-stone-300 stroke-[1.2] mb-3" />
            <p className="text-sm font-semibold text-stone-700">No Books Found</p>
            <p className="text-xs text-stone-400 mt-1">Try refining your search text or add a new record.</p>
          </div>
        )}

      </div>

      {/* Custom Deletion Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-xl border border-stone-200/50 animate-scaleUp">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif text-lg font-bold text-stone-950">Confirm Deletion</h3>
                <p className="text-xs text-stone-500 leading-relaxed font-sans font-light">
                  Are you absolutely sure you want to delete this book? This will permanently remove its metadata from Neon DB and delete its cover images and PDF documents from object storage.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3.5 pt-2 font-sans">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-5 py-2.5 bg-stone-50 hover:bg-stone-100 text-stone-600 text-xs font-semibold rounded-xl border border-stone-200 transition-all"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow transition-all"
                type="button"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default AdminBooks;
