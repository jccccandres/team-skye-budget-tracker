import { type FormEvent, useState } from 'react'
import { ErrorAlert } from '../ui/ErrorAlert'
import { FormField, TextInput } from '../ui/FormField'
import { PrimaryButton } from '../ui/PageHeader'
import type { CreditCard, CreditCardInsert } from '../../types/database'

interface CreditCardFormProps {
  initial?: CreditCard
  onSubmit: (data: CreditCardInsert) => Promise<{ error: string | null }>
  onCancel: () => void
}

export function CreditCardForm({ initial, onSubmit, onCancel }: CreditCardFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [limitAmount, setLimitAmount] = useState(initial?.limit_amount?.toString() ?? '')
  const [cutoffDay, setCutoffDay] = useState(initial?.cutoff_day?.toString() ?? '21')
  const [dueDay, setDueDay] = useState(initial?.due_day?.toString() ?? '7')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const parsedLimit = Number(limitAmount)
    const parsedCutoff = Number(cutoffDay)
    const parsedDue = Number(dueDay)

    if (!name.trim()) {
      setError('Enter a card name.')
      setSubmitting(false)
      return
    }

    if (!parsedLimit || parsedLimit < 0) {
      setError('Enter a valid credit limit.')
      setSubmitting(false)
      return
    }

    if (parsedCutoff < 1 || parsedCutoff > 31 || parsedDue < 1 || parsedDue > 31) {
      setError('Cutoff and due day must fall between 1 and 31.')
      setSubmitting(false)
      return
    }

    const result = await onSubmit({
      name: name.trim(),
      limit_amount: parsedLimit,
      cutoff_day: parsedCutoff,
      due_day: parsedDue,
    })

    if (result.error) setError(result.error)
    else onCancel()

    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Card name" htmlFor="credit-card-name">
        <TextInput
          id="credit-card-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. BPI Gold Card"
        />
      </FormField>

      <FormField label="Credit limit" htmlFor="credit-card-limit">
        <TextInput
          id="credit-card-limit"
          type="number"
          min="0"
          step="0.01"
          required
          value={limitAmount}
          onChange={(e) => setLimitAmount(e.target.value)}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Cutoff day" htmlFor="credit-card-cutoff-day">
          <TextInput
            id="credit-card-cutoff-day"
            type="number"
            min="1"
            max="31"
            required
            value={cutoffDay}
            onChange={(e) => setCutoffDay(e.target.value)}
          />
        </FormField>

        <FormField label="Due day" htmlFor="credit-card-due-day">
          <TextInput
            id="credit-card-due-day"
            type="number"
            min="1"
            max="31"
            required
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
          />
        </FormField>
      </div>

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
          {submitting ? 'Saving…' : initial ? 'Update' : 'Add card'}
        </PrimaryButton>
      </div>
    </form>
  )
}
