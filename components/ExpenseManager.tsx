
import React, { useState } from 'react';
import { Expense, ExpenseFrequency } from '../types';
import { TrashIcon, ExpenseIcon, ClockIcon } from './Icons';
import PasswordModal from './PasswordModal';
import CategoryModal from './CategoryModal';

interface Props {
  items: Expense[];
  customCategories: string[];
  onAddCategory: (category: string) => void;
  onUpdateCategory: (oldCategory: string, newCategory: string) => void;
  onDeleteCategory: (category: string) => void;
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

const ExpenseManager: React.FC<Props> = ({ items, customCategories, onAddCategory, onUpdateCategory, onDeleteCategory, onAdd, onDelete, currency }) => {
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<ExpenseFrequency>('none');
  const [newCatName, setNewCatName] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);

  // Category modal state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

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

  const openCategoryEdit = (cat: string) => {
    setEditingCategory(cat);
    setCategoryModalOpen(true);
  };

  const handleCategorySave = (newName: string, oldName?: string) => {
    if (oldName && customCategories.includes(oldName)) {
      onUpdateCategory(oldName, newName);
    } else {
      onAddCategory(newName);
    }
  };

  const handleCategoryDelete = (cat: string) => {
    if (customCategories.includes(cat)) {
      onDeleteCategory(cat);
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

      <CategoryModal
        isOpen={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleCategorySave}
        onDelete={handleCategoryDelete}
        title={editingCategory ? 'Edit Category' : 'New Category'}
        existingCategories={allCategories}
        initialCategory={editingCategory || undefined}
        mode={editingCategory ? 'edit' : 'add'}
      />

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-xl"><ExpenseIcon className="text-rose-600" /></div>
            Log Operational Expense
          </h3>
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => {
                setEditingCategory(null);
                setCategoryModalOpen(true);
              }}
              className="text-rose-600 text-[10px] font-black uppercase tracking-widest hover:underline"
            >
              + Categories
            </button>
          </div>
        </div>

        {/* Categories Display */}
        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl">
          {allCategories.map(cat => (
            <span 
              key={cat} 
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase cursor-pointer hover:scale-105 transition-transform ${
                category === cat 
                  ? 'bg-rose-600 text-white' 
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
              onClick={() => setCategory(cat)}
              title="Click to select, right-click to edit"
              onContextMenu={(e) => {
                e.preventDefault();
                if (customCategories.includes(cat)) {
                  openCategoryEdit(cat);
                }
              }}
            >
              {cat}
            </span>
          ))}
        </div>

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
