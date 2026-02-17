
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import SalesManager from './components/SalesManager';
import StockManager from './components/StockManager';
import DebtManager from './components/DebtManager';
import ExpenseManager from './components/ExpenseManager';
import Reports from './components/Reports';
import SearchBar from './components/SearchBar';
import Notification, { NotificationType } from './components/Notification';
import ThemeSwitcher from './components/ThemeSwitcher';
import RecordsManager from './components/RecordsManager';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';
import { ThemeProvider } from './contexts/ThemeContext';
import * as db from './services/db';
import { User, hasManagerPin, fetchManagerPin, saveManagerPin, fetchSecurityQuestion, saveSecurityQuestion } from './services/db';
import { DashboardIcon, SalesIcon, StockIcon, DebtIcon, ExpenseIcon, ReportsIcon, ClockIcon, FolderIcon, ShieldIcon } from './components/Icons';
import { Tab, Sale, StockItem, Debt, Expense, BusinessData } from './types';

interface SearchResult {
  id: string;
  name: string;
  type: 'stock' | 'sale' | 'debt' | 'expense';
  quantity?: number;
  amount?: number;
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [pinRequired, setPinRequired] = useState(false);
  
  const [sales, setSales] = useState<Sale[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const [notification, setNotification] = useState<{ message: string, type: NotificationType } | null>(null);
  const [managerPassword, setManagerPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState<string>('');
  const [securityAnswer, setSecurityAnswer] = useState<string>('');
  const [currency, setCurrency] = useState('$');
  const [reminderTime, setReminderTime] = useState('18:00');
  const [lastAlarmShown, setLastAlarmShown] = useState<string | null>(null);
  const [showRecordsManager, setShowRecordsManager] = useState(false);

  const showNotification = useCallback((message: string, type: NotificationType = 'success') => {
    setNotification({ message, type });
  }, []);

  const verifyAction = useCallback((callback: () => void) => {
    const pass = prompt("Enter Manager PIN to verify this action:");
    if (pass === managerPassword) {
      callback();
    } else {
      showNotification("Incorrect PIN. Action denied.", "error");
    }
  }, [managerPassword, showNotification]);

  // Check for PIN availability on app load
  useEffect(() => {
    const checkPinAvailability = async () => {
      try {
        const pinExists = await hasManagerPin();
        if (!pinExists) {
          // PIN not set - admin should set it
          console.log('PIN not set. Admin should configure it.');
        }
      } catch (error) {
        console.error('Failed to check PIN availability:', error);
      }
    };
    checkPinAvailability();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await db.fetchSettings(user?.id);
        if (settings.customCategories) setCustomCategories(settings.customCategories);
        if (settings.managerPassword) setManagerPassword(settings.managerPassword);
        if (settings.currency) setCurrency(settings.currency);
        if (settings.reminderTime) setReminderTime(settings.reminderTime);
        if (settings.securityQuestion) setSecurityQuestion(settings.securityQuestion);
        if (settings.securityAnswer) setSecurityAnswer(settings.securityAnswer);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    if (user) loadSettings();
  }, [user]);

  useEffect(() => {
    if (user && customCategories.length > 0) {
      db.saveSettings(user.id, { customCategories });
    }
  }, [customCategories, user]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const settings = await db.fetchSettings(undefined);
        if (settings.currentUser) {
          try {
            const { user: freshUser } = await db.getUserProfile(settings.currentUser.id);
            setUser(freshUser);
          } catch {
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  // Load manager PIN on mount
  useEffect(() => {
    const loadPin = async () => {
      const pin = await fetchManagerPin();
      setManagerPassword(pin);
    };
    loadPin();
  }, []);

  useEffect(() => {
    const alarmInterval = setInterval(() => {
      const now = new Date();
      const currentHM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const todayDate = now.toDateString();
      if (currentHM === reminderTime && lastAlarmShown !== todayDate) {
        showNotification("Time to record your business records for today!", "success");
        setLastAlarmShown(todayDate);
        try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play(); } catch(e){}
      }
    }, 30000);
    return () => clearInterval(alarmInterval);
  }, [reminderTime, lastAlarmShown, showNotification]);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        setLoading(true);
        await db.initServerDB();
        const s = await db.fetchAllSales();
        const st = await db.fetchAllStock();
        const d = await db.fetchAllDebts();
        const e = await db.fetchAllExpenses();
        setSales(s); setStock(st); setDebts(d); setExpenses(e);
      } catch (e) {
        showNotification("Failed to load data.", "error");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, showNotification]);

  const businessData: BusinessData = { sales, stock, debts, expenses };

  const filteredSales = useMemo(() => 
    sales.filter(s => s.itemName.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => b.date - a.date), 
    [sales, searchQuery]);
    
  const filteredStock = useMemo(() => 
    stock.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => b.lastUpdated - a.lastUpdated), 
    [stock, searchQuery]);
    
  const filteredDebts = useMemo(() => 
    debts.filter(d => d.debtorName.toLowerCase().includes(searchQuery.toLowerCase()) || d.phoneNumber.includes(searchQuery)).sort((a, b) => b.date - a.date), 
    [debts, searchQuery]);
    
  const filteredExpenses = useMemo(() => 
    expenses.filter(e => e.category.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => b.date - a.date), 
    [expenses, searchQuery]);

  const searchResults: SearchResult[] = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const results: SearchResult[] = [];
    stock.forEach(item => {
      if (item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        results.push({ id: item.id, name: item.name, type: 'stock', quantity: item.quantity });
      }
    });
    sales.forEach(sale => {
      if (sale.itemName.toLowerCase().includes(searchQuery.toLowerCase())) {
        results.push({ id: sale.id, name: sale.itemName, type: 'sale', quantity: sale.quantity, amount: sale.price * sale.quantity });
      }
    });
    debts.forEach(debt => {
      if (debt.debtorName.toLowerCase().includes(searchQuery.toLowerCase())) {
        results.push({ id: debt.id, name: debt.debtorName, type: 'debt', amount: debt.amount });
      }
    });
    expenses.forEach(expense => {
      if (expense.category.toLowerCase().includes(searchQuery.toLowerCase())) {
        results.push({ id: expense.id, name: expense.category, type: 'expense', amount: expense.amount });
      }
    });
    return results;
  }, [searchQuery, stock, sales, debts, expenses]);

  const handleSearchSelect = (result: SearchResult) => {
    switch (result.type) {
      case 'stock': setActiveTab('stock'); break;
      case 'sale': setActiveTab('sales'); break;
      case 'debt': setActiveTab('debts'); break;
      case 'expense': setActiveTab('expenses'); break;
    }
    setSearchQuery('');
  };

  const handleLogin = async (loggedInUser: User) => {
    setUser(loggedInUser);
    if (loggedInUser.email === 'zionpro@gmail.com' && loggedInUser.role === 'admin') {
      setAdminId(loggedInUser.id);
      setShowAdminDashboard(true);
      db.saveSettings(undefined, { currentUser: loggedInUser });
      showNotification('Welcome, Administrator!', 'success');
    }
  };

  const handleLogout = () => {
    db.deleteSettings(undefined, 'currentUser');
    setUser(null);
    setAdminId(null);
    setShowAdminDashboard(false);
    setSales([]);
    setStock([]);
    setDebts([]);
    setExpenses([]);
  };

  const handleAdminLogin = async (email: string, password: string) => {
    try {
      const { user: adminUser } = await db.loginAdmin(email, password);
      setAdminId(adminUser.id);
      db.saveSettings(undefined, { currentUser: adminUser });
      setShowAdminDashboard(true);
      showNotification('Welcome, Administrator!', 'success');
    } catch (error: any) {
      showNotification(error.message || 'Admin login failed', 'error');
      throw error;
    }
  };

  const handleAdminLogout = () => {
    db.deleteSettings(undefined, 'currentUser');
    setAdminId(null);
    setShowAdminDashboard(false);
  };

  const handleSale = async (newSale: Sale) => {
    await db.saveSale(newSale);
    await db.updateStockQuantity(newSale.itemName, -newSale.quantity);
    setSales(prev => [newSale, ...prev]);
    setStock(prev => prev.map(item => item.name.toLowerCase() === newSale.itemName.toLowerCase() ? { ...item, quantity: item.quantity - newSale.quantity, lastUpdated: Date.now() } : item));
    
    // Auto-create debt record for credit sales
    if (newSale.isOnCredit && newSale.balance && newSale.balance > 0 && newSale.customerName) {
      const debt: Debt = {
        id: `debt_${Date.now()}`,
        debtorName: newSale.customerName,
        phoneNumber: newSale.customerPhone || '',
        amount: newSale.balance,
        description: `Credit sale: ${newSale.quantity}x ${newSale.itemName} @ ${currency}${newSale.price}`,
        isPaid: false,
        date: Date.now()
      };
      await db.saveDebt(debt);
      setDebts(prev => [debt, ...prev]);
      showNotification("Sale recorded! Debt added to Debt Manager.");
    } else {
      showNotification("Sale recorded!");
    }
  };

  const handleDeleteSale = (id: string) => verifyAction(async () => {
    await db.deleteSale(id);
    setSales(prev => prev.filter(s => s.id !== id));
    showNotification("Sale record deleted.");
  });

  const handleAddStock = async (item: StockItem) => {
    await db.saveStock(item);
    setStock(prev => [item, ...prev]);
    showNotification("Stock added.");
  };

  const handleUpdateStock = async (item: StockItem) => {
    await db.updateStockItem(item);
    setStock(prev => prev.map(s => s.id === item.id ? item : s));
    showNotification("Stock item updated.");
  };

  const handleDeleteStock = (id: string) => verifyAction(async () => {
    await db.deleteStock(id);
    setStock(prev => prev.filter(s => s.id !== id));
    showNotification("Stock record deleted.");
  });

  const handleAddDebt = async (d: Debt) => {
    await db.saveDebt(d);
    setDebts(prev => [d, ...prev]);
    showNotification("Debt recorded.");
  };

  const handleUpdateDebt = async (debt: Debt) => {
    await db.updateDebtItem(debt);
    setDebts(prev => prev.map(d => d.id === debt.id ? debt : d));
    showNotification("Debt updated.");
  };

  const handleToggleDebt = async (id: string) => {
    await db.toggleDebtStatus(id);
    setDebts(prev => prev.map(d => d.id === id ? {...d, isPaid: !d.isPaid} : d));
    showNotification("Debt status changed.");
  };

  const handleDeleteDebt = (id: string) => verifyAction(async () => {
    await db.deleteDebt(id);
    setDebts(prev => prev.filter(d => d.id !== id));
    showNotification("Debt record deleted.");
  });

  const handleAddExpense = async (e: Expense) => {
    await db.saveExpense(e);
    setExpenses(prev => [e, ...prev]);
    showNotification("Expense logged.");
  };

  const handleUpdateExpense = async (expense: Expense) => {
    await db.updateExpenseItem(expense);
    setExpenses(prev => prev.map(e => e.id === expense.id ? expense : e));
    showNotification("Expense updated.");
  };

  const handleDeleteExpense = (id: string) => verifyAction(async () => {
    await db.deleteExpense(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    showNotification("Expense record deleted.");
  });

  const handleAddCategory = (category: string) => {
    if (!customCategories.includes(category)) {
      setCustomCategories(prev => [...prev, category]);
      showNotification(`Category "${category}" added.`);
    }
  };

  const handleUpdateCategory = (oldCategory: string, newCategory: string) => {
    if (!customCategories.includes(newCategory)) {
      setCustomCategories(prev => prev.map(cat => cat === oldCategory ? newCategory : cat));
      showNotification(`Category updated from "${oldCategory}" to "${newCategory}".`);
    }
  };

  const handleDeleteCategory = (category: string) => {
    setCustomCategories(prev => prev.filter(cat => cat !== category));
    showNotification(`Category "${category}" deleted.`);
  };

  const handleChangePassword = async (newPass: string) => {
    setManagerPassword(newPass);
    await saveManagerPin(newPass, user?.id);
    showNotification("Security PIN changed successfully.");
  };

  const handleSetSecurityQuestion = async (question: string, answer: string) => {
    setSecurityQuestion(question);
    setSecurityAnswer(answer);
    await saveSecurityQuestion(question, answer, user?.id);
    showNotification("Security question set successfully.");
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    db.saveSettings(user?.id, { currency: newCurrency });
    showNotification("Currency updated.");
  };

  const handleReminderChange = (time: string) => {
    setReminderTime(time);
    db.saveSettings(user?.id, { reminderTime: time });
    showNotification("Reminder alarm updated.");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-background)] p-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[var(--color-primary)] tracking-widest">ZION</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} showNotification={showNotification} />;
  }

  return (
    <>
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}
      
      <div className="flex flex-col min-h-screen bg-[var(--color-background)] pb-32 md:pb-16 md:pl-64 transition-colors duration-500">
        {notification && (
          <Notification 
            message={notification.message} 
            type={notification.type} 
            onClose={() => setNotification(null)} 
          />
        )}
        
        <aside className="hidden md:flex flex-col w-64 bg-white border-r h-full fixed left-0 top-0 p-6 shadow-xl">
          <h1 className="text-3xl font-black text-blue-600 mb-10 tracking-tighter flex items-center gap-2">
            ZION <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full uppercase">Pro</span>
          </h1>
          <nav className="space-y-2">
            <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<DashboardIcon />} label="Analytics" />
            <NavButton active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} icon={<SalesIcon />} label="Sales" />
            <NavButton active={activeTab === 'stock'} onClick={() => setActiveTab('stock')} icon={<StockIcon />} label="Inventory" />
            <NavButton active={activeTab === 'debts'} onClick={() => setActiveTab('debts')} icon={<DebtIcon />} label="Debts" />
            <NavButton active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} icon={<ExpenseIcon />} label="Expenses" />
            <NavButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<ReportsIcon />} label="Reports" />
            <NavButton active={false} onClick={() => setShowRecordsManager(true)} icon={<FolderIcon />} label="Records" />
            {user?.role === 'admin' && (
              <NavButton 
                active={showAdminDashboard} 
                onClick={() => {
                  setAdminId(user.id);
                  setShowAdminDashboard(true);
                }} 
                icon={<ShieldIcon />} 
                label="Admin Panel" 
              />
            )}
          </nav>
          <div className="mt-auto p-4 bg-[var(--color-background-alt)] rounded-2xl border border-[var(--color-surface-border)]">
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2">Reminder</p>
            <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold">
              <ClockIcon className="w-4 h-4" /> {reminderTime}
            </div>
          </div>
        </aside>

        <header className="bg-[var(--color-surface)]/80 backdrop-blur-md border-b px-6 py-4 sticky top-0 z-40 shadow-sm flex items-center justify-between">
          <h2 className="text-xl font-black text-[var(--color-text)] capitalize md:hidden">Zion</h2>
          <div className="flex-1 max-w-xl md:mx-auto">
            <SearchBar 
              value={searchQuery} 
              onChange={setSearchQuery} 
              results={searchResults}
              onSelect={handleSearchSelect}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right mr-2">
              <p className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-widest">Business</p>
              <p className="text-sm font-bold text-[var(--color-primary)]">{user.businessName}</p>
            </div>
            <div className="flex items-center gap-2 bg-[var(--color-background)] px-3 py-1.5 rounded-lg border border-[var(--color-surface-border)]">
              <span className="text-[var(--color-text-muted)]">{currency}</span>
              <span className="font-black text-[var(--color-primary)]">{filteredSales.reduce((acc, s) => acc + (Number(s.price) * Number(s.quantity)), 0).toLocaleString()}</span>
            </div>
            <ThemeSwitcher />
          </div>
        </header>

        <main className="flex-1 p-6">
          {showAdminDashboard ? (
            <AdminDashboard 
              adminId={adminId || ''}
              onLogout={handleAdminLogout}
              currency={currency}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard 
                  data={businessData}
                  currency={currency}
                  currentPassword={managerPassword}
                  onChangePassword={handleChangePassword}
                  onCurrencyChange={handleCurrencyChange}
                  reminderTime={reminderTime}
                  onReminderChange={handleReminderChange}
                  securityQuestion={securityQuestion}
                  securityAnswer={securityAnswer}
                  onSetSecurityQuestion={handleSetSecurityQuestion}
                />
              )}
              
              {activeTab === 'sales' && (
                <SalesManager 
                  sales={filteredSales}
                  stock={stock}
                  customCategories={customCategories}
                  onAddSale={handleSale}
                  onDeleteSale={handleDeleteSale}
                  currency={currency}
                  onAddCategory={handleAddCategory}
                  onUpdateCategory={handleUpdateCategory}
                  onDeleteCategory={handleDeleteCategory}
                />
              )}
              
              {activeTab === 'stock' && (
                <StockManager 
                  items={filteredStock}
                  customCategories={customCategories}
                  onAddItem={handleAddStock}
                  onUpdateItem={handleUpdateStock}
                  onDeleteItem={handleDeleteStock}
                  currency={currency}
                  onAddCategory={handleAddCategory}
                  onUpdateCategory={handleUpdateCategory}
                  onDeleteCategory={handleDeleteCategory}
                />
              )}
              
              {activeTab === 'debts' && (
                <DebtManager 
                  debts={filteredDebts}
                  onAddDebt={handleAddDebt}
                  onUpdateDebt={handleUpdateDebt}
                  onToggleDebt={handleToggleDebt}
                  onDeleteDebt={handleDeleteDebt}
                  currency={currency}
                />
              )}
              
              {activeTab === 'expenses' && (
                <ExpenseManager 
                  expenses={filteredExpenses}
                  customCategories={customCategories}
                  onAddExpense={handleAddExpense}
                  onUpdateExpense={handleUpdateExpense}
                  onDeleteExpense={handleDeleteExpense}
                  currency={currency}
                  onAddCategory={handleAddCategory}
                  onUpdateCategory={handleUpdateCategory}
                  onDeleteCategory={handleDeleteCategory}
                  managerPassword={managerPassword}
                />
              )}
              
              {activeTab === 'reports' && (
                <Reports 
                  data={businessData}
                  currency={currency}
                />
              )}
            </>
          )}
        </main>
        
        {showRecordsManager && (
          <RecordsManager 
            onClose={() => setShowRecordsManager(false)}
            data={businessData}
            customCategories={customCategories}
            managerPassword={managerPassword}
            onChangePassword={handleChangePassword}
            onCurrencyChange={handleCurrencyChange}
            onReminderChange={handleReminderChange}
            currency={currency}
            userId={user.id}
            userRole={user.role}
            adminId={adminId}
            onAdminLogin={handleAdminLogin}
          />
        )}
      </div>
    </>
  );

  function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
          active 
            ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-blue-200' 
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-background-alt)] hover:text-[var(--color-text)]'
        }`}
      >
        {icon}
        {label}
      </button>
    );
  }
}

function AppWrapper() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

export default AppWrapper;
