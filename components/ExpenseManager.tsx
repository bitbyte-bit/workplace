
import React, { useState } from 'react';
import { Expense, ExpenseFrequency } from '../types';
import { TrashIcon, ExpenseIcon, ClockIcon } from './Icons';
import PasswordModal from './PasswordModal';
import CategoryModal from './CategoryModal';

// EditIcon component inline
const EditIcon = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

interface Props {
  expenses: Expense[];
  customCategories: string[];
  onAddCategory: (category: string) => void;
  onUpdateCategory: (oldCategory: string, newCategory: string) => void;
  onDeleteCategory: (category: string) => void;
  onAddExpense: (expense: Expense) => void;
  onUpdateExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  managerPassword: string;
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

const ExpenseManager: React.FC<Props> = ({ expenses, customCategories, onAddCategory, onUpdateCategory, onDeleteCategory, onAddExpense, onUpdateExpense, onDeleteExpense, managerPassword, currency }) => {
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
  const [pendingAction, setPendingAction] = useState<{ action: 'edit' | 'delete', id?: string, data?: Expense } | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Expense | null>(null);

  const allCategories = [...new Set([...PREDEFINED_CATEGORIES, ...customCategories])];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      alert('Please select a category');
      return;
    }
    onAddExpense({
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

  const requestEdit = (expense: Expense) => {
    setPendingAction({ action: 'edit', id: expense.id, data: expense });
    setPasswordModalOpen(true);
  };

  const requestDelete = (id: string) => {
    setPendingAction({ action: 'delete', id });
    setPasswordModalOpen(true);
  };

  const handlePasswordConfirm = (password: string) => {
    if (password === managerPassword) {
      if (pendingAction?.action === 'edit' && pendingAction.data) {
        setEditingId(pendingAction.id!);
        setEditForm({ ...pendingAction.data });
      } else if (pendingAction?.action === 'delete' && pendingAction.id) {
        onDeleteExpense(pendingAction.id);
      }
      setPasswordModalOpen(false);
      setPendingAction(null);
    }
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editForm) {
      onUpdateExpense(editForm);
      setEditingId(null);
      setEditForm(null);
    }
  };

  return (
    <div className="space-y-6">
      {editingId && editForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-black text-lg">Edit Expense</h3>
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                <select
                  value={editForm.category}
                  onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
                >
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount ({currency})</label>
                <input
                  type="number"
                  value={editForm.amount}
                  onChange={e => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Frequency</label>
                <select
                  value={editForm.frequency}
                  onChange={e => setEditForm({ ...editForm, frequency: e.target.value as ExpenseFrequency })}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold"
                >
                  <option value="none">One-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-rose-600 text-white font-black py-3 rounded-xl">Update</button>
                <button type="button" onClick={() => { setEditingId(null); setEditForm(null); }} className="flex-1 bg-slate-200 font-black py-3 rounded-xl">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PasswordModal
        isOpen={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false);
          setPendingAction(null);
        }}
        onConfirm={handlePasswordConfirm}
        title={pendingAction?.action === 'edit' ? 'Edit Expense' : 'Delete Expense'}
        message={pendingAction?.action === 'edit' ? 'Enter PIN to confirm editing' : 'Enter PIN to confirm deletion'}
        confirmText={pendingAction?.action === 'edit' ? 'Edit' : 'Delete'}
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
        {expenses.map(expense => (
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
               <button onClick={() => requestEdit(expense)} className="p-2 bg-blue-50 text-blue-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600 hover:text-white" title="Edit (PIN required)">
                 <EditIcon className="w-4 h-4" />
               </button>
               <button onClick={() => requestDelete(expense.id)} className="p-2 bg-rose-50 text-rose-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 hover:text-white" title="Delete (PIN required)">
                 <TrashIcon className="w-4 h-4" />
               </button>
            </div>
          </div>
        ))}
        {expenses.length === 0 && (
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
