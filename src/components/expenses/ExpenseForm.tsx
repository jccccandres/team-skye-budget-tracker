import { type FormEvent, useState } from 'react'
import { ErrorAlert } from '../ui/ErrorAlert'
import { FormField, SelectInput, TextInput } from '../ui/FormField'
import { PrimaryButton } from '../ui/PageHeader'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseInsert } from '../../types/database'
import { todayISO } from '../../lib/format'

interface ExpenseFormProps {
  initial?: Expense
  onSubmit: (data: ExpenseInsert) => Promise<{ error: string | null }>
  onCancel: () => void
}

export function ExpenseForm({ initial, onSubmit, onCancel }: ExpenseFormProps) {
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? '')
  const [category, setCategory] = useState(initial?.category ?? EXPENSE_CATEGORIES[0])
  const [description, setDescription] = useState(initial?.description ?? '')
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

    const result = await onSubmit({
      amount: parsedAmount,
      category,
      description: description.trim() || null,
      date,
    })

    if (result.error) setError(result.error)
    else onCancel()

    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Amount" htmlFor="expense-amount">
        <TextInput
          id="expense-amount"
          type="number"
          min="0"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </FormField>

      <FormField label="Category" htmlFor="expense-category">
        <SelectInput
          id="expense-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </SelectInput>
      </FormField>

      <FormField label="Description" htmlFor="expense-description">
        <TextInput
          id="expense-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />
      </FormField>

      <FormField label="Date" htmlFor="expense-date">
        <TextInput
          id="expense-date"
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
          {submitting ? 'Saving…' : initial ? 'Update' : 'Add expense'}
        </PrimaryButton>
      </div>
    </form>
  )
}
