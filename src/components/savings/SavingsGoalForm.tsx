import { type FormEvent, useState } from 'react'
import { ErrorAlert } from '../ui/ErrorAlert'
import { FormField, TextInput } from '../ui/FormField'
import { PrimaryButton } from '../ui/PageHeader'
import type { SavingsGoal, SavingsGoalInsert } from '../../types/database'

interface SavingsGoalFormProps {
  initial?: SavingsGoal
  onSubmit: (data: SavingsGoalInsert) => Promise<{ error: string | null }>
  onCancel: () => void
}

export function SavingsGoalForm({ initial, onSubmit, onCancel }: SavingsGoalFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [targetAmount, setTargetAmount] = useState(initial?.target_amount?.toString() ?? '')
  const [targetDate, setTargetDate] = useState(initial?.target_date ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Enter a goal name.')
      return
    }

    setSubmitting(true)

    const result = await onSubmit({
      name: name.trim(),
      target_amount: targetAmount ? Number(targetAmount) : null,
      target_date: targetDate || null,
    })

    if (result.error) setError(result.error)
    else onCancel()

    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Goal name" htmlFor="goal-name">
        <TextInput
          id="goal-name"
          type="text"
          required
          placeholder="e.g. Emergency fund"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>

      <FormField label="Target amount (optional)" htmlFor="goal-target-amount">
        <TextInput
          id="goal-target-amount"
          type="number"
          min="0"
          step="0.01"
          placeholder="Leave blank for no fixed target"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
        />
      </FormField>

      <FormField label="Target date (optional)" htmlFor="goal-target-date">
        <TextInput
          id="goal-target-date"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
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
          {submitting ? 'Saving…' : initial ? 'Update' : 'Add goal'}
        </PrimaryButton>
      </div>
    </form>
  )
}
