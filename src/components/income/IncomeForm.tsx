import { type FormEvent, useState } from 'react'
import { todayISO } from '../../lib/format'
import { INCOME_FREQUENCIES, type Income, type IncomeInsert } from '../../types/database'
import { ErrorAlert } from '../ui/ErrorAlert'
import { FormField, SelectInput, TextInput } from '../ui/FormField'
import { PrimaryButton } from '../ui/PageHeader'

interface IncomeFormProps {
  initial?: Income
  onSubmit: (data: IncomeInsert) => Promise<{ error: string | null }>
  onCancel: () => void
}

export function IncomeForm({ initial, onSubmit, onCancel }: IncomeFormProps) {
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? '')
  const [source, setSource] = useState(initial?.source ?? '')
  const [frequency, setFrequency] = useState(initial?.frequency ?? INCOME_FREQUENCIES[0])
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const parsedAmount = Number(amount)
    if (!parsedAmount || parsedAmount < 0) {
      setError('Enter a valid amount.')
      setSubmitting(false)
      return
    }

    if (!source.trim()) {
      setError('Source is required.')
      setSubmitting(false)
      return
    }

    const result = await onSubmit({
      amount: parsedAmount,
      source: source.trim(),
      frequency,
      date,
    })

    if (result.error) setError(result.error)
    else onCancel()

    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Amount" htmlFor="income-amount">
        <TextInput
          id="income-amount"
          type="number"
          min="0"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </FormField>

      <FormField label="Source" htmlFor="income-source">
        <TextInput
          id="income-source"
          type="text"
          required
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="e.g. Salary, Freelance"
        />
      </FormField>

      <FormField label="Frequency" htmlFor="income-frequency">
        <SelectInput
          id="income-frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
        >
          {INCOME_FREQUENCIES.map((freq) => (
            <option key={freq} value={freq}>
              {freq}
            </option>
          ))}
        </SelectInput>
      </FormField>

      <FormField label="Date" htmlFor="income-date">
        <TextInput
          id="income-date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
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
          {submitting ? 'Saving…' : initial ? 'Update' : 'Add income'}
        </PrimaryButton>
      </div>
    </form>
  )
}
