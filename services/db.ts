import { Sale, StockItem, Debt, Expense } from '../types';

// Record folder structure
export const RECORD_FOLDERS = {
  SALES: 'zion records/sales',
  STOCK: 'zion records/stock',
  DEBTS: 'zion records/debts',
  EXPENSES: 'zion records/expenses',
} as const;

// IndexedDB setup
const DB_NAME = 'ZionBusinessDB';
const DB_VERSION = 1;

interface DBStores {
  sales: Sale;
  stock: StockItem;
  debts: Debt;
  expenses: Expense;
}

let db: IDBDatabase | null = null;

export async function initDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB connected successfully');
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create stores for each record type
      if (!database.objectStoreNames.contains('sales')) {
        const salesStore = database.createObjectStore('sales', { keyPath: 'id' });
        salesStore.createIndex('itemName', 'itemName', { unique: false });
        salesStore.createIndex('date', 'date', { unique: false });
      }

      if (!database.objectStoreNames.contains('stock')) {
        const stockStore = database.createObjectStore('stock', { keyPath: 'id' });
        stockStore.createIndex('name', 'name', { unique: false });
        stockStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }

      if (!database.objectStoreNames.contains('debts')) {
        const debtsStore = database.createObjectStore('debts', { keyPath: 'id' });
        debtsStore.createIndex('debtorName', 'debtorName', { unique: false });
        debtsStore.createIndex('date', 'date', { unique: false });
        debtsStore.createIndex('isPaid', 'isPaid', { unique: false });
      }

      if (!database.objectStoreNames.contains('expenses')) {
        const expensesStore = database.createObjectStore('expenses', { keyPath: 'id' });
        expensesStore.createIndex('category', 'category', { unique: false });
        expensesStore.createIndex('date', 'date', { unique: false });
      }
    };
  });
}

function getDB(): IDBDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}

async function getAllFromStore<T>(storeName: keyof DBStores): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putToStore<T>(storeName: keyof DBStores, data: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function deleteFromStore(storeName: keyof DBStores, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const database = getDB();
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Sales functions
export async function saveSale(sale: Sale): Promise<void> {
  await putToStore('sales', sale);
}

export async function deleteSale(id: string): Promise<void> {
  await deleteFromStore('sales', id);
}

export async function fetchAllSales(): Promise<Sale[]> {
  return getAllFromStore<Sale>('sales');
}

// Stock functions
export async function saveStock(item: StockItem): Promise<void> {
  await putToStore('stock', item);
}

export async function deleteStock(id: string): Promise<void> {
  await deleteFromStore('stock', id);
}

export async function updateStockItem(item: StockItem): Promise<void> {
  await putToStore('stock', item);
}

export async function updateStockQuantity(name: string, quantityChange: number): Promise<void> {
  const stock = await fetchAllStock();
  const item = stock.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (item) {
    await updateStockItem({
      ...item,
      quantity: item.quantity + quantityChange,
      lastUpdated: Date.now(),
    });
  }
}

export async function fetchAllStock(): Promise<StockItem[]> {
  return getAllFromStore<StockItem>('stock');
}

// Debt functions
export async function saveDebt(debt: Debt): Promise<void> {
  await putToStore('debts', debt);
}

export async function deleteDebt(id: string): Promise<void> {
  await deleteFromStore('debts', id);
}

export async function updateDebtItem(debt: Debt): Promise<void> {
  await putToStore('debts', debt);
}

export async function toggleDebtStatus(id: string): Promise<void> {
  const debts = await fetchAllDebts();
  const debt = debts.find(d => d.id === id);
  if (debt) {
    await updateDebtItem({
      ...debt,
      isPaid: !debt.isPaid,
    });
  }
}

export async function fetchAllDebts(): Promise<Debt[]> {
  return getAllFromStore<Debt>('debts');
}

// Expense functions
export async function saveExpense(expense: Expense): Promise<void> {
  await putToStore('expenses', expense);
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteFromStore('expenses', id);
}

export async function fetchAllExpenses(): Promise<Expense[]> {
  return getAllFromStore<Expense>('expenses');
}

// Summary function
export async function fetchSummary() {
  const sales = await fetchAllSales();
  const stock = await fetchAllStock();
  const debts = await fetchAllDebts();
  const expenses = await fetchAllExpenses();

  const salesTotal = sales.reduce((acc, s) => acc + (s.price * s.quantity), 0);
  const totalStockValue = stock.reduce((acc, item) => acc + (item.quantity * item.costPrice), 0);
  const unpaidDebts = debts.filter(d => !d.isPaid).reduce((acc, d) => acc + d.amount, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const lowStockItems = stock.filter(item => item.quantity <= (item.lowStockThreshold || 5)).length;

  return {
    salesTotal,
    stockCount: stock.length,
    totalStockValue,
    unpaidDebts,
    totalExpenses,
    lowStockItems
  };
}

// Export all data as JSON files
export async function exportAllData(): Promise<void> {
  const sales = await fetchAllSales();
  const stock = await fetchAllStock();
  const debts = await fetchAllDebts();
  const expenses = await fetchAllExpenses();

  const data = {
    sales,
    stock,
    debts,
    expenses,
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zion_records_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import data from JSON file
export async function importData(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (data.sales && Array.isArray(data.sales)) {
          for (const sale of data.sales) {
            await saveSale(sale);
          }
        }
        if (data.stock && Array.isArray(data.stock)) {
          for (const item of data.stock) {
            await saveStock(item);
          }
        }
        if (data.debts && Array.isArray(data.debts)) {
          for (const debt of data.debts) {
            await saveDebt(debt);
          }
        }
        if (data.expenses && Array.isArray(data.expenses)) {
          for (const expense of data.expenses) {
            await saveExpense(expense);
          }
        }
        
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// Reset function
export function resetDatabase(): void {
  const databases = indexedDB.databases();
  databases.then(dbs => {
    dbs?.forEach(dbInfo => {
      if (dbInfo.name) {
        indexedDB.deleteDatabase(dbInfo.name);
      }
    });
    localStorage.clear();
    window.location.reload();
  });
}

// Initialize - setup IndexedDB
export async function initLocalDB(): Promise<void> {
  try {
    await initDB();
    console.log('Local database initialized');
  } catch (error) {
    console.error('Failed to initialize local database:', error);
    throw error;
  }
}
