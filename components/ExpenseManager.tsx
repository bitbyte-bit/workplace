
import React, { useState } from 'react';
import { Expense, ExpenseFrequency } from '../types';
import { TrashIcon, ExpenseIcon, ClockIcon } from './Icons';
import PasswordModal from './PasswordModal';

interface Props {
  items: Expense[];
  customCategories: string[];
  onAddCategory: (category: string) => void;
  onAdd: (expense: Expense) => void;
  onDelete: (id: string) => void;
  currency: string;
}

const PREDEFINED_CATEGORIES = [
  "Rent & Showroom",
  "Inventory Restock",
  "Shipping & Logistics",
  "Marketing & Ads",
  "Staff Salaries",
  "Repair & Warranty",
  "Utilities",
  "Software & Tech Tools"
];

const ExpenseManager: React.FC<Props> = ({ items, customCategories, onAddCategory, onAdd, onDelete, currency }) => {
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<ExpenseFrequency>('none');
  const [newCatName, setNewCatName] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);

  // Password modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const allCategories = [...new Set([...PREDEFINED_CATEGORIES, ...customCategories])];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      category,
      amount,
      description,
      date: Date.now(),
      frequency,
    });
    setCategory(''); setAmount(0); setDescription(''); setFrequency('none');
  };

  const handleAddCategory = () => {
    if (newCatName.trim()) {
      onAddCategory(newCatName.trim());
      setCategory(newCatName.trim());
      setNewCatName('');
      setShowAddCat(false);
    }
  };

  const requestDelete = (id: string) => {
    setPendingDeleteId(id);
    setPasswordModalOpen(true);
  };

  const handlePasswordConfirm = (password: string) => {
    if (password && password.length > 0) {
      if (pendingDeleteId) {
        onDelete(pendingDeleteId);
      }
      setPasswordModalOpen(false);
      setPendingDeleteId(null);
    } else {
      const modal = document.querySelector('[class*="animate-in"]') as HTMLElement;
      if (modal) {
        const input = modal.querySelector('input');
        if (input) {
          (input as HTMLInputElement).style.borderColor = '#ef4444';
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <PasswordModal
        isOpen={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false);
          setPendingDeleteId(null);
        }}
        onConfirm={handlePasswordConfirm}
        title="Delete Expense"
        message="Enter PIN to confirm deletion"
        confirmText="Delete"
      />

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-xl"><ExpenseIcon className="text-rose-600" /></div>
            Log Operational Expense
          </h3>
          <button 
            type="button" 
            onClick={() => setShowAddCat(!showAddCat)}
            className="text-rose-600 text-[10px] font-black uppercase tracking-widest hover:underline"
          >
            {showAddCat ? 'Cancel' : '+ Custom Category'}
          </button>
        </div>

        {showAddCat && (
          <div className="flex gap-2 p-3 bg-rose-50 rounded-2xl mb-4 animate-in slide-in-from-top-2">
            <input 
              type="text" 
              placeholder="Custom Expense Type" 
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 p-3 bg-white border border-rose-100 rounded-xl outline-none"
            />
            <button 
              onClick={handleAddCategory}
              className="bg-rose-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase"
            >
              Add
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expense Type</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" required>
                <option value="">Select Category</option>
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount ({currency})</label>
              <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes</label>
              <input type="text" placeholder="Short description" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Frequency</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value as ExpenseFrequency)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold">
                <option value="none">One-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <button type="submit" className="w-full bg-rose-600 text-white font-black py-4 rounded-[1.5rem] shadow-xl shadow-rose-100 uppercase tracking-widest hover:scale-[1.01] transition-all">
            Record Outflow
          </button>
        </form>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden divide-y divide-slate-50">
        {items.map(expense => (
          <div key={expense.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                <ExpenseIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-black text-slate-800 tracking-tight">{expense.category}</p>
                  {expense.frequency !== 'none' && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[8px] uppercase font-black rounded-full tracking-widest">
                      {expense.frequency}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">{expense.description}</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase mt-1">
                  <ClockIcon className="w-3 h-3" /> {new Date(expense.date).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <p className="font-black text-xl text-rose-600">-{currency}{expense.amount.toLocaleString()}</p>
               <button onClick={() => requestDelete(expense.id)} className="p-2 bg-rose-50 text-rose-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 hover:text-white" title="Delete (PIN required)">
                 <TrashIcon className="w-4 h-4" />
               </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="p-20 text-center opacity-30">
            <div className="flex justify-center mb-4"><ExpenseIcon className="w-16 h-16" /></div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No outflows recorded</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseManager;
