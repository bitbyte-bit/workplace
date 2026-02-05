import { Sale, StockItem, Debt, Expense } from '../types';

const API_BASE = '/api';

// Helper function for API calls
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `Request failed: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error);
    throw error;
  }
}

// Sales functions
export async function saveSale(sale: Sale) {
  await apiCall('/sales', {
    method: 'POST',
    body: JSON.stringify(sale),
  });
}

export async function deleteSale(id: string) {
  await apiCall(`/sales/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchAllSales(): Promise<Sale[]> {
  return apiCall('/sales');
}

// Stock functions
export async function saveStock(item: StockItem) {
  await apiCall('/stock', {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export async function deleteStock(id: string) {
  await apiCall(`/stock/${id}`, {
    method: 'DELETE',
  });
}

export async function updateStockItem(item: StockItem) {
  await apiCall(`/stock/${item.id}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  });
}

export async function updateStockQuantity(name: string, quantityChange: number) {
  try {
    const stock = await fetchAllStock();
    const item = stock.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (item) {
      await updateStockItem({
        ...item,
        quantity: item.quantity + quantityChange,
      });
    }
  } catch (error) {
    console.warn('Failed to update stock quantity:', error);
  }
}

export async function fetchAllStock(): Promise<StockItem[]> {
  return apiCall('/stock');
}

// Debt functions
export async function saveDebt(debt: Debt) {
  await apiCall('/debts', {
    method: 'POST',
    body: JSON.stringify(debt),
  });
}

export async function deleteDebt(id: string) {
  await apiCall(`/debts/${id}`, {
    method: 'DELETE',
  });
}

export async function updateDebtItem(debt: Debt) {
  await apiCall(`/debts/${debt.id}`, {
    method: 'PUT',
    body: JSON.stringify(debt),
  });
}

export async function toggleDebtStatus(id: string) {
  try {
    const debts = await fetchAllDebts();
    const debt = debts.find(d => d.id === id);
    if (debt) {
      await updateDebtItem({
        ...debt,
        isPaid: !debt.isPaid,
      });
    }
  } catch (error) {
    console.warn('Failed to toggle debt status:', error);
  }
}

export async function fetchAllDebts(): Promise<Debt[]> {
  return apiCall('/debts');
}

// Expense functions
export async function saveExpense(expense: Expense) {
  await apiCall('/expenses', {
    method: 'POST',
    body: JSON.stringify(expense),
  });
}

export async function deleteExpense(id: string) {
  await apiCall(`/expenses/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchAllExpenses(): Promise<Expense[]> {
  return apiCall('/expenses');
}

// Summary function
export async function fetchSummary() {
  return apiCall('/summary');
}

// Reset function (clears local storage and reloads)
export function resetDatabase() {
  localStorage.removeItem('zion_sale_cats');
  localStorage.removeItem('zion_expense_cats');
  localStorage.removeItem('zion_manager_pass');
  window.location.reload();
}

// Initialize - check if API is available
export async function initDB(): Promise<void> {
  try {
    await fetchSummary();
    console.log('API connected successfully');
  } catch (error) {
    console.warn('API not available:', error);
  }
}
