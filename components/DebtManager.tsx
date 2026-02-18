
import React, { useState } from 'react';
import { Debt } from '../types';
import { TrashIcon, DebtIcon, ClockIcon, PhoneIcon, MessageIcon, SendIcon } from './Icons';
import PasswordModal from './PasswordModal';

interface Props {
  debts: Debt[];
  onAddDebt: (debt: Debt) => void;
  onUpdateDebt: (debt: Debt) => void;
  onToggleDebt: (id: string) => void;
  onDeleteDebt: (id: string) => void;
  currency: string;
  businessName?: string;
  managerPassword?: string;
}

type ModalAction = 'edit' | 'delete' | 'whatsapp' | null;

const DebtManager: React.FC<Props> = ({ debts, onAddDebt, onUpdateDebt, onToggleDebt, onDeleteDebt, currency, businessName = 'Our Business', managerPassword = '' }) => {
  const [debtorName, setDebtorName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Debt | null>(null);

  // Password modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: ModalAction; id?: string; data?: Debt } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddDebt({
      id: Math.random().toString(36).substr(2, 9),
      debtorName, phoneNumber, amount, description,
      isPaid: false,
      date: Date.now(),
    });
    setDebtorName(''); setPhoneNumber(''); setAmount(0); setDescription('');
  };

  const requestEdit = (debt: Debt) => {
    setPendingAction({ action: 'edit', id: debt.id, data: debt });
    setPasswordModalOpen(true);
  };

  const requestDelete = (id: string) => {
    setPendingAction({ action: 'delete', id });
    setPasswordModalOpen(true);
  };

  const requestWhatsApp = (debt: Debt) => {
    setPendingAction({ action: 'whatsapp', id: debt.id, data: debt });
    setPasswordModalOpen(true);
  };

  const handlePasswordConfirm = (password: string) => {
    if (password === managerPassword) {
      if (pendingAction?.action === 'edit' && pendingAction.data) {
        setEditingId(pendingAction.id!);
        setEditForm({ ...pendingAction.data });
      } else if (pendingAction?.action === 'delete' && pendingAction.id) {
        onDeleteDebt(pendingAction.id);
      } else if (pendingAction?.action === 'whatsapp' && pendingAction.data) {
        sendDebtReminder(pendingAction.data);
      }
      setPasswordModalOpen(false);
      setPendingAction(null);
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

  const sendDebtReminder = (debt: Debt) => {
    const cleanPhone = debt.phoneNumber.replace(/\D/g, '');
    const message = `Hello ${debt.debtorName}, this is a reminder that you have an outstanding balance of ${currency}${debt.amount.toLocaleString()} at ${businessName}. ${debt.description ? 'Note: ' + debt.description + '. ' : ''}Please arrange payment at your earliest convenience. Thank you!`;
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Open WhatsApp Web with pre-filled message
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editForm) {
      onUpdateDebt(editForm);
      setEditingId(null);
      setEditForm(null);
    }
  };

  // Contact actions
  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleSMS = (phone: string) => {
    window.open(`sms:${phone}`, '_self');
  };

  return (
    <div className="space-y-6">
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

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 space-y-6">
        <h3 className="font-black text-xl text-slate-800 flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-xl"><DebtIcon className="text-indigo-600" /></div>
          Log New Debt
        </h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Debtor Name</label>
              <input type="text" placeholder="e.g. John Doe" value={debtorName} onChange={e => setDebtorName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact</label>
              <input type="tel" placeholder="07xx xxx xxx" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Owed ({currency})</label>
              <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes</label>
              <input type="text" placeholder="Reason for debt" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" />
            </div>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-[1.5rem] shadow-xl shadow-indigo-100 uppercase tracking-widest hover:scale-[1.01] transition-all">Record Debt</button>
        </form>
      </div>

      <div className="space-y-4">
        {debts.map(debt => {
          if (editingId === debt.id && editForm) {
            return (
              <form key={debt.id} onSubmit={handleUpdateSubmit} className="bg-indigo-50 p-6 rounded-[2.5rem] border border-indigo-100 shadow-xl space-y-4">
                <input type="text" value={editForm.debtorName} onChange={e => setEditForm({...editForm, debtorName: e.target.value})} className="w-full p-3 bg-white border rounded-xl" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="tel" value={editForm.phoneNumber} onChange={e => setEditForm({...editForm, phoneNumber: e.target.value})} className="p-3 bg-white border rounded-xl" />
                  <input type="number" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: Number(e.target.value)})} className="p-3 bg-white border rounded-xl" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-indigo-600 text-white text-[10px] font-black py-3 rounded-xl uppercase">Update</button>
                  <button type="button" onClick={() => setEditingId(null)} className="flex-1 bg-white border text-[10px] font-black py-3 rounded-xl uppercase">Cancel</button>
                </div>
              </form>
            );
          }
          return (
            <div key={debt.id} className={`p-6 rounded-[2rem] border shadow-xl transition-all duration-300 group ${debt.isPaid ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-indigo-50'}`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${debt.isPaid ? 'bg-slate-200 text-slate-400' : 'bg-indigo-100 text-indigo-600'}`}>
                    <DebtIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-xl text-slate-800">{debt.debtorName}</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{debt.phoneNumber}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                      <ClockIcon className="w-3 h-3" /> {new Date(debt.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <p className="font-black text-2xl text-indigo-700">{currency}{debt.amount.toLocaleString()}</p>
                  <div className="flex gap-2">
                    <button onClick={() => requestEdit(debt)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-100 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Edit (PIN required)">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth={2}/></svg>
                    </button>
                    <div className="flex gap-1">
                      {debt.phoneNumber && (
                        <>
                          <button onClick={() => handleCall(debt.phoneNumber)} className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all" title="Call">
                            <PhoneIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleSMS(debt.phoneNumber)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all" title="SMS">
                            <MessageIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleSMS(debt.phoneNumber)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all" title="SMS">
                            <MessageIcon className="w-4 h-4" />
                          </button>
                          {!debt.isPaid && (
                            <button 
                              onClick={() => requestWhatsApp(debt)} 
                              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 opacity-0 group-hover:opacity-100 transition-all" 
                              title="Send Reminder via System"
                            >
                              <SendIcon className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    <button onClick={() => requestDelete(debt.id)} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" title="Delete (PIN required)">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => onToggleDebt(debt.id)} className={`text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all ${debt.isPaid ? 'bg-slate-200 text-slate-500' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:scale-105'}`}>
                      {debt.isPaid ? 'Settled' : 'Mark Paid'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {debts.length === 0 && (
          <div className="py-20 text-center opacity-30">
            <div className="flex justify-center mb-4"><DebtIcon className="w-16 h-16" /></div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No outstanding debts</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebtManager;
