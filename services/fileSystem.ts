// File System Access API service for automatic device storage sync
// Note: File System Access API is only supported in Chrome/Edge browsers

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
let firstSyncComplete = false;

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

export async function requestStorageAccess(): Promise<boolean> {
  if (!isFileSystemAccessSupported()) {
    console.log('File System Access API not supported, using fallback sync');
    return false;
  }

  try {
    zionRecordsDir = await window.showDirectoryPicker!({
      id: 'zion-records-dir',
      mode: 'readwrite',
      startIn: 'documents'
    });

    permissionGranted = true;
    console.log('Storage access granted for:', zionRecordsDir?.name || 'Zion Records');
    return true;
  } catch (error) {
    console.error('Failed to get storage access:', error);
    return false;
  }
}

export function hasStoragePermission(): boolean {
  return permissionGranted && zionRecordsDir !== null;
}

export function getZionRecordsDir(): FileSystemDirectoryHandle | null {
  return zionRecordsDir;
}

async function saveToDevice(filename: string, data: string | Blob): Promise<boolean> {
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
    return true;
  } catch (error) {
    console.error('Failed to save ' + filename + ':', error);
    return false;
  }
}

export async function loadFromDevice(filename: string): Promise<string | null> {
  if (!zionRecordsDir || !permissionGranted) {
    return null;
  }

  try {
    const fileHandle = await zionRecordsDir.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (error) {
    return null;
  }
}

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

export function isDeviceSyncEnabled(): boolean {
  return permissionGranted && zionRecordsDir !== null;
}

function generateHTMLReport(data: {
  sales: unknown[];
  stock: unknown[];
  debts: unknown[];
  expenses: unknown[];
  businessName?: string;
  exportedAt?: string;
}): string {
  const salesTotal = data.sales.reduce((acc: number, s: any) => acc + (Number(s.price) * Number(s.quantity)), 0);
  const totalStockValue = data.stock.reduce((acc: number, item: any) => acc + (Number(item.quantity) * Number(item.costPrice)), 0);
  const unpaidDebts = data.debts.filter((d: any) => !d.isPaid).reduce((acc: number, d: any) => acc + Number(d.amount), 0);
  const totalExpenses = data.expenses.reduce((acc: number, e: any) => acc + Number(e.amount), 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZION Pro - Business Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: white; border-radius: 20px; padding: 30px; margin-bottom: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
    .header h1 { color: #2563eb; font-size: 2.5rem; font-weight: 800; }
    .header .subtitle { color: #64748b; margin-top: 5px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .stat-card { background: white; border-radius: 15px; padding: 20px; box-shadow: 0 5px 20px rgba(0,0,0,0.08); }
    .stat-card h3 { color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
    .stat-card .value { font-size: 1.5rem; font-weight: 800; color: #1e293b; }
    .stat-card.sales .value { color: #10b981; }
    .stat-card.stock .value { color: #3b82f6; }
    .stat-card.debts .value { color: #f59e0b; }
    .stat-card.expenses .value { color: #ef4444; }
    .section { background: white; border-radius: 20px; padding: 25px; margin-bottom: 20px; box-shadow: 0 5px 20px rgba(0,0,0,0.08); }
    .section h2 { color: #1e293b; font-size: 1.25rem; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #f1f5f9; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #f1f5f9; }
    th { color: #64748b; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; }
    td { color: #334155; }
    .empty { text-align: center; padding: 40px; color: #94a3b8; }
    .footer { text-align: center; color: white; padding: 20px; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ZION Pro</h1>
      <p class="subtitle">${data.businessName || 'Business Report'} - Updated: ${data.exportedAt || new Date().toLocaleString()}</p>
    </div>
    
    <div class="stats">
      <div class="stat-card sales">
        <h3>Total Sales</h3>
        <div class="value">$${salesTotal.toLocaleString()}</div>
      </div>
      <div class="stat-card stock">
        <h3>Stock Value</h3>
        <div class="value">$${totalStockValue.toLocaleString()}</div>
      </div>
      <div class="stat-card debts">
        <h3>Unpaid Debts</h3>
        <div class="value">$${unpaidDebts.toLocaleString()}</div>
      </div>
      <div class="stat-card expenses">
        <h3>Total Expenses</h3>
        <div class="value">$${totalExpenses.toLocaleString()}</div>
      </div>
    </div>

    <div class="section">
      <h2>Sales (${data.sales.length} records)</h2>
      ${data.sales.length > 0 ? `
      <table>
        <thead>
          <tr><th>Date</th><th>Item</th><th>Qty</th><th>Price</th><th>Total</th><th>Category</th></tr>
        </thead>
        <tbody>
          ${data.sales.map((s: any) => `<tr>
            <td>${new Date(s.date).toLocaleDateString()}</td>
            <td>${s.itemName}</td>
            <td>${s.quantity}</td>
            <td>$${Number(s.price).toLocaleString()}</td>
            <td>$${(Number(s.price) * Number(s.quantity)).toLocaleString()}</td>
            <td>${s.category || '-'}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<div class="empty">No sales recorded</div>'}
    </div>

    <div class="section">
      <h2>Stock Inventory (${data.stock.length} items)</h2>
      ${data.stock.length > 0 ? `
      <table>
        <thead>
          <tr><th>Item</th><th>Qty</th><th>Cost</th><th>Selling</th><th>Value</th></tr>
        </thead>
        <tbody>
          ${data.stock.map((item: any) => `<tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>$${Number(item.costPrice).toLocaleString()}</td>
            <td>$${Number(item.sellingPrice).toLocaleString()}</td>
            <td>$${(Number(item.quantity) * Number(item.costPrice)).toLocaleString()}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<div class="empty">No stock items</div>'}
    </div>

    <div class="section">
      <h2>Debts (${data.debts.length} records)</h2>
      ${data.debts.length > 0 ? `
      <table>
        <thead>
          <tr><th>Date</th><th>Debtor</th><th>Amount</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${data.debts.map((d: any) => `<tr>
            <td>${new Date(d.date).toLocaleDateString()}</td>
            <td>${d.debtorName}</td>
            <td>$${Number(d.amount).toLocaleString()}</td>
            <td>${d.isPaid ? '<span style="color:#10b981">Paid</span>' : '<span style="color:#ef4444">Unpaid</span>'}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<div class="empty">No debts recorded</div>'}
    </div>

    <div class="section">
      <h2>Expenses (${data.expenses.length} records)</h2>
      ${data.expenses.length > 0 ? `
      <table>
        <thead>
          <tr><th>Date</th><th>Category</th><th>Amount</th><th>Description</th></tr>
        </thead>
        <tbody>
          ${data.expenses.map((e: any) => `<tr>
            <td>${new Date(e.date).toLocaleDateString()}</td>
            <td>${e.category}</td>
            <td style="color:#ef4444">-$${Number(e.amount).toLocaleString()}</td>
            <td>${e.description}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<div class="empty">No expenses recorded</div>'}
    </div>

    <div class="footer">
      <p>ZION Pro - Business Management System</p>
    </div>
  </div>
</body>
</html>`;
}

export async function createDeviceBackup(data: {
  sales: unknown[];
  stock: unknown[];
  debts: unknown[];
  expenses: unknown[];
  businessName?: string;
}): Promise<boolean> {
  if (!permissionGranted || !zionRecordsDir) {
    return false;
  }

  const exportedAt = new Date().toLocaleString();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Always update the main files
  await saveToDevice('sales.json', JSON.stringify(data.sales, null, 2));
  await saveToDevice('stock.json', JSON.stringify(data.stock, null, 2));
  await saveToDevice('debts.json', JSON.stringify(data.debts, null, 2));
  await saveToDevice('expenses.json', JSON.stringify(data.expenses, null, 2));
  
  // Update main HTML report (always the same filename)
  const htmlReport = generateHTMLReport({
    ...data,
    exportedAt: exportedAt
  });
  await saveToDevice('zion_report.html', htmlReport);

  // Only create timestamped backup on first sync or if explicitly requested
  if (!firstSyncComplete) {
    const backupData = {
      sales: data.sales,
      stock: data.stock,
      debts: data.debts,
      expenses: data.expenses,
      exportedAt: exportedAt,
      appVersion: '1.0.0'
    };
    await saveToDevice('zion_backup.json', JSON.stringify(backupData, null, 2));
    await saveToDevice('zion_backup_' + timestamp + '.json', JSON.stringify(backupData, null, 2));
    await saveToDevice('zion_report_initial.html', htmlReport);
    firstSyncComplete = true;
    console.log('Initial sync complete - all files created');
  } else {
    console.log('Sync updated - zion_report.html updated');
  }

  return true;
}

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

export type SyncCallback = (data: {
  sales: unknown[];
  stock: unknown[];
  debts: unknown[];
  expenses: unknown[];
}) => void;

let syncCallback: SyncCallback | null = null;

export function onDataChange(callback: SyncCallback): void {
  syncCallback = callback;
}

export async function triggerAutoSync(data: {
  sales: unknown[];
  stock: unknown[];
  debts: unknown[];
  expenses: unknown[];
  businessName?: string;
}): Promise<boolean> {
  if (!isDeviceSyncEnabled()) {
    return false;
  }
  
  if (syncCallback) {
    syncCallback(data);
  }
  
  return await createDeviceBackup(data);
}
