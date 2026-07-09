export type DebtType = 'one_time' | 'installment'

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
  type: DebtType
  total_amount: number
  monthly_payment: number | null
  due_date: string | null
  remaining_balance: number
  created_at: string
}
