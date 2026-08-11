import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { ErrorAlert } from '../ui/ErrorAlert'
import { FormField, SelectInput, TextInput } from '../ui/FormField'
import { PrimaryButton } from '../ui/PageHeader'
import { useCreditCards } from '../../hooks/useCreditCards'
import { useDebts } from '../../hooks/useDebts'
import { useSavingsGoals } from '../../hooks/useSavings'
import { useTransfers } from '../../hooks/useTransfers'
import { useWallets } from '../../hooks/useWallets'
import { useToast } from '../../hooks/useToast'
import { todayISO } from '../../lib/format'
import type { TransferDestinationType, TransferSourceType } from '../../types/database'

interface TransferFormProps {
  onDone: () => void
  onCancel: () => void
  /** Pre-select and lock the destination to a specific debt (used by the
   * "Pay" shortcut on the Debts page). The person can still change the
   * source and amount, just not the destination. */
  presetDebtId?: string
  /** Pre-select and lock the destination to a specific credit card (used by
   * the "Pay bill" shortcut on the Credit Cards page). The person can still
   * change the source and amount, just not the destination. */
  presetCreditCardId?: string
}

export function TransferForm({
  onDone,
  onCancel,
  presetDebtId,
  presetCreditCardId,
}: TransferFormProps) {
  const { wallets } = useWallets()
  const { items: goals } = useSavingsGoals()
  const { items: debts } = useDebts()
  const { items: creditCards } = useCreditCards()
  const { createTransfer } = useTransfers()
  const { showToast } = useToast()

  const [sourceType, setSourceType] = useState<TransferSourceType>('personal')
  const [sourceWalletId, setSourceWalletId] = useState(wallets[0]?.id ?? '')

  const [destinationType, setDestinationType] = useState<TransferDestinationType>(
    presetCreditCardId ? 'credit_card' : presetDebtId ? 'debt' : 'wallet',
  )
  const [destinationWalletId, setDestinationWalletId] = useState(wallets[0]?.id ?? '')
  const [destinationGoalId, setDestinationGoalId] = useState(goals[0]?.id ?? '')
  const [destinationDebtId, setDestinationDebtId] = useState(presetDebtId ?? debts[0]?.id ?? '')
  const [destinationCreditCardId, setDestinationCreditCardId] = useState(
    presetCreditCardId ?? creditCards[0]?.id ?? '',
  )

  const [amount, setAmount] = useState('0.00')
  const [fee, setFee] = useState('0.00')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Available destination wallets when transferring from a wallet: every
  // wallet except the source itself (can't transfer a wallet to itself).
  const destinationWallets = useMemo(
    () => (sourceType === 'wallet' ? wallets.filter((w) => w.id !== sourceWalletId) : wallets),
    [wallets, sourceType, sourceWalletId],
  )

  // The dropdowns render correctly the moment wallets/goals/debts load (since
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
    if (destinationWallets.length === 0) return
    if (!destinationWallets.some((w) => w.id === destinationWalletId)) {
      setDestinationWalletId(destinationWallets[0].id)
    }
  }, [destinationWallets, destinationWalletId])

  useEffect(() => {
    if (goals.length === 0) return
    if (!goals.some((g) => g.id === destinationGoalId)) {
      setDestinationGoalId(goals[0].id)
    }
  }, [goals, destinationGoalId])

  useEffect(() => {
    if (presetDebtId || debts.length === 0) return
    if (!debts.some((d) => d.id === destinationDebtId)) {
      setDestinationDebtId(debts[0].id)
    }
  }, [debts, destinationDebtId, presetDebtId])

  useEffect(() => {
    if (presetCreditCardId || creditCards.length === 0) return
    if (!creditCards.some((c) => c.id === destinationCreditCardId)) {
      setDestinationCreditCardId(creditCards[0].id)
    }
  }, [creditCards, destinationCreditCardId, presetCreditCardId])

  const destinationOptions: TransferDestinationType[] = ['wallet', 'savings_goal', 'debt', 'credit_card']

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const parsedAmount = Number(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid amount.')
      return
    }

    const parsedFee = Number(fee)
    if (Number.isNaN(parsedFee) || parsedFee < 0) {
      setError('Enter a valid fee.')
      return
    }
    const feeToSubmit = parsedFee > 0 ? parsedFee : null
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
    if (destinationType === 'credit_card' && !destinationCreditCardId) {
      setError('Select a credit card, or add one first.')
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
      fee: feeToSubmit,
      date,
      note: note.trim() || null,
      sourceType,
      sourceWalletId: sourceType === 'wallet' ? sourceWalletId : null,
      destinationType,
      destinationWalletId: destinationType === 'wallet' ? destinationWalletId : null,
      destinationSavingsGoalId: destinationType === 'savings_goal' ? destinationGoalId : null,
      destinationDebtId: destinationType === 'debt' ? destinationDebtId : null,
      destinationCreditCardId: destinationType === 'credit_card' ? destinationCreditCardId : null,
    })
    setSubmitting(false)

    if (result.error) setError(result.error)
    else {
      const successMessage =
        destinationType === 'debt'
          ? 'Debt payment recorded'
          : destinationType === 'credit_card'
            ? 'Credit card payment recorded'
            : destinationType === 'savings_goal'
              ? 'Transferred to savings goal'
              : 'Transfer complete'
      showToast(successMessage)
      onDone()
    }
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
          {wallets.length > 0 && <option value="wallet">Wallet</option>}
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
          disabled={Boolean(presetDebtId || presetCreditCardId)}
          onChange={(e) => setDestinationType(e.target.value as TransferDestinationType)}
        >
          {destinationOptions.includes('wallet') && <option value="wallet">Wallet</option>}
          {destinationOptions.includes('savings_goal') && (
            <option value="savings_goal">Savings</option>
          )}
          {destinationOptions.includes('debt') && <option value="debt">Debt</option>}
          {destinationOptions.includes('credit_card') && (
            <option value="credit_card">Credit Card</option>
          )}
        </SelectInput>
      </FormField>

      {destinationType === 'wallet' && (
        <FormField label="Destination wallet" htmlFor="transfer-destination-wallet">
          {destinationWallets.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {sourceType === 'wallet'
                ? "You don't have any other shared wallets yet."
                : "You don't have any shared wallets yet."}
            </p>
          ) : (
            <SelectInput
              id="transfer-destination-wallet"
              value={destinationWalletId}
              onChange={(e) => setDestinationWalletId(e.target.value)}
            >
              {destinationWallets.map((w) => (
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

      {destinationType === 'debt' && (
        <FormField label="Debt" htmlFor="transfer-destination-debt">
          {debts.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You don't have any debts tracked yet.
            </p>
          ) : (
            <SelectInput
              id="transfer-destination-debt"
              value={destinationDebtId}
              disabled={Boolean(presetDebtId)}
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

      {destinationType === 'credit_card' && (
        <FormField label="Credit card" htmlFor="transfer-destination-credit-card">
          {creditCards.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You don't have any credit cards tracked yet.
            </p>
          ) : (
            <SelectInput
              id="transfer-destination-credit-card"
              value={destinationCreditCardId}
              disabled={Boolean(presetCreditCardId)}
              onChange={(e) => setDestinationCreditCardId(e.target.value)}
            >
              {creditCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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

      <FormField label="Fee (optional)" htmlFor="transfer-fee">
        <TextInput
          id="transfer-fee"
          type="number"
          min="0"
          step="0.01"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
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
