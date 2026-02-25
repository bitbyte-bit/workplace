
import React, { useState } from 'react';
import { Sale, Receipt } from '../types';
import { ReceiptIcon, SendIcon, PhoneIcon, XIcon, DownloadIcon, FileTextIcon, CheckCircleIcon } from './Icons';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  currency: string;
  onSaveReceipt: (receipt: Receipt) => void;
  onDownloadPDF: (receipt: Receipt) => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  currency,
  onSaveReceipt,
  onDownloadPDF,
}) => {
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccessfully, setSentSuccessfully] = useState(false);

  if (!isOpen) return null;

  const totalAmount = sale.price * sale.quantity;
  const profit = (sale.price - sale.cost) * sale.quantity;

  const handleSendReceipt = async () => {
    if (!phoneNumber.trim()) return;
    
    setIsSending(true);
    
    // Simulate sending delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const receipt: Receipt = {
      id: Math.random().toString(36).substr(2, 9),
      saleId: sale.id,
      itemName: sale.itemName,
      category: sale.category,
      quantity: sale.quantity,
      price: sale.price,
      totalAmount,
      customerPhone: phoneNumber,
      customerName: sale.customerName,
      date: Date.now(),
      sentVia: 'SMS',
    };

    onSaveReceipt(receipt);
    setSentSuccessfully(true);
    setIsSending(false);
  };

  const handleDownloadPDF = () => {
    const receipt: Receipt = {
      id: Math.random().toString(36).substr(2, 9),
      saleId: sale.id,
      itemName: sale.itemName,
      category: sale.category,
      quantity: sale.quantity,
      price: sale.price,
      totalAmount,
      customerPhone: sale.customerPhone,
      customerName: sale.customerName,
      date: sale.date,
    };
    onDownloadPDF(receipt);
  };

  const handleClose = () => {
    setShowPhoneInput(false);
    setPhoneNumber('');
    setSentSuccessfully(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <ReceiptIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg">Sale Receipt</h3>
                <p className="text-blue-100 text-xs">Transaction completed successfully!</p>
              </div>
            </div>
            <button 
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Preview */}
        <div className="p-6">
          {sentSuccessfully ? (
            /* Success State */
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="w-10 h-10 text-green-600" />
              </div>
              <h4 className="font-black text-xl text-slate-800 mb-2">Receipt Sent!</h4>
              <p className="text-slate-600 mb-6">
                Thank you for your purchase! Your receipt has been sent to {phoneNumber}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : showPhoneInput ? (
            /* Phone Input State */
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PhoneIcon className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-black text-lg text-slate-800">Enter Phone Number</h4>
                <p className="text-slate-500 text-sm">Where should we send the receipt?</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="07xx xxx xxx"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 font-bold text-lg"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPhoneInput(false)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSendReceipt}
                  disabled={!phoneNumber.trim() || isSending}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <SendIcon className="w-4 h-4" />
                      Send Receipt
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Initial State */
            <div className="space-y-6">
              {/* Receipt Details */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <span className="text-slate-500 text-sm">Item</span>
                  <span className="font-bold text-slate-800">{sale.itemName}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <span className="text-slate-500 text-sm">Category</span>
                  <span className="font-bold text-slate-800">{sale.category}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <span className="text-slate-500 text-sm">Quantity</span>
                  <span className="font-bold text-slate-800">{sale.quantity}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <span className="text-slate-500 text-sm">Unit Price</span>
                  <span className="font-bold text-slate-800">{currency}{sale.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">Total</span>
                  <span className="font-black text-xl text-blue-600">{currency}{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowPhoneInput(true)}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <SendIcon className="w-5 h-5" />
                  Send Receipt via SMS
                </button>
                
                <button
                  onClick={handleDownloadPDF}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <DownloadIcon className="w-5 h-5" />
                  Download PDF
                </button>
                
                <button
                  onClick={handleClose}
                  className="w-full px-6 py-3 text-slate-500 font-bold hover:text-slate-700 transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
