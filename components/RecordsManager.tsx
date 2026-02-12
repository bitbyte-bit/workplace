import React, { useState } from 'react';
import { FolderIcon, FileIcon, DownloadIcon, UploadIcon, TrashIcon, RefreshIcon } from './Icons';
import { exportAllData, importData, forceSync } from '../services/db';
import { useTheme } from '../contexts/ThemeContext';
import { Sale, StockItem, Debt, Expense } from '../types';
import { BusinessData } from '../types';

interface RecordsManagerProps {
  onClose: () => void;
  data: BusinessData;
  customCategories: string[];
  managerPassword: string;
  onChangePassword: (newPass: string) => void;
  onCurrencyChange: (newCurrency: string) => void;
  onReminderChange: (time: string) => void;
  currency: string;
  userId: string;
  userRole: string;
  adminId: string | null;
  onAdminLogin: (email: string, password: string) => Promise<void>;
}

export default function RecordsManager({ onClose, data, customCategories, managerPassword, onChangePassword, onCurrencyChange, onReminderChange, currency, userId, userRole, adminId, onAdminLogin }: RecordsManagerProps) {
  const { colors } = useTheme();
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const folders = [
    { name: 'sales', path: 'zion records/sales', description: 'Sales transactions', count: 0 },
    { name: 'stock', path: 'zion records/stock', description: 'Inventory items', count: 0 },
    { name: 'debts', path: 'zion records/debts', description: 'Customer debts', count: 0 },
    { name: 'expenses', path: 'zion records/expenses', description: 'Business expenses', count: 0 },
  ];

  const handleExport = async () => {
    try {
      await exportAllData();
      setMessage({ text: 'Records exported to device!', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ text: 'Failed to export records', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      await importData(file);
      setMessage({ text: 'Records imported successfully!', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
      window.location.reload();
    } catch (error) {
      setMessage({ text: 'Failed to import records', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setImporting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await forceSync();
      setMessage({ text: 'Data synced to SQLite & device!', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ text: 'Sync failed', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--color-background)]/90 backdrop-blur-md" onClick={onClose}></div>
      
      <div 
        className="relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)' }}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--color-surface-border)' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-xl"
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <FolderIcon className="w-5 h-5" style={{ color: colors.primary }} />
            </div>
            <div>
              <h2 className="text-lg font-black" style={{ color: colors.text }}>Zion Records</h2>
              <p className="text-xs" style={{ color: colors.textMuted }}>SQLite + File Backup</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:opacity-70 transition-opacity rounded-lg"
            style={{ color: colors.textMuted }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {message && (
            <div 
              className={`px-4 py-3 rounded-xl text-sm font-medium ${
                message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Virtual Folder Structure */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: colors.textMuted }}>
              Data Folders
            </h3>
            {folders.map((folder) => (
              <div 
                key={folder.path}
                className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-md"
                style={{ 
                  backgroundColor: 'var(--color-background-alt)',
                  borderColor: 'var(--color-surface-border)'
                }}
              >
                <FolderIcon className="w-5 h-5" style={{ color: colors.primary }} />
                <div className="flex-1">
                  <p className="font-medium text-sm" style={{ color: colors.text }}>{folder.path}</p>
                  <p className="text-xs" style={{ color: colors.textMuted }}>{folder.description}</p>
                </div>
                <FileIcon className="w-4 h-4" style={{ color: colors.textMuted }} />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: colors.primary, color: colors.textInverse }}
            >
              <DownloadIcon className="w-4 h-4" />
              Export JSON
            </button>
            
            <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{ backgroundColor: colors.backgroundAlt, color: colors.text }}
            >
              <UploadIcon className="w-4 h-4" />
              {importing ? 'Importing...' : 'Import'}
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                disabled={importing}
              />
            </label>
          </div>

          {/* Sync */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}
          >
            <RefreshIcon className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>

          {/* Info */}
          <div 
            className="mt-4 p-3 rounded-xl text-xs"
            style={{ backgroundColor: colors.backgroundAlt, color: colors.textMuted }}
          >
            <p className="flex items-center gap-2">
              <FolderIcon className="w-4 h-4" />
              Data saved to SQLite database & "zion records" folder
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
