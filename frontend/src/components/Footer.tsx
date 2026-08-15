import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-stone-900 text-stone-300 border-t-4 border-brand-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Logo & Description */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-white">
              <div className="p-1.5 bg-brand-500 rounded text-white">
                <BookOpen size={16} />
              </div>
              <span className="font-serif text-lg font-bold tracking-tight">
                SMILING BOOKS
              </span>
            </div>
            <p className="text-sm text-stone-400 max-w-sm leading-relaxed">
              A digital library initiative of Akshar Paaul NGO. Making stories, knowledge, and imagination accessible to children and communities legally.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-serif text-sm font-semibold text-white tracking-wider uppercase mb-4">
              Navigation
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-brand-400 transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/library" className="hover:text-brand-400 transition-colors">Library Catalog</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-brand-400 transition-colors">About Project</Link>
              </li>
              <li>
                <a 
                  href="https://aksharpaaul.org" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-brand-400 transition-colors flex items-center space-x-1"
                >
                  <span>Akshar Paaul Main Website</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Important Rights / Legal disclaimer */}
          <div>
            <h3 className="font-serif text-sm font-semibold text-white tracking-wider uppercase mb-4">
              Content Rights & Policy
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed space-y-2">
              Smiling Books Digital Library operates strictly under copyright compliance. We distribute only works in the Public Domain or books where explicit digitizing permission has been granted by authors and publishers.
            </p>
          </div>

        </div>

        {/* Bottom Banner */}
        <div className="mt-12 pt-8 border-t border-stone-800 flex flex-col sm:flex-row justify-between items-center text-xs text-stone-500">
          <p>© {new Date().getFullYear()} Akshar Paaul NGO. All rights reserved.</p>
          <p className="flex items-center mt-4 sm:mt-0">
            <span>Made with</span>
            <Heart size={10} className="mx-1 text-red-500 fill-red-500 animate-pulse" />
            <span>for Service-Learning</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
