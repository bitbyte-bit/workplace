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
        console.log('Auto-saved to database');
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }
  }, 2000);
}

// Current user ID for API requests
let currentUserId: string | null = null;

export function setCurrentUserId(userId: string | null) {
  currentUserId = userId;
}

export function getCurrentUserId(): string | null {
  return currentUserId;
}

// API helper functions
async function apiGet<T>(endpoint: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (currentUserId) {
    headers['x-user-id'] = currentUserId;
  }
  const response = await fetch(`${API_BASE}${endpoint}`, { headers });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}

async function apiPost<T>(endpoint: string, data: T): Promise<{ success: boolean }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (currentUserId) {
    headers['x-user-id'] = currentUserId;
  }
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}

async function apiPut<T>(endpoint: string, data: T): Promise<{ success: boolean }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (currentUserId) {
    headers['x-user-id'] = currentUserId;
  }
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}

async function apiDelete(endpoint: string): Promise<{ success: boolean }> {
  const headers: Record<string, string> = {};
  if (currentUserId) {
    headers['x-user-id'] = currentUserId;
  }
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}

// Sync with server (saves to SQLite database)
export async function syncToDevice(): Promise<void> {
  // The data is already saved via individual API calls
  // This function is kept for backwards compatibility but now does nothing
  console.log('Data sync handled automatically via API calls');
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

export async function updateExpenseItem(expense: Expense): Promise<void> {
  await apiPut(`/expenses/${expense.id}`, expense);
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
  role: string;
  status: string;
  warningCount: number;
  lastWarningAt?: number;
  suspendedAt?: number;
  suspendedReason?: string;
  createdAt?: number;
  lastLoginAt?: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  bannedUsers: number;
  warnedUsers: number;
  totalSales: number;
  totalRevenue: number;
  totalExpenses?: number;
  totalDebts?: number;
  totalStockItems?: number;
  lowStockItems?: number;
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

// ========== ADMIN FUNCTIONS ==========

export async function loginAdmin(email: string, password: string): Promise<{ user: User }> {
  const response = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Admin login failed');
  }
  return response.json();
}

export async function getAllUsers(adminId: string): Promise<{ users: User[] }> {
  const response = await fetch(`${API_BASE}/admin/users`, {
    headers: { 'x-admin-id': adminId }
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch users');
  }
  return response.json();
}

export async function getAdminStats(adminId: string): Promise<{ stats: AdminStats }> {
  const response = await fetch(`${API_BASE}/admin/stats`, {
    headers: { 'x-admin-id': adminId }
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch stats');
  }
  return response.json();
}

export async function warnUser(adminId: string, userId: string, reason?: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/warn`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-admin-id': adminId 
    },
    body: JSON.stringify({ reason })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to warn user');
  }
}

export async function suspendUser(adminId: string, userId: string, reason?: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/suspend`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-admin-id': adminId 
    },
    body: JSON.stringify({ reason })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to suspend user');
  }
}

export async function unsuspendUser(adminId: string, userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/unsuspend`, {
    method: 'POST',
    headers: { 'x-admin-id': adminId }
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to unsuspend user');
  }
}

export async function banUser(adminId: string, userId: string, reason?: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/ban`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-admin-id': adminId 
    },
    body: JSON.stringify({ reason })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to ban user');
  }
}

export async function deleteUser(adminId: string, userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { 'x-admin-id': adminId }
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete user');
  }
}

// ========== SETTINGS FUNCTIONS ==========

export async function fetchSettings(userId?: string): Promise<Record<string, any>> {
  let url = `${API_BASE}/settings`;
  if (userId) {
    url += `?userId=${encodeURIComponent(userId)}`;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch settings');
  return response.json();
}

export async function saveSetting(userId: string | undefined, key: string, value: any): Promise<void> {
  const response = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, key, value }),
  });
  if (!response.ok) throw new Error('Failed to save setting');
}

export async function saveSettings(userId: string | undefined, settings: Record<string, any>): Promise<void> {
  const response = await fetch(`${API_BASE}/settings/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, settings }),
  });
  if (!response.ok) throw new Error('Failed to save settings');
}

export async function deleteSettings(userId: string | undefined, key: string): Promise<void> {
  const response = await fetch(`${API_BASE}/settings`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, key }),
  });
  if (!response.ok) throw new Error('Failed to delete setting');
}

// ========== THEME FUNCTIONS ==========

export type Theme = 'light' | 'dark' | 'blue' | 'green' | 'purple' | 'warm';

export async function fetchTheme(userId?: string): Promise<Theme> {
  try {
    const settings = await fetchSettings(userId);
    return (settings.theme as Theme) || 'light';
  } catch {
    return 'light';
  }
}

export async function saveTheme(theme: Theme, userId?: string): Promise<void> {
  await saveSetting(userId, 'theme', theme);
}

// ========== PIN/MANAGER PASSWORD FUNCTIONS ==========

export async function fetchManagerPin(): Promise<string> {
  try {
    const settings = await fetchSettings(undefined);
    return (settings.managerPassword as string) || '';
  } catch {
    return '';
  }
}

export async function saveManagerPin(pin: string, userId?: string): Promise<void> {
  await saveSetting(userId, 'managerPassword', pin);
}

export async function hasManagerPin(): Promise<boolean> {
  try {
    const settings = await fetchSettings(undefined);
    return !!settings.managerPassword;
  } catch {
    return false;
  }
}

// ========== SECURITY QUESTION FUNCTIONS ==========

export interface SecurityQuestion {
  question: string;
  answer: string;
}

export async function fetchSecurityQuestion(): Promise<SecurityQuestion | null> {
  try {
    const settings = await fetchSettings(undefined);
    if (settings.securityQuestion && settings.securityAnswer) {
      return {
        question: settings.securityQuestion as string,
        answer: settings.securityAnswer as string
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveSecurityQuestion(question: string, answer: string, userId?: string): Promise<void> {
  await saveSetting(userId, 'securityQuestion', question);
  await saveSetting(userId, 'securityAnswer', answer);
}

// ========== WHATSAPP FUNCTIONS ==========

export interface WhatsAppConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export async function sendWhatsAppMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message }),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      return { success: true, messageId: result.messageId };
    } else {
      return { success: false, error: result.error || result.message };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveWhatsAppConfig(config: WhatsAppConfig): Promise<void> {
  const response = await fetch(`${API_BASE}/whatsapp/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!response.ok) throw new Error('Failed to save WhatsApp config');
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

// Force immediate sync to database
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
