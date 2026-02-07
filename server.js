import express from 'express';
import initSqlJs from 'sql.js';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, 'database.sqlite');
const recordsFolder = path.join(__dirname, 'zion records');

// Ensure zion records folder exists
if (!fs.existsSync(recordsFolder)) {
  fs.mkdirSync(recordsFolder, { recursive: true });
}

let db = null;

// File sync functions
function syncToDevice() {
  try {
    // Export all data
    const sales = db.exec('SELECT * FROM sales')[0]?.values || [];
    const stock = db.exec('SELECT * FROM stock')[0]?.values || [];
    const debts = db.exec('SELECT * FROM debts')[0]?.values || [];
    const expenses = db.exec('SELECT * FROM expenses')[0]?.values || [];

    // Get column names
    const salesCols = db.exec('PRAGMA table_info(sales)')[0]?.columns || [];
    const stockCols = db.exec('PRAGMA table_info(stock)')[0]?.columns || [];
    const debtsCols = db.exec('PRAGMA table_info(debts)')[0]?.columns || [];
    const expensesCols = db.exec('PRAGMA table_info(expenses)')[0]?.columns || [];

    // Helper to convert rows to objects
    const rowsToObjects = (rows, cols) => rows.map(row => {
      const obj = {};
      cols.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });

    const data = {
      sales: rowsToObjects(sales, salesCols),
      stock: rowsToObjects(stock, stockCols),
      debts: rowsToObjects(debts, debtsCols),
      expenses: rowsToObjects(expenses, expensesCols),
      savedAt: new Date().toISOString(),
    };

    // Save main backup file
    const backupPath = path.join(recordsFolder, 'zion_backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));

    // Save individual category files
    fs.writeFileSync(path.join(recordsFolder, 'sales.json'), JSON.stringify(data.sales, null, 2));
    fs.writeFileSync(path.join(recordsFolder, 'stock.json'), JSON.stringify(data.stock, null, 2));
    fs.writeFileSync(path.join(recordsFolder, 'debts.json'), JSON.stringify(data.debts, null, 2));
    fs.writeFileSync(path.join(recordsFolder, 'expenses.json'), JSON.stringify(data.expenses, null, 2));

    console.log('✅ Data synced to zion records folder');
    return true;
  } catch (error) {
    console.error('❌ Sync failed:', error);
    return false;
  }
}

async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      itemName TEXT,
      category TEXT,
      quantity REAL,
      price REAL,
      cost REAL,
      date INTEGER
    );

    CREATE TABLE IF NOT EXISTS stock (
      id TEXT PRIMARY KEY,
      name TEXT,
      quantity REAL,
      costPrice REAL,
      sellingPrice REAL,
      lastUpdated INTEGER,
      lowStockThreshold INTEGER,
      imageUrl TEXT,
      costHistory TEXT
    );

    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      debtorName TEXT,
      phoneNumber TEXT,
      amount REAL,
      description TEXT,
      isPaid INTEGER,
      date INTEGER
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      category TEXT,
      amount REAL,
      description TEXT,
      date INTEGER,
      frequency TEXT
    );
  `);
  
  saveDatabase();
  syncToDevice(); // Initial sync
  console.log('✅ Connected to SQLite database');
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// Auto-save debounce
let saveTimeout = null;
function triggerSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveDatabase();
    syncToDevice();
  }, 2000); // Auto-save 2 seconds after changes
}

// ============= API ROUTES =============

// Sales endpoints
app.get('/api/sales', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM sales ORDER BY date DESC');
    const sales = [];
    while (stmt.step()) {
      sales.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sales', (req, res) => {
  try {
    const { id, itemName, category, quantity, price, cost, date } = req.body;
    db.run('INSERT INTO sales VALUES (?, ?, ?, ?, ?, ?, ?)', [id, itemName, category, quantity, price, cost, date]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/sales/:id', (req, res) => {
  try {
    db.run('DELETE FROM sales WHERE id = ?', [req.params.id]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stock endpoints
app.get('/api/stock', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM stock');
    const stock = [];
    while (stmt.step()) {
      const item = stmt.getAsObject();
      item.costHistory = item.costHistory ? JSON.parse(item.costHistory) : [];
      stock.push(item);
    }
    stmt.free();
    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stock', (req, res) => {
  try {
    const { id, name, quantity, costPrice, sellingPrice, lastUpdated, lowStockThreshold, imageUrl, costHistory } = req.body;
    db.run('INSERT OR REPLACE INTO stock VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      id, name, quantity, costPrice, sellingPrice, lastUpdated, lowStockThreshold, imageUrl || null, JSON.stringify(costHistory || [])
    ]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/stock/:id', (req, res) => {
  try {
    const { name, quantity, costPrice, sellingPrice, lowStockThreshold, imageUrl, costHistory } = req.body;
    db.run('UPDATE stock SET name=?, quantity=?, costPrice=?, sellingPrice=?, lastUpdated=?, lowStockThreshold=?, imageUrl=?, costHistory=? WHERE id=?', [
      name, quantity, costPrice, sellingPrice, Date.now(), lowStockThreshold, imageUrl || null, JSON.stringify(costHistory || []), req.params.id
    ]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/stock/:id', (req, res) => {
  try {
    db.run('DELETE FROM stock WHERE id = ?', [req.params.id]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debts endpoints
app.get('/api/debts', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM debts ORDER BY date DESC');
    const debts = [];
    while (stmt.step()) {
      const debt = stmt.getAsObject();
      debt.isPaid = debt.isPaid === 1;
      debts.push(debt);
    }
    stmt.free();
    res.json(debts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/debts', (req, res) => {
  try {
    const { id, debtorName, phoneNumber, amount, description, isPaid, date } = req.body;
    db.run('INSERT INTO debts VALUES (?, ?, ?, ?, ?, ?, ?)', [id, debtorName, phoneNumber, amount, description, isPaid ? 1 : 0, date]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/debts/:id', (req, res) => {
  try {
    const { debtorName, phoneNumber, amount, description, isPaid } = req.body;
    db.run('UPDATE debts SET debtorName=?, phoneNumber=?, amount=?, description=?, isPaid=? WHERE id=?', [
      debtorName, phoneNumber, amount, description, isPaid ? 1 : 0, req.params.id
    ]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/debts/:id', (req, res) => {
  try {
    db.run('DELETE FROM debts WHERE id = ?', [req.params.id]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Expenses endpoints
app.get('/api/expenses', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM expenses ORDER BY date DESC');
    const expenses = [];
    while (stmt.step()) {
      expenses.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expenses', (req, res) => {
  try {
    const { id, category, amount, description, date, frequency } = req.body;
    db.run('INSERT INTO expenses VALUES (?, ?, ?, ?, ?, ?)', [id, category, amount, description, date, frequency]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/expenses/:id', (req, res) => {
  try {
    db.run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard summary endpoint
app.get('/api/summary', (req, res) => {
  try {
    const salesTotal = db.prepare('SELECT SUM(price * quantity) as total FROM sales').get()?.total || 0;
    const stockCount = db.prepare('SELECT COUNT(*) as count FROM stock').get().count;
    const totalStockValue = db.prepare('SELECT SUM(quantity * costPrice) as total FROM stock').get()?.total || 0;
    const unpaidDebts = db.prepare('SELECT SUM(amount) as total FROM debts WHERE isPaid = 0').get()?.total || 0;
    const totalExpenses = db.prepare('SELECT SUM(amount) as total FROM expenses').get()?.total || 0;
    const lowStockItems = db.prepare('SELECT COUNT(*) as count FROM stock WHERE quantity <= lowStockThreshold').get().count;

    res.json({
      salesTotal,
      stockCount,
      totalStockValue,
      unpaidDebts,
      totalExpenses,
      lowStockItems
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual sync endpoint
app.post('/api/sync', (req, res) => {
  saveDatabase();
  const success = syncToDevice();
  res.json({ success });
});

// Export/Import endpoints
app.get('/api/export', (req, res) => {
  try {
    const sales = db.exec('SELECT * FROM sales')[0]?.values || [];
    const stock = db.exec('SELECT * FROM stock')[0]?.values || [];
    const debts = db.exec('SELECT * FROM debts')[0]?.values || [];
    const expenses = db.exec('SELECT * FROM expenses')[0]?.values || [];

    const salesCols = db.exec('PRAGMA table_info(sales)')[0]?.columns || [];
    const stockCols = db.exec('PRAGMA table_info(stock)')[0]?.columns || [];
    const debtsCols = db.exec('PRAGMA table_info(debts)')[0]?.columns || [];
    const expensesCols = db.exec('PRAGMA table_info(expenses)')[0]?.columns || [];

    const rowsToObjects = (rows, cols) => rows.map(row => {
      const obj = {};
      cols.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });

    const data = {
      sales: rowsToObjects(sales, salesCols),
      stock: rowsToObjects(stock, stockCols),
      debts: rowsToObjects(debts, debtsCols),
      expenses: rowsToObjects(expenses, expensesCols),
      exportedAt: new Date().toISOString(),
    };

    res.setHeader('Content-Disposition', `attachment; filename="zion_records_${Date.now()}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(data, null, 2));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/import', (req, res) => {
  try {
    const { sales, stock, debts, expenses } = req.body;

    // Clear existing data
    db.run('DELETE FROM sales');
    db.run('DELETE FROM stock');
    db.run('DELETE FROM debts');
    db.run('DELETE FROM expenses');

    // Import sales
    if (sales && Array.isArray(sales)) {
      for (const sale of sales) {
        db.run('INSERT INTO sales VALUES (?, ?, ?, ?, ?, ?, ?)', [
          sale.id, sale.itemName, sale.category, sale.quantity, sale.price, sale.cost, sale.date
        ]);
      }
    }

    // Import stock
    if (stock && Array.isArray(stock)) {
      for (const item of stock) {
        db.run('INSERT OR REPLACE INTO stock VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
          item.id, item.name, item.quantity, item.costPrice, item.sellingPrice,
          item.lastUpdated, item.lowStockThreshold, item.imageUrl || null,
          JSON.stringify(item.costHistory || [])
        ]);
      }
    }

    // Import debts
    if (debts && Array.isArray(debts)) {
      for (const debt of debts) {
        db.run('INSERT INTO debts VALUES (?, ?, ?, ?, ?, ?, ?)', [
          debt.id, debt.debtorName, debt.phoneNumber, debt.amount, debt.description,
          debt.isPaid ? 1 : 0, debt.date
        ]);
      }
    }

    // Import expenses
    if (expenses && Array.isArray(expenses)) {
      for (const expense of expenses) {
        db.run('INSERT INTO expenses VALUES (?, ?, ?, ?, ?, ?)', [
          expense.id, expense.category, expense.amount, expense.description, expense.date, expense.frequency
        ]);
      }
    }

    saveDatabase();
    syncToDevice();
    res.json({ success: true, message: 'Data imported successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static files from the dist folder
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Handle SPA routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <html>
        <head><title>Zion Business Manager</title></head>
        <body>
          <h1>Zion Business Manager</h1>
          <p>Frontend not built. Run:</p>
          <pre>npm run build</pre>
          <p>Then restart the server.</p>
        </body>
      </html>
    `);
  }
});

// Start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Data synced to: ${recordsFolder}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
