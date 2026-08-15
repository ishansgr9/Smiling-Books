import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Analytics } from '../types';
import api from '../services/api';
import { BookCopy, Eye, CheckCircle2, ShieldAlert, Plus, BookOpen, Loader2 } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const stats = await api.get<Analytics>('/api/admin/analytics');
        setData(stats);
      } catch (e: any) {
        console.error('Failed to load dashboard analytics:', e);
        setError(e.message || 'An error occurred while loading dashboard statistics.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl">
        <p className="font-semibold">Failed to load analytics</p>
        <p className="text-xs mt-1">{error || 'Unknown database error occurred.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-black text-stone-900 leading-tight">
            Dashboard
          </h1>
          <p className="text-xs text-stone-400 font-medium uppercase tracking-wider mt-0.5">
            Smiling Books Digital Library Operations
          </p>
        </div>
        <Link
          to="/admin/books/new"
          className="flex items-center space-x-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow transition-all"
        >
          <Plus size={14} />
          <span>Add New Book</span>
        </Link>
      </div>

      {/* Metrics Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Metric Card: Total Books */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/50 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider block">Total Books</span>
            <span className="text-3xl font-black text-stone-900 block">{data.total_books}</span>
          </div>
          <div className="p-3 bg-stone-50 text-stone-500 rounded-xl">
            <BookCopy size={24} />
          </div>
        </div>

        {/* Metric Card: Published Books */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/50 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider block">Published Books</span>
            <span className="text-3xl font-black text-emerald-600 block">{data.published_books}</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Metric Card: Pending Review */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/50 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider block">Pending Review</span>
            <span className="text-3xl font-black text-amber-600 block">{data.pending_review}</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <ShieldAlert size={24} />
          </div>
        </div>

        {/* Metric Card: Total Reads */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/50 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider block">Total Reads</span>
            <span className="text-3xl font-black text-brand-600 block">{data.total_reads}</span>
          </div>
          <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
            <Eye size={24} />
          </div>
        </div>

      </section>

      {/* Analytics Breakdown Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Popular Books Listing */}
        <div className="bg-white rounded-2xl border border-stone-200/50 p-6 shadow-sm space-y-4">
          <div className="border-b border-stone-100 pb-3 flex items-center space-x-2 text-stone-900">
            <BookOpen size={16} className="text-brand-500" />
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider">Most Read Books</h2>
          </div>
          
          {data.popular_books && data.popular_books.length > 0 ? (
            <div className="divide-y divide-stone-100">
              {data.popular_books.map((b, idx) => (
                <div key={b.id} className="flex justify-between items-center py-3">
                  <div className="min-w-0 pr-4">
                    <p className="text-sm font-semibold text-stone-900 truncate">
                      {idx + 1}. {b.title}
                    </p>
                    <p className="text-xs text-stone-500 truncate mt-0.5">By {b.author_name}</p>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0 bg-stone-50 px-2.5 py-1 rounded-lg text-xs font-bold text-stone-700 border border-stone-200/40">
                    <Eye size={12} className="text-stone-400" />
                    <span>{b.read_count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-400 py-6 text-center">No reading logs tracked yet.</p>
          )}
        </div>

        {/* Category Book Distribution (SVG Bars) */}
        <div className="bg-white rounded-2xl border border-stone-200/50 p-6 shadow-sm space-y-4">
          <div className="border-b border-stone-100 pb-3 flex items-center space-x-2 text-stone-900">
            <BookCopy size={16} className="text-brand-500" />
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider">Category Distribution</h2>
          </div>
          
          {data.category_stats && data.category_stats.length > 0 ? (
            <div className="space-y-4 py-2">
              {data.category_stats.map((stat) => {
                const maxCount = data.category_stats?.[0]?.book_count || 1;
                const percentage = Math.max(5, (stat.book_count / maxCount) * 100);

                return (
                  <div key={stat.category_name} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-stone-600">
                      <span>{stat.category_name}</span>
                      <span className="text-stone-400">{stat.book_count} Books</span>
                    </div>
                    {/* Visual Bar */}
                    <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-brand-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-stone-400 py-6 text-center">No categories populated yet.</p>
          )}
        </div>

      </section>

    </div>
  );
};
export default AdminDashboard;
