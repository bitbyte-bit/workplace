
import React, { useState, useEffect, useMemo, useCallback, Component, ErrorInfo } from 'react';
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
import * as db from './services/db';
import { 
  DashboardIcon, 
  SalesIcon, 
  StockIcon, 
  DebtIcon, 
  ExpenseIcon, 
  ReportsIcon,
  ClockIcon
} from './components/Icons';

// Error boundary to catch rendering errors
class ErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-50 p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-slate-600 mb-4">{this.state.error?.message || 'Unknown error'}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [sales, setSales] = useState<Sale[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [notification, setNotification] = useState<{ message: string, type: NotificationType } | null>(null);
  const [managerPassword, setManagerPassword] = useState(() => localStorage.getItem('zion_manager_pass') || '1234');
  const [currency, setCurrency] = useState(() => localStorage.getItem('zion_currency') || '$');
  const [reminderTime, setReminderTime] = useState(() => localStorage.getItem('zion_reminder_time') || '18:00');
  const [lastAlarmShown, setLastAlarmShown] = useState<string | null>(null);

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

  useEffect(() => {
    const alarmInterval = setInterval(() => {
      const now = new Date();
      const currentHM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const todayDate = now.toDateString();

      if (currentHM === reminderTime && lastAlarmShown !== todayDate) {
        showNotification("⏰ Time to record your business records for today!", "success");
        setLastAlarmShown(todayDate);
        try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play(); } catch(e){}
      }
    }, 30000);

    return () => clearInterval(alarmInterval);
  }, [reminderTime, lastAlarmShown, showNotification]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await db.initDB();
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
  }, [showNotification]);

  const businessData: BusinessData = { sales, stock, debts, expenses };

  const filteredSales = useMemo(() => sales.filter(s => s.itemName.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => b.date - a.date), [sales, searchQuery]);
  const filteredStock = useMemo(() => stock.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => b.lastUpdated - a.lastUpdated), [stock, searchQuery]);
  const filteredDebts = useMemo(() => debts.filter(d => d.debtorName.toLowerCase().includes(searchQuery.toLowerCase()) || d.phoneNumber.includes(searchQuery)).sort((a, b) => b.date - a.date), [debts, searchQuery]);
  const filteredExpenses = useMemo(() => expenses.filter(e => e.category.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => b.date - a.date), [expenses, searchQuery]);

  const handleSale = async (newSale: Sale) => {
    await db.saveSale(newSale);
    await db.updateStockQuantity(newSale.itemName, -newSale.quantity);
    setSales(prev => [newSale, ...prev]);
    setStock(prev => prev.map(item => item.name.toLowerCase() === newSale.itemName.toLowerCase() ? { ...item, quantity: item.quantity - newSale.quantity, lastUpdated: Date.now() } : item));
    showNotification("Sale recorded!");
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

  const handleDeleteExpense = (id: string) => verifyAction(async () => {
    await db.deleteExpense(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    showNotification("Expense record deleted.");
  });

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

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white p-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-blue-600 tracking-widest">ZION</div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-32 md:pb-16 md:pl-64 transition-colors duration-500">
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
        </nav>
        <div className="mt-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Reminder</p>
          <div className="flex items-center gap-2 text-blue-600 font-bold">
            <ClockIcon className="w-4 h-4" /> {reminderTime}
          </div>
        </div>
      </aside>

      <header className="bg-white/80 backdrop-blur-md border-b px-6 py-4 sticky top-0 z-40 shadow-sm flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-800 capitalize md:hidden">Zion</h2>
        <div className="flex-1 max-w-xl md:mx-auto">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
        <div className="md:w-10"></div>
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
            customCategories={[]}
            onAddCategory={() => {}}
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
            customCategories={[]}
            onAddCategory={() => {}}
            onAdd={handleAddExpense} 
            onDelete={handleDeleteExpense}
            currency={currency}
          />
        )}
        {activeTab === 'reports' && <Reports data={businessData} currency={currency} />}
      </main>

      <WarningStatusBar data={businessData} onNavigate={setActiveTab} />

      <nav className="md:hidden fixed bottom-6 left-6 right-6 bg-white/90 backdrop-blur-lg border border-slate-200 rounded-3xl flex justify-around items-center p-3 z-50 shadow-2xl shadow-blue-500/10">
        <MobileNavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<DashboardIcon />} label="Home" />
        <MobileNavButton active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} icon={<SalesIcon />} label="Sales" />
        <MobileNavButton active={activeTab === 'stock'} onClick={() => setActiveTab('stock')} icon={<StockIcon />} label="Stock" />
        <MobileNavButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<ReportsIcon />} label="Reports" />
      </nav>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ${active ? 'bg-blue-600 text-white font-bold shadow-xl shadow-blue-200 scale-[1.02]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
    <span className="text-xl">{icon}</span>
    <span className="text-sm tracking-tight">{label}</span>
  </button>
);

const MobileNavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center py-2 px-3 rounded-2xl transition-all duration-300 ${active ? 'text-blue-600 bg-blue-50/50 scale-110' : 'text-slate-400'}`}>
    <span className="text-2xl">{icon}</span>
    <span className="text-[10px] font-black mt-1 uppercase tracking-tighter">{label}</span>
  </button>
);

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
