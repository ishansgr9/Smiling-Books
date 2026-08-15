import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Menu, X, BookOpen, User, LogOut, LayoutDashboard } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    return location.pathname === path ? 'text-brand-700 font-semibold' : 'text-stone-600 hover:text-brand-600 transition-colors';
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-brand-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="p-2 bg-brand-500 rounded-lg text-white group-hover:bg-brand-600 transition-colors">
                <BookOpen size={20} />
              </div>
              <div>
                <span className="font-serif text-lg font-bold tracking-tight block leading-tight">
                  <span className="text-brand-500">SMILING </span>
                  <span className="text-pink-500 font-extrabold">BOOKS</span>
                </span>
                <span className="text-[10px] text-stone-500 font-sans tracking-wide block">
                  An Akshar Paaul Digital Library
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className={isActive('/')}>Home</Link>
            <Link to="/library" className={isActive('/library')}>Library</Link>
            <Link 
              to="/donate" 
              className="px-4.5 py-1.5 bg-pink-500 hover:bg-pink-600 text-white text-xs font-extrabold uppercase tracking-wider rounded-full transition-all shadow-sm hover:shadow"
            >
              Donate
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/admin/dashboard"
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-brand-50 text-brand-700 text-sm font-medium rounded-full hover:bg-brand-100 transition-all border border-brand-200/50"
                >
                  <LayoutDashboard size={14} />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-1.5 text-stone-600 hover:text-red-600 text-sm font-medium rounded-full transition-all hover:bg-red-50"
                  aria-label="Logout"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/admin/login"
                className="flex items-center space-x-1.5 px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-full hover:bg-stone-800 transition-all shadow-sm hover:shadow"
              >
                <User size={14} />
                <span>Admin Login</span>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-stone-500 hover:text-brand-600 p-2 rounded-lg"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white/95 border-b border-brand-100/50 absolute left-0 right-0 py-4 px-6 space-y-4 shadow-lg animate-fadeIn">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="block text-stone-700 hover:text-brand-600 font-medium py-1"
          >
            Home
          </Link>
          <Link
            to="/library"
            onClick={() => setIsOpen(false)}
            className="block text-stone-700 hover:text-brand-600 font-medium py-1"
          >
            Library
          </Link>
          <Link
            to="/donate"
            onClick={() => setIsOpen(false)}
            className="block text-center py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-full text-xs uppercase tracking-wider transition-colors"
          >
            Donate
          </Link>
          
          <div className="pt-4 border-t border-stone-100">
            {isAuthenticated ? (
              <div className="flex flex-col space-y-3">
                <Link
                  to="/admin/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center space-x-2 w-full py-2 bg-brand-500 text-white rounded-full text-sm font-medium"
                >
                  <LayoutDashboard size={16} />
                  <span>Admin Dashboard</span>
                </Link>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center justify-center space-x-2 w-full py-2 text-stone-600 hover:text-red-600 text-sm font-medium border border-stone-200 rounded-full"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/admin/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center space-x-2 w-full py-2 bg-stone-900 text-white rounded-full text-sm font-medium"
              >
                <User size={16} />
                <span>Admin Login</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
export default Navbar;
