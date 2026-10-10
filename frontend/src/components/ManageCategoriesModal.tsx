import React, { useState } from 'react';
import type { Category } from '../types';
import api from '../services/api';
import { X, Plus, Trash2, Loader2, Tag, AlertCircle, CheckCircle2, Search } from 'lucide-react';

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCategoriesChange: () => void;
  onSelectCategory?: (categoryName: string) => void;
  selectedCategoryName?: string;
}

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoriesChange,
  onSelectCategory,
  selectedCategoryName,
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setError('Category name cannot be empty.');
      return;
    }

    // Client-side duplicate check
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`A category named "${trimmed}" already exists.`);
      return;
    }

    setAdding(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const created = await api.post<Category>('/api/admin/categories', { name: trimmed });
      setSuccessMessage(`Category "${created.name}" created successfully!`);
      setNewCategoryName('');
      onCategoriesChange();
      if (onSelectCategory) {
        onSelectCategory(created.name);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create category.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    setDeletingId(cat.id);
    setError(null);
    setSuccessMessage(null);

    try {
      await api.delete(`/api/admin/categories/${cat.id}`);
      setSuccessMessage(`Category "${cat.name}" was deleted successfully.`);
      setConfirmDeleteId(null);
      onCategoriesChange();

      // If the currently selected category was deleted, clear it in the form
      if (selectedCategoryName && selectedCategoryName.toLowerCase() === cat.name.toLowerCase() && onSelectCategory) {
        onSelectCategory('');
      }
    } catch (err: any) {
      setError(err.message || `Failed to delete category "${cat.name}".`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchFilter.toLowerCase().trim())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-stone-200/80 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-brand-100 text-brand-700 rounded-xl">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900 leading-tight">
                Manage Categories
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Add new categories or remove existing ones from the catalog
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-grow">
          {/* Notifications */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-700 animate-fadeIn">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="flex-grow">
                <span className="font-medium">{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-start space-x-2 text-xs text-green-800 animate-fadeIn">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-green-600" />
              <div className="flex-grow">
                <span className="font-medium">{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-green-400 hover:text-green-600"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Add Category Form */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/70 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Add New Category
            </h3>
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Graphic Novels, Sci-Fi..."
                className="flex-grow px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-stone-800 placeholder-stone-400 font-sans"
                disabled={adding}
              />
              <button
                type="submit"
                disabled={adding || !newCategoryName.trim()}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1.5 shrink-0"
              >
                {adding ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>Add</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Existing Categories List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center space-x-1.5">
                <span>Existing Categories</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-stone-200 text-stone-700 rounded-full">
                  {categories.length}
                </span>
              </h3>
            </div>

            {/* Filter categories */}
            {categories.length > 5 && (
              <div className="relative">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter categories..."
                  className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-stone-800"
                />
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              </div>
            )}

            {/* Categories container */}
            <div className="divide-y divide-stone-100 border border-stone-200/70 rounded-xl overflow-hidden bg-white max-h-60 overflow-y-auto">
              {filteredCategories.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-400">
                  {searchFilter ? 'No categories match your search.' : 'No categories found. Create one above!'}
                </div>
              ) : (
                filteredCategories.map((cat) => {
                  const isSelected =
                    selectedCategoryName &&
                    selectedCategoryName.toLowerCase() === cat.name.toLowerCase();
                  const isConfirming = confirmDeleteId === cat.id;
                  const isDeleting = deletingId === cat.id;

                  return (
                    <div
                      key={cat.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-stone-50/60 transition-colors"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Tag size={14} className="text-brand-500 shrink-0" />
                        <span className="text-sm font-medium text-stone-800 truncate">
                          {cat.name}
                        </span>
                        {isSelected && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-brand-100 text-brand-800 rounded-md shrink-0">
                            Selected
                          </span>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center space-x-1">
                        {isConfirming ? (
                          <div className="flex items-center space-x-1 animate-fadeIn">
                            <span className="text-[11px] text-red-600 font-medium mr-1">
                              Delete?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat)}
                              disabled={isDeleting}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center space-x-1"
                            >
                              {isDeleting ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <span>Yes, Delete</span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={isDeleting}
                              className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 text-[11px] font-semibold rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setError(null);
                              setSuccessMessage(null);
                              setConfirmDeleteId(cat.id);
                            }}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={`Delete category "${cat.name}"`}
                            aria-label={`Delete category ${cat.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageCategoriesModal;
