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

let db = null;

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
      userId TEXT,
      itemName TEXT,
      category TEXT,
      quantity REAL,
      price REAL,
      cost REAL,
      date INTEGER
    );

    CREATE TABLE IF NOT EXISTS stock (
      id TEXT PRIMARY KEY,
      userId TEXT,
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
      userId TEXT,
      debtorName TEXT,
      phoneNumber TEXT,
      amount REAL,
      description TEXT,
      isPaid INTEGER,
      date INTEGER
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      userId TEXT,
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
      businessEmail TEXT,
      businessLocation TEXT,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      warningCount INTEGER DEFAULT 0,
      lastWarningAt INTEGER,
      suspendedAt INTEGER,
      suspendedReason TEXT,
      createdAt INTEGER,
      lastLoginAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      key TEXT NOT NULL,
      value TEXT,
      UNIQUE(userId, key)
    );
  `);
  
  // Migrate existing data: Add userId column if it doesn't exist
  try {
    // Check if userId column exists in sales table
    const salesColumns = db.exec("PRAGMA table_info(sales)")[0]?.values || [];
    const salesHasUserId = salesColumns.some(col => col[1] === 'userId');
    if (!salesHasUserId) {
      db.run('ALTER TABLE sales ADD COLUMN userId TEXT');
      console.log('✅ Migrated sales table: added userId column');
    }
    
    const stockColumns = db.exec("PRAGMA table_info(stock)")[0]?.values || [];
    const stockHasUserId = stockColumns.some(col => col[1] === 'userId');
    if (!stockHasUserId) {
      db.run('ALTER TABLE stock ADD COLUMN userId TEXT');
      console.log('✅ Migrated stock table: added userId column');
    }
    
    const debtsColumns = db.exec("PRAGMA table_info(debts)")[0]?.values || [];
    const debtsHasUserId = debtsColumns.some(col => col[1] === 'userId');
    if (!debtsHasUserId) {
      db.run('ALTER TABLE debts ADD COLUMN userId TEXT');
      console.log('✅ Migrated debts table: added userId column');
    }
    
    // Migrate users table: Add businessEmail and businessLocation columns
    const usersColumns = db.exec("PRAGMA table_info(users)")[0]?.values || [];
    const usersHasBusinessEmail = usersColumns.some(col => col[1] === 'businessEmail');
    if (!usersHasBusinessEmail) {
      db.run('ALTER TABLE users ADD COLUMN businessEmail TEXT');
      console.log('✅ Migrated users table: added businessEmail column');
    }
    
    const usersHasBusinessLocation = usersColumns.some(col => col[1] === 'businessLocation');
    if (!usersHasBusinessLocation) {
      db.run('ALTER TABLE users ADD COLUMN businessLocation TEXT');
      console.log('✅ Migrated users table: added businessLocation column');
    }
    
    const expensesColumns = db.exec("PRAGMA table_info(expenses)")[0]?.values || [];
    const expensesHasUserId = expensesColumns.some(col => col[1] === 'userId');
    if (!expensesHasUserId) {
      db.run('ALTER TABLE expenses ADD COLUMN userId TEXT');
      console.log('✅ Migrated expenses table: added userId column');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }
  
  // Create admin account if not exists
  const adminCheck = db.exec("SELECT id FROM users WHERE email = 'zionpro@gmail.com'")[0]?.values || [];
  if (adminCheck.length === 0) {
    db.run('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      'admin', 'zionpro@gmail.com', 'zionpro', 'System Administrator', 'ZION Pro', '', '', '',
      'admin', 'active', 0, null, null, null, Date.now(), null
    ]);
    console.log('✅ Admin account created: zionpro@gmail.com / zionpro');
  }
  
  saveDatabase();
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
  }, 2000);
}

// ============= API ROUTES =============

// Sales endpoints
app.get('/api/sales', (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const stmt = db.prepare('SELECT * FROM sales WHERE userId = ? ORDER BY date DESC');
    stmt.bind([userId]);
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
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { id, itemName, category, quantity, price, cost, date } = req.body;
    db.run('INSERT INTO sales VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, userId, itemName, category, quantity, price, cost, date]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/sales/:id', (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    db.run('DELETE FROM sales WHERE id = ? AND userId = ?', [req.params.id, userId]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stock endpoints
app.get('/api/stock', (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const stmt = db.prepare('SELECT * FROM stock WHERE userId = ?');
    stmt.bind([userId]);
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
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { id, name, quantity, costPrice, sellingPrice, lastUpdated, lowStockThreshold, imageUrl, costHistory } = req.body;
    db.run('INSERT OR REPLACE INTO stock VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      id, userId, name, quantity, costPrice, sellingPrice, lastUpdated, lowStockThreshold, imageUrl || null, JSON.stringify(costHistory || [])
    ]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/stock/:id', (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { name, quantity, costPrice, sellingPrice, lowStockThreshold, imageUrl, costHistory } = req.body;
    db.run('UPDATE stock SET userId=?, name=?, quantity=?, costPrice=?, sellingPrice=?, lastUpdated=?, lowStockThreshold=?, imageUrl=?, costHistory=? WHERE id=?', [
      userId, name, quantity, costPrice, sellingPrice, Date.now(), lowStockThreshold, imageUrl || null, JSON.stringify(costHistory || []), req.params.id
    ]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/stock/:id', (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    db.run('DELETE FROM stock WHERE id = ? AND userId = ?', [req.params.id, userId]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debts endpoints
app.get('/api/debts', (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const stmt = db.prepare('SELECT * FROM debts WHERE userId = ? ORDER BY date DESC');
    stmt.bind([userId]);
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
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { id, debtorName, phoneNumber, amount, description, isPaid, date } = req.body;
    db.run('INSERT INTO debts VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, userId, debtorName, phoneNumber, amount, description, isPaid ? 1 : 0, date]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/debts/:id', (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { debtorName, phoneNumber, amount, description, isPaid } = req.body;
    db.run('UPDATE debts SET userId=?, debtorName=?, phoneNumber=?, amount=?, description=?, isPaid=? WHERE id=?', [
      userId, debtorName, phoneNumber, amount, description, isPaid ? 1 : 0, req.params.id
    ]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/debts/:id', (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    db.run('DELETE FROM debts WHERE id = ? AND userId = ?', [req.params.id, userId]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Expenses endpoints
app.get('/api/expenses', (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const stmt = db.prepare('SELECT * FROM expenses WHERE userId = ? ORDER BY date DESC');
    stmt.bind([userId]);
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
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { id, category, amount, description, date, frequency } = req.body;
    db.run('INSERT INTO expenses VALUES (?, ?, ?, ?, ?, ?, ?)', [id, userId, category, amount, description, date, frequency]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/expenses/:id', (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    db.run('DELETE FROM expenses WHERE id = ? AND userId = ?', [req.params.id, userId]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/expenses/:id', (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { category, amount, description, date, frequency } = req.body;
    db.run('UPDATE expenses SET userId=?, category=?, amount=?, description=?, date=?, frequency=? WHERE id=?', [
      userId, category, amount, description, date, frequency, req.params.id
    ]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== USER AUTHENTICATION ==========

app.post('/api/auth/register', (req, res) => {
  try {
    const { id, email, password, fullName, businessName, phone, businessEmail, businessLocation } = req.body;
    
    const checkStmt = db.prepare('SELECT id FROM users WHERE email = ?');
    checkStmt.bind([email]);
    if (checkStmt.step()) {
      checkStmt.free();
      return res.status(400).json({ error: 'Email already registered' });
    }
    checkStmt.free();
    
    db.run('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      id, email, password, fullName, businessName, phone, '', '', 'user', 'active', 0, null, null, null, Date.now(), null
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
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const salesStmt = db.prepare('SELECT * FROM sales WHERE userId = ?');
    salesStmt.bind([userId]);
    const sales = [];
    while (salesStmt.step()) {
      sales.push(salesStmt.getAsObject());
    }
    salesStmt.free();
    const salesTotal = sales.reduce((acc, s) => acc + (Number(s.price) * Number(s.quantity)), 0);

    const stockStmt = db.prepare('SELECT * FROM stock WHERE userId = ?');
    stockStmt.bind([userId]);
    const stock = [];
    while (stockStmt.step()) {
      const item = stockStmt.getAsObject();
      item.costHistory = item.costHistory ? JSON.parse(item.costHistory) : [];
      stock.push(item);
    }
    stockStmt.free();
    const totalStockValue = stock.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.costPrice)), 0);

    const debtsStmt = db.prepare('SELECT * FROM debts WHERE userId = ?');
    debtsStmt.bind([userId]);
    const debts = [];
    while (debtsStmt.step()) {
      const debt = debtsStmt.getAsObject();
      debt.isPaid = debt.isPaid === 1;
      debts.push(debt);
    }
    debtsStmt.free();
    const unpaidDebts = debts.filter(d => !d.isPaid).reduce((acc, d) => acc + Number(d.amount), 0);

    const expensesStmt = db.prepare('SELECT * FROM expenses WHERE userId = ?');
    expensesStmt.bind([userId]);
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

// Serve static files from the dist folder
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// ========== SETTINGS ENDPOINTS ==========

// Get all settings for a user
app.get('/api/settings', (req, res) => {
  try {
    const userId = req.query.userId;
    let stmt;
    if (userId) {
      stmt = db.prepare('SELECT key, value FROM settings WHERE userId = ? OR userId IS NULL');
      stmt.bind([userId]);
    } else {
      stmt = db.prepare('SELECT key, value FROM settings WHERE userId IS NULL');
      stmt.bind([]);
    }
    const settings = {};
    while (stmt.step()) {
      const row = stmt.getAsObject();
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    stmt.free();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save a setting
app.post('/api/settings', (req, res) => {
  try {
    const { userId, key, value } = req.body;
    const stringValue = JSON.stringify(value);
    db.run('INSERT OR REPLACE INTO settings (userId, key, value) VALUES (?, ?, ?)', 
      [userId || null, key, stringValue]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save multiple settings at once
app.post('/api/settings/bulk', (req, res) => {
  try {
    const { userId, settings } = req.body;
    for (const [key, value] of Object.entries(settings)) {
      const stringValue = JSON.stringify(value);
      db.run('INSERT OR REPLACE INTO settings (userId, key, value) VALUES (?, ?, ?)', 
        [userId || null, key, stringValue]);
    }
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a setting
app.delete('/api/settings', (req, res) => {
  try {
    const { userId, key } = req.body;
    if (userId && key) {
      db.run('DELETE FROM settings WHERE userId = ? AND key = ?', [userId, key]);
    } else if (key) {
      db.run('DELETE FROM settings WHERE key = ? AND userId IS NULL', [key]);
    }
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== WHATSAPP ENDPOINTS ==========

// Send WhatsApp message via Twilio
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }
    
    // Get WhatsApp credentials from settings
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    stmt.bind(['whatsapp_config']);
    const configStr = stmt.step() ? stmt.getAsObject().value : null;
    stmt.free();
    
    let config = { accountSid: '', authToken: '', fromNumber: '' };
    if (configStr) {
      try {
        config = JSON.parse(configStr);
      } catch {}
    }
    
    // If no credentials configured, return info message
    if (!config.accountSid || !config.authToken || !config.fromNumber) {
      return res.json({ 
        success: false, 
        message: 'WhatsApp not configured. Please add Twilio credentials in settings.'
      });
    }
    
    // Clean phone number
    const cleanPhone = to.replace(/\D/g, '');
    const formattedTo = `whatsapp:+${cleanPhone}`;
    const formattedFrom = `whatsapp:${config.fromNumber}`;
    
    // Using Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
    
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedTo,
        From: formattedFrom,
        Body: message,
      }),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      res.json({ success: true, messageId: result.sid });
    } else {
      res.status(response.status).json({ error: result.message || 'Failed to send WhatsApp message' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save WhatsApp configuration
app.post('/api/whatsapp/config', (req, res) => {
  try {
    const { accountSid, authToken, fromNumber } = req.body;
    
    db.run('INSERT OR REPLACE INTO settings (userId, key, value) VALUES (?, ?, ?)', 
      [null, 'whatsapp_config', JSON.stringify({ accountSid, authToken, fromNumber })]);
    triggerSave();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
    console.log(`💾 Data stored in SQLite database`);
  });
});
