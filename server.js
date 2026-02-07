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
      savedAt: new Date().toISOString(),
    };

    const backupPath = path.join(recordsFolder, 'zion_backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));

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
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
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

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      fullName TEXT,
      businessName TEXT,
      phone TEXT,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      warningCount INTEGER DEFAULT 0,
      lastWarningAt INTEGER,
      suspendedAt INTEGER,
      suspendedReason TEXT,
      createdAt INTEGER,
      lastLoginAt INTEGER
    );
  `);
  
  // Create admin account if not exists
  const adminCheck = db.exec("SELECT id FROM users WHERE email = 'zionpro@gmail.com'")[0]?.values || [];
  if (adminCheck.length === 0) {
    db.run('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      'admin', 'zionpro@gmail.com', 'zionpro', 'System Administrator', 'ZION Pro', '', 
      'admin', 'active', 0, null, null, null, Date.now(), null, null
    ]);
    console.log('✅ Admin account created: zionpro@gmail.com / zionpro');
  }
  
  saveDatabase();
  syncToDevice();
  console.log('✅ Connected to SQLite database');
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

let saveTimeout = null;
function triggerSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveDatabase();
    syncToDevice();
  }, 2000);
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

// ========== USER AUTHENTICATION ==========

app.post('/api/auth/register', (req, res) => {
  try {
    const { id, email, password, fullName, businessName, phone } = req.body;
    
    const checkStmt = db.prepare('SELECT id FROM users WHERE email = ?');
    checkStmt.bind([email]);
    if (checkStmt.step()) {
      checkStmt.free();
      return res.status(400).json({ error: 'Email already registered' });
    }
    checkStmt.free();
    
    db.run('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      id, email, password, fullName, businessName, phone, 'user', 'active', 0, null, null, null, Date.now(), null
    ]);
    
    triggerSave();
    
    res.json({
      success: true,
      user: { id, email, fullName, businessName, phone, role: 'user', status: 'active' }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    stmt.bind([email]);
    
    if (stmt.step()) {
      const user = stmt.getAsObject();
      stmt.free();
      
      if (user.status === 'banned') {
        return res.status(403).json({ error: 'Your account has been banned. Contact support.' });
      }
      if (user.status === 'suspended') {
        return res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
      }
      
      if (user.password === password) {
        // Update last login
        db.run('UPDATE users SET lastLoginAt = ? WHERE id = ?', [Date.now(), user.id]);
        triggerSave();
        
        const { password: _, ...safeUser } = user;
        res.json({ success: true, user: safeUser });
      } else {
        res.status(401).json({ error: 'Invalid email or password' });
      }
    } else {
      stmt.free();
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/profile', (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    stmt.bind([userId]);
    
    if (stmt.step()) {
      const user = stmt.getAsObject();
      stmt.free();
      const { password: _, ...safeUser } = user;
      res.json({ success: true, user: safeUser });
    } else {
      stmt.free();
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/auth/profile', (req, res) => {
  try {
    const { userId, fullName, businessName, phone, currentPassword, newPassword } = req.body;
    
    if (newPassword) {
      const checkStmt = db.prepare('SELECT password FROM users WHERE id = ?');
      checkStmt.bind([userId]);
      if (checkStmt.step()) {
        const user = checkStmt.getAsObject();
        if (user.password !== currentPassword) {
          checkStmt.free();
          return res.status(401).json({ error: 'Current password is incorrect' });
        }
      }
      checkStmt.free();
      
      db.run('UPDATE users SET fullName=?, businessName=?, phone=?, password=? WHERE id=?', [
        fullName, businessName, phone, newPassword, userId
      ]);
    } else {
      db.run('UPDATE users SET fullName=?, businessName=?, phone=? WHERE id=?', [
        fullName, businessName, phone, userId
      ]);
    }
    
    triggerSave();
    
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    stmt.bind([userId]);
    if (stmt.step()) {
      const user = stmt.getAsObject();
      stmt.free();
      const { password: _, ...safeUser } = user;
      res.json({ success: true, user: safeUser });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/check', (req, res) => {
  try {
    const stmt = db.prepare('SELECT id FROM users LIMIT 1');
    stmt.bind([]);
    const hasUser = stmt.step();
    stmt.free();
    res.json({ hasUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN ENDPOINTS ==========

// Admin login
app.post('/api/admin/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    const stmt = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?');
    stmt.bind([email, password]);
    
    if (stmt.step()) {
      const user = stmt.getAsObject();
      stmt.free();
      
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
      }
      
      const { password: _, ...safeUser } = user;
      res.json({ success: true, user: safeUser });
    } else {
      stmt.free();
      res.status(401).json({ error: 'Invalid admin credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (admin only)
app.get('/api/admin/users', (req, res) => {
  try {
    const adminId = req.headers['x-admin-id'];
    
    if (!adminId) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    
    const adminStmt = db.prepare('SELECT role FROM users WHERE id = ?');
    adminStmt.bind([adminId]);
    if (!adminStmt.step() || adminStmt.getAsObject().role !== 'admin') {
      adminStmt.free();
      return res.status(403).json({ error: 'Admin access required' });
    }
    adminStmt.free();
    
    const stmt = db.prepare('SELECT id, email, fullName, businessName, phone, role, status, warningCount, lastWarningAt, suspendedAt, suspendedReason, createdAt, lastLoginAt FROM users ORDER BY createdAt DESC');
    const users = [];
    while (stmt.step()) {
      users.push(stmt.getAsObject());
    }
    stmt.free();
    
    // Remove passwords
    const safeUsers = users.map(({ password, ...user }) => user);
    
    res.json({ success: true, users: safeUsers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user statistics (admin only)
app.get('/api/admin/stats', (req, res) => {
  try {
    const adminId = req.headers['x-admin-id'];
    
    if (!adminId) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    
    const adminStmt = db.prepare('SELECT role FROM users WHERE id = ?');
    adminStmt.bind([adminId]);
    if (!adminStmt.step() || adminStmt.getAsObject().role !== 'admin') {
      adminStmt.free();
      return res.status(403).json({ error: 'Admin access required' });
    }
    adminStmt.free();
    
    const totalUsers = db.exec('SELECT COUNT(*) as count FROM users WHERE role = "user"')[0]?.values[0][0] || 0;
    const activeUsers = db.exec("SELECT COUNT(*) as count FROM users WHERE role = 'user' AND status = 'active'")[0]?.values[0][0] || 0;
    const suspendedUsers = db.exec("SELECT COUNT(*) as count FROM users WHERE role = 'user' AND status = 'suspended'")[0]?.values[0][0] || 0;
    const bannedUsers = db.exec("SELECT COUNT(*) as count FROM users WHERE role = 'user' AND status = 'banned'")[0]?.values[0][0] || 0;
    const warnedUsers = db.exec('SELECT COUNT(*) as count FROM users WHERE role = "user" AND warningCount > 0')[0]?.values[0][0] || 0;
    
    // Get sales count and total
    const salesData = db.exec('SELECT COUNT(*) as count, SUM(price * quantity) as total FROM sales')[0]?.values[0] || [0, 0];
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        bannedUsers,
        warnedUsers,
        totalSales: salesData[0] || 0,
        totalRevenue: salesData[1] || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Warn user (admin only)
app.post('/api/admin/users/:id/warn', (req, res) => {
  try {
    const adminId = req.headers['x-admin-id'];
    const userId = req.params.id;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    
    const adminStmt = db.prepare('SELECT role FROM users WHERE id = ?');
    adminStmt.bind([adminId]);
    if (!adminStmt.step() || adminStmt.getAsObject().role !== 'admin') {
      adminStmt.free();
      return res.status(403).json({ error: 'Admin access required' });
    }
    adminStmt.free();
    
    const stmt = db.prepare('SELECT warningCount FROM users WHERE id = ?');
    stmt.bind([userId]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ error: 'User not found' });
    }
    const currentWarnings = stmt.getAsObject().warningCount || 0;
    stmt.free();
    
    const newWarnings = currentWarnings + 1;
    
    db.run('UPDATE users SET warningCount = ?, lastWarningAt = ? WHERE id = ?', [
      newWarnings, Date.now(), userId
    ]);
    
    triggerSave();
    
    res.json({ success: true, message: 'User warned. Total warnings: ' + newWarnings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suspend user (admin only)
app.post('/api/admin/users/:id/suspend', (req, res) => {
  try {
    const adminId = req.headers['x-admin-id'];
    const userId = req.params.id;
    const { reason } = req.body;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    
    const adminStmt = db.prepare('SELECT role FROM users WHERE id = ?');
    adminStmt.bind([adminId]);
    if (!adminStmt.step() || adminStmt.getAsObject().role !== 'admin') {
      adminStmt.free();
      return res.status(403).json({ error: 'Admin access required' });
    }
    adminStmt.free();
    
    db.run('UPDATE users SET status = ?, suspendedAt = ?, suspendedReason = ? WHERE id = ?', [
      'suspended', Date.now(), reason || 'No reason provided', userId
    ]);
    
    triggerSave();
    
    res.json({ success: true, message: 'User suspended' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unsuspend user (admin only)
app.post('/api/admin/users/:id/unsuspend', (req, res) => {
  try {
    const adminId = req.headers['x-admin-id'];
    const userId = req.params.id;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    
    const adminStmt = db.prepare('SELECT role FROM users WHERE id = ?');
    adminStmt.bind([adminId]);
    if (!adminStmt.step() || adminStmt.getAsObject().role !== 'admin') {
      adminStmt.free();
      return res.status(403).json({ error: 'Admin access required' });
    }
    adminStmt.free();
    
    db.run('UPDATE users SET status = ?, suspendedAt = NULL, suspendedReason = NULL WHERE id = ?', ['active', userId]);
    
    triggerSave();
    
    res.json({ success: true, message: 'User unsuspended' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ban user (admin only)
app.post('/api/admin/users/:id/ban', (req, res) => {
  try {
    const adminId = req.headers['x-admin-id'];
    const userId = req.params.id;
    const { reason } = req.body;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    
    const adminStmt = db.prepare('SELECT role FROM users WHERE id = ?');
    adminStmt.bind([adminId]);
    if (!adminStmt.step() || adminStmt.getAsObject().role !== 'admin') {
      adminStmt.free();
      return res.status(403).json({ error: 'Admin access required' });
    }
    adminStmt.free();
    
    db.run('UPDATE users SET status = ?, suspendedAt = ?, suspendedReason = ? WHERE id = ?', [
      'banned', Date.now(), reason || 'Banned by administrator', userId
    ]);
    
    triggerSave();
    
    res.json({ success: true, message: 'User banned' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (admin only)
app.delete('/api/admin/users/:id', (req, res) => {
  try {
    const adminId = req.headers['x-admin-id'];
    const userId = req.params.id;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    
    const adminStmt = db.prepare('SELECT role FROM users WHERE id = ?');
    adminStmt.bind([adminId]);
    if (!adminStmt.step() || adminStmt.getAsObject().role !== 'admin') {
      adminStmt.free();
      return res.status(403).json({ error: 'Admin access required' });
    }
    adminStmt.free();
    
    // Delete user's data first
    db.run('DELETE FROM sales WHERE userId = ?', [userId]);
    db.run('DELETE FROM stock WHERE userId = ?', [userId]);
    db.run('DELETE FROM debts WHERE userId = ?', [userId]);
    db.run('DELETE FROM expenses WHERE userId = ?', [userId]);
    
    // Delete user
    db.run('DELETE FROM users WHERE id = ?', [userId]);
    
    triggerSave();
    
    res.json({ success: true, message: 'User and all data deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard summary endpoint
app.get('/api/summary', (req, res) => {
  try {
    const salesStmt = db.prepare('SELECT * FROM sales');
    const sales = [];
    while (salesStmt.step()) {
      sales.push(salesStmt.getAsObject());
    }
    salesStmt.free();
    const salesTotal = sales.reduce((acc, s) => acc + (Number(s.price) * Number(s.quantity)), 0);

    const stockStmt = db.prepare('SELECT * FROM stock');
    const stock = [];
    while (stockStmt.step()) {
      const item = stockStmt.getAsObject();
      item.costHistory = item.costHistory ? JSON.parse(item.costHistory) : [];
      stock.push(item);
    }
    stockStmt.free();
    const totalStockValue = stock.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.costPrice)), 0);

    const debtsStmt = db.prepare('SELECT * FROM debts');
    const debts = [];
    while (debtsStmt.step()) {
      const debt = debtsStmt.getAsObject();
      debt.isPaid = debt.isPaid === 1;
      debts.push(debt);
    }
    debtsStmt.free();
    const unpaidDebts = debts.filter(d => !d.isPaid).reduce((acc, d) => acc + Number(d.amount), 0);

    const expensesStmt = db.prepare('SELECT * FROM expenses');
    const expenses = [];
    while (expensesStmt.step()) {
      expenses.push(expensesStmt.getAsObject());
    }
    expensesStmt.free();
    const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

    const lowStockItems = stock.filter(item => Number(item.quantity) <= Number(item.lowStockThreshold || 5)).length;

    res.json({
      salesTotal,
      stockCount: stock.length,
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

    db.run('DELETE FROM sales');
    db.run('DELETE FROM stock');
    db.run('DELETE FROM debts');
    db.run('DELETE FROM expenses');

    if (sales && Array.isArray(sales)) {
      for (const sale of sales) {
        db.run('INSERT INTO sales VALUES (?, ?, ?, ?, ?, ?, ?)', [
          sale.id, sale.itemName, sale.category, sale.quantity, sale.price, sale.cost, sale.date
        ]);
      }
    }

    if (stock && Array.isArray(stock)) {
      for (const item of stock) {
        db.run('INSERT OR REPLACE INTO stock VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
          item.id, item.name, item.quantity, item.costPrice, item.sellingPrice,
          item.lastUpdated, item.lowStockThreshold, item.imageUrl || null,
          JSON.stringify(item.costHistory || [])
        ]);
      }
    }

    if (debts && Array.isArray(debts)) {
      for (const debt of debts) {
        db.run('INSERT INTO debts VALUES (?, ?, ?, ?, ?, ?, ?)', [
          debt.id, debt.debtorName, debt.phoneNumber, debt.amount, debt.description,
          debt.isPaid ? 1 : 0, debt.date
        ]);
      }
    }

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
        <head><title>ZION Pro</title></head>
        <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <div style="text-align: center; color: white;">
            <h1 style="font-size: 3rem; font-weight: 800;">ZION Pro</h1>
            <p style="font-size: 1.2rem; opacity: 0.8;">Business Management System</p>
            <p style="margin-top: 20px; opacity: 0.6;">Server running. Build the frontend with: npm run build</p>
          </div>
        </body>
      </html>
    `);
  }
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Data synced to: ${recordsFolder}`);
  });
});
