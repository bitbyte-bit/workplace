
import { Expense, ExpenseFrequency } from '../types';

export function getNextOccurrence(startDate: number, frequency: ExpenseFrequency): number {
  if (frequency === 'none') return Infinity;

  const start = new Date(startDate);
  const now = new Date();
  let next = new Date(startDate);

  // If the start date is in the future, that's the first occurrence
  if (start.getTime() > now.getTime()) {
    return start.getTime();
  }

  while (next.getTime() <= now.getTime()) {
    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
  }

  return next.getTime();
}

export function isExpenseDueSoon(expense: Expense, thresholdDays: number = 3): boolean {
  if (expense.frequency === 'none') return false;
  
  const next = getNextOccurrence(expense.date, expense.frequency);
  const diffTime = next - Date.now();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return diffDays <= thresholdDays && diffDays >= -1; // Due within window or slightly overdue today
}
