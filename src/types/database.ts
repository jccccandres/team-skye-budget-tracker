export type DebtType = 'one_time' | 'installment'
export type DebtCategory = 'other' | 'car_loan' | 'house_loan'
export type WalletRole = 'owner' | 'member'
export type InviteStatus = 'pending' | 'accepted' | 'declined'
export type SavingsTransactionType = 'deposit' | 'withdrawal'
export type TransferSourceType = 'personal' | 'wallet'
export type TransferDestinationType = 'wallet' | 'savings_goal'

export interface Expense {
  id: string
  user_id: string
  wallet_id: string | null
  amount: number
  category: string
  description: string | null
  date: string
  created_at: string
}

export interface Income {
  id: string
  user_id: string
  wallet_id: string | null
  amount: number
  source: string
  frequency: string
  date: string
  created_at: string
}

export interface Wallet {
  id: string
  name: string
  created_by: string
  created_at: string
}

export interface WalletMember {
  wallet_id: string
  user_id: string
  role: WalletRole
  joined_at: string
}

export interface WalletInvite {
  id: string
  wallet_id: string
  invited_email: string
  invited_by: string
  status: InviteStatus
  created_at: string
}

export interface SavingsGoal {
  id: string
  user_id: string
  name: string
  target_amount: number | null
  target_date: string | null
  current_amount: number
  created_at: string
}

export interface SavingsTransaction {
  id: string
  goal_id: string
  amount: number
  type: SavingsTransactionType
  date: string
  note: string | null
  created_at: string
}

export interface Transfer {
  id: string
  user_id: string
  amount: number
  date: string
  note: string | null
  source_type: TransferSourceType
  source_wallet_id: string | null
  destination_type: TransferDestinationType
  destination_wallet_id: string | null
  destination_savings_goal_id: string | null
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

export type WalletInsert = Pick<Wallet, 'name'>

export type SavingsGoalInsert = Pick<SavingsGoal, 'name' | 'target_amount' | 'target_date'>
export type SavingsGoalUpdate = SavingsGoalInsert

export type SavingsTransactionInsert = Pick<
  SavingsTransaction,
  'amount' | 'type' | 'date' | 'note'
>

export interface CreateTransferInput {
  amount: number
  date: string
  note: string | null
  sourceType: TransferSourceType
  sourceWalletId: string | null
  destinationType: TransferDestinationType
  destinationWalletId: string | null
  destinationSavingsGoalId: string | null
}

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
