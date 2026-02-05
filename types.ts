
export interface Sale {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  price: number;
  cost: number;
  date: number;
}

export interface CostHistoryEntry {
  price: number;
  date: number;
}

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  lastUpdated: number;
  lowStockThreshold: number;
  imageUrl?: string;
  costHistory: CostHistoryEntry[];
}

export interface Debt {
  id: string;
  debtorName: string;
  phoneNumber: string;
  amount: number;
  description: string;
  isPaid: boolean;
  date: number;
}

export type ExpenseFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: number;
  frequency: ExpenseFrequency;
}

export type Tab = 'dashboard' | 'sales' | 'stock' | 'debts' | 'expenses' | 'reports';

export interface BusinessData {
  sales: Sale[];
  stock: StockItem[];
  debts: Debt[];
  expenses: Expense[];
}
