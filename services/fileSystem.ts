// File System Access API service for automatic device storage sync
// Note: File System Access API is only supported in Chrome/Edge browsers

// Extend Window interface for TypeScript
declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: 'read' | 'readwrite';
      startIn?: 'desktop' | 'documents' | 'downloads' | 'filesystem' | 'recent' | 'music' | 'pictures' | 'videos';
    }) => Promise<FileSystemDirectoryHandle>;
  }
}

interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

interface FileSystemGetFileOptions {
  create?: boolean;
}

interface FileSystemGetDirectoryOptions {
  create?: boolean;
}

interface FileSystemRemoveOptions {
  recursive?: boolean;
}

interface FileSystemHandle {
  readonly kind: 'file' | 'directory';
  readonly name: string;
  isSameEntry(other: FileSystemHandle): Promise<boolean>;
}

interface FileSystemFileHandle extends FileSystemHandle {
  readonly kind: 'file';
  createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>;
  getFile(): Promise<File>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  readonly kind: 'directory';
  entries(): AsyncIterable<[string, FileSystemHandle]>;
  getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions): Promise<FileSystemDirectoryHandle>;
  getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<FileSystemFileHandle>;
  removeEntry(name: string, options?: FileSystemRemoveOptions): Promise<void>;
  values(): AsyncIterable<FileSystemHandle>;
  keys(): AsyncIterable<string>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string): void | PromiseLike<void>;
  close(): Promise<void>;
}

let zionRecordsDir: FileSystemDirectoryHandle | null = null;
let permissionGranted = false;

// Check if File System Access API is supported
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

// Request storage permission and open directory
export async function requestStorageAccess(): Promise<boolean> {
  if (!isFileSystemAccessSupported()) {
    console.log('File System Access API not supported, using fallback sync');
    return false;
  }

  try {
    // Request directory access
    zionRecordsDir = await window.showDirectoryPicker!({
      id: 'zion-records-dir',
      mode: 'readwrite',
      startIn: 'documents'
    });

    permissionGranted = true;
    console.log('✅ Storage access granted for:', zionRecordsDir?.name || 'Zion Records');
    return true;
  } catch (error) {
    console.error('❌ Failed to get storage access:', error);
    return false;
  }
}

// Check if we have permission
export function hasStoragePermission(): boolean {
  return permissionGranted && zionRecordsDir !== null;
}

// Get the directory handle
export function getZionRecordsDir(): FileSystemDirectoryHandle | null {
  return zionRecordsDir;
}

// Save data to the device
export async function saveToDevice(filename: string, data: string | Blob): Promise<boolean> {
  if (!zionRecordsDir || !permissionGranted) {
    console.warn('No storage access, cannot save to device');
    return false;
  }

  try {
    const fileHandle = await zionRecordsDir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable({ keepExistingData: true });
    
    if (typeof data === 'string') {
      await writable.write(data);
    } else {
      await writable.write(data);
    }
    
    await writable.close();
    console.log(`✅ Saved ${filename} to device`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to save ${filename}:`, error);
    return false;
  }
}

// Load data from the device
export async function loadFromDevice(filename: string): Promise<string | null> {
  if (!zionRecordsDir || !permissionGranted) {
    return null;
  }

  try {
    const fileHandle = await zionRecordsDir.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (error) {
    console.log(`File ${filename} not found on device`);
    return null;
  }
}

// List files in the directory
export async function listDeviceFiles(): Promise<string[]> {
  if (!zionRecordsDir || !permissionGranted) {
    return [];
  }

  try {
    const files: string[] = [];
    for await (const entry of zionRecordsDir.values()) {
      files.push(entry.name);
    }
    return files;
  } catch (error) {
    console.error('Failed to list files:', error);
    return [];
  }
}

// Check if device sync is enabled
export function isDeviceSyncEnabled(): boolean {
  return permissionGranted && zionRecordsDir !== null;
}

// Export data to device as JSON
export async function exportToDevice(data: Record<string, unknown>, filename: string): Promise<boolean> {
  const jsonData = JSON.stringify(data, null, 2);
  return saveToDevice(filename, jsonData);
}

// Create a backup of all data
export async function createDeviceBackup(data: {
  sales: unknown[];
  stock: unknown[];
  debts: unknown[];
  expenses: unknown[];
}): Promise<boolean> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Save individual files
  await saveToDevice('sales.json', JSON.stringify(data.sales, null, 2));
  await saveToDevice('stock.json', JSON.stringify(data.stock, null, 2));
  await saveToDevice('debts.json', JSON.stringify(data.debts, null, 2));
  await saveToDevice('expenses.json', JSON.stringify(data.expenses, null, 2));
  
  // Save complete backup
  const backupData = {
    ...data,
    exportedAt: new Date().toISOString(),
    appVersion: '1.0.0'
  };
  
  return await exportToDevice(backupData, `zion_backup_${timestamp}.json`);
}

// Initialize storage on app load
export async function initializeStorage(): Promise<{
  supported: boolean;
  accessGranted: boolean;
  syncEnabled: boolean;
}> {
  const supported = isFileSystemAccessSupported();
  
  if (!supported) {
    return { supported: false, accessGranted: false, syncEnabled: false };
  }

  return {
    supported,
    accessGranted: permissionGranted,
    syncEnabled: isDeviceSyncEnabled()
  };
}

// Sync callback type for automatic sync
export type SyncCallback = (data: {
  sales: unknown[];
  stock: unknown[];
  debts: unknown[];
  expenses: unknown[];
}) => void;

let syncCallback: SyncCallback | null = null;

// Register automatic sync callback
export function onDataChange(callback: SyncCallback): void {
  syncCallback = callback;
}

// Trigger automatic sync to device
export async function triggerAutoSync(data: {
  sales: unknown[];
  stock: unknown[];
  debts: unknown[];
  expenses: unknown[];
}): Promise<boolean> {
  if (!isDeviceSyncEnabled()) {
    return false;
  }
  
  if (syncCallback) {
    syncCallback(data);
  }
  
  return await createDeviceBackup(data);
}
