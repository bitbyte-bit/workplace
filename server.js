import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from root directory (for esm.sh CDN-based setup)
app.use(express.static(__dirname));

// ============ FRONTEND ROUTE ============

// Serve index.html for all non-API routes (SPA fallback)
app.get('*', (req, res) => {
  // Don't redirect API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize SQLite database
const dbPath = path.join(__dirname, 'zion.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Enable WAL mode for better performance
db.run('PRAGMA journal_mode = WAL');

// Create tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      itemName TEXT,
      category TEXT,
      quantity REAL,
      price REAL,
      cost REAL,
      date INTEGER
    )
  `);

  db.run(`
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
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      debtorName TEXT,
      phoneNumber TEXT,
      amount REAL,
      description TEXT,
      isPaid INTEGER,
      date INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      category TEXT,
      amount REAL,
      description TEXT,
      date INTEGER,
      frequency TEXT
    )
  `);

  // Add missing columns if they don't exist
  db.run("ALTER TABLE stock ADD COLUMN imageUrl TEXT", () => {});
  db.run("ALTER TABLE stock ADD COLUMN costHistory TEXT", () => {});
});

// Helper function to run queries with Promises
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// ============ SALES ROUTES ============

// Get all sales
app.get('/api/sales', async (req, res) => {
  try {
    const sales = await getQuery('SELECT * FROM sales ORDER BY date DESC');
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a sale
app.post('/api/sales', async (req, res) => {
  try {
    const { id, itemName, category, quantity, price, cost, date } = req.body;
    await runQuery('INSERT INTO sales VALUES (?, ?, ?, ?, ?, ?, ?)', [id, itemName, category, quantity, price, cost, date]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a sale
app.delete('/api/sales/:id', async (req, res) => {
  try {
    await runQuery('DELETE FROM sales WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ STOCK ROUTES ============

// Get all stock
app.get('/api/stock', async (req, res) => {
  try {
    const stock = await getQuery('SELECT * FROM stock');
    res.json(stock.map(item => ({
      ...item,
      costHistory: item.costHistory ? JSON.parse(item.costHistory) : []
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add or update stock
app.post('/api/stock', async (req, res) => {
  try {
    const { id, name, quantity, costPrice, sellingPrice, lastUpdated, lowStockThreshold, imageUrl, costHistory } = req.body;
    await runQuery('INSERT OR REPLACE INTO stock VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
      [id, name, quantity, costPrice, sellingPrice, lastUpdated, lowStockThreshold, imageUrl || null, JSON.stringify(costHistory || [])]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update stock item
app.put('/api/stock/:id', async (req, res) => {
  try {
    const { name, quantity, costPrice, sellingPrice, lowStockThreshold, imageUrl, costHistory } = req.body;
    await runQuery('UPDATE stock SET name=?, quantity=?, costPrice=?, sellingPrice=?, lastUpdated=?, lowStockThreshold=?, imageUrl=?, costHistory=? WHERE id=?', 
      [name, quantity, costPrice, sellingPrice, Date.now(), lowStockThreshold, imageUrl || null, JSON.stringify(costHistory || []), req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update stock quantity
app.patch('/api/stock/:name/quantity', async (req, res) => {
  try {
    const { quantityChange } = req.body;
    await runQuery('UPDATE stock SET quantity = quantity + ?, lastUpdated = ? WHERE LOWER(name) = LOWER(?)', [quantityChange, Date.now(), req.params.name]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete stock
app.delete('/api/stock/:id', async (req, res) => {
  try {
    await runQuery('DELETE FROM stock WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DEBTS ROUTES ============

// Get all debts
app.get('/api/debts', async (req, res) => {
  try {
    const debts = await getQuery('SELECT * FROM debts ORDER BY date DESC');
    res.json(debts.map(debt => ({
      ...debt,
      isPaid: debt.isPaid === 1
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a debt
app.post('/api/debts', async (req, res) => {
  try {
    const { id, debtorName, phoneNumber, amount, description, isPaid, date } = req.body;
    await runQuery('INSERT INTO debts VALUES (?, ?, ?, ?, ?, ?, ?)', [id, debtorName, phoneNumber, amount, description, isPaid ? 1 : 0, date]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update debt
app.put('/api/debts/:id', async (req, res) => {
  try {
    const { debtorName, phoneNumber, amount, description, isPaid } = req.body;
    await runQuery('UPDATE debts SET debtorName=?, phoneNumber=?, amount=?, description=?, isPaid=? WHERE id=?', 
      [debtorName, phoneNumber, amount, description, isPaid ? 1 : 0, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle debt status
app.patch('/api/debts/:id/toggle', async (req, res) => {
  try {
    await runQuery('UPDATE debts SET isPaid = 1 - isPaid WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete debt
app.delete('/api/debts/:id', async (req, res) => {
  try {
    await runQuery('DELETE FROM debts WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ EXPENSES ROUTES ============

// Get all expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await getQuery('SELECT * FROM expenses ORDER BY date DESC');
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add an expense
app.post('/api/expenses', async (req, res) => {
  try {
    const { id, category, amount, description, date, frequency } = req.body;
    await runQuery('INSERT INTO expenses VALUES (?, ?, ?, ?, ?, ?)', [id, category, amount, description, date, frequency]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete expense
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    await runQuery('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ UTILITY ROUTES ============

// Reset database
app.post('/api/reset', async (req, res) => {
  try {
    await runQuery('DELETE FROM sales');
    await runQuery('DELETE FROM stock');
    await runQuery('DELETE FROM debts');
    await runQuery('DELETE FROM expenses');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
