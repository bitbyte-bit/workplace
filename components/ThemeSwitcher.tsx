import React, { useState } from 'react';
import { useTheme, Theme } from '../contexts/ThemeContext';

const themeOptions: { id: Theme; name: string; color: string }[] = [
  { id: 'light', name: 'Light', color: 'bg-white border-slate-300' },
  { id: 'dark', name: 'Dark', color: 'bg-slate-900 border-slate-700' },
  { id: 'blue', name: 'Ocean', color: 'bg-sky-600 border-sky-400' },
  { id: 'green', name: 'Nature', color: 'bg-green-600 border-green-400' },
  { id: 'purple', name: 'Royal', color: 'bg-purple-600 border-purple-400' },
  { id: 'warm', name: 'Warm', color: 'bg-amber-600 border-amber-400' },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const currentTheme = themeOptions.find(t => t.id === theme);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-surface-border)] hover:opacity-80 transition-all"
        title="Change theme"
      >
        <span className={`w-5 h-5 rounded-full ${currentTheme?.color}`}></span>
        <span className="text-sm font-medium text-[var(--color-text)]">{currentTheme?.name}</span>
        <svg
          className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full right-0 mt-2 p-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl shadow-xl z-50 min-w-[140px]">
            <div className="space-y-1">
              {themeOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setTheme(option.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    theme === option.id
                      ? 'bg-[var(--color-primary-light)]/20 text-[var(--color-primary)]'
                      : 'hover:bg-[var(--color-background-alt)] text-[var(--color-text)]'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full ${option.color} border`}></span>
                  <span className="text-sm font-medium">{option.name}</span>
                  {theme === option.id && (
                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
