
import React, { useState, useEffect, useMemo } from 'react';
import { BusinessData } from '../types';
import { getBusinessInsights } from '../services/geminiService';
import { SparkleIcon, BellIcon, ClockIcon, TrendingIcon, LockIcon, UnlockIcon, ExchangeIcon, AlertCircleIcon, CheckCircleIcon, PackageIcon, SalesIcon } from './Icons';
import { isExpenseDueSoon } from '../utils/expenseUtils';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  data: BusinessData;
  currentPassword: string;
  onChangePassword: (pass: string) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
  reminderTime: string;
  onReminderChange: (time: string) => void;
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
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  const [showPassModal, setShowPassModal] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [pendingAction, setPendingAction] = useState<{ type: string, value?: any } | null>(null);

  const [tempTime, setTempTime] = useState(reminderTime);
  const [selectedCurrency, setSelectedCurrency] = useState(currency);

  // Currency Converter State
  const [convAmount, setConvAmount] = useState<number>(0);
  const [convFrom, setConvFrom] = useState('$');
  const [convTo, setConvTo] = useState('USHs');

  const totalSales = data.sales.reduce((acc, s) => acc + (s.price * s.quantity), 0);
  const totalCost = data.sales.reduce((acc, s) => acc + (s.cost * s.quantity), 0);
  const grossProfit = totalSales - totalCost;
  const totalExpenses = data.expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;
  const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  const lowStockItems = useMemo(() => data.stock.filter(item => item.quantity <= (item.lowStockThreshold || 5)), [data.stock]);
  const upcomingExpenses = useMemo(() => data.expenses.filter(e => e.frequency !== 'none' && isExpenseDueSoon(e)), [data.expenses]);

  // Analytics: Total items in stock
  const totalStockItems = useMemo(() => {
    return data.stock.reduce((acc, item) => acc + item.quantity, 0);
  }, [data.stock]);

  // Analytics: Items sold this month
  const itemsSoldThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return data.sales
      .filter(sale => sale.date >= startOfMonth)
      .reduce((acc, sale) => acc + sale.quantity, 0);
  }, [data.sales]);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoadingInsights(true);
      const advice = await getBusinessInsights(data);
      setInsights(advice);
      setLoadingInsights(false);
    };
    fetchInsights();
  }, [data]);

  const initiateAction = (type: string, value?: any) => {
    if (isUnlocked && type !== 'changePassword') {
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
        break;
      case 'setAlarm':
        onReminderChange(tempTime);
        break;
      case 'setCurrency':
        onCurrencyChange(selectedCurrency);
        break;
      case 'changePassword':
        const newP = prompt("Enter New Manager PIN:");
        if (newP) onChangePassword(newP);
        break;
    }
  };

  const convertedValue = useMemo(() => {
    const usdAmount = convAmount / (EXCHANGE_RATES[convFrom] || 1);
    return usdAmount * (EXCHANGE_RATES[convTo] || 1);
  }, [convAmount, convFrom, convTo]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {showPassModal && (
        <div className="fixed inset-0 bg-[var(--color-background)]/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <form onSubmit={handlePassVerify} className="bg-[var(--color-surface)] rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl border border-[var(--color-surface-border)] flex flex-col items-center animate-in zoom-in-95 duration-300">
            <div className="p-4 rounded-full mb-4" style={{ backgroundColor: `${colors.primary}20` }}>
              <LockIcon className="w-8 h-8" style={{ color: colors.primary }} />
            </div>
            <h4 className="text-xl font-black mb-2" style={{ color: colors.text }}>Manager Verification</h4>
            <p className="text-xs font-bold uppercase tracking-widest text-center mb-6" style={{ color: colors.textMuted }}>Enter your PIN to perform sensitive actions</p>
            <input 
              autoFocus
              type="password" 
              value={passInput} 
              onChange={e => setPassInput(e.target.value)}
              placeholder="••••"
              className="w-full text-center text-3xl tracking-[0.5em] p-4 bg-[var(--color-background-alt)] border border-[var(--color-surface-border)] rounded-2xl outline-none focus:ring-4 mb-6 font-black"
              style={{ 
                '--tw-ring-color': `${colors.primary}40`,
                color: colors.text,
              } as React.CSSProperties}
            />
            <div className="flex gap-2 w-full">
              <button type="button" onClick={() => { setShowPassModal(false); setPassInput(''); }} className="flex-1 py-4 text-xs font-black uppercase tracking-widest hover:opacity-70 transition-colors" style={{ color: colors.textMuted }}>Cancel</button>
              <button type="submit" className="flex-[2] py-4 text-white text-xs font-black rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest" style={{ backgroundColor: colors.text, color: colors.textInverse }}>Verify PIN</button>
            </div>
          </form>
        </div>
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
            <h3 className="text-xl font-black mb-6 flex items-center gap-3" style={{ color: colors.text }}>
              <div className="p-2 rounded-xl" style={{ backgroundColor: `${colors.primary}20` }}><SparkleIcon className="" style={{ color: colors.primary }} /></div>
              Zion Intelligence
            </h3>
            {loadingInsights ? (
              <div className="space-y-4">
                <div className="h-10 bg-[var(--color-background-alt)] animate-pulse rounded-2xl w-full"></div>
                <div className="h-10 bg-[var(--color-background-alt)] animate-pulse rounded-2xl w-4/5"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((tip, i) => (
                  <div key={i} className="group p-5 bg-[var(--color-background-alt)] hover:bg-[var(--color-primary)]/10 border border-[var(--color-surface-border)] rounded-2xl transition-all duration-300">
                    <p className="text-sm font-medium leading-relaxed italic" style={{ color: colors.text }}>"{tip}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Currency Converter Section */}
          <div className="bg-[var(--color-surface)] p-8 rounded-[2rem] border border-[var(--color-surface-border)] shadow-xl" style={{ boxShadow: `0 20px 25px -5px ${colors.primary}10` }}>
            <h3 className="text-xl font-black mb-6 flex items-center gap-3" style={{ color: colors.text }}>
              <div className="p-2 rounded-xl" style={{ backgroundColor: `${colors.secondary}20` }}><ExchangeIcon className="" style={{ color: colors.secondary }} /></div>
              East African Converter
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: colors.textMuted }}>From</label>
                <div className="flex gap-2">
                  <select value={convFrom} onChange={e => setConvFrom(e.target.value)} className="w-20 p-3 bg-[var(--color-background-alt)] border border-[var(--color-surface-border)] rounded-2xl outline-none text-xs font-bold" style={{ color: colors.text }}>
                    {Object.keys(EXCHANGE_RATES).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="number" value={convAmount} onChange={e => setConvAmount(Number(e.target.value))} className="flex-1 p-3 bg-[var(--color-background-alt)] border border-[var(--color-surface-border)] rounded-2xl outline-none font-bold" style={{ color: colors.text }} />
                </div>
              </div>
              <div className="flex items-center justify-center pt-4">
                <div className="p-3 bg-[var(--color-background-alt)] rounded-full"><ExchangeIcon className="w-5 h-5" style={{ color: colors.textMuted }} /></div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: colors.textMuted }}>To</label>
                <div className="flex gap-2">
                  <select value={convTo} onChange={e => setConvTo(e.target.value)} className="w-20 p-3 bg-[var(--color-background-alt)] border border-[var(--color-surface-border)] rounded-2xl outline-none text-xs font-bold" style={{ color: colors.text }}>
                    {Object.keys(EXCHANGE_RATES).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="flex-1 p-3 rounded-2xl font-black border border-[var(--color-surface-border)] flex items-center" style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}>
                    {convTo}{convertedValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] p-8 rounded-[2rem] border border-[var(--color-surface-border)] shadow-xl flex flex-col h-fit" style={{ boxShadow: `0 20px 25px -5px ${colors.primary}10` }}>
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-xl font-black" style={{ color: colors.text }}>System</h3>
             <button onClick={() => setShowSettings(!showSettings)} className="text-xs font-black uppercase tracking-widest" style={{ color: colors.primary }}>{showSettings ? 'Close' : 'Setup'}</button>
          </div>
          
          {showSettings ? (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
              {!isUnlocked ? (
                <button onClick={() => initiateAction('unlock')} className="w-full flex items-center justify-center gap-3 py-6 bg-[var(--color-background-alt)] border border-dashed border-[var(--color-surface-border)] group hover:border-[var(--color-primary)] transition-all rounded-3xl">
                  <LockIcon className="transition-colors" style={{ color: colors.textMuted }} />
                  <span className="text-xs font-black uppercase tracking-widest transition-colors group-hover:text-[var(--color-primary)]" style={{ color: colors.textMuted }}>Unlock System</span>
                </button>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: colors.textMuted }}>Daily Reminder</label>
                    <div className="flex gap-2">
                      <input type="time" value={tempTime} onChange={e => setTempTime(e.target.value)} className="flex-1 p-3 text-sm bg-[var(--color-background-alt)] border border-[var(--color-surface-border)] rounded-2xl outline-none" style={{ color: colors.text }} />
                      <button onClick={() => executeAction('setAlarm')} className="text-white text-[10px] font-black px-4 py-2 rounded-2xl" style={{ backgroundColor: colors.text }}>Set</button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: colors.textMuted }}>Base Currency</label>
                    <div className="flex gap-2">
                      <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} className="flex-1 p-3 text-sm bg-[var(--color-background-alt)] border border-[var(--color-surface-border)] rounded-2xl outline-none font-bold" style={{ color: colors.text }}>
                        <option value="$">$ USD</option><option value="£">£ GBP</option><option value="€">€ EUR</option><option value="₦">₦ NGN</option>
                        <option value="USHs">USHs (UG)</option><option value="KSHs">KSHs (KE)</option><option value="TZS">TZS (TZ)</option>
                      </select>
                      <button onClick={() => executeAction('setCurrency')} className="text-white text-[10px] font-black px-4 py-2 rounded-2xl" style={{ backgroundColor: colors.text }}>Save</button>
                    </div>
                  </div>
                  <div className="space-y-3 pt-4 border-t" style={{ borderColor: colors.backgroundAlt }}>
                    <button onClick={() => initiateAction('changePassword')} className="w-full p-3 text-xs font-black rounded-2xl uppercase tracking-widest" style={{ backgroundColor: `${colors.primary}20`, color: colors.primary, border: `1px solid ${colors.primary}30` }}>Update PIN</button>
                    <button onClick={() => setIsUnlocked(false)} className="w-full flex items-center justify-center gap-2 p-3 text-xs font-black uppercase tracking-widest hover:opacity-70 transition-colors" style={{ color: colors.textMuted }}><LockIcon className="w-3 h-3" /> Lock Settings</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center py-10 opacity-30 grayscale pointer-events-none">
                <div className="p-4 rounded-full mb-4" style={{ backgroundColor: colors.backgroundAlt }}><ClockIcon className="w-8 h-8" style={{ color: colors.textMuted }} /></div>
                <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: colors.textMuted }}>Configuration Hidden</p>
             </div>
          )}
        </div>
      </div>

      <div className="bg-[var(--color-surface)] p-8 rounded-[2rem] border border-[var(--color-surface-border)] shadow-xl" style={{ boxShadow: `0 20px 25px -5px ${colors.primary}10` }}>
        <h3 className="text-xl font-black mb-6 flex items-center gap-3" style={{ color: colors.text }}><div className="p-2 rounded-xl" style={{ backgroundColor: `${colors.primary}20` }}><BellIcon className="" style={{ color: colors.primary }} /></div> Urgent Alerts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lowStockItems.map(i => (
            <div key={i.id} className="p-4 border rounded-[1.5rem] flex flex-col" style={{ backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }}>
              <span className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: colors.primary }}>Low Inventory</span>
              <div className="flex justify-between items-center">
                <span className="font-bold" style={{ color: colors.text }}>{i.name}</span>
                <span className="text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter" style={{ backgroundColor: colors.primary, color: colors.textInverse }}>{i.quantity} left</span>
              </div>
            </div>
          ))}
          {upcomingExpenses.map(e => (
            <div key={e.id} className="p-4 border rounded-[1.5rem] flex flex-col" style={{ backgroundColor: `${colors.secondary}20`, borderColor: `${colors.secondary}30` }}>
              <span className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: colors.secondary }}>Upcoming Bill</span>
              <div className="flex justify-between items-center">
                <span className="font-bold" style={{ color: colors.text }}>{e.category}</span>
                <span className="text-xs font-bold" style={{ color: colors.secondary }}>{currency}{e.amount.toLocaleString()}</span>
              </div>
            </div>
          ))}
          {lowStockItems.length === 0 && upcomingExpenses.length === 0 && (
            <div className="col-span-full py-12 text-center opacity-50">
              <div className="flex justify-center mb-4"><CheckCircleIcon className="w-12 h-12" style={{ color: colors.primary }} /></div>
              <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: colors.textMuted }}>Operations smooth. No alerts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, color = "blue", icon, colors }: any) => {
  const colorStyles: any = {
    blue: { bg: `${colors.primary}10`, text: colors.primary },
    red: { bg: '#fef2f2', text: '#dc2626' },
    green: { bg: '#f0fdf4', text: '#16a34a' },
    amber: { bg: '#fffbeb', text: '#d97706' },
    emerald: { bg: '#f0fdf4', text: '#059669' },
    violet: { bg: '#faf5ff', text: '#7c3aed' },
  };
  const style = colorStyles[color] || colorStyles.blue;
  
  return (
    <div className="p-6 rounded-[2rem] border shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-all duration-300" 
         style={{ 
           backgroundColor: colors.surface, 
           borderColor: colors.surfaceBorder,
           boxShadow: `0 10px 15px -3px ${colors.primary}10`
         }}>
      <div className="relative z-10">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-2" style={{ color: colors.textMuted }}>{title}</p>
        <p className="text-2xl font-black" style={{ color: colors.text }}>{value}</p>
      </div>
      <div className="absolute top-4 right-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
        {icon || <TrendingIcon className="w-8 h-8" />}
      </div>
    </div>
  );
};

export default Dashboard;
