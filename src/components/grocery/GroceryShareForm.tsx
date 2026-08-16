import { type FormEvent, useState } from 'react'
import { ErrorAlert } from '../ui/ErrorAlert'
import { FormField, TextInput } from '../ui/FormField'
import { PrimaryButton } from '../ui/PageHeader'

interface GroceryShareFormProps {
  listName: string
  onSubmit: (email: string) => Promise<{ error: string | null }>
  onCancel: () => void
}

export function GroceryShareForm({ listName, onSubmit, onCancel }: GroceryShareFormProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const normalized = email.trim().toLowerCase()
    if (!normalized) {
      setError('Enter an email address.')
      return
    }

    setSubmitting(true)
    const result = await onSubmit(normalized)
    if (result.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    onCancel()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Send a share invite for <span className="font-medium text-slate-700 dark:text-slate-200">{listName}</span>.
      </p>

      <FormField label="Invite by email" htmlFor="grocery-share-email">
        <TextInput
          id="grocery-share-email"
          type="email"
          required
          autoFocus
          placeholder="friend@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          {submitting ? 'Sending…' : 'Send invite'}
        </PrimaryButton>
      </div>
    </form>
  )
}
