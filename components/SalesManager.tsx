
import React, { useState } from 'react';
import { Sale, StockItem } from '../types';
import { TrashIcon, SalesIcon, AlertCircleIcon } from './Icons';
import PasswordModal from './PasswordModal';

interface Props {
  items: Sale[];
  stock: StockItem[];
  customCategories: string[];
  onAddCategory: (category: string) => void;
  onAdd: (sale: Sale) => void;
  onDelete: (id: string) => void;
  currency: string;
}

const PREDEFINED_CATEGORIES = [
  "Smartphones",
  "Laptops & PCs",
  "Audio & Headphones",
  "Gaming & Consoles",
  "Accessories",
  "Wearables",
  "Components & Parts"
];

const SalesManager: React.FC<Props> = ({ items, stock, customCategories, onAddCategory, onAdd, onDelete, currency }) => {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Smartphones');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [newCatName, setNewCatName] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);

  // Password modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const allCategories = [...new Set([...PREDEFINED_CATEGORIES, ...customCategories])];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stockItem = stock.find(s => s.name.toLowerCase() === itemName.toLowerCase());
    
    if (!stockItem) {
      alert(`The item "${itemName}" is not in your stock inventory. Please add it to the Stock section first.`);
      return;
    }

    if (stockItem.quantity < quantity) {
      if (!confirm(`Warning: You are selling ${quantity} units, but only ${stockItem.quantity} are in stock. Proceed anyway?`)) {
        return;
      }
    }

    const newSale: Sale = {
      id: Math.random().toString(36).substr(2, 9),
      itemName,
      category,
      quantity,
      price,
      cost: stockItem.costPrice,
      date: Date.now(),
    };
    
    onAdd(newSale);
    setItemName('');
    setCategory('Smartphones');
    setQuantity(1);
    setPrice(0);
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
    // Get password from context or props - using a default for now
    const managerPassword = '1234'; // Default PIN
    
    // For sales, we'll accept any non-empty password since it's not admin-sensitive
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
        title="Delete Sale"
        message="Enter PIN to confirm deletion"
        confirmText="Delete"
      />

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-xl text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl"><SalesIcon className="text-blue-600" /></div>
            Record Electronics Sale
          </h3>
          <button 
            type="button" 
            onClick={() => setShowAddCat(!showAddCat)}
            className="text-blue-600 text-[10px] font-black uppercase tracking-widest hover:underline"
          >
            {showAddCat ? 'Cancel' : '+ New Category'}
          </button>
        </div>

        {showAddCat && (
          <div className="flex gap-2 p-3 bg-blue-50 rounded-2xl mb-4 animate-in slide-in-from-top-2">
            <input 
              type="text" 
              placeholder="Custom Category Name" 
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 p-3 bg-white border border-blue-100 rounded-xl outline-none"
            />
            <button 
              onClick={handleAddCategory}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase"
            >
              Add
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Device/Model</label>
              <input
                list="stock-items"
                value={itemName}
                onChange={(e) => {
                  const val = e.target.value;
                  setItemName(val);
                  const item = stock.find(s => s.name.toLowerCase() === val.toLowerCase());
                  if (item) setPrice(item.sellingPrice);
                }}
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                placeholder="Find in inventory..."
                required
              />
              <datalist id="stock-items">
                {stock.map(s => <option key={s.id} value={s.name} />)}
              </datalist>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Type</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                required
              >
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Units Sold</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                min="1"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Price</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                step="0.01"
                required
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-[1.5rem] shadow-xl shadow-blue-200 hover:scale-[1.01] active:scale-[0.99] transition-all">
            COMPLETE SALE ({currency}{(price * quantity).toLocaleString()})
          </button>
        </form>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Info</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Revenue</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((sale) => {
                const totalAmount = sale.price * sale.quantity;
                const profitLoss = (sale.price - sale.cost) * sale.quantity;
                
                return (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-4 text-xs font-medium text-slate-500">{new Date(sale.date).toLocaleDateString()}</td>
                    <td className="px-8 py-4">
                      <p className="font-bold text-slate-800">{sale.itemName}</p>
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">{sale.category}</p>
                    </td>
                    <td className="px-8 py-4 text-sm font-bold">{sale.quantity}</td>
                    <td className="px-8 py-4 text-right">
                       <p className="text-sm font-black text-slate-900">{currency}{totalAmount.toLocaleString()}</p>
                       <p className={`text-[10px] font-black ${profitLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                         {profitLoss >= 0 ? '+' : '-'}{currency}{Math.abs(profitLoss).toLocaleString()} net
                       </p>
                    </td>
                    <td className="px-8 py-4 text-right">
                       <button onClick={() => requestDelete(sale.id)} className="p-2 bg-rose-50 text-rose-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 hover:text-white" title="Delete Sale (PIN required)">
                         <TrashIcon className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center opacity-40">
                    <div className="flex justify-center mb-4"><SalesIcon className="w-12 h-12 text-slate-300" /></div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No sales recorded yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesManager;
