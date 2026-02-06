
import React from 'react';
import { BusinessData } from '../types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { ReportsIcon, SalesIcon, ExpenseIcon, CheckCircleIcon } from './Icons';
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

    doc.setFontSize(22);
    doc.text("ZION BALANCE SHEET", 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });

    doc.autoTable({
      startY: 40,
      head: [['Metric', `Value (${currency})`]],
      body: [
        ['Total Revenue', totalSales.toLocaleString()],
        ['Total Expenses', totalExpenses.toLocaleString()],
        ['Net Profit', (totalSales - totalExpenses).toLocaleString()]
      ],
      theme: 'striped'
    });

    doc.save(`zion_report_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-3xl font-black text-slate-800">Business Intelligence</h3>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Master Performance Review</p>
        </div>
        <button onClick={generatePDF} className="w-full md:w-auto bg-slate-900 text-white text-[10px] font-black px-6 py-4 rounded-2xl flex items-center justify-center gap-2 shadow-2xl shadow-slate-400 hover:scale-105 active:scale-95 transition-all tracking-[0.2em] uppercase">
          <ReportsIcon className="w-4 h-4" /> Extract balance sheet
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
