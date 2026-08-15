import React from 'react';
import type { Category, Language } from '../types';
import { Filter, RotateCcw } from 'lucide-react';

interface FilterPanelProps {
  categories: Category[];
  languages: Language[];
  selectedCategory: number;
  selectedLanguage: number;
  selectedAgeGroup: string;
  selectedSort: string;
  onCategoryChange: (id: number) => void;
  onLanguageChange: (id: number) => void;
  onAgeGroupChange: (group: string) => void;
  onSortChange: (sort: string) => void;
  onReset: () => void;
}

const AGE_GROUPS = ['All', '5-8', '9-12', '13+', 'All Ages'];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  categories,
  languages,
  selectedCategory,
  selectedLanguage,
  selectedAgeGroup,
  selectedSort,
  onCategoryChange,
  onLanguageChange,
  onAgeGroupChange,
  onSortChange,
  onReset,
}) => {
  const hasFilters = selectedCategory > 0 || selectedLanguage > 0 || selectedAgeGroup !== 'All' || selectedSort !== 'title';

  return (
    <div className="bg-white rounded-2xl border border-brand-100/50 p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center space-x-2 text-stone-900">
          <Filter size={16} className="text-brand-500" />
          <h2 className="font-serif text-sm font-semibold tracking-wider uppercase">Filters & Sorting</h2>
        </div>
        {hasFilters && (
          <button
            onClick={onReset}
            className="flex items-center space-x-1 text-xs text-stone-500 hover:text-brand-600 transition-colors font-medium"
            type="button"
          >
            <RotateCcw size={12} />
            <span>Reset All</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Category Select */}
        <div>
          <label htmlFor="category-filter" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            Category
          </label>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(Number(e.target.value))}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-stone-700 font-sans"
          >
            <option value={0}>All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Language Select */}
        <div>
          <label htmlFor="language-filter" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            Language
          </label>
          <select
            id="language-filter"
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(Number(e.target.value))}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-stone-700 font-sans"
          >
            <option value={0}>All Languages</option>
            {languages.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Age Group Buttons */}
        <div>
          <span className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            Age Group
          </span>
          <div className="flex flex-wrap gap-1.5">
            {AGE_GROUPS.map((group) => (
              <button
                key={group}
                onClick={() => onAgeGroupChange(group)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold tracking-wide uppercase transition-all duration-200 ${
                  selectedAgeGroup === group
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/50'
                }`}
                type="button"
              >
                {group}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Select */}
        <div>
          <label htmlFor="sort-filter" className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            Sort By
          </label>
          <select
            id="sort-filter"
            value={selectedSort}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-stone-700 font-sans"
          >
            <option value="title">Alphabetical (A-Z)</option>
            <option value="newest">Recently Added</option>
          </select>
        </div>
      </div>
    </div>
  );
};
export default FilterPanel;
