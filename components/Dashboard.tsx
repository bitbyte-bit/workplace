
import React, { useState, useMemo } from 'react';
import { BusinessData } from '../types';
import { SparkleIcon, BellIcon, ClockIcon, TrendingIcon, LockIcon, UnlockIcon, ExchangeIcon, CheckCircleIcon, PackageIcon, SalesIcon, XIcon } from './Icons';
import { isExpenseDueSoon } from '../utils/expenseUtils';
import { useTheme } from '../contexts/ThemeContext';
import PasswordModal from './PasswordModal';

interface Props {
  data: BusinessData;
  currentPassword?: string;
  onChangePassword?: (pass: string) => void;
  currency: string;
  onCurrencyChange?: (currency: string) => void;
  reminderTime?: string;
  onReminderChange?: (time: string) => void;
  onNavigate?: (tab: string) => void;
}

const EXCHANGE_RATES: Record<string, number> = {
  '$': 1,
  '£': 0.79,
  '€': 0.92,
  '₦': 1500,
  'USHs': 3800,
  'KSHs': 130,
  'TZS': 2580
};

const Dashboard: React.FC<Props> = ({ 
  data, currentPassword, onChangePassword, currency, onCurrencyChange, reminderTime, onReminderChange 
}) => {
  const { colors } = useTheme();
  const [insights] = useState<string[]>([
    "Review your stock levels weekly to avoid stockouts on popular items.",
    "Track your profit margins on each product to identify high-performing items.",
    "Set up regular debt follow-ups to improve cash flow.",
    "Monitor expenses monthly to identify cost-saving opportunities."
  ]);
  const [showSettings, setShowSettings] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  const [showPassModal, setShowPassModal] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [pendingAction, setPendingAction] = useState<{ type: string, value?: any } | null>(null);

  // Individual modals state
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const [tempTime, setTempTime] = useState(reminderTime || '18:00');

  const convertedValue = useMemo(() => {
    return 0;
  }, []);

  const totalSales = (data.sales || []).reduce((acc, s) => acc + (s.price * s.quantity), 0);
  const totalCost = (data.sales || []).reduce((acc, s) => acc + (s.cost * s.quantity), 0);
  const grossProfit = totalSales - totalCost;
  const totalExpenses = (data.expenses || []).reduce((acc, e) => acc + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;
  const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  const lowStockItems = useMemo(() => (data.stock || []).filter(item => item.quantity <= (item.lowStockThreshold || 5)), [data.stock]);
  const upcomingExpenses = useMemo(() => (data.expenses || []).filter(e => e.frequency !== 'none' && isExpenseDueSoon(e)), [data.expenses]);

  // Analytics: Total items in stock
  const totalStockItems = useMemo(() => {
    return (data.stock || []).reduce((acc, item) => acc + item.quantity, 0);
  }, [data.stock]);

  // Analytics: Items sold this month
  const itemsSoldThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return (data.sales || [])
      .filter(sale => sale.date >= startOfMonth)
      .reduce((acc, sale) => acc + sale.quantity, 0);
  }, [data.sales]);

  const initiateAction = (type: string, value?: any) => {
    if (isUnlocked && type !== 'changePassword' && type !== 'unlock') {
       executeAction(type, value);
    } else {
      setPendingAction({ type, value });
      setShowPassModal(true);
    }
  };

  const handlePassVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (passInput === currentPassword) {
      if (pendingAction) {
        executeAction(pendingAction.type, pendingAction.value);
      }
      setIsUnlocked(true);
      setShowPassModal(false);
      setPassInput('');
      setPendingAction(null);
    } else {
      alert("Invalid Password. Access Denied.");
      setPassInput('');
    }
  };

  const executeAction = (type: string, value?: any) => {
    switch (type) {
      case 'unlock':
        setIsUnlocked(true);
        setShowUnlockModal(false);
        break;
      case 'setAlarm':
        onReminderChange?.(tempTime);
        break;
      case 'setCurrency':
        setShowCurrencyModal(true);
        break;
      case 'changePassword':
        const newP = prompt("Enter New Manager PIN:");
        if (newP) onChangePassword?.(newP);
        break;
    }
  };

  const StatCard = ({ title, value, color = "blue", icon, colors }: any) => {
    const colorMap: Record<string, string> = {
      blue: colors.primary,
      red: '#ef4444',
      green: '#22c55e',
      amber: '#f59e0b',
      emerald: '#10b981',
      violet: '#8b5cf6',
    };
    
    return (
      <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-surface-border)] shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: colors.textMuted }}>{title}</span>
          {icon && <div className="p-2 rounded-lg" style={{ backgroundColor: `${colorMap[color]}20` }}>{React.cloneElement(icon, { className: "w-4 h-4", style: { color: colorMap[color] } })}</div>}
        </div>
        <p className="text-2xl font-black" style={{ color: colorMap[color] }}>{value}</p>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {showPassModal && (
        <PasswordModal
          isOpen={showPassModal}
          onClose={() => {
            setShowPassModal(false);
            setPassInput('');
            setPendingAction(null);
          }}
          onConfirm={(password: string) => {
            if (password === currentPassword) {
              if (pendingAction) {
                executeAction(pendingAction.type, pendingAction.value);
              }
              setIsUnlocked(true);
              setShowPassModal(false);
              setPassInput('');
              setPendingAction(null);
            } else {
              alert("Invalid Password. Access Denied.");
              setPassInput('');
            }
          }}
          title="Manager Verification"
          message="Enter your PIN to perform sensitive actions"
          confirmText="Verify"
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Gross Profit" value={`${currency}${grossProfit.toLocaleString()}`} icon={<TrendingIcon className="" />} colors={colors} />
        <StatCard title="Expenses" value={`${currency}${totalExpenses.toLocaleString()}`} color="red" colors={colors} />
        <StatCard title="Net Profit" value={`${currency}${netProfit.toLocaleString()}`} color={netProfit >= 0 ? 'green' : 'red'} colors={colors} />
        <StatCard title="Margin" value={`${profitMargin.toFixed(1)}%`} color={profitMargin > 15 ? 'green' : 'amber'} colors={colors} />
      </div>

      {isUnlocked && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Stock Items" value={totalStockItems.toLocaleString()} icon={<PackageIcon className="" />} color="emerald" colors={colors} />
          <StatCard title="Sold This Month" value={itemsSoldThisMonth.toLocaleString()} icon={<SalesIcon className="" />} color="violet" colors={colors} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--color-surface)] p-8 rounded-[2rem] border border-[var(--color-surface-border)] shadow-xl" style={{ boxShadow: `0 20px 25px -5px ${colors.primary}10` }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black" style={{ color: colors.text }}>Financial Overview</h2>
                <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: colors.textMuted }}>Profit & Loss Summary</p>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: `${colors.primary}20` }}>
                <TrendingIcon className="w-6 h-6" style={{ color: colors.primary }} />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[var(--color-background-alt)] rounded-xl">
                <span className="font-bold" style={{ color: colors.text }}>Gross Profit</span>
                <span className="font-black text-lg" style={{ color: colors.primary }}>{currency}{grossProfit.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[var(--color-background-alt)] rounded-xl">
                <span className="font-bold" style={{ color: colors.text }}>Total Expenses</span>
                <span className="font-black text-lg text-red-500">{currency}{totalExpenses.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[var(--color-background-alt)] rounded-xl border-2" style={{ borderColor: netProfit >= 0 ? '#22c55e' : '#ef4444' }}>
                <span className="font-bold" style={{ color: colors.text }}>Net Profit</span>
                <span className="font-black text-lg" style={{ color: netProfit >= 0 ? '#22c55e' : '#ef4444' }}>{currency}{netProfit.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[var(--color-surface-border)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.textMuted }}>Profit Margin</span>
                <span className="text-sm font-bold" style={{ color: profitMargin >= 15 ? '#22c55e' : profitMargin >= 5 ? '#f59e0b' : '#ef4444' }}>{profitMargin.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-[var(--color-background-alt)] rounded-full mt-2 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(profitMargin, 100)}%`, backgroundColor: profitMargin >= 15 ? '#22c55e' : profitMargin >= 5 ? '#f59e0b' : '#ef4444' }}></div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] p-8 rounded-[2rem] border border-[var(--color-surface-border)] shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black" style={{ color: colors.text }}>Quick Actions</h2>
                <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: colors.textMuted }}>Common Tasks</p>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: `${colors.primary}20` }}>
                <SparkleIcon className="w-6 h-6" style={{ color: colors.primary }} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => initiateAction('changePassword')} className="p-4 bg-[var(--color-background-alt)] hover:bg-[var(--color-background)] rounded-xl transition-all group text-left">
                <div className="p-2 rounded-lg inline-block mb-2 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${colors.primary}20` }}>
                  <LockIcon className="w-5 h-5" style={{ color: colors.primary }} />
                </div>
                <p className="font-bold text-sm" style={{ color: colors.text }}>Change PIN</p>
                <p className="text-xs mt-1" style={{ color: colors.textMuted }}>Update manager PIN</p>
              </button>
              
              <button onClick={() => initiateAction('setAlarm')} className="p-4 bg-[var(--color-background-alt)] hover:bg-[var(--color-background)] rounded-xl transition-all group text-left">
                <div className="p-2 rounded-lg inline-block mb-2 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${colors.primary}20` }}>
                  <BellIcon className="w-5 h-5" style={{ color: colors.primary }} />
                </div>
                <p className="font-bold text-sm" style={{ color: colors.text }}>Set Reminder</p>
                <p className="text-xs mt-1" style={{ color: colors.textMuted }}>Daily reminder time</p>
              </button>
              
              <button onClick={() => initiateAction('setCurrency')} className="p-4 bg-[var(--color-background-alt)] hover:bg-[var(--color-background)] rounded-xl transition-all group text-left">
                <div className="p-2 rounded-lg inline-block mb-2 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${colors.primary}20` }}>
                  <ExchangeIcon className="w-5 h-5" style={{ color: colors.primary }} />
                </div>
                <p className="font-bold text-sm" style={{ color: colors.text }}>Set Currency</p>
                <p className="text-xs mt-1" style={{ color: colors.textMuted }}>Display currency</p>
              </button>
              
              <button onClick={() => setIsUnlocked(true)} className="p-4 bg-[var(--color-background-alt)] hover:bg-[var(--color-background)] rounded-xl transition-all group text-left">
                <div className="p-2 rounded-lg inline-block mb-2 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${colors.primary}20` }}>
                  <CheckCircleIcon className="w-5 h-5" style={{ color: colors.primary }} />
                </div>
                <p className="font-bold text-sm" style={{ color: colors.text }}>Unlock All</p>
                <p className="text-xs mt-1" style={{ color: colors.textMuted }}>Show hidden data</p>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] p-6 rounded-[2rem] border border-[var(--color-surface-border)] shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg" style={{ color: colors.text }}>Low Stock Alert</h3>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-600">{lowStockItems.length}</span>
            </div>
            <div className="space-y-3">
              {lowStockItems.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: colors.textMuted }}>All stock levels are healthy!</p>
              ) : (
                lowStockItems.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                    <div>
                      <p className="font-bold text-sm" style={{ color: colors.text }}>{item.name}</p>
                      <p className="text-xs" style={{ color: colors.textMuted }}>Only {item.quantity} left</p>
                    </div>
                    <div className="p-2 rounded-lg bg-red-100">
                      <PackageIcon className="w-4 h-4 text-red-600" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-[var(--color-surface)] p-6 rounded-[2rem] border border-[var(--color-surface-border)] shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg" style={{ color: colors.text }}>Smart Insights</h3>
              <SparkleIcon className="w-5 h-5" style={{ color: colors.primary }} />
            </div>
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <div key={i} className="p-3 bg-[var(--color-background-alt)] rounded-xl text-sm" style={{ color: colors.text }}>
                  {insight}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Currency Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 bg-[var(--color-background)]/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[var(--color-surface)] rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl border border-[var(--color-surface-border)] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black" style={{ color: colors.text }}>Set Currency</h3>
              <button onClick={() => setShowCurrencyModal(false)} className="p-2 hover:bg-[var(--color-background-alt)] rounded-xl transition-colors">
                <XIcon className="w-5 h-5" style={{ color: colors.textMuted }} />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm" style={{ color: colors.textMuted }}>Select your display currency</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(EXCHANGE_RATES).map(curr => (
                  <button
                    key={curr}
                    onClick={() => {
                      onCurrencyChange?.(curr);
                      setShowCurrencyModal(false);
                    }}
                    className={`px-6 py-3 rounded-xl font-bold transition-all ${
                      currency === curr 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'bg-[var(--color-background-alt)] hover:bg-[var(--color-background)]'
                    }`}
                    style={{ 
                      color: currency === curr ? 'white' : colors.text 
                    }}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mt-8">
              <button 
                onClick={() => setShowCurrencyModal(false)}
                className="w-full py-4 text-xs font-black uppercase tracking-widest hover:opacity-70 transition-colors rounded-2xl"
                style={{ color: colors.textMuted, backgroundColor: colors.backgroundAlt }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-[var(--color-background)]/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[var(--color-surface)] rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl border border-[var(--color-surface-border)] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black" style={{ color: colors.text }}>Set Reminder</h3>
              <button onClick={() => setShowReminderModal(false)} className="p-2 hover:bg-[var(--color-background-alt)] rounded-xl transition-colors">
                <XIcon className="w-5 h-5" style={{ color: colors.textMuted }} />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm" style={{ color: colors.textMuted }}>Set daily reminder time for taking records</p>
              <div className="flex items-center gap-3 p-4 bg-[var(--color-background-alt)] rounded-xl">
                <BellIcon className="w-5 h-5" style={{ color: colors.primary }} />
                <input
                  type="time"
                  value={tempTime}
                  onChange={(e) => setTempTime(e.target.value)}
                  className="flex-1 bg-transparent outline-none font-bold text-lg"
                  style={{ color: colors.text }}
                />
              </div>
            </div>
            
            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setShowReminderModal(false)}
                className="flex-1 py-4 text-xs font-black uppercase tracking-widest hover:opacity-70 transition-colors rounded-2xl"
                style={{ color: colors.textMuted, backgroundColor: colors.backgroundAlt }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onReminderChange?.(tempTime);
                  setShowReminderModal(false);
                }}
                className="flex-[2] py-4 text-white text-xs font-black rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                style={{ backgroundColor: colors.primary }}
              >
                Save Reminder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 bg-[var(--color-background)]/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[var(--color-surface)] rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl border border-[var(--color-surface-border)] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black" style={{ color: colors.text }}>Unlock Hidden Data</h3>
              <button onClick={() => setShowUnlockModal(false)} className="p-2 hover:bg-[var(--color-background-alt)] rounded-xl transition-colors">
                <XIcon className="w-5 h-5" style={{ color: colors.textMuted }} />
              </button>
            </div>
            
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-full mx-auto w-16 h-16 flex items-center justify-center" style={{ backgroundColor: `${colors.primary}20` }}>
                <UnlockIcon className="w-8 h-8" style={{ color: colors.primary }} />
              </div>
              <p className="text-sm" style={{ color: colors.textMuted }}>Enter your PIN to unlock hidden data and statistics</p>
            </div>
            
            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setShowUnlockModal(false)}
                className="flex-1 py-4 text-xs font-black uppercase tracking-widest hover:opacity-70 transition-colors rounded-2xl"
                style={{ color: colors.textMuted, backgroundColor: colors.backgroundAlt }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setIsUnlocked(true);
                  setShowUnlockModal(false);
                }}
                className="flex-[2] py-4 text-white text-xs font-black rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                style={{ backgroundColor: colors.primary }}
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
