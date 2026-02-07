import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  title: string;
  message: string;
  confirmText?: string;
}

export default function PasswordModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm' }: PasswordModalProps) {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(password);
  };

  const handleConfirm = () => {
    onConfirm(password);
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-black" style={{ color: colors.text }}>{title}</h2>
              <p className="text-xs" style={{ color: colors.textMuted }}>{message}</p>
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
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="Enter manager PIN"
              className="w-full p-4 rounded-xl text-center text-lg font-black tracking-widest"
              style={{ 
                backgroundColor: colors.backgroundAlt,
                border: `2px solid ${error ? '#ef4444' : colors.surfaceBorder}`,
                color: colors.text,
              }}
              autoFocus
            />
            {error && (
              <p className="text-center text-red-500 text-sm mt-2">Incorrect PIN. Please try again.</p>
            )}
            
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl font-bold uppercase text-sm tracking-wide"
                style={{ 
                  backgroundColor: colors.backgroundAlt,
                  color: colors.text,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl font-bold uppercase text-sm tracking-wide"
                style={{ 
                  backgroundColor: colors.primary,
                  color: colors.textInverse,
                }}
              >
                {confirmText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
