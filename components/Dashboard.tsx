
import React, { useState, useEffect, useMemo } from 'react';
import { BusinessData } from '../types';
import { getBusinessInsights } from '../services/geminiService';
import { SparkleIcon, BellIcon, ClockIcon, TrendingIcon, LockIcon, UnlockIcon, ExchangeIcon, AlertCircleIcon, CheckCircleIcon } from './Icons';
import { isExpenseDueSoon } from '../utils/expenseUtils';

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
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <form onSubmit={handlePassVerify} className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl border border-slate-100 flex flex-col items-center animate-in zoom-in-95 duration-300">
            <div className="p-4 bg-blue-100 rounded-full mb-4">
              <LockIcon className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="text-xl font-black text-slate-800 mb-2">Manager Verification</h4>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-6">Enter your PIN to perform sensitive actions</p>
            <input 
              autoFocus
              type="password" 
              value={passInput} 
              onChange={e => setPassInput(e.target.value)}
              placeholder="••••"
              className="w-full text-center text-3xl tracking-[0.5em] p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 mb-6 font-black"
            />
            <div className="flex gap-2 w-full">
              <button type="button" onClick={() => { setShowPassModal(false); setPassInput(''); }} className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">Cancel</button>
              <button type="submit" className="flex-[2] py-4 bg-slate-900 text-white text-xs font-black rounded-2xl shadow-xl shadow-slate-300 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest">Verify PIN</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Gross Profit" value={`${currency}${grossProfit.toLocaleString()}`} icon={<TrendingIcon className="text-blue-500" />} />
        <StatCard title="Expenses" value={`${currency}${totalExpenses.toLocaleString()}`} color="red" />
        <StatCard title="Net Profit" value={`${currency}${netProfit.toLocaleString()}`} color={netProfit >= 0 ? 'green' : 'red'} />
        <StatCard title="Margin" value={`${profitMargin.toFixed(1)}%`} color={profitMargin > 15 ? 'green' : 'amber'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40">
            <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-blue-100 rounded-xl"><SparkleIcon className="text-blue-600" /></div>
              Zion Intelligence
            </h3>
            {loadingInsights ? (
              <div className="space-y-4">
                <div className="h-10 bg-slate-50 animate-pulse rounded-2xl w-full"></div>
                <div className="h-10 bg-slate-50 animate-pulse rounded-2xl w-4/5"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((tip, i) => (
                  <div key={i} className="group p-5 bg-slate-50/50 hover:bg-blue-50 border border-slate-100 rounded-2xl transition-all duration-300">
                    <p className="text-sm font-medium text-slate-700 leading-relaxed italic">"{tip}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Currency Converter Section */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40">
            <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-emerald-100 rounded-xl"><ExchangeIcon className="text-emerald-600" /></div>
              East African Converter
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">From</label>
                <div className="flex gap-2">
                  <select value={convFrom} onChange={e => setConvFrom(e.target.value)} className="w-20 p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-xs font-bold">
                    {Object.keys(EXCHANGE_RATES).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="number" value={convAmount} onChange={e => setConvAmount(Number(e.target.value))} className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" />
                </div>
              </div>
              <div className="flex items-center justify-center pt-4">
                <div className="p-3 bg-slate-50 rounded-full"><ExchangeIcon className="w-5 h-5 text-slate-400" /></div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">To</label>
                <div className="flex gap-2">
                  <select value={convTo} onChange={e => setConvTo(e.target.value)} className="w-20 p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-xs font-bold">
                    {Object.keys(EXCHANGE_RATES).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="flex-1 p-3 bg-blue-50 text-blue-700 rounded-2xl font-black border border-blue-100 flex items-center">
                    {convTo}{convertedValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col h-fit">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-xl font-black text-slate-800">System</h3>
             <button onClick={() => setShowSettings(!showSettings)} className="text-blue-600 text-xs font-black uppercase tracking-widest">{showSettings ? 'Close' : 'Setup'}</button>
          </div>
          
          {showSettings ? (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
              {!isUnlocked ? (
                <button onClick={() => initiateAction('unlock')} className="w-full flex items-center justify-center gap-3 py-6 bg-slate-50 border border-dashed border-slate-200 rounded-3xl group hover:border-blue-400 hover:bg-blue-50 transition-all">
                  <LockIcon className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-600">Unlock System</span>
                </button>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Daily Reminder</label>
                    <div className="flex gap-2">
                      <input type="time" value={tempTime} onChange={e => setTempTime(e.target.value)} className="flex-1 p-3 text-sm bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
                      <button onClick={() => executeAction('setAlarm')} className="bg-slate-900 text-white text-[10px] font-black px-4 py-2 rounded-2xl">Set</button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Currency</label>
                    <div className="flex gap-2">
                      <select value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} className="flex-1 p-3 text-sm bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold">
                        <option value="$">$ USD</option><option value="£">£ GBP</option><option value="€">€ EUR</option><option value="₦">₦ NGN</option>
                        <option value="USHs">USHs (UG)</option><option value="KSHs">KSHs (KE)</option><option value="TZS">TZS (TZ)</option>
                      </select>
                      <button onClick={() => executeAction('setCurrency')} className="bg-slate-900 text-white text-[10px] font-black px-4 py-2 rounded-2xl">Save</button>
                    </div>
                  </div>
                  <div className="space-y-3 pt-4 border-t border-slate-50">
                    <button onClick={() => initiateAction('changePassword')} className="w-full p-3 bg-blue-50 text-blue-600 text-[10px] font-black rounded-2xl border border-blue-100 uppercase tracking-widest">Update PIN</button>
                    <button onClick={() => setIsUnlocked(false)} className="w-full flex items-center justify-center gap-2 p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"><LockIcon className="w-3 h-3" /> Lock Settings</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center py-10 opacity-30 grayscale pointer-events-none">
                <div className="p-4 bg-slate-100 rounded-full mb-4"><ClockIcon className="w-8 h-8" /></div>
                <p className="text-xs font-bold text-slate-500 uppercase">Configuration Hidden</p>
             </div>
          )}
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40">
        <h3 className="text-xl font-black mb-6 flex items-center gap-3"><div className="p-2 bg-red-100 rounded-xl"><BellIcon className="text-red-500" /></div> Urgent Alerts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lowStockItems.map(i => (
            <div key={i.id} className="p-4 bg-red-50/50 border border-red-100 rounded-[1.5rem] flex flex-col">
              <span className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">Low Inventory</span>
              <div className="flex justify-between items-center">
                <span className="font-bold text-red-900">{i.name}</span>
                <span className="text-[10px] bg-red-600 text-white px-3 py-1 rounded-full font-black uppercase tracking-tighter">{i.quantity} left</span>
              </div>
            </div>
          ))}
          {upcomingExpenses.map(e => (
            <div key={e.id} className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-[1.5rem] flex flex-col">
              <span className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Upcoming Bill</span>
              <div className="flex justify-between items-center">
                <span className="font-bold text-indigo-900">{e.category}</span>
                <span className="text-xs font-black text-indigo-600">{currency}{e.amount.toLocaleString()}</span>
              </div>
            </div>
          ))}
          {lowStockItems.length === 0 && upcomingExpenses.length === 0 && (
            <div className="col-span-full py-12 text-center opacity-50">
              <div className="flex justify-center mb-4"><CheckCircleIcon className="w-12 h-12 text-emerald-400" /></div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Operations smooth. No alerts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, color = "blue", icon }: any) => {
  const styles: any = {
    blue: 'bg-white text-blue-700',
    red: 'bg-white text-red-600',
    green: 'bg-white text-emerald-600',
    amber: 'bg-white text-amber-600',
  };
  return (
    <div className={`p-6 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/30 ${styles[color]} relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}>
      <div className="relative z-10">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-2">{title}</p>
        <p className="text-2xl font-black">{value}</p>
      </div>
      <div className="absolute top-4 right-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
        {icon || <TrendingIcon className="w-8 h-8" />}
      </div>
    </div>
  );
};

export default Dashboard;
