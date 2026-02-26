
import React, { useState, useRef } from 'react';
import { StockItem, CostHistoryEntry } from '../types';
import { TrashIcon, PackageIcon, AlertCircleIcon, StockIcon } from './Icons';
import PasswordModal from './PasswordModal';
import CategoryModal from './CategoryModal';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  items: StockItem[];
  customCategories: string[];
  onAddItem: (item: StockItem) => void;
  onUpdateItem: (item: StockItem) => void;
  onDeleteItem: (id: string) => void;
  currency: string;
  onAddCategory: (category: string) => void;
  onUpdateCategory: (oldCategory: string, newCategory: string) => void;
  onDeleteCategory: (category: string) => void;
  managerPassword?: string;
}

type ModalAction = 'edit' | 'delete' | null;

const StockManager: React.FC<Props> = ({ items, customCategories, onAddItem, onUpdateItem, onDeleteItem, currency, onAddCategory, onUpdateCategory, onDeleteCategory, managerPassword = '' }) => {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [threshold, setThreshold] = useState(5);
  const [imageUrl, setImageUrl] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<StockItem | null>(null);
  const [viewItem, setViewItem] = useState<StockItem | null>(null);

  // Password modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: ModalAction; id?: string; data?: StockItem } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (isEdit && editForm) {
          setEditForm({ ...editForm, imageUrl: base64 });
        } else {
          setImageUrl(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    onAddItem({
      id: Math.random().toString(36).substr(2, 9),
      name, quantity, costPrice, sellingPrice,
      lastUpdated: now,
      lowStockThreshold: threshold,
      imageUrl: imageUrl || undefined,
      costHistory: [{ price: costPrice, date: now }]
    });
    setName(''); setQuantity(0); setCostPrice(0); setSellingPrice(0); setThreshold(5); setImageUrl('');
  };

  const requestEdit = (item: StockItem) => {
    setPendingAction({ action: 'edit', id: item.id, data: item });
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
        onDeleteItem(pendingAction.id);
      }
      setPasswordModalOpen(false);
      setPendingAction(null);
    } else {
      // Wrong password - modal will show error
      const modal = document.querySelector('[class*="animate-in"]') as HTMLElement;
      if (modal) {
        const input = modal.querySelector('input');
        if (input) {
          (input as HTMLInputElement).style.borderColor = '#ef4444';
        }
      }
    }
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editForm) {
      const originalItem = items.find(i => i.id === editForm.id);
      let updatedHistory = [...(editForm.costHistory || [])];
      
      if (originalItem && originalItem.costPrice !== editForm.costPrice) {
        updatedHistory.push({ price: editForm.costPrice, date: Date.now() });
      }

      onUpdateItem({
        ...editForm,
        costHistory: updatedHistory
      });
      setEditingId(null);
      setEditForm(null);
    }
  };

  return (
    <div className="space-y-8">
      <PasswordModal
        isOpen={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false);
          setPendingAction(null);
        }}
        onConfirm={handlePasswordConfirm}
        title="Manager Authentication"
        message="Enter your PIN to confirm this action"
        confirmText="Verify"
      />

      {viewItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setViewItem(null)}>
          <div className="bg-[var(--color-surface)] rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()} style={{ borderColor: 'var(--color-surface-border)' }}>
            <div className="h-64 bg-[var(--color-background-alt)] flex items-center justify-center relative">
              {viewItem.imageUrl ? (
                <img src={viewItem.imageUrl} alt={viewItem.name} className="w-full h-full object-cover" />
              ) : (
                <div className="p-10 bg-[var(--color-background-alt)] rounded-full"><PackageIcon className="w-16 h-16" style={{ color: 'var(--color-surface-border)' }} /></div>
              )}
              <button onClick={() => setViewItem(null)} className="absolute top-4 right-4 bg-[var(--color-surface)]/80 p-2 rounded-full hover:bg-[var(--color-surface)]">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2}/></svg>
              </button>
            </div>
            <div className="p-8">
              <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--color-text)' }}>{viewItem.name}</h2>
              <div className="flex gap-4 mb-6">
                <div className="flex-1 p-4 rounded-2xl" style={{ backgroundColor: `${colors.primary}15` }}>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: colors.primary }}>Sale Price</p>
                  <p className="text-xl font-black" style={{ color: colors.primary }}>{currency}{viewItem.sellingPrice.toFixed(2)}</p>
                </div>
                <div className="flex-1 p-4 rounded-2xl" style={{ backgroundColor: 'var(--color-background-alt)' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Cost Price</p>
                  <p className="text-xl font-black" style={{ color: 'var(--color-text)' }}>{currency}{viewItem.costPrice.toFixed(2)}</p>
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4" style={{ color: 'var(--color-text-muted)' }}>Cost Fluctuations</p>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {viewItem.costHistory?.slice().reverse().map((h, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-xl border" style={{ backgroundColor: 'var(--color-background-alt)', borderColor: 'var(--color-surface-border)' }}>
                    <span className="text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>{new Date(h.date).toLocaleDateString()}</span>
                    <span className="font-black" style={{ color: colors.primary }}>{currency}{h.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-8 rounded-[2.5rem] border shadow-xl space-y-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-border)', boxShadow: `0 20px 25px -5px ${colors.primary}10` }}>
        <h3 className="text-xl font-black flex items-center gap-3" style={{ color: 'var(--color-text)' }}>
          <div className="p-2 rounded-xl" style={{ backgroundColor: `${colors.primary}20` }}><PackageIcon className="" style={{ color: colors.primary }} /></div>
          New Inventory Item
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--color-text-muted)' }}>Product Details</label>
            <input type="text" placeholder="Item Name" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 border rounded-2xl outline-none focus:ring-2 font-bold" style={{ backgroundColor: 'var(--color-background-alt)', borderColor: 'var(--color-surface-border)', color: 'var(--color-text)' }} required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--color-text-muted)' }}>Initial Units</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Qty" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="flex-1 p-3 border rounded-2xl outline-none font-bold" style={{ backgroundColor: 'var(--color-background-alt)', borderColor: 'var(--color-surface-border)', color: 'var(--color-text)' }} required />
              <input type="number" placeholder="Alert" value={threshold} onChange={e => setThreshold(Number(e.target.value))} className="w-24 p-3 border rounded-2xl outline-none font-bold" style={{ backgroundColor: 'var(--color-background-alt)', borderColor: 'var(--color-surface-border)', color: 'var(--color-text)' }} title="Low stock threshold" required />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--color-text-muted)' }}>Pricing ({currency})</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Cost" value={costPrice} onChange={e => setCostPrice(Number(e.target.value))} className="flex-1 p-3 border rounded-2xl outline-none font-bold" style={{ backgroundColor: 'var(--color-background-alt)', borderColor: 'var(--color-surface-border)', color: 'var(--color-text)' }} step="0.01" required />
              <input type="number" placeholder="Sale" value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value))} className="flex-1 p-3 border rounded-2xl outline-none font-bold" style={{ backgroundColor: 'var(--color-background-alt)', borderColor: 'var(--color-surface-border)', color: 'var(--color-text)' }} step="0.01" required />
            </div>
          </div>
          <div className="col-span-full">
            <label className="text-[10px] font-black uppercase tracking-widest ml-1 mb-2 block" style={{ color: 'var(--color-text-muted)' }}>Visual Asset</label>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <input type="text" placeholder="https://image-link.com/..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="flex-1 p-3 border rounded-2xl outline-none text-xs" style={{ backgroundColor: 'var(--color-background-alt)', borderColor: 'var(--color-surface-border)', color: 'var(--color-text)' }} />
              <div className="flex gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 rounded-2xl hover:opacity-80" style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}>
                  <PackageIcon className="w-5 h-5" />
                </button>
                {imageUrl && <div className="w-12 h-12 rounded-xl overflow-hidden"><img src={imageUrl} className="w-full h-full object-cover" /></div>}
              </div>
              <input type="file" ref={fileInputRef} onChange={e => handleImageUpload(e)} className="hidden" accept="image/*" />
            </div>
          </div>
        </div>
        <button type="submit" className="w-full text-white font-black py-4 rounded-[1.5rem] shadow-xl uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all" style={{ backgroundColor: colors.primary, boxShadow: `0 10px 15px -3px ${colors.primary}40` }}>Add to Stock</button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(item => {
          const isLowStock = item.quantity <= (item.lowStockThreshold || 5);
          if (editingId === item.id && editForm) {
            return (
              <form key={item.id} onSubmit={handleUpdateSubmit} className="p-6 rounded-[2.5rem] border-2 shadow-2xl animate-in zoom-in-95 space-y-4" style={{ backgroundColor: `${colors.primary}10`, borderColor: colors.primary }}>
                <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-2 bg-[var(--color-surface)] border rounded-xl" style={{ color: 'var(--color-text)' }} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: Number(e.target.value)})} className="p-2 bg-[var(--color-surface)] border rounded-xl" style={{ color: 'var(--color-text)' }} placeholder="Qty" />
                  <input type="number" value={editForm.lowStockThreshold} onChange={e => setEditForm({...editForm, lowStockThreshold: Number(e.target.value)})} className="p-2 bg-[var(--color-surface)] border rounded-xl" style={{ color: 'var(--color-text)' }} placeholder="Alert" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={editForm.costPrice} onChange={e => setEditForm({...editForm, costPrice: Number(e.target.value)})} className="p-2 bg-[var(--color-surface)] border rounded-xl" style={{ color: 'var(--color-text)' }} step="0.01" />
                  <input type="number" value={editForm.sellingPrice} onChange={e => setEditForm({...editForm, sellingPrice: Number(e.target.value)})} className="p-2 bg-[var(--color-surface)] border rounded-xl" style={{ color: 'var(--color-text)' }} step="0.01" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 text-white text-[10px] font-black py-3 rounded-xl uppercase" style={{ backgroundColor: colors.primary }}>Update</button>
                  <button type="button" onClick={() => setEditingId(null)} className="flex-1 bg-[var(--color-surface)] border text-[10px] font-black py-3 rounded-xl uppercase" style={{ color: 'var(--color-text)' }}>Cancel</button>
                </div>
              </form>
            );
          }
          return (
            <div key={item.id} className={`group p-6 rounded-[2.5rem] border shadow-xl hover:shadow-2xl transition-all duration-300 relative`} style={{ backgroundColor: isLowStock ? 'rgba(239, 68, 68, 0.05)' : 'var(--color-surface)', borderColor: isLowStock ? '#ef4444' : 'var(--color-surface-border)' }}>
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border cursor-pointer shadow-inner" style={{ backgroundColor: 'var(--color-background-alt)', borderColor: 'var(--color-surface-border)' }} onClick={() => setViewItem(item)}>
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" /> : <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--color-surface-border)' }}><PackageIcon /></div>}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                  <button onClick={() => requestEdit(item)} className="p-2 rounded-xl hover:opacity-80 transition-colors" style={{ backgroundColor: 'var(--color-background-alt)', color: 'var(--color-text-muted)' }} title="Edit (PIN required)">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth={2}/></svg>
                  </button>
                  <button onClick={() => requestDelete(item.id)} className="p-2 rounded-xl hover:opacity-80 transition-colors" style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' }} title="Delete (PIN required)">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-black text-xl mb-1" style={{ color: 'var(--color-text)' }}>{item.name}</h4>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isLowStock ? 'bg-red-600 text-white' : ''}`} style={!isLowStock ? { backgroundColor: `${colors.primary}20`, color: colors.primary } : {}}>
                      {item.quantity} units
                    </span>
                    {isLowStock && <span className="text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter flex items-center gap-1" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}><AlertCircleIcon className="w-2 h-2" /> Critical</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'var(--color-surface-border)' }}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Sale</p>
                    <p className="text-lg font-black" style={{ color: colors.primary }}>{currency}{item.sellingPrice.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Cost</p>
                    <p className="text-lg font-black" style={{ color: 'var(--color-text-muted)' }}>{currency}{item.costPrice.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="col-span-full py-20 text-center" style={{ opacity: 0.3 }}>
            <div className="flex justify-center mb-4"><StockIcon className="w-16 h-16" style={{ color: 'var(--color-text-muted)' }} /></div>
            <p className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Inventory empty</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockManager;
