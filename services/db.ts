
import { Sale, StockItem, Debt, Expense } from '../types';

let db: any = null;
let initPromise: Promise<any> | null = null;
const DB_KEY = 'zion_sqlite_db';
const WASM_VERSION = '1.12.0';

export async function initDB() {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const wasmUrl = `https://cdnjs.cloudflare.com/ajax/libs/sql.js/${WASM_VERSION}/sql-wasm.wasm`;
      const wasmResponse = await fetch(wasmUrl);
      if (!wasmResponse.ok) throw new Error(`Failed to fetch WASM binary`);
      const wasmBinary = new Uint8Array(await wasmResponse.arrayBuffer());

      const loader = (window as any).initSqlJs;
      if (!loader) throw new Error("SQL.js loader not found on window.");

      const globalObj = window as any;
      const originalProcess = globalObj.process;
      
      let SQL;
      try {
        globalObj.process = undefined; 
        SQL = await loader({ wasmBinary: wasmBinary, ENVIRONMENT: 'WEB' });
      } finally {
        globalObj.process = originalProcess;
      }

      const savedData = localStorage.getItem(DB_KEY);
      if (savedData) {
        try {
          const u8 = new Uint8Array(JSON.parse(savedData));
          db = new SQL.Database(u8);
        } catch (e) {
          db = new SQL.Database();
          createSchema(db);
        }
      } else {
        db = new SQL.Database();
        createSchema(db);
      }
      return db;
    } catch (error) {
      initPromise = null;
      throw error;
    }
  })();
  return initPromise;
}

function createSchema(database: any) {
  database.run(`
    CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, itemName TEXT, category TEXT, quantity REAL, price REAL, cost REAL, date INTEGER);
    CREATE TABLE IF NOT EXISTS stock (id TEXT PRIMARY KEY, name TEXT, quantity REAL, costPrice REAL, sellingPrice REAL, lastUpdated INTEGER, lowStockThreshold INTEGER, imageUrl TEXT, costHistory TEXT);
    CREATE TABLE IF NOT EXISTS debts (id TEXT PRIMARY KEY, debtorName TEXT, phoneNumber TEXT, amount REAL, description TEXT, isPaid INTEGER, date INTEGER);
    CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, category TEXT, amount REAL, description TEXT, date INTEGER, frequency TEXT);
  `);
  
  try {
    database.run("ALTER TABLE stock ADD COLUMN imageUrl TEXT");
    database.run("ALTER TABLE stock ADD COLUMN costHistory TEXT");
  } catch(e) {}

  saveToLocalStorage();
}

export function resetDatabase() {
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem('zion_sale_cats');
  localStorage.removeItem('zion_expense_cats');
  localStorage.removeItem('zion_manager_pass');
  window.location.reload();
}

function saveToLocalStorage() {
  if (db) {
    try {
      const data = db.export();
      localStorage.setItem(DB_KEY, JSON.stringify(Array.from(data)));
    } catch (e) {
      console.error("Zion: Persistence Sync Failed:", e);
    }
  }
}

export async function saveSale(sale: Sale) {
  const database = await initDB();
  database.run("INSERT INTO sales VALUES (?, ?, ?, ?, ?, ?, ?)", [sale.id, sale.itemName, sale.category, sale.quantity, sale.price, sale.cost, sale.date]);
  saveToLocalStorage();
}

export async function deleteSale(id: string) {
  const database = await initDB();
  database.run("DELETE FROM sales WHERE id = ?", [id]);
  saveToLocalStorage();
}

export async function saveStock(item: StockItem) {
  const database = await initDB();
  database.run("INSERT OR REPLACE INTO stock VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
    item.id, 
    item.name, 
    item.quantity, 
    item.costPrice, 
    item.sellingPrice, 
    item.lastUpdated, 
    item.lowStockThreshold,
    item.imageUrl || null,
    JSON.stringify(item.costHistory || [])
  ]);
  saveToLocalStorage();
}

export async function deleteStock(id: string) {
  const database = await initDB();
  database.run("DELETE FROM stock WHERE id = ?", [id]);
  saveToLocalStorage();
}

export async function updateStockItem(item: StockItem) {
  const database = await initDB();
  database.run("UPDATE stock SET name=?, quantity=?, costPrice=?, sellingPrice=?, lastUpdated=?, lowStockThreshold=?, imageUrl=?, costHistory=? WHERE id=?", [
    item.name, 
    item.quantity, 
    item.costPrice, 
    item.sellingPrice, 
    Date.now(), 
    item.lowStockThreshold,
    item.imageUrl || null,
    JSON.stringify(item.costHistory || []),
    item.id
  ]);
  saveToLocalStorage();
}

export async function updateStockQuantity(name: string, quantityChange: number) {
  const database = await initDB();
  database.run("UPDATE stock SET quantity = quantity + ?, lastUpdated = ? WHERE LOWER(name) = LOWER(?)", [quantityChange, Date.now(), name]);
  saveToLocalStorage();
}

export async function saveDebt(debt: Debt) {
  const database = await initDB();
  database.run("INSERT INTO debts VALUES (?, ?, ?, ?, ?, ?, ?)", [debt.id, debt.debtorName, debt.phoneNumber, debt.amount, debt.description, debt.isPaid ? 1 : 0, debt.date]);
  saveToLocalStorage();
}

export async function deleteDebt(id: string) {
  const database = await initDB();
  database.run("DELETE FROM debts WHERE id = ?", [id]);
  saveToLocalStorage();
}

export async function updateDebtItem(debt: Debt) {
  const database = await initDB();
  database.run("UPDATE debts SET debtorName=?, phoneNumber=?, amount=?, description=?, isPaid=? WHERE id=?", [
    debt.debtorName, debt.phoneNumber, debt.amount, debt.description, debt.isPaid ? 1 : 0, debt.id
  ]);
  saveToLocalStorage();
}

export async function toggleDebtStatus(id: string) {
  const database = await initDB();
  database.run("UPDATE debts SET isPaid = 1 - isPaid WHERE id = ?", [id]);
  saveToLocalStorage();
}

export async function saveExpense(expense: Expense) {
  const database = await initDB();
  database.run("INSERT INTO expenses VALUES (?, ?, ?, ?, ?, ?)", [expense.id, expense.category, expense.amount, expense.description, expense.date, expense.frequency]);
  saveToLocalStorage();
}

export async function deleteExpense(id: string) {
  const database = await initDB();
  database.run("DELETE FROM expenses WHERE id = ?", [id]);
  saveToLocalStorage();
}

export async function fetchAllSales(): Promise<Sale[]> {
  const database = await initDB();
  const res = database.exec("SELECT id, itemName, category, quantity, price, cost, date FROM sales");
  if (!res.length) return [];
  return res[0].values.map(v => ({ id: v[0], itemName: v[1], category: v[2], quantity: v[3], price: v[4], cost: v[5], date: v[6] } as Sale));
}

export async function fetchAllStock(): Promise<StockItem[]> {
  const database = await initDB();
  const res = database.exec("SELECT id, name, quantity, costPrice, sellingPrice, lastUpdated, lowStockThreshold, imageUrl, costHistory FROM stock");
  if (!res.length) return [];
  return res[0].values.map(v => ({ 
    id: v[0], 
    name: v[1], 
    quantity: v[2], 
    costPrice: v[3], 
    sellingPrice: v[4], 
    lastUpdated: v[5], 
    lowStockThreshold: v[6],
    imageUrl: v[7],
    costHistory: v[8] ? JSON.parse(v[8] as string) : []
  } as StockItem));
}

export async function fetchAllDebts(): Promise<Debt[]> {
  const database = await initDB();
  const res = database.exec("SELECT id, debtorName, phoneNumber, amount, description, isPaid, date FROM debts");
  if (!res.length) return [];
  return res[0].values.map(v => ({ id: v[0], debtorName: v[1], phoneNumber: v[2], amount: v[3], description: v[4], isPaid: v[5] === 1, date: v[6] } as Debt));
}

export async function fetchAllExpenses(): Promise<Expense[]> {
  const database = await initDB();
  const res = database.exec("SELECT id, category, amount, description, date, frequency FROM expenses");
  if (!res.length) return [];
  return res[0].values.map(v => ({ id: v[0], category: v[1], amount: v[2], description: v[3], date: v[4], frequency: v[5] } as Expense));
}
