import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { ErrorAlert } from '../ui/ErrorAlert'
import { FormField, SelectInput, TextInput } from '../ui/FormField'
import { PrimaryButton } from '../ui/PageHeader'
import { useDebts } from '../../hooks/useDebts'
import { useRecurringTransfers } from '../../hooks/useRecurringTransfers'
import { useSavingsGoals } from '../../hooks/useSavings'
import { useWallets } from '../../hooks/useWallets'
import type { TransferDestinationType, TransferSourceType } from '../../types/database'

interface RecurringTransferFormProps {
  onDone: () => void
  onCancel: () => void
}

export function RecurringTransferForm({ onDone, onCancel }: RecurringTransferFormProps) {
  const { wallets } = useWallets()
  const { items: goals } = useSavingsGoals()
  const { items: debts } = useDebts()
  const { create } = useRecurringTransfers()

  const [label, setLabel] = useState('')
  const [sourceType, setSourceType] = useState<TransferSourceType>('personal')
  const [sourceWalletId, setSourceWalletId] = useState(wallets[0]?.id ?? '')

  const [destinationType, setDestinationType] = useState<TransferDestinationType>('wallet')
  const [destinationWalletId, setDestinationWalletId] = useState(wallets[0]?.id ?? '')
  const [destinationGoalId, setDestinationGoalId] = useState(goals[0]?.id ?? '')
  const [destinationDebtId, setDestinationDebtId] = useState(debts[0]?.id ?? '')

  const [amount, setAmount] = useState('')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (wallets.length === 0) return
    if (!wallets.some((w) => w.id === sourceWalletId)) setSourceWalletId(wallets[0].id)
  }, [wallets, sourceWalletId])

  useEffect(() => {
    if (wallets.length === 0) return
    if (!wallets.some((w) => w.id === destinationWalletId)) setDestinationWalletId(wallets[0].id)
  }, [wallets, destinationWalletId])

  useEffect(() => {
    if (goals.length === 0) return
    if (!goals.some((g) => g.id === destinationGoalId)) setDestinationGoalId(goals[0].id)
  }, [goals, destinationGoalId])

  useEffect(() => {
    if (debts.length === 0) return
    if (!debts.some((d) => d.id === destinationDebtId)) setDestinationDebtId(debts[0].id)
  }, [debts, destinationDebtId])

  const destinationOptions = useMemo<TransferDestinationType[]>(
    () => (sourceType === 'wallet' ? ['savings_goal', 'debt'] : ['wallet', 'savings_goal', 'debt']),
    [sourceType],
  )

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const parsedAmount = Number(amount)
    const parsedDay = Number(dayOfMonth)

    if (!label.trim()) {
      setError('Give this rule a name, e.g. "Car loan auto-debit".')
      return
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid amount.')
      return
    }
    if (!parsedDay || parsedDay < 1 || parsedDay > 31) {
      setError('Day of month must be between 1 and 31.')
      return
    }
    if (sourceType === 'wallet' && !sourceWalletId) {
      setError('Select a source wallet.')
      return
    }
    if (destinationType === 'wallet' && !destinationWalletId) {
      setError('Select a destination wallet.')
      return
    }
    if (destinationType === 'savings_goal' && !destinationGoalId) {
      setError('Select a savings goal, or create one first.')
      return
    }
    if (destinationType === 'debt' && !destinationDebtId) {
      setError('Select a debt, or add one first.')
      return
    }

    setSubmitting(true)
    const result = await create({
      label: label.trim(),
      amount: parsedAmount,
      day_of_month: parsedDay,
      note: note.trim() || null,
      source_type: sourceType,
      source_wallet_id: sourceType === 'wallet' ? sourceWalletId : null,
      destination_type: destinationType,
      destination_wallet_id: destinationType === 'wallet' ? destinationWalletId : null,
      destination_savings_goal_id: destinationType === 'savings_goal' ? destinationGoalId : null,
      destination_debt_id: destinationType === 'debt' ? destinationDebtId : null,
    })
    setSubmitting(false)

    if (result.error) setError(result.error)
    else onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Name" htmlFor="rt-label">
        <TextInput
          id="rt-label"
          type="text"
          required
          placeholder="e.g. Car loan auto-debit"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </FormField>

      <FormField label="From" htmlFor="rt-source-type">
        <SelectInput
          id="rt-source-type"
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value as TransferSourceType)}
        >
          <option value="personal">Personal</option>
          {wallets.length > 0 && <option value="wallet">A shared wallet</option>}
        </SelectInput>
      </FormField>

      {sourceType === 'wallet' && (
        <FormField label="Source wallet" htmlFor="rt-source-wallet">
          <SelectInput
            id="rt-source-wallet"
            value={sourceWalletId}
            onChange={(e) => setSourceWalletId(e.target.value)}
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </SelectInput>
        </FormField>
      )}

      <FormField label="To" htmlFor="rt-destination-type">
        <SelectInput
          id="rt-destination-type"
          value={destinationType}
          onChange={(e) => setDestinationType(e.target.value as TransferDestinationType)}
        >
          {destinationOptions.includes('wallet') && <option value="wallet">A shared wallet</option>}
          {destinationOptions.includes('savings_goal') && (
            <option value="savings_goal">A savings goal</option>
          )}
          {destinationOptions.includes('debt') && <option value="debt">A debt payment</option>}
        </SelectInput>
      </FormField>

      {destinationType === 'wallet' && (
        <FormField label="Destination wallet" htmlFor="rt-destination-wallet">
          {wallets.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No shared wallets yet.</p>
          ) : (
            <SelectInput
              id="rt-destination-wallet"
              value={destinationWalletId}
              onChange={(e) => setDestinationWalletId(e.target.value)}
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </SelectInput>
          )}
        </FormField>
      )}

      {destinationType === 'savings_goal' && (
        <FormField label="Destination goal" htmlFor="rt-destination-goal">
          {goals.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No savings goals yet.</p>
          ) : (
            <SelectInput
              id="rt-destination-goal"
              value={destinationGoalId}
              onChange={(e) => setDestinationGoalId(e.target.value)}
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </SelectInput>
          )}
        </FormField>
      )}

      {destinationType === 'debt' && (
        <FormField label="Debt" htmlFor="rt-destination-debt">
          {debts.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No debts tracked yet.</p>
          ) : (
            <SelectInput
              id="rt-destination-debt"
              value={destinationDebtId}
              onChange={(e) => setDestinationDebtId(e.target.value)}
            >
              {debts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </SelectInput>
          )}
        </FormField>
      )}

      <FormField label="Amount" htmlFor="rt-amount">
        <TextInput
          id="rt-amount"
          type="number"
          min="0"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </FormField>

      <FormField label="Day of month" htmlFor="rt-day">
        <TextInput
          id="rt-day"
          type="number"
          min="1"
          max="31"
          required
          value={dayOfMonth}
          onChange={(e) => setDayOfMonth(e.target.value)}
        />
      </FormField>
      <p className="-mt-2 text-xs text-slate-400 dark:text-slate-500">
        For months with fewer days (e.g. February), this lands on the last day of that month
        instead.
      </p>

      <FormField label="Note (optional)" htmlFor="rt-note">
        <TextInput
          id="rt-note"
          type="text"
          placeholder="Shown on the resulting transfer"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </FormField>

      {error && <ErrorAlert message={error} />}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <PrimaryButton type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save rule'}
        </PrimaryButton>
      </div>
    </form>
  )
}
