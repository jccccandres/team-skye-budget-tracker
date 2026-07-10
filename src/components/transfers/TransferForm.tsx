import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { ErrorAlert } from '../ui/ErrorAlert'
import { FormField, SelectInput, TextInput } from '../ui/FormField'
import { PrimaryButton } from '../ui/PageHeader'
import { useSavingsGoals } from '../../hooks/useSavings'
import { useTransfers } from '../../hooks/useTransfers'
import { useWallets } from '../../hooks/useWallets'
import { todayISO } from '../../lib/format'
import type { TransferDestinationType, TransferSourceType } from '../../types/database'

interface TransferFormProps {
  onDone: () => void
  onCancel: () => void
}

export function TransferForm({ onDone, onCancel }: TransferFormProps) {
  const { wallets } = useWallets()
  const { items: goals } = useSavingsGoals()
  const { createTransfer } = useTransfers()

  const [sourceType, setSourceType] = useState<TransferSourceType>('personal')
  const [sourceWalletId, setSourceWalletId] = useState(wallets[0]?.id ?? '')

  const [destinationType, setDestinationType] = useState<TransferDestinationType>('wallet')
  const [destinationWalletId, setDestinationWalletId] = useState(wallets[0]?.id ?? '')
  const [destinationGoalId, setDestinationGoalId] = useState(goals[0]?.id ?? '')

  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // The dropdowns render correctly the moment wallets/goals load (since
  // <select> falls back to showing the first <option> even when the
  // controlled value doesn't match any of them yet) - but the underlying
  // state can still be stuck at '' from before the data arrived. Keep the
  // selected id in sync whenever the list changes and the current
  // selection isn't actually valid anymore.
  useEffect(() => {
    if (wallets.length === 0) return
    if (!wallets.some((w) => w.id === sourceWalletId)) {
      setSourceWalletId(wallets[0].id)
    }
  }, [wallets, sourceWalletId])

  useEffect(() => {
    if (wallets.length === 0) return
    if (!wallets.some((w) => w.id === destinationWalletId)) {
      setDestinationWalletId(wallets[0].id)
    }
  }, [wallets, destinationWalletId])

  useEffect(() => {
    if (goals.length === 0) return
    if (!goals.some((g) => g.id === destinationGoalId)) {
      setDestinationGoalId(goals[0].id)
    }
  }, [goals, destinationGoalId])

  // A wallet-sourced transfer can only go to a savings goal (moving it to
  // another wallet isn't a supported flow yet).
  const destinationOptions = useMemo<TransferDestinationType[]>(
    () => (sourceType === 'wallet' ? ['savings_goal'] : ['wallet', 'savings_goal']),
    [sourceType],
  )

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const parsedAmount = Number(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid amount.')
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
    if (
      sourceType === 'wallet' &&
      destinationType === 'wallet' &&
      sourceWalletId === destinationWalletId
    ) {
      setError('Source and destination wallets must be different.')
      return
    }

    setSubmitting(true)
    const result = await createTransfer({
      amount: parsedAmount,
      date,
      note: note.trim() || null,
      sourceType,
      sourceWalletId: sourceType === 'wallet' ? sourceWalletId : null,
      destinationType,
      destinationWalletId: destinationType === 'wallet' ? destinationWalletId : null,
      destinationSavingsGoalId: destinationType === 'savings_goal' ? destinationGoalId : null,
    })
    setSubmitting(false)

    if (result.error) setError(result.error)
    else onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="From" htmlFor="transfer-source-type">
        <SelectInput
          id="transfer-source-type"
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value as TransferSourceType)}
        >
          <option value="personal">Personal</option>
          {wallets.length > 0 && <option value="wallet">A shared wallet</option>}
        </SelectInput>
      </FormField>

      {sourceType === 'wallet' && (
        <FormField label="Source wallet" htmlFor="transfer-source-wallet">
          <SelectInput
            id="transfer-source-wallet"
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

      <FormField label="To" htmlFor="transfer-destination-type">
        <SelectInput
          id="transfer-destination-type"
          value={destinationType}
          onChange={(e) => setDestinationType(e.target.value as TransferDestinationType)}
        >
          {destinationOptions.includes('wallet') && <option value="wallet">A shared wallet</option>}
          <option value="savings_goal">A savings goal</option>
        </SelectInput>
      </FormField>

      {destinationType === 'wallet' && (
        <FormField label="Destination wallet" htmlFor="transfer-destination-wallet">
          {wallets.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You don't have any shared wallets yet.
            </p>
          ) : (
            <SelectInput
              id="transfer-destination-wallet"
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
        <FormField label="Destination goal" htmlFor="transfer-destination-goal">
          {goals.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You don't have any savings goals yet.
            </p>
          ) : (
            <SelectInput
              id="transfer-destination-goal"
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

      <FormField label="Amount" htmlFor="transfer-amount">
        <TextInput
          id="transfer-amount"
          type="number"
          min="0"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </FormField>

      <FormField label="Date" htmlFor="transfer-date">
        <TextInput
          id="transfer-date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </FormField>

      <FormField label="Note (optional)" htmlFor="transfer-note">
        <TextInput
          id="transfer-note"
          type="text"
          placeholder="e.g. Salary contribution"
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
          {submitting ? 'Transferring…' : 'Transfer'}
        </PrimaryButton>
      </div>
    </form>
  )
}
