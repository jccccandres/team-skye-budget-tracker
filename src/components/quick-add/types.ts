import type { VerificationScopeRef } from '../../hooks/useBalanceVerifications'

export type QuickAddAction = 'transfer' | 'expense' | 'income' | 'verify'

export type QuickAddScope = VerificationScopeRef

export const quickAddActions: { key: QuickAddAction; label: string }[] = [
  { key: 'transfer', label: 'Transfer' },
  { key: 'expense', label: 'Expense' },
  { key: 'income', label: 'Income' },
  { key: 'verify', label: 'Verify balance' },
]
