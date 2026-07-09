export type DebtType = 'one_time' | 'installment'
export type DebtCategory = 'other' | 'car_loan' | 'house_loan'

export interface Expense {
  id: string
  user_id: string
  amount: number
  category: string
  description: string | null
  date: string
  created_at: string
}

export interface Income {
  id: string
  user_id: string
  amount: number
  source: string
  frequency: string
  date: string
  created_at: string
}

export interface Debt {
  id: string
  user_id: string
  name: string
  category: DebtCategory
  type: DebtType
  total_amount: number
  monthly_payment: number | null
  due_date: string | null
  remaining_balance: number
  created_at: string
}

export type ExpenseInsert = Pick<Expense, 'amount' | 'category' | 'description' | 'date'>
export type ExpenseUpdate = ExpenseInsert

export type IncomeInsert = Pick<Income, 'amount' | 'source' | 'frequency' | 'date'>
export type IncomeUpdate = IncomeInsert

export type DebtInsert = Pick<
  Debt,
  'name' | 'category' | 'type' | 'total_amount' | 'monthly_payment' | 'due_date' | 'remaining_balance'
>
export type DebtUpdate = DebtInsert

export const DEBT_CATEGORIES = [
  { value: 'other', label: 'Other' },
  { value: 'car_loan', label: 'Car loan' },
  { value: 'house_loan', label: 'House loan' },
] as const

export function debtCategoryLabel(category: DebtCategory): string {
  return DEBT_CATEGORIES.find((c) => c.value === category)?.label ?? category
}

export const EXPENSE_CATEGORIES = [
  'Housing',
  'Food',
  'Transport',
  'Utilities',
  'Healthcare',
  'Entertainment',
  'Shopping',
  'Education',
  'Other',
] as const

export const INCOME_FREQUENCIES = [
  'One-time',
  'Weekly',
  'Biweekly',
  'Monthly',
  'Yearly',
] as const
