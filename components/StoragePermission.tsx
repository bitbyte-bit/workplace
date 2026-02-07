import React, { useEffect, useState } from 'react';
import { requestStorageAccess, isFileSystemAccessSupported, isDeviceSyncEnabled } from '../services/fileSystem';

interface StoragePermissionProps {
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

export default function StoragePermission({ onPermissionGranted, onPermissionDenied }: StoragePermissionProps) {
  const [checking, setChecking] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if already granted
    if (isDeviceSyncEnabled()) {
      onPermissionGranted();
      return;
    }

    // Check if supported
    if (!isFileSystemAccessSupported()) {
      // File System Access not supported (likely Firefox/Safari)
      // Fall back to server-side sync only
      onPermissionDenied();
      return;
    }

    // Show prompt after a short delay
    const timer = setTimeout(() => {
      setChecking(false);
      setShowPrompt(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [onPermissionGranted, onPermissionDenied]);

  const handleRequestAccess = async () => {
    setError('');
    setChecking(true);
    
    const granted = await requestStorageAccess();
    
    if (granted) {
      onPermissionGranted();
    } else {
      setChecking(false);
      setError('Storage access was denied. Your data will sync to the server only.');
    }
  };

  const handleSkip = () => {
    onPermissionDenied();
  };

  if (checking) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Checking Storage...</h2>
          <p className="text-white/70">Please wait while we set up automatic sync</p>
        </div>
      </div>
    );
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </div>

        <h2 className="text-2xl font-black text-slate-800 mb-2">Auto-Sync to Device</h2>
        <p className="text-slate-500 text-sm mb-6">
          Zion Pro can automatically save your business records to a folder on your device. This ensures your data is always backed up locally.
        </p>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold mb-4">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleRequestAccess}
            className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-200 uppercase tracking-widest hover:bg-blue-700 hover:scale-[1.02] transition-all"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8v8a2 2 0 002 2h8a2 2 0 002-2V8M12 4v4m0 4h.01M8 8h.01M16 8h.01M7 12h2m4 0h2" />
              </svg>
              Save to Device
            </span>
          </button>
          
          <button
            onClick={handleSkip}
            className="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-2xl hover:bg-slate-200 transition-all"
          >
            Skip for Now
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-6">
          Your data will sync to the server regardless of this setting.
        </p>
      </div>
    </div>
  );
}
