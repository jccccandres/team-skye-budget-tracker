import { useState } from 'react'
import { PrimaryButton, SecondaryButton } from '../ui/PageHeader'
import { useDebts } from '../../hooks/useDebts'
import { dateForDayThisMonth, useRecurringTransfers } from '../../hooks/useRecurringTransfers'
import { useSavingsGoals } from '../../hooks/useSavings'
import { useTransfers } from '../../hooks/useTransfers'
import { useWallets } from '../../hooks/useWallets'
import { formatCurrency } from '../../lib/format'
import { transferDestinationLabel, transferSourceLabel } from '../../lib/transfers'

export function PendingRecurringTransfersBanner({ onApplied }: { onApplied?: () => void }) {
  const { wallets } = useWallets()
  const { items: goals } = useSavingsGoals()
  const { items: debts } = useDebts()
  const { dueNow, markApplied } = useRecurringTransfers()
  const { createTransfer } = useTransfers()
  const [busyId, setBusyId] = useState<string | null>(null)

  if (dueNow.length === 0) return null

  async function handleApply(rule: (typeof dueNow)[number]) {
    setBusyId(rule.id)
    const result = await createTransfer({
      amount: rule.amount,
      fee: null,
      date: dateForDayThisMonth(rule.day_of_month),
      note: rule.note,
      sourceType: rule.source_type,
      sourceWalletId: rule.source_wallet_id,
      destinationType: rule.destination_type,
      destinationWalletId: rule.destination_wallet_id,
      destinationSavingsGoalId: rule.destination_savings_goal_id,
      destinationDebtId: rule.destination_debt_id,
    })
    if (!result.error) {
      await markApplied(rule.id)
      onApplied?.()
    }
    setBusyId(null)
  }

  async function handleSkip(ruleId: string) {
    setBusyId(ruleId)
    await markApplied(ruleId)
    setBusyId(null)
  }

  return (
    <div className="mb-6 space-y-2">
      {dueNow.map((rule) => (
        <div
          key={rule.id}
          className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-amber-950/40"
        >
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              {rule.label} · {formatCurrency(rule.amount)}
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
              {transferSourceLabel(rule, wallets)} → {transferDestinationLabel(rule, wallets, goals, debts)}
              {' · Due on day '}
              {rule.day_of_month}
            </p>
          </div>
          <div className="flex gap-2">
            <PrimaryButton disabled={busyId === rule.id} onClick={() => void handleApply(rule)}>
              {busyId === rule.id ? 'Applying…' : 'Apply now'}
            </PrimaryButton>
            <SecondaryButton disabled={busyId === rule.id} onClick={() => void handleSkip(rule.id)}>
              Skip this month
            </SecondaryButton>
          </div>
        </div>
      ))}
    </div>
  )
}
