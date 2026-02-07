
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tab, Sale, StockItem, Debt, Expense, BusinessData } from './types';
import Dashboard from './components/Dashboard';
import SalesManager from './components/SalesManager';
import StockManager from './components/StockManager';
import DebtManager from './components/DebtManager';
import ExpenseManager from './components/ExpenseManager';
import Reports from './components/Reports';
import SearchBar from './components/SearchBar';
import Notification, { NotificationType } from './components/Notification';
import WarningStatusBar from './components/WarningStatusBar';
import ThemeSwitcher from './components/ThemeSwitcher';
import RecordsManager from './components/RecordsManager';
import Auth from './components/Auth';
import StoragePermission from './components/StoragePermission';
import { ThemeProvider } from './contexts/ThemeContext';
import * as db from './services/db';
import { triggerAutoSync, isDeviceSyncEnabled } from './services/fileSystem';
import { User } from './services/db';
import { 
  DashboardIcon, 
  SalesIcon, 
  StockIcon, 
  DebtIcon, 
  ExpenseIcon, 
  ReportsIcon,
  ClockIcon,
  FolderIcon
} from './components/Icons';

interface SearchResult {
  id: string;
  name: string;
  type: 'stock' | 'sale' | 'debt' | 'expense';
  quantity?: number;
  amount?: number;
}

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (error: Error) => {
      setError(error);
      setHasError(true);
    };
    return () => {};
  }, []);

  if (hasError) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-background)] p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
          <p className="text-[var(--color-text-muted)] mb-4">{error?.message || 'Unknown error'}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-primary-hover)]"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return children;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  
  const [sales, setSales] = useState<Sale[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('zion_custom_categories');
    return saved ? JSON.parse(saved) : [];
  });

  const [notification, setNotification] = useState<{ message: string, type: NotificationType } | null>(null);
  const [managerPassword, setManagerPassword] = useState(() => localStorage.getItem('zion_manager_pass') || '1234');
  const [currency, setCurrency] = useState(() => localStorage.getItem('zion_currency') || '$');
  const [reminderTime, setReminderTime] = useState(() => localStorage.getItem('zion_reminder_time') || '18:00');
  const [lastAlarmShown, setLastAlarmShown] = useState<string | null>(null);
  const [showRecordsManager, setShowRecordsManager] = useState(false);
  const [showStoragePrompt, setShowStoragePrompt] = useState(false);
  const [deviceSyncEnabled, setDeviceSyncEnabled] = useState(false);

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

  // Save custom categories to localStorage
  useEffect(() => {
    localStorage.setItem('zion_custom_categories', JSON.stringify(customCategories));
  }, [customCategories]);

  // Check for existing user session
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedUser = localStorage.getItem('zion_user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          try {
            const { user: freshUser } = await db.getUserProfile(parsedUser.id);
            setUser(freshUser);
          } catch {
            localStorage.removeItem('zion_user');
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

  // Storage permission handler
  const handleStorageGranted = () => {
    setShowStoragePrompt(false);
    setDeviceSyncEnabled(true);
    showNotification('Auto-sync to device enabled!', 'success');
  };

  const handleStorageDenied = () => {
    setShowStoragePrompt(false);
    setDeviceSyncEnabled(false);
  };

  // Trigger auto sync when data changes
  const triggerSync = useCallback(() => {
    if (deviceSyncEnabled) {
      triggerAutoSync({ sales, stock, debts, expenses, businessName: user?.businessName });
    }
  }, [sales, stock, debts, expenses, deviceSyncEnabled, user?.businessName]);

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
        // Show storage permission prompt after data loads
        if (!isDeviceSyncEnabled()) {
          setShowStoragePrompt(true);
        }
      }
    };
    loadData();
  }, [user, showNotification]);

  const businessData: BusinessData = { sales, stock, debts, expenses };

  const filteredSales = useMemo(() => sales.filter(s => s.itemName.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => b.date - a.date), [sales, searchQuery]);
  const filteredStock = useMemo(() => stock.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => b.lastUpdated - a.lastUpdated), [stock, searchQuery]);
  const filteredDebts = useMemo(() => debts.filter(d => d.debtorName.toLowerCase().includes(searchQuery.toLowerCase()) || d.phoneNumber.includes(searchQuery)).sort((a, b) => b.date - a.date), [debts, searchQuery]);
  const filteredExpenses = useMemo(() => expenses.filter(e => e.category.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => b.date - a.date), [expenses, searchQuery]);

  const searchResults: SearchResult[] = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const results: SearchResult[] = [];
    
    stock.forEach(item => {
      if (item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        results.push({
          id: item.id,
          name: item.name,
          type: 'stock',
          quantity: item.quantity
        });
      }
    });
    
    sales.forEach(sale => {
      if (sale.itemName.toLowerCase().includes(searchQuery.toLowerCase())) {
        results.push({
          id: sale.id,
          name: sale.itemName,
          type: 'sale',
          quantity: sale.quantity,
          amount: sale.price * sale.quantity
        });
      }
    });
    
    debts.forEach(debt => {
      if (debt.debtorName.toLowerCase().includes(searchQuery.toLowerCase())) {
        results.push({
          id: debt.id,
          name: debt.debtorName,
          type: 'debt',
          amount: debt.amount
        });
      }
    });
    
    expenses.forEach(expense => {
      if (expense.category.toLowerCase().includes(searchQuery.toLowerCase())) {
        results.push({
          id: expense.id,
          name: expense.category,
          type: 'expense',
          amount: expense.amount
        });
      }
    });
    
    return results;
  }, [searchQuery, stock, sales, debts, expenses]);

  const handleSearchSelect = (result: SearchResult) => {
    switch (result.type) {
      case 'stock':
        setActiveTab('stock');
        break;
      case 'sale':
        setActiveTab('sales');
        break;
      case 'debt':
        setActiveTab('debts');
        break;
      case 'expense':
        setActiveTab('expenses');
        break;
    }
    setSearchQuery('');
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('zion_user');
    setUser(null);
    setSales([]);
    setStock([]);
    setDebts([]);
    setExpenses([]);
  };

  const handleSale = async (newSale: Sale) => {
    await db.saveSale(newSale);
    await db.updateStockQuantity(newSale.itemName, -newSale.quantity);
    setSales(prev => [newSale, ...prev]);
    setStock(prev => prev.map(item => item.name.toLowerCase() === newSale.itemName.toLowerCase() ? { ...item, quantity: item.quantity - newSale.quantity, lastUpdated: Date.now() } : item));
    showNotification("Sale recorded!");
    triggerSync();
  };

  const handleDeleteSale = (id: string) => verifyAction(async () => {
    await db.deleteSale(id);
    setSales(prev => prev.filter(s => s.id !== id));
    showNotification("Sale record deleted.");
    triggerSync();
  });

  const handleAddStock = async (item: StockItem) => {
    await db.saveStock(item);
    setStock(prev => [item, ...prev]);
    showNotification("Stock added.");
    triggerSync();
  };

  const handleUpdateStock = async (item: StockItem) => {
    await db.updateStockItem(item);
    setStock(prev => prev.map(s => s.id === item.id ? item : s));
    showNotification("Stock item updated.");
    triggerSync();
  };

  const handleDeleteStock = (id: string) => verifyAction(async () => {
    await db.deleteStock(id);
    setStock(prev => prev.filter(s => s.id !== id));
    showNotification("Stock record deleted.");
    triggerSync();
  });

  const handleAddDebt = async (d: Debt) => {
    await db.saveDebt(d);
    setDebts(prev => [d, ...prev]);
    showNotification("Debt recorded.");
    triggerSync();
  };

  const handleUpdateDebt = async (debt: Debt) => {
    await db.updateDebtItem(debt);
    setDebts(prev => prev.map(d => d.id === debt.id ? debt : d));
    showNotification("Debt updated.");
    triggerSync();
  };

  const handleToggleDebt = async (id: string) => {
    await db.toggleDebtStatus(id);
    setDebts(prev => prev.map(d => d.id === id ? {...d, isPaid: !d.isPaid} : d));
    showNotification("Debt status changed.");
    triggerSync();
  };

  const handleDeleteDebt = (id: string) => verifyAction(async () => {
    await db.deleteDebt(id);
    setDebts(prev => prev.filter(d => d.id !== id));
    showNotification("Debt record deleted.");
    triggerSync();
  });

  const handleAddExpense = async (e: Expense) => {
    await db.saveExpense(e);
    setExpenses(prev => [e, ...prev]);
    showNotification("Expense logged.");
    triggerSync();
  };

  const handleDeleteExpense = (id: string) => verifyAction(async () => {
    await db.deleteExpense(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    showNotification("Expense record deleted.");
    triggerSync();
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

  const handleChangePassword = (newPass: string) => {
    setManagerPassword(newPass);
    localStorage.setItem('zion_manager_pass', newPass);
    showNotification("Password changed.");
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    localStorage.setItem('zion_currency', newCurrency);
    showNotification(`Currency updated.`);
  };

  const handleReminderChange = (time: string) => {
    setReminderTime(time);
    localStorage.setItem('zion_reminder_time', time);
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
      {showStoragePrompt && (
        <StoragePermission 
          onPermissionGranted={handleStorageGranted}
          onPermissionDenied={handleStorageDenied}
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
        
        <aside className="hidden md:flex flex-col w-64 bg-white border-r h-full fixed left-0 top-0 p-6 shadow-xl shadow-slate-200/50">
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
            <div className="hidden md:block text-right mr-2">
              <p className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-widest">User</p>
              <p className="text-sm font-bold text-[var(--color-text)]">{user.fullName}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
            </button>
            <ThemeSwitcher />
          </div>
        </header>

        <main className="p-4 md:p-10 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <Dashboard 
              data={businessData} 
              onChangePassword={handleChangePassword} 
              currentPassword={managerPassword} 
              currency={currency}
              onCurrencyChange={handleCurrencyChange}
              reminderTime={reminderTime}
              onReminderChange={handleReminderChange}
            />
          )}
          {activeTab === 'sales' && (
            <SalesManager 
              items={filteredSales} 
              stock={stock} 
              customCategories={customCategories}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onAdd={handleSale} 
              onDelete={handleDeleteSale}
              currency={currency}
            />
          )}
          {activeTab === 'stock' && (
            <StockManager 
              items={filteredStock} 
              onAdd={handleAddStock} 
              onUpdate={handleUpdateStock}
              onDelete={handleDeleteStock}
              managerPassword={managerPassword}
              currency={currency}
            />
          )}
          {activeTab === 'debts' && (
            <DebtManager 
              items={filteredDebts} 
              onAdd={handleAddDebt} 
              onUpdate={handleUpdateDebt}
              onToggle={handleToggleDebt} 
              onDelete={handleDeleteDebt}
              managerPassword={managerPassword}
              currency={currency}
            />
          )}
          {activeTab === 'expenses' && (
            <ExpenseManager 
              items={filteredExpenses} 
              customCategories={customCategories}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onAdd={handleAddExpense} 
              onDelete={handleDeleteExpense}
              currency={currency}
            />
          )}
          {activeTab === 'reports' && <Reports data={businessData} currency={currency} />}
        </main>

        <WarningStatusBar data={businessData} onNavigate={setActiveTab} />

        {showRecordsManager && <RecordsManager onClose={() => setShowRecordsManager(false)} />}

        <nav className="md:hidden fixed bottom-6 left-6 right-6 bg-[var(--color-surface)]/90 backdrop-blur-lg border border-[var(--color-surface-border)] rounded-3xl flex justify-around items-center p-3 z-50 shadow-2xl shadow-[var(--color-primary)]/10">
          <MobileNavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<DashboardIcon />} label="Home" />
          <MobileNavButton active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} icon={<SalesIcon />} label="Sales" />
          <MobileNavButton active={activeTab === 'stock'} onClick={() => setActiveTab('stock')} icon={<StockIcon />} label="Stock" />
          <MobileNavButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<ReportsIcon />} label="Reports" />
        </nav>
      </div>
    </>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ${active ? 'bg-[var(--color-primary)] text-[var(--color-text-inverse)] font-bold shadow-xl shadow-[var(--color-primary)]/20 scale-[1.02]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-background-alt)] hover:text-[var(--color-text)]'}`}>
    <span className="text-xl">{icon}</span>
    <span className="text-sm tracking-tight">{label}</span>
  </button>
);

const MobileNavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center py-2 px-3 rounded-2xl transition-all duration-300 ${active ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 scale-110' : 'text-[var(--color-text-muted)]'}`}>
    <span className="text-2xl">{icon}</span>
    <span className="text-[10px] font-black mt-1 uppercase tracking-tighter">{label}</span>
  </button>
);

export default function AppWrapper() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
