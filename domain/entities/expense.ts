export interface Expense {
  id: string;
  amount: number;
  date: Date;
  category: string;
  description?: string;
  farmId: string;
}

export const ExpenseCategories = [
  'Fertilization',
  'Pesticides',
  'Fuel',
  'Labor',
  'Maintenance',
  'Taxes',
  'Other',
];
