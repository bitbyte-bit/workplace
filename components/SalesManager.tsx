
import React, { useState } from 'react';
import { Sale, StockItem, Receipt } from '../types';
import { TrashIcon, SalesIcon } from './Icons';
import PasswordModal from './PasswordModal';
import CategoryModal from './CategoryModal';
import ReceiptModal from './ReceiptModal';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  sales: Sale[];
  stock: StockItem[];
  customCategories: string[];
  onAddCategory: (category: string) => void;
  onUpdateCategory: (oldCategory: string, newCategory: string) => void;
  onDeleteCategory: (category: string) => void;
  onAddSale: (sale: Sale) => void;
  onDeleteSale: (id: string) => void;
  onSaveReceipt: (receipt: Receipt) => void;
  currency: string;
  managerPassword?: string;
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

const SalesManager: React.FC<Props> = ({ sales, stock, customCategories, onAddCategory, onUpdateCategory, onDeleteCategory, onAddSale, onDeleteSale, onSaveReceipt, currency, managerPassword = '' }) => {
  const { colors } = useTheme();
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Smartphones');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [newCatName, setNewCatName] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);

  // Receipt modal state
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [lastCreatedSale, setLastCreatedSale] = useState<Sale | null>(null);

  // Credit sale state
  const [isOnCredit, setIsOnCredit] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paidAmount, setPaidAmount] = useState(0);

  // Category modal state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

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

    const totalAmount = price * quantity;
    const balance = totalAmount - (paidAmount || 0);
    
    const newSale: Sale = {
      id: Math.random().toString(36).substr(2, 9),
      itemName,
      category,
      quantity,
      price,
      cost: stockItem.costPrice,
      date: Date.now(),
      isOnCredit,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      paidAmount: isOnCredit ? (paidAmount || 0) : undefined,
      balance: isOnCredit ? balance : undefined,
    };
    
    onAddSale(newSale);
    setItemName('');
    setCategory('Smartphones');
    setQuantity(1);
    setPrice(0);
    setIsOnCredit(false);
    setCustomerName('');
    setCustomerPhone('');
    setPaidAmount(0);
    
    // Show receipt modal after successful sale
    setLastCreatedSale(newSale);
    setReceiptModalOpen(true);
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
        onDeleteSale(pendingDeleteId);
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
        title="Delete Sale"
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

      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false);
          setLastCreatedSale(null);
        }}
        sale={lastCreatedSale!}
        currency={currency}
        onSaveReceipt={onSaveReceipt}
        onDownloadPDF={(receipt) => {
          // Import the PDF generation function dynamically
          import('../utils/receiptUtils').then(({ downloadReceiptPDF }) => {
            downloadReceiptPDF(receipt, currency);
          });
        }}
      />

      <div className="p-8 rounded-[2.5rem] border shadow-xl space-y-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)', boxShadow: `0 20px 25px -5px ${colors.primary}10` }}>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <h3 className="font-black text-xl flex items-center gap-3" style={{ color: 'var(--color-text)' }}>
            <div className="p-2 rounded-xl" style={{ backgroundColor: `${colors.primary}20` }}><SalesIcon className="" style={{ color: colors.primary }} /></div>
            Record Electronics Sale
          </h3>
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => {
                setEditingCategory(null);
                setCategoryModalOpen(true);
              }}
              className="text-[10px] font-black uppercase tracking-widest hover:underline"
              style={{ color: colors.primary }}
            >
              + Categories
            </button>
          </div>
        </div>

        {/* Categories Display */}
        <div className="flex flex-wrap gap-2 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-background-alt)' }}>
          {allCategories.map(cat => (
            <span 
              key={cat} 
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase cursor-pointer hover:scale-105 transition-transform ${
                category === cat 
                  ? 'text-white' 
                  : ''
              }`}
              style={category === cat ? { backgroundColor: colors.primary } : { backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-surface-border)' }}
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

          {/* Credit Sale Toggle */}
          <div className="col-span-full">
            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={isOnCredit}
                onChange={(e) => setIsOnCredit(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-bold text-slate-700">Sold on Credit / Installments</span>
                <p className="text-xs text-slate-400">Track partial payments and customer information</p>
              </div>
            </label>
          </div>

          {/* Customer Information - Always visible */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Name (Optional)</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                placeholder="Enter customer name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number (Optional)</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                placeholder="07xx xxx xxx"
              />
            </div>
          </div>

          {/* Credit Sale Fields */}
          {isOnCredit && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--color-text-muted)' }}>Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 font-bold"
                  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)', color: 'var(--color-text)' }}
                  placeholder="Customer full name"
                  required={isOnCredit}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--color-text-muted)' }}>Phone Number</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 font-bold"
                  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)', color: 'var(--color-text)' }}
                  placeholder="07xx xxx xxx"
                  required={isOnCredit}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--color-text-muted)' }}>Amount Paid ({currency})</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Math.min(Number(e.target.value), price * quantity))}
                  className="w-full p-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 font-bold"
                  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)', color: 'var(--color-text)' }}
                  min="0"
                  max={price * quantity}
                  step="0.01"
                  required={isOnCredit}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--color-text-muted)' }}>Balance ({currency})</label>
                <div className="w-full p-3 border rounded-2xl font-black text-lg" style={{ backgroundColor: 'var(--color-background-alt)', borderColor: 'var(--color-surface-border)', color: 'var(--color-text)' }}>
                  {currency}{((price * quantity) - (paidAmount || 0)).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="w-full text-white font-black py-4 rounded-[1.5rem] shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all" style={{ backgroundColor: colors.primary, boxShadow: `0 10px 15px -3px ${colors.primary}40` }}>
            COMPLETE SALE ({currency}{(price * quantity).toLocaleString()})
          </button>
        </form>
      </div>

      <div className="rounded-[2.5rem] border shadow-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-background-alt)' }}>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Date</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Product Info</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Qty</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-right" style={{ color: 'var(--color-text-muted)' }}>Revenue</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-right" style={{ color: 'var(--color-text-muted)' }}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-surface-border)' }}>
              {sales.map((sale) => {
                const totalAmount = sale.price * sale.quantity;
                const profitLoss = (sale.price - sale.cost) * sale.quantity;
                
                return (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-4 text-xs font-medium text-slate-500">{new Date(sale.date).toLocaleDateString()}</td>
                    <td className="px-8 py-4">
                      <p className="font-bold text-slate-800">{sale.itemName}</p>
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">{sale.category}</p>
                      {sale.isOnCredit && (
                        <div className="mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z"/>
                            <path d="M10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 6.25a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 11.25z"/>
                          </svg>
                          <span className="text-[10px] font-bold text-amber-600 uppercase">Credit</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-4 text-sm font-bold">{sale.quantity}</td>
                    <td className="px-8 py-4 text-right">
                       <p className="text-sm font-black text-slate-900">{currency}{totalAmount.toLocaleString()}</p>
                       <p className={`text-[10px] font-black ${profitLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                         {profitLoss >= 0 ? '+' : '-'}{currency}{Math.abs(profitLoss).toLocaleString()} net
                       </p>
                       {sale.isOnCredit && sale.balance && sale.balance > 0 && (
                         <p className="text-[10px] font-bold text-amber-600 mt-1">
                           Balance: {currency}{sale.balance.toLocaleString()}
                         </p>
                       )}
                    </td>
                    <td className="px-8 py-4 text-right">
                       <button onClick={() => requestDelete(sale.id)} className="p-2 bg-rose-50 text-rose-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 hover:text-white" title="Delete Sale (PIN required)">
                         <TrashIcon className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                );
              })}
              {sales.length === 0 && (
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
