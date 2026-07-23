export type DebtType = 'one_time' | 'installment'
export type DebtCategory = 'other' | 'car_loan' | 'house_loan'
export type WalletRole = 'owner' | 'member'
export type InviteStatus = 'pending' | 'accepted' | 'declined'
export type SavingsTransactionType = 'deposit' | 'withdrawal'
export type TransferSourceType = 'personal' | 'wallet'
export type TransferDestinationType = 'wallet' | 'savings_goal' | 'debt'
export type ExpensePaymentSource = 'wallet' | 'credit_card'

export interface Expense {
  id: string
  user_id: string
  wallet_id: string | null
  transfer_id: string | null
  credit_card_id: string | null
  payment_source: ExpensePaymentSource
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
  transfer_id: string | null
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
  transfer_id: string | null
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
  fee: number | null
  date: string
  note: string | null
  source_type: TransferSourceType
  source_wallet_id: string | null
  destination_type: TransferDestinationType
  destination_wallet_id: string | null
  destination_savings_goal_id: string | null
  destination_debt_id: string | null
  created_at: string
}

export interface DebtPayment {
  id: string
  debt_id: string
  transfer_id: string | null
  amount: number
  date: string
  note: string | null
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

// Grocery lists are a standalone module: not linked to wallets, expenses,
// or transfers. `id` is generated client-side (UUID) so lists/items can be
// created while offline and synced later without id collisions.
export interface GroceryList {
  id: string
  user_id: string
  name: string
  created_at: string
}

// Grocery items are grouped into a fixed set of categories so a list can
// show separate sections in the UI.
export type GroceryItemCategory =
  | 'meat_frozen'
  | 'fruits_veggies'
  | 'pantry_snacks'
  | 'household_cleaning'

export interface GroceryItem {
  id: string
  list_id: string
  name: string
  category: GroceryItemCategory
  checked: boolean
  price: number | null
  created_at: string
}

export interface CreditCard {
  id: string
  user_id: string
  name: string
  limit_amount: number
  cutoff_day: number
  due_day: number
  created_at: string
}

export type ExpenseInsert = Pick<
  Expense,
  'amount' | 'category' | 'description' | 'date' | 'payment_source' | 'credit_card_id'
>
export type ExpenseUpdate = ExpenseInsert

export type IncomeInsert = Pick<Income, 'amount' | 'source' | 'frequency' | 'date'>
export type IncomeUpdate = IncomeInsert

export type DebtInsert = Pick<
  Debt,
  'name' | 'category' | 'type' | 'total_amount' | 'monthly_payment' | 'due_date' | 'remaining_balance'
>
export type DebtUpdate = DebtInsert

export type CreditCardInsert = Pick<CreditCard, 'name' | 'limit_amount' | 'cutoff_day' | 'due_day'>
export type CreditCardUpdate = CreditCardInsert

export type WalletInsert = Pick<Wallet, 'name'>

export type SavingsGoalInsert = Pick<SavingsGoal, 'name' | 'target_amount' | 'target_date'>
export type SavingsGoalUpdate = SavingsGoalInsert

export type SavingsTransactionInsert = Pick<
  SavingsTransaction,
  'amount' | 'type' | 'date' | 'note'
>

export type GroceryListInsert = Pick<GroceryList, 'id' | 'name'>
export type GroceryListUpdate = Pick<GroceryList, 'name'>

export type GroceryItemInsert = Pick<GroceryItem, 'id' | 'list_id' | 'name' | 'category'>
export type GroceryItemUpdate = Partial<Pick<GroceryItem, 'name' | 'category' | 'checked' | 'price'>>

export interface CreateTransferInput {
  amount: number
  fee: number | null
  date: string
  note: string | null
  sourceType: TransferSourceType
  sourceWalletId: string | null
  destinationType: TransferDestinationType
  destinationWalletId: string | null
  destinationSavingsGoalId: string | null
  destinationDebtId: string | null
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
  'Grocery',
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
