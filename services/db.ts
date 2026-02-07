import { Sale, StockItem, Debt, Expense } from '../types';

// API base URL (will be proxied by Vite)
const API_BASE = '/api';

// Auto-save functionality
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingChanges = false;

function triggerAutoSave() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  autoSaveTimer = setTimeout(async () => {
    if (pendingChanges) {
      pendingChanges = false;
      try {
        await syncToDevice();
        console.log('Auto-synced to server and device');
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }
  }, 2000);
}

// API helper functions
async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}

async function apiPost<T>(endpoint: string, data: T): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}

async function apiPut<T>(endpoint: string, data: T): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}

async function apiDelete(endpoint: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}

// Sync with server (saves SQLite to device files)
export async function syncToDevice(): Promise<void> {
  await apiPost('/sync', {});
}

// Sales functions
export async function saveSale(sale: Sale): Promise<void> {
  await apiPost('/sales', sale);
  pendingChanges = true;
  triggerAutoSave();
}

export async function deleteSale(id: string): Promise<void> {
  await apiDelete(`/sales/${id}`);
  pendingChanges = true;
  triggerAutoSave();
}

export async function fetchAllSales(): Promise<Sale[]> {
  return apiGet<Sale[]>('/sales');
}

// Stock functions
export async function saveStock(item: StockItem): Promise<void> {
  await apiPost('/stock', item);
  pendingChanges = true;
  triggerAutoSave();
}

export async function deleteStock(id: string): Promise<void> {
  await apiDelete(`/stock/${id}`);
  pendingChanges = true;
  triggerAutoSave();
}

export async function updateStockItem(item: StockItem): Promise<void> {
  await apiPut(`/stock/${item.id}`, item);
  pendingChanges = true;
  triggerAutoSave();
}

export async function updateStockQuantity(name: string, quantityChange: number): Promise<void> {
  const stock = await fetchAllStock();
  const item = stock.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (item) {
    await updateStockItem({
      ...item,
      quantity: item.quantity + quantityChange,
      lastUpdated: Date.now(),
    });
  }
}

export async function fetchAllStock(): Promise<StockItem[]> {
  return apiGet<StockItem[]>('/stock');
}

// Debt functions
export async function saveDebt(debt: Debt): Promise<void> {
  await apiPost('/debts', debt);
  pendingChanges = true;
  triggerAutoSave();
}

export async function deleteDebt(id: string): Promise<void> {
  await apiDelete(`/debts/${id}`);
  pendingChanges = true;
  triggerAutoSave();
}

export async function updateDebtItem(debt: Debt): Promise<void> {
  await apiPut(`/debts/${debt.id}`, debt);
  pendingChanges = true;
  triggerAutoSave();
}

export async function toggleDebtStatus(id: string): Promise<void> {
  const debts = await fetchAllDebts();
  const debt = debts.find(d => d.id === id);
  if (debt) {
    await updateDebtItem({
      ...debt,
      isPaid: !debt.isPaid,
    });
  }
}

export async function fetchAllDebts(): Promise<Debt[]> {
  return apiGet<Debt[]>('/debts');
}

// Expense functions
export async function saveExpense(expense: Expense): Promise<void> {
  await apiPost('/expenses', expense);
  pendingChanges = true;
  triggerAutoSave();
}

export async function deleteExpense(id: string): Promise<void> {
  await apiDelete(`/expenses/${id}`);
  pendingChanges = true;
  triggerAutoSave();
}

export async function fetchAllExpenses(): Promise<Expense[]> {
  return apiGet<Expense[]>('/expenses');
}

// ========== USER AUTHENTICATION ==========

export interface User {
  id: string;
  email: string;
  fullName: string;
  businessName: string;
  phone: string;
  createdAt?: number;
}

export async function checkUserExists(): Promise<boolean> {
  const response = await fetch(`${API_BASE}/auth/check`);
  if (!response.ok) throw new Error('Auth check failed');
  const data = await response.json();
  return data.hasUser;
}

export async function registerUser(
  email: string,
  password: string,
  fullName: string,
  businessName: string,
  phone: string
): Promise<{ user: User }> {
  const id = Math.random().toString(36).substr(2, 9);
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, email, password, fullName, businessName, phone })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }
  return response.json();
}

export async function loginUser(email: string, password: string): Promise<{ user: User }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }
  return response.json();
}

export async function getUserProfile(userId: string): Promise<{ user: User }> {
  const response = await fetch(`${API_BASE}/auth/profile?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to get profile');
  return response.json();
}

export async function updateUserProfile(
  userId: string,
  fullName: string,
  businessName: string,
  phone: string,
  currentPassword?: string,
  newPassword?: string
): Promise<{ user: User }> {
  const response = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, fullName, businessName, phone, currentPassword, newPassword })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Update failed');
  }
  return response.json();
}

// Summary function
export async function fetchSummary() {
  return apiGet<{
    salesTotal: number;
    stockCount: number;
    totalStockValue: number;
    unpaidDebts: number;
    totalExpenses: number;
    lowStockItems: number;
  }>('/summary');
}

// Export/Import for Records Manager
export async function exportAllData(): Promise<void> {
  const response = await fetch(`${API_BASE}/export`);
  if (!response.ok) throw new Error('Export failed');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zion_records_${Date.now()}.json`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function importData(file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  
  const text = await file.text();
  const data = JSON.parse(text);
  
  await apiPost('/import', data);
  pendingChanges = true;
  triggerAutoSave();
}

// Force immediate sync
export function forceSync(): void {
  pendingChanges = true;
  triggerAutoSave();
  // Also trigger immediate server sync
  syncToDevice();
}

// Initialize - check connection
export async function initServerDB(): Promise<boolean> {
  try {
    await fetchAllSales();
    console.log('✅ Connected to server database');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to server:', error);
    return false;
  }
}
