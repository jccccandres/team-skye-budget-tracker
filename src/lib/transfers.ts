import type {
  Debt,
  SavingsGoal,
  Transfer,
  TransferDestinationType,
  TransferSourceType,
  Wallet,
} from '../types/database'

interface HasTransferSource {
  source_type: TransferSourceType
  source_wallet_id: string | null
}

interface HasTransferDestination {
  destination_type: TransferDestinationType
  destination_wallet_id: string | null
  destination_savings_goal_id: string | null
  destination_debt_id: string | null
}

export function transferSourceLabel(transfer: HasTransferSource, wallets: Wallet[]): string {
  if (transfer.source_type === 'personal') return 'Personal'
  const wallet = wallets.find((w) => w.id === transfer.source_wallet_id)
  return wallet ? `${wallet.name} (shared)` : 'Shared wallet'
}

export function transferDestinationLabel(
  transfer: HasTransferDestination,
  wallets: Wallet[],
  goals: SavingsGoal[],
  debts: Debt[] = [],
): string {
  if (transfer.destination_type === 'wallet') {
    const wallet = wallets.find((w) => w.id === transfer.destination_wallet_id)
    return wallet ? `${wallet.name} (shared)` : 'Shared wallet'
  }
  if (transfer.destination_type === 'debt') {
    const debt = debts.find((d) => d.id === transfer.destination_debt_id)
    return debt ? `${debt.name} (payment)` : 'Debt payment'
  }
  const goal = goals.find((g) => g.id === transfer.destination_savings_goal_id)
  return goal ? goal.name : 'Savings goal'
}

export function transferCreatorLabel(
  transfer: Transfer,
  currentUserId: string,
  creatorEmails: Record<string, string>,
): string {
  if (transfer.user_id === currentUserId) return 'You'
  return creatorEmails[transfer.user_id] ?? 'Another member'
}
