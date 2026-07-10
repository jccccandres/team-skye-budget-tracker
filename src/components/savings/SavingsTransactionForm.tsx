import { type FormEvent, useState } from 'react'
import { ErrorAlert } from '../ui/ErrorAlert'
import { FormField, SelectInput, TextInput } from '../ui/FormField'
import { PrimaryButton } from '../ui/PageHeader'
import type { SavingsTransactionInsert, SavingsTransactionType } from '../../types/database'
import { todayISO } from '../../lib/format'

interface SavingsTransactionFormProps {
  onSubmit: (data: SavingsTransactionInsert) => Promise<{ error: string | null }>
  onCancel: () => void
}

export function SavingsTransactionForm({ onSubmit, onCancel }: SavingsTransactionFormProps) {
  const [type, setType] = useState<SavingsTransactionType>('deposit')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const parsedAmount = Number(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid amount.')
      return
    }

    setSubmitting(true)

    const result = await onSubmit({
      amount: parsedAmount,
      type,
      date,
      note: note.trim() || null,
    })

    if (result.error) setError(result.error)
    else onCancel()

    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Type" htmlFor="txn-type">
        <SelectInput
          id="txn-type"
          value={type}
          onChange={(e) => setType(e.target.value as SavingsTransactionType)}
        >
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
        </SelectInput>
      </FormField>

      <FormField label="Amount" htmlFor="txn-amount">
        <TextInput
          id="txn-amount"
          type="number"
          min="0"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </FormField>

      <FormField label="Date" htmlFor="txn-date">
        <TextInput
          id="txn-date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </FormField>

      <FormField label="Note (optional)" htmlFor="txn-note">
        <TextInput
          id="txn-note"
          type="text"
          placeholder="Optional"
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
          {submitting ? 'Saving…' : 'Add'}
        </PrimaryButton>
      </div>
    </form>
  )
}
