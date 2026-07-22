import { type FormEvent, useState } from 'react'
import { ErrorAlert } from '../ui/ErrorAlert'
import { FormField, TextInput } from '../ui/FormField'
import { PrimaryButton } from '../ui/PageHeader'
import type { GroceryList } from '../../types/database'

interface GroceryListFormProps {
  initial?: GroceryList
  onSubmit: (name: string) => Promise<{ error: string | null }>
  onCancel: () => void
}

export function GroceryListForm({ initial, onSubmit, onCancel }: GroceryListFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Enter a list name.')
      return
    }

    setSubmitting(true)
    const result = await onSubmit(name.trim())
    if (result.error) setError(result.error)
    else onCancel()
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="List name" htmlFor="grocery-list-name">
        <TextInput
          id="grocery-list-name"
          type="text"
          required
          autoFocus
          placeholder="e.g. Weekly groceries"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          {submitting ? 'Saving…' : initial ? 'Rename' : 'Create list'}
        </PrimaryButton>
      </div>
    </form>
  )
}
