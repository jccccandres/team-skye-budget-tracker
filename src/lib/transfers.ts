import type { SavingsGoal, Transfer, Wallet } from '../types/database'

export function transferSourceLabel(transfer: Transfer, wallets: Wallet[]): string {
  if (transfer.source_type === 'personal') return 'Personal'
  const wallet = wallets.find((w) => w.id === transfer.source_wallet_id)
  return wallet ? `${wallet.name} (shared)` : 'Shared wallet'
}

export function transferDestinationLabel(
  transfer: Transfer,
  wallets: Wallet[],
  goals: SavingsGoal[],
): string {
  if (transfer.destination_type === 'wallet') {
    const wallet = wallets.find((w) => w.id === transfer.destination_wallet_id)
    return wallet ? `${wallet.name} (shared)` : 'Shared wallet'
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
