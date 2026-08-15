import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BookOpen, KeyRound, Mail, AlertTriangle, Loader2 } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const { login, isAuthenticated, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Check URL params for session expiration info
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === 'true') {
      setInfoMessage('Your session has expired. Please log in again.');
    }
    clearError();
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    setInfoMessage(null);
    try {
      await login(email, password);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      // Errors are handled by the useAuth hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white border border-brand-100 rounded-3xl p-8 sm:p-10 shadow-sm">
        
        {/* Header & Logo */}
        <div className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 bg-brand-500 rounded-2xl text-white flex items-center justify-center shadow-md">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-stone-900 leading-tight">
              Admin Portal
            </h1>
            <p className="text-xs text-stone-400 font-medium tracking-wide uppercase pt-1">
              Smiling Books Management System
            </p>
          </div>
        </div>

        {/* Message Banner for Info/Alerts */}
        {(infoMessage || error) && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-start space-x-2.5 ${
              error
                ? 'bg-red-50 border-red-200/50 text-red-700'
                : 'bg-amber-50 border-amber-200/50 text-amber-700'
            }`}
          >
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{error ? 'Authentication Error' : 'Session Notification'}</p>
              <p className="text-xs mt-0.5 leading-relaxed">{error || infoMessage}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Email field */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@smilingbooks.org"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder-stone-400 text-stone-800 font-sans"
              />
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Mail size={16} />
              </div>
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder-stone-400 text-stone-800 font-sans"
              />
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <KeyRound size={16} />
              </div>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow hover:shadow-md flex items-center justify-center space-x-2 disabled:opacity-75 disabled:hover:bg-brand-500"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>

        </form>

      </div>
    </div>
  );
};
export default AdminLogin;
