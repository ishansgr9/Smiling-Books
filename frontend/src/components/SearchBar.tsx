import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder = "Search for books, authors, categories..." }) => {
  const [localVal, setLocalVal] = useState(value);

  // Sync state if parent value changes
  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange(localVal);
  };

  const handleClear = () => {
    setLocalVal('');
    onChange('');
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3.5 bg-white border border-brand-100 rounded-2xl shadow-sm text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder-stone-400 text-stone-800 transition-all font-sans"
        />
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
          <Search size={18} />
        </div>
        {localVal && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-stone-600"
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </form>
  );
};
export default SearchBar;
