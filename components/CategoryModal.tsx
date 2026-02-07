import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: string, oldCategory?: string) => void;
  onDelete: (category: string) => void;
  title: string;
  existingCategories: string[];
  initialCategory?: string;
  mode: 'add' | 'edit';
}

export default function CategoryModal({ isOpen, onClose, onSave, onDelete, title, existingCategories, initialCategory, mode }: CategoryModalProps) {
  const { colors } = useTheme();
  const [category, setCategory] = useState(initialCategory || '');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory || '');
      setError('');
    }
  }, [isOpen, initialCategory]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!category.trim()) {
      setError('Category name is required');
      return;
    }
    if (existingCategories.some(c => c.toLowerCase() === category.toLowerCase() && c !== initialCategory)) {
      setError('Category already exists');
      return;
    }
    onSave(category.trim(), initialCategory);
    onClose();
  };

  const handleDelete = () => {
    if (category) {
      onDelete(category);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div 
        className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        style={{ backgroundColor: colors.surface }}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: colors.surfaceBorder }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-xl"
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={colors.primary}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-black" style={{ color: colors.text }}>{title}</h2>
              <p className="text-xs" style={{ color: colors.textMuted }}>
                {mode === 'edit' ? 'Edit or delete category' : 'Add new category'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:opacity-70 transition-opacity rounded-lg"
            style={{ color: colors.textMuted }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest mb-2 block" style={{ color: colors.textMuted }}>
                Category Name
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setError('');
                }}
                placeholder="Enter category name"
                className="w-full p-4 rounded-xl text-center font-bold"
                style={{ 
                  backgroundColor: colors.backgroundAlt,
                  border: `2px solid ${error ? '#ef4444' : colors.surfaceBorder}`,
                  color: colors.text,
                }}
                autoFocus
              />
              {error && (
                <p className="text-center text-red-500 text-xs mt-2">{error}</p>
              )}
            </div>

            {mode === 'edit' && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 rounded-xl font-bold uppercase text-sm tracking-wide"
                  style={{ 
                    backgroundColor: colors.primary,
                    color: colors.textInverse,
                  }}
                >
                  Save Changes
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl font-bold uppercase text-sm tracking-wide"
                  style={{ 
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                  }}
                >
                  Delete
                </button>
              </div>
            )}

            {mode === 'add' && (
              <button
                onClick={handleSave}
                className="w-full py-3 rounded-xl font-bold uppercase text-sm tracking-wide"
                style={{ 
                  backgroundColor: colors.primary,
                  color: colors.textInverse,
                }}
              >
                Add Category
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-bold uppercase text-sm tracking-wide"
              style={{ 
                backgroundColor: colors.backgroundAlt,
                color: colors.text,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
