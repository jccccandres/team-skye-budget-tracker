import { useMemo, useState, type FormEvent } from 'react'
import { SecondaryButton } from '../ui/PageHeader'
import { Modal } from '../ui/Modal'
import type { SavingsGoal, Wallet } from '../../types/database'
import type { VerificationScopeRef } from '../../hooks/useBalanceVerifications'

interface VerifyBalanceModalProps {
  wallets: Wallet[]
  savingsGoals: SavingsGoal[]
  defaultScope: VerificationScopeRef
  onClose: () => void
  onVerify: (input: {
    scopeType: VerificationScopeRef['scopeType']
    walletId: string | null
    savingsGoalId: string | null
    actualAmount: number
    date: string
    note: string | null
  }) => Promise<{ error: string | null }>
}

function optionValue(scopeType: VerificationScopeRef['scopeType'], id: string | null): string {
  if (scopeType === 'personal') return 'personal'
  return `${scopeType}:${id ?? ''}`
}

function parseOptionValue(value: string): VerificationScopeRef {
  if (value === 'personal') {
    return { scopeType: 'personal', walletId: null, savingsGoalId: null }
  }

  const [scopeType, id] = value.split(':')

  if (scopeType === 'wallet') {
    return { scopeType: 'wallet', walletId: id || null, savingsGoalId: null }
  }

  return { scopeType: 'savings_goal', walletId: null, savingsGoalId: id || null }
}

export function VerifyBalanceModal({
  wallets,
  savingsGoals,
  defaultScope,
  onClose,
  onVerify,
}: VerifyBalanceModalProps) {
  const [scopeValue, setScopeValue] = useState(() =>
    optionValue(
      defaultScope.scopeType,
      defaultScope.scopeType === 'wallet' ? defaultScope.walletId : defaultScope.savingsGoalId,
    ),
  )
  const [actualAmount, setActualAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const options = useMemo(() => {
    const list = [{ value: 'personal', label: 'Personal' }]
    for (const wallet of wallets) {
      list.push({ value: optionValue('wallet', wallet.id), label: `Wallet · ${wallet.name}` })
    }
    for (const goal of savingsGoals) {
      list.push({ value: optionValue('savings_goal', goal.id), label: `Savings · ${goal.name}` })
    }
    return list
  }, [wallets, savingsGoals])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsedAmount = Number(actualAmount)
    if (!Number.isFinite(parsedAmount)) {
      setError('Please enter a valid amount.')
      return
    }

    const scope = parseOptionValue(scopeValue)

    setSaving(true)
    setError(null)
    const result = await onVerify({
      scopeType: scope.scopeType,
      walletId: scope.walletId,
      savingsGoalId: scope.savingsGoalId,
      actualAmount: parsedAmount,
      date,
      note: note.trim() || null,
    })

    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }

    setSaving(false)
    onClose()
  }

  return (
    <Modal title="Verify balance" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Enter the real-world amount you currently have. If it differs from system totals, an adjustment transaction will be created automatically.
        </p>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Scope</span>
          <select
            value={scopeValue}
            onChange={(e) => setScopeValue(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Actual amount</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={actualAmount}
            onChange={(e) => setActualAmount(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 sm:text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            placeholder="0.00"
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Verification date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Reason (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            rows={3}
            placeholder="Cash count, bank reconciliation, correction, etc."
          />
        </label>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <SecondaryButton onClick={onClose} disabled={saving}>Cancel</SecondaryButton>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {saving ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
