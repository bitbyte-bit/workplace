
import React, { useMemo } from 'react';
import { BusinessData, Tab } from '../types';
import { isExpenseDueSoon } from '../utils/expenseUtils';
import { PackageIcon, ExpenseIcon, DebtIcon, AlertCircleIcon } from './Icons';

interface Props {
  data: BusinessData;
  onNavigate: (tab: Tab) => void;
}

const WarningStatusBar: React.FC<Props> = ({ data, onNavigate }) => {
  const lowStockCount = useMemo(() => 
    data.stock.filter(i => i.quantity <= (i.lowStockThreshold || 5)).length, 
  [data.stock]);

  const upcomingExpenseCount = useMemo(() => 
    data.expenses.filter(e => e.frequency !== 'none' && isExpenseDueSoon(e)).length, 
  [data.expenses]);

  const unpaidDebtCount = useMemo(() => 
    data.debts.filter(d => !d.isPaid).length, 
  [data.debts]);

  const hasAnyWarning = lowStockCount > 0 || upcomingExpenseCount > 0 || unpaidDebtCount > 0;

  if (!hasAnyWarning) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 md:left-64 z-[45] animate-in slide-in-from-bottom-full duration-500">
      <div className="bg-slate-900/90 backdrop-blur-md border-t border-slate-800 px-6 py-2 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar md:rounded-t-[2rem] md:mx-6 md:mb-0 mb-20 md:pb-2">
        <div className="flex items-center gap-6 min-w-max">
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="w-4 h-4 text-slate-400" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">System Monitor</span>
          </div>

          {lowStockCount > 0 && (
            <button 
              onClick={() => onNavigate('stock')}
              className="flex items-center gap-2 group hover:bg-white/5 p-1 rounded-lg transition-colors"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 text-red-500 animate-blink-light" />
              <PackageIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-400 transition-colors" />
              <span className="text-[10px] font-bold text-slate-300 group-hover:text-white transition-colors">
                {lowStockCount} Low Stock
              </span>
            </button>
          )}

          {upcomingExpenseCount > 0 && (
            <button 
              onClick={() => onNavigate('expenses')}
              className="flex items-center gap-2 group hover:bg-white/5 p-1 rounded-lg transition-colors"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 text-amber-500 animate-blink-light" />
              <ExpenseIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />
              <span className="text-[10px] font-bold text-slate-300 group-hover:text-white transition-colors">
                {upcomingExpenseCount} Bills Due
              </span>
            </button>
          )}

          {unpaidDebtCount > 0 && (
            <button 
              onClick={() => onNavigate('debts')}
              className="flex items-center gap-2 group hover:bg-white/5 p-1 rounded-lg transition-colors"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 text-indigo-500 animate-blink-light" />
              <DebtIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              <span className="text-[10px] font-bold text-slate-300 group-hover:text-white transition-colors">
                {unpaidDebtCount} Unpaid Debts
              </span>
            </button>
          )}
        </div>

        <div className="hidden md:flex items-center gap-2 text-[8px] font-black text-emerald-500 uppercase tracking-tighter bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Hardware Node Online
        </div>
      </div>
    </div>
  );
};

export default WarningStatusBar;
