
import React from 'react';
import { BusinessData, Sale, Expense, StockItem, Debt } from '../types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { ReportsIcon, SalesIcon, ExpenseIcon, CheckCircleIcon, StockIcon, DebtIcon } from './Icons';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

interface Props {
  data: BusinessData;
  currency: string;
}

const Reports: React.FC<Props> = ({ data, currency }) => {
  const salesByDate = data.sales.reduce((acc, sale) => {
    const dateStr = new Date(sale.date).toLocaleDateString();
    acc[dateStr] = (acc[dateStr] || 0) + (sale.price * sale.quantity);
    return acc;
  }, {} as Record<string, number>);

  const expensesByDate = data.expenses.reduce((acc, exp) => {
    const dateStr = new Date(exp.date).toLocaleDateString();
    acc[dateStr] = (acc[dateStr] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const dates = [...new Set([...Object.keys(salesByDate), ...Object.keys(expensesByDate)])]
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .slice(-7);

  const salesChartData = {
    labels: dates,
    datasets: [
      { 
        label: `Revenue`, 
        data: dates.map(d => salesByDate[d] || 0), 
        borderColor: 'rgb(37, 99, 235)', 
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.4, 
        fill: true 
      }
    ],
  };

  const comparisonData = {
    labels: dates,
    datasets: [
      { label: 'Revenue', data: dates.map(d => salesByDate[d] || 0), backgroundColor: '#3b82f6', borderRadius: 10 },
      { label: 'Expenses', data: dates.map(d => expensesByDate[d] || 0), backgroundColor: '#f43f5e', borderRadius: 10 }
    ]
  };

  const generatePDF = () => {
    const doc = new jsPDF() as any;
    const totalSales = data.sales.reduce((a, s) => a + s.price * s.quantity, 0);
    const totalExpenses = data.expenses.reduce((a, e) => a + e.amount, 0);
    const totalStockValue = data.stock.reduce((a, s) => a + s.quantity * s.costPrice, 0);
    const unpaidDebts = data.debts.filter(d => !d.isPaid).reduce((a, d) => a + d.amount, 0);

    // Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("ZION BUSINESS RECORDS", 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });

    // Summary Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("FINANCIAL SUMMARY", 14, 45);
    
    doc.autoTable({
      startY: 50,
      head: [['Metric', `Value (${currency})`]],
      body: [
        ['Total Revenue', totalSales.toLocaleString()],
        ['Total Expenses', totalExpenses.toLocaleString()],
        ['Net Profit', (totalSales - totalExpenses).toLocaleString()],
        ['Stock Value', totalStockValue.toLocaleString()],
        ['Unpaid Debts', unpaidDebts.toLocaleString()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });

    // Sales Section
    let currentY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("SALES RECORDS", 14, currentY);
    
    if (data.sales.length > 0) {
      doc.autoTable({
        startY: currentY + 5,
        head: [['Date', 'Item', 'Category', 'Qty', 'Unit Price', 'Total']],
        body: data.sales.map(s => [
          new Date(s.date).toLocaleDateString(),
          s.itemName,
          s.category,
          s.quantity,
          `${currency}${s.price.toLocaleString()}`,
          `${currency}${(s.price * s.quantity).toLocaleString()}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] }
      });
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text("No sales records found.", 14, currentY + 12);
    }

    // Stock Section
    currentY = (doc as any).lastAutoTable?.finalY || currentY + 30;
    if (data.sales.length === 0) currentY += 10;
    currentY += 10;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("STOCK INVENTORY", 14, currentY);
    
    if (data.stock.length > 0) {
      doc.autoTable({
        startY: currentY + 5,
        head: [['Item', 'Quantity', 'Cost Price', 'Selling Price', 'Value']],
        body: data.stock.map(s => [
          s.name,
          s.quantity,
          `${currency}${s.costPrice.toLocaleString()}`,
          `${currency}${s.sellingPrice.toLocaleString()}`,
          `${currency}${(s.quantity * s.costPrice).toLocaleString()}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text("No stock items found.", 14, currentY + 12);
    }

    // Debts Section
    currentY = (doc as any).lastAutoTable?.finalY || currentY + 30;
    if (data.stock.length === 0) currentY += 10;
    currentY += 10;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("DEBTS RECORDS", 14, currentY);
    
    if (data.debts.length > 0) {
      doc.autoTable({
        startY: currentY + 5,
        head: [['Debtor', 'Phone', 'Amount', 'Status', 'Date']],
        body: data.debts.map(d => [
          d.debtorName,
          d.phoneNumber,
          `${currency}${d.amount.toLocaleString()}`,
          d.isPaid ? 'Paid' : 'Unpaid',
          new Date(d.date).toLocaleDateString()
        ]),
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] }
      });
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text("No debt records found.", 14, currentY + 12);
    }

    // Expenses Section
    currentY = (doc as any).lastAutoTable?.finalY || currentY + 30;
    if (data.debts.length === 0) currentY += 10;
    currentY += 10;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("EXPENSES RECORDS", 14, currentY);
    
    if (data.expenses.length > 0) {
      doc.autoTable({
        startY: currentY + 5,
        head: [['Category', 'Description', 'Amount', 'Frequency', 'Date']],
        body: data.expenses.map(e => [
          e.category,
          e.description,
          `${currency}${e.amount.toLocaleString()}`,
          e.frequency === 'none' ? 'One-time' : e.frequency,
          new Date(e.date).toLocaleDateString()
        ]),
        theme: 'striped',
        headStyles: { fillColor: [244, 63, 94] }
      });
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text("No expense records found.", 14, currentY + 12);
    }

    doc.save(`zion_records_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-3xl font-black text-slate-800">Business Intelligence</h3>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Master Performance Review</p>
        </div>
        <button onClick={generatePDF} className="w-full md:w-auto bg-slate-900 text-white text-[10px] font-black px-6 py-4 rounded-2xl flex items-center justify-center gap-2 shadow-2xl shadow-slate-400 hover:scale-105 active:scale-95 transition-all tracking-[0.2em] uppercase">
          <ReportsIcon className="w-4 h-4" /> Export PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Revenue Trajectory</p>
          <div className="h-64"><Line data={salesChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } } }} /></div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Revenue vs Expenses</p>
          <div className="h-64"><Bar data={comparisonData} options={{ maintainAspectRatio: false, scales: { x: { grid: { display: false } }, y: { grid: { display: false } } } }} /></div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Master Transaction Log</p>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{data.sales.length + data.expenses.length} total entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-4">Transaction</th>
                <th className="px-8 py-4">Modality</th>
                <th className="px-8 py-4 text-right">Magnitude</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.sales.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-4">
                    <p className="font-bold text-slate-800">{s.itemName}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{new Date(s.date).toLocaleDateString()}</p>
                  </td>
                  <td className="px-8 py-4 flex items-center gap-2 pt-5">
                    <div className="p-1.5 bg-emerald-100 rounded-lg"><SalesIcon className="w-3 h-3 text-emerald-600" /></div>
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Inflow</span>
                  </td>
                  <td className="px-8 py-4 text-right font-black text-slate-900">{currency}{(s.price * s.quantity).toLocaleString()}</td>
                </tr>
              ))}
              {data.expenses.map(e => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-4">
                    <p className="font-bold text-slate-800">{e.category}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{new Date(e.date).toLocaleDateString()}</p>
                  </td>
                  <td className="px-8 py-4 flex items-center gap-2 pt-5">
                    <div className="p-1.5 bg-rose-100 rounded-lg"><ExpenseIcon className="w-3 h-3 text-rose-600" /></div>
                    <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Outflow</span>
                  </td>
                  <td className="px-8 py-4 text-right font-black text-rose-600">-{currency}{e.amount.toLocaleString()}</td>
                </tr>
              ))}
              {(data.sales.length === 0 && data.expenses.length === 0) && (
                <tr>
                   <td colSpan={3} className="py-20 text-center opacity-30">
                      <div className="flex justify-center mb-4"><CheckCircleIcon className="w-16 h-16" /></div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Log clear. No transactions.</p>
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

export default Reports;
