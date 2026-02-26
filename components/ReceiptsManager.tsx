
import React, { useState } from 'react';
import { Receipt } from '../types';
import { ReceiptIcon, DownloadIcon, SearchIcon, FileTextIcon, TrashIcon, PhoneIcon, SendIcon, WhatsAppIcon } from './Icons';
import { useTheme } from '../contexts/ThemeContext';

interface ReceiptsManagerProps {
  receipts: Receipt[];
  currency: string;
  onDeleteReceipt: (id: string) => void;
  onDownloadPDF: (receipt: Receipt) => void;
}

const ReceiptsManager: React.FC<ReceiptsManagerProps> = ({
  receipts,
  currency,
  onDeleteReceipt,
  onDownloadPDF,
}) => {
  const { colors } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReceipts = receipts.filter(receipt => 
    receipt.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    receipt.customerPhone?.includes(searchTerm) ||
    receipt.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    receipt.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedReceipts = [...filteredReceipts].sort((a, b) => b.date - a.date);

  const handleSendViaWhatsApp = async (receipt: Receipt) => {
    if (!receipt.customerPhone) {
      alert('No phone number available for this receipt');
      return;
    }

    // Format phone number
    let phone = receipt.customerPhone.replace(/[^\d+]/g, '');
    if (!phone.startsWith('+')) {
      if (phone.length === 10) {
        phone = '+1' + phone;
      } else {
        phone = '+' + phone;
      }
    }

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const businessName = 'ORIONHUB';
      
      // Header
      doc.setFillColor(30, 64, 175);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(businessName, pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Sales Receipt', pageWidth / 2, 30, { align: 'center' });
      
      // Receipt ID
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(15, 48, pageWidth - 30, 15, 3, 3, 'F');
      doc.setTextColor(30, 64, 175);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`#${receipt.id}`, pageWidth / 2, 58, { align: 'center' });
      
      // Details
      let yPos = 75;
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const details = [
        ['Date', new Date(receipt.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })],
        ['Item Name', receipt.itemName],
        ['Category', receipt.category],
        ['Quantity', `${receipt.quantity} unit${receipt.quantity > 1 ? 's' : ''}`],
        ['Unit Price', `${currency}${receipt.price.toLocaleString()}`],
      ];
      
      details.forEach(([label, value]) => {
        doc.setTextColor(100, 116, 139);
        doc.text(label, 20, yPos);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(value, pageWidth - 20, yPos, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        yPos += 10;
      });
      
      // Total
      yPos += 5;
      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(0.5);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 15;
      
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(14);
      doc.text('Total Amount', 20, yPos);
      doc.setTextColor(30, 64, 175);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text(`${currency}${receipt.totalAmount.toLocaleString()}`, pageWidth - 20, yPos, { align: 'right' });
      
      // Customer Info
      if (receipt.customerName || receipt.customerPhone) {
        yPos += 20;
        doc.setFillColor(240, 253, 244);
        doc.roundedRect(15, yPos - 5, pageWidth - 30, 25, 3, 3, 'F');
        doc.setTextColor(22, 101, 52);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('CUSTOMER INFORMATION', 20, yPos + 3);
        yPos += 10;
        doc.setFont('helvetica', 'normal');
        if (receipt.customerName) {
          doc.setTextColor(21, 128, 61);
          doc.text('Name', 20, yPos);
          doc.setTextColor(22, 101, 52);
          doc.setFont('helvetica', 'bold');
          doc.text(receipt.customerName, pageWidth - 20, yPos, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          yPos += 8;
        }
        if (receipt.customerPhone) {
          doc.setTextColor(21, 128, 61);
          doc.text('Phone', 20, yPos);
          doc.setTextColor(22, 101, 52);
          doc.setFont('helvetica', 'bold');
          doc.text(receipt.customerPhone, pageWidth - 20, yPos, { align: 'right' });
        }
      }
      
      // Footer
      yPos = 140;
      doc.setFillColor(30, 64, 175);
      doc.rect(0, yPos, pageWidth, 50, 'F');
      yPos += 15;
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Thank You for Your Purchase!', pageWidth / 2, yPos + 8, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Please keep this receipt for your records.', pageWidth / 2, yPos + 15, { align: 'center' });
      
      // Try to use Web Share API for direct sharing to WhatsApp
      const pdfBlob = doc.output('blob');
      const pdfFile = new File([pdfBlob], `receipt_${receipt.id}.pdf`, { type: 'application/pdf' });
      
      const date = new Date(receipt.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      
      // Check if Web Share API is available and supports files
      if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: `Receipt #${receipt.id}`,
            text: `🧾 Receipt from ${businessName}\nReceipt #: ${receipt.id}\nDate: ${date}\nTotal: ${currency}${receipt.totalAmount.toLocaleString()}\n\nThank you for your business!`,
          });
          return; // Successfully shared
        } catch (shareError) {
          // User cancelled or error, continue to fallback
          console.log('Web Share failed, using fallback');
        }
      }
      
      // Fallback: Download PDF and open WhatsApp with link message
      // Save PDF
      doc.save(`receipt_${receipt.id}_${new Date(receipt.date).toISOString().split('T')[0]}.pdf`);
      
      // Open WhatsApp with detailed message
      const message = `*🧾 RECEIPT - ${businessName}*%0A%0A` +
        `*Receipt #:* ${receipt.id}%0A` +
        `*Date:* ${date}%0A%0A` +
        `━━━━━━━━━━━━━━━━━━━━%0A%0A` +
        `*ITEM DETAILS*%0A` +
        `────────────────────%0A` +
        `*Item:* ${receipt.itemName}%0A` +
        `*Category:* ${receipt.category}%0A` +
        `*Quantity:* ${receipt.quantity} unit${receipt.quantity > 1 ? 's' : ''}%0A` +
        `*Unit Price:* ${currency}${receipt.price.toLocaleString()}%0A%0A` +
        `━━━━━━━━━━━━━━━━━━━━%0A%0A` +
        `*TOTAL:* ${currency}${receipt.totalAmount.toLocaleString()}%0A%0A` +
        `━━━━━━━━━━━━━━━━━━━━%0A%0A` +
        `${receipt.customerName ? `*Customer:* ${receipt.customerName}%0A` : ''}` +
        `${receipt.customerPhone ? `*Phone:* ${receipt.customerPhone}%0A%0A` : ''}` +
        `*Thank you for your business!*%0A` +
        `(PDF receipt has been downloaded - please attach to this chat)`;

      window.open(`https://wa.me/${phone.replace(/\+/g, '')}?text=${message}`, '_blank');
      
    } catch (error) {
      console.error('Error generating receipt:', error);
      alert('Error generating receipt. Please try downloading the PDF instead.');
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-220px)]">
      {/* Header */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <h3 className="font-black text-xl text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <ReceiptIcon className="text-blue-600" />
            </div>
            Sales Receipts
          </h3>
          <div className="text-sm text-slate-500">
            {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} total
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search receipts by item, phone, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
          />
        </div>
      </div>

      {/* Receipts List */}
      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden">
        {sortedReceipts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-slate-50 rounded-full">
                <FileTextIcon className="w-12 h-12 text-slate-300" />
              </div>
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
              {searchTerm ? 'No receipts found matching your search' : 'No receipts generated yet'}
            </p>
            <p className="text-sm text-slate-400 mt-2">
              {searchTerm ? 'Try a different search term' : 'Receipts will appear here after sales are made'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt ID</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sent To</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedReceipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-4">
                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        #{receipt.id}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-xs font-medium text-slate-500">
                      {new Date(receipt.date).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-4">
                      <p className="font-bold text-slate-800">{receipt.itemName}</p>
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">
                        {receipt.category}
                      </p>
                    </td>
                    <td className="px-8 py-4 text-sm font-bold">{receipt.quantity}</td>
                    <td className="px-8 py-4 text-right">
                      <p className="text-sm font-black text-slate-900">
                        {currency}{receipt.totalAmount.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-8 py-4">
                      {receipt.customerName ? (
                        <span className="text-sm font-bold text-slate-700">{receipt.customerName}</span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-8 py-4">
                      {receipt.customerPhone ? (
                        <div className="flex items-center gap-2">
                          <PhoneIcon className="w-3 h-3 text-green-600" />
                          <span className="text-sm font-medium text-slate-700">{receipt.customerPhone}</span>
                          {receipt.sentVia && (
                            <span className="text-[10px] font-black text-green-600 uppercase bg-green-50 px-2 py-0.5 rounded-full">
                              {receipt.sentVia}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Not sent</span>
                      )}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {receipt.customerPhone && (
                          <button
                            onClick={() => handleSendViaWhatsApp(receipt)}
                            className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-colors"
                            title="Send via WhatsApp"
                          >
                            <WhatsAppIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onDownloadPDF(receipt)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-colors"
                          title="Download PDF"
                        >
                          <DownloadIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteReceipt(receipt.id)}
                          className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete Receipt"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptsManager;
