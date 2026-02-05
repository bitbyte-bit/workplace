
import React, { useState, useRef } from 'react';
import { StockItem, CostHistoryEntry } from '../types';
import { TrashIcon, PackageIcon, AlertCircleIcon, StockIcon } from './Icons';

interface Props {
  items: StockItem[];
  onAdd: (item: StockItem) => void;
  onUpdate: (item: StockItem) => void;
  onDelete: (id: string) => void;
  managerPassword: string;
  currency: string;
}

const StockManager: React.FC<Props> = ({ items, onAdd, onUpdate, onDelete, managerPassword, currency }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [threshold, setThreshold] = useState(5);
  const [imageUrl, setImageUrl] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<StockItem | null>(null);
  const [viewItem, setViewItem] = useState<StockItem | null>(null);

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
    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      name, quantity, costPrice, sellingPrice,
      lastUpdated: now,
      lowStockThreshold: threshold,
      imageUrl: imageUrl || undefined,
      costHistory: [{ price: costPrice, date: now }]
    });
    setName(''); setQuantity(0); setCostPrice(0); setSellingPrice(0); setThreshold(5); setImageUrl('');
  };

  const startEdit = (item: StockItem) => {
    const pass = prompt("Enter manager password to edit:");
    if (pass === managerPassword) {
      setEditingId(item.id);
      setEditForm({ ...item });
    } else {
      alert("Incorrect password.");
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

      onUpdate({
        ...editForm,
        costHistory: updatedHistory
      });
      setEditingId(null);
      setEditForm(null);
    }
  };

  return (
    <div className="space-y-8">
      {viewItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setViewItem(null)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="h-64 bg-slate-100 flex items-center justify-center relative">
              {viewItem.imageUrl ? (
                <img src={viewItem.imageUrl} alt={viewItem.name} className="w-full h-full object-cover" />
              ) : (
                <div className="p-10 bg-slate-50 rounded-full"><PackageIcon className="w-16 h-16 text-slate-200" /></div>
              )}
              <button onClick={() => setViewItem(null)} className="absolute top-4 right-4 bg-white/80 p-2 rounded-full hover:bg-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2}/></svg>
              </button>
            </div>
            <div className="p-8">
              <h2 className="text-3xl font-black text-slate-800 mb-2">{viewItem.name}</h2>
              <div className="flex gap-4 mb-6">
                <div className="flex-1 bg-blue-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Sale Price</p>
                  <p className="text-xl font-black text-blue-700">{currency}{viewItem.sellingPrice.toFixed(2)}</p>
                </div>
                <div className="flex-1 bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cost Price</p>
                  <p className="text-xl font-black text-slate-700">{currency}{viewItem.costPrice.toFixed(2)}</p>
                </div>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Cost Fluctuations</p>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {viewItem.costHistory?.slice().reverse().map((h, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-600">{new Date(h.date).toLocaleDateString()}</span>
                    <span className="font-black text-blue-600">{currency}{h.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 space-y-6">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl"><PackageIcon className="text-emerald-600" /></div>
          New Inventory Item
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Details</label>
            <input type="text" placeholder="Item Name" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 font-bold" required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Units</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Qty" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" required />
              <input type="number" placeholder="Alert" value={threshold} onChange={e => setThreshold(Number(e.target.value))} className="w-24 p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" title="Low stock threshold" required />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pricing ({currency})</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Cost" value={costPrice} onChange={e => setCostPrice(Number(e.target.value))} className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" step="0.01" required />
              <input type="number" placeholder="Sale" value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value))} className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" step="0.01" required />
            </div>
          </div>
          <div className="lg:col-span-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Visual Asset</label>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <input type="text" placeholder="https://image-link.com/..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-xs" />
              <div className="flex gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-blue-100 text-blue-600 rounded-2xl hover:bg-blue-200">
                  <PackageIcon className="w-5 h-5" />
                </button>
                {imageUrl && <div className="w-12 h-12 rounded-xl overflow-hidden"><img src={imageUrl} className="w-full h-full object-cover" /></div>}
              </div>
              <input type="file" ref={fileInputRef} onChange={e => handleImageUpload(e)} className="hidden" accept="image/*" />
            </div>
          </div>
        </div>
        <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-[1.5rem] shadow-xl shadow-slate-300 uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all">Add to Stock</button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(item => {
          const isLowStock = item.quantity <= (item.lowStockThreshold || 5);
          if (editingId === item.id && editForm) {
            return (
              <form key={item.id} onSubmit={handleUpdateSubmit} className="bg-blue-50 p-6 rounded-[2.5rem] border-2 border-blue-200 shadow-2xl animate-in zoom-in-95 space-y-4">
                <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-2 bg-white border rounded-xl" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: Number(e.target.value)})} className="p-2 bg-white border rounded-xl" placeholder="Qty" />
                  <input type="number" value={editForm.lowStockThreshold} onChange={e => setEditForm({...editForm, lowStockThreshold: Number(e.target.value)})} className="p-2 bg-white border rounded-xl" placeholder="Alert" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={editForm.costPrice} onChange={e => setEditForm({...editForm, costPrice: Number(e.target.value)})} className="p-2 bg-white border rounded-xl" step="0.01" />
                  <input type="number" value={editForm.sellingPrice} onChange={e => setEditForm({...editForm, sellingPrice: Number(e.target.value)})} className="p-2 bg-white border rounded-xl" step="0.01" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-blue-600 text-white text-[10px] font-black py-3 rounded-xl uppercase">Update</button>
                  <button type="button" onClick={() => setEditingId(null)} className="flex-1 bg-white border text-[10px] font-black py-3 rounded-xl uppercase">Cancel</button>
                </div>
              </form>
            );
          }
          return (
            <div key={item.id} className={`bg-white group p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-slate-300/40 transition-all duration-300 relative ${isLowStock ? 'bg-red-50/20 border-red-100' : ''}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 cursor-pointer shadow-inner" onClick={() => setViewItem(item)}>
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><PackageIcon /></div>}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                  <button onClick={() => startEdit(item)} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-600 hover:text-white transition-colors" title="Edit">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth={2}/></svg>
                  </button>
                  <button onClick={() => onDelete(item.id)} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-colors" title="Delete Stock (PIN required)">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-black text-xl text-slate-800 mb-1">{item.name}</h4>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isLowStock ? 'bg-red-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                      {item.quantity} units
                    </span>
                    {isLowStock && <span className="text-[10px] bg-red-100 text-red-600 px-3 py-1 rounded-full font-black uppercase tracking-tighter flex items-center gap-1"><AlertCircleIcon className="w-2 h-2" /> Critical</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sale</p>
                    <p className="text-lg font-black text-blue-600">{currency}{item.sellingPrice.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cost</p>
                    <p className="text-lg font-black text-slate-400">{currency}{item.costPrice.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-30">
            <div className="flex justify-center mb-4"><StockIcon className="w-16 h-16" /></div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Inventory empty</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockManager;
