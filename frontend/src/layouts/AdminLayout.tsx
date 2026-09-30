import React, { useState } from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, BookCopy, LogOut, ArrowLeft, BookOpen, Loader2, Menu, X } from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { isAuthenticated, loading, logout, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    return location.pathname === path
      ? 'bg-brand-500 text-white shadow-sm'
      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-brand-500 mx-auto" size={32} />
          <p className="text-sm font-medium text-stone-500">Checking session status...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row">
      
      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-brand-500 rounded text-white">
            <BookOpen size={16} />
          </div>
          <span className="font-serif text-sm font-bold tracking-tight text-stone-900">
            Smiling Books Admin
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-stone-200 p-4 space-y-3 shadow-lg z-20">
          <div className="bg-brand-50 rounded-xl p-3 border border-brand-100/50 mb-2">
            <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Logged in as</p>
            <p className="text-xs font-bold text-brand-800 truncate">{user?.name || 'Administrator'}</p>
          </div>
          <Link
            to="/admin/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive('/admin/dashboard')}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/admin/books"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive('/admin/books')}`}
          >
            <BookCopy size={18} />
            <span>Manage Books</span>
          </Link>
          <div className="pt-2 border-t border-stone-100 flex flex-col space-y-1">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2.5 px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100"
            >
              <ArrowLeft size={18} />
              <span>Return to Main Site</span>
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="flex items-center space-x-2.5 w-full text-left px-4 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex w-64 bg-white border-r border-stone-200 flex-col justify-between shrink-0 min-h-screen">
        <div>
          {/* Admin Header */}
          <div className="p-6 border-b border-stone-100">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-brand-500 rounded text-white">
                <BookOpen size={16} />
              </div>
              <span className="font-serif text-base font-bold tracking-tight text-stone-900">
                Smiling Books
              </span>
            </div>
            <div className="mt-3.5 bg-brand-50 rounded-xl p-3 border border-brand-100/50">
              <p className="text-xs text-stone-400 font-medium">Logged in as</p>
              <p className="text-xs font-bold text-brand-800 truncate">{user?.name || 'Administrator'}</p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1">
            <Link
              to="/admin/dashboard"
              className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive('/admin/dashboard')}`}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/admin/books"
              className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive('/admin/books')}`}
            >
              <BookCopy size={18} />
              <span>Manage Books</span>
            </Link>
          </nav>
        </div>

        {/* Bottom actions */}
        <div className="p-4 border-t border-stone-100 space-y-1">
          <Link
            to="/"
            className="flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-all"
          >
            <ArrowLeft size={18} />
            <span>Return to Site</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2.5 w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-4 sm:p-6 md:p-10 overflow-y-auto max-w-7xl">
        <div className="animate-fadeIn">
          <Outlet />
        </div>
      </main>

    </div>
  );
};
export default AdminLayout;

