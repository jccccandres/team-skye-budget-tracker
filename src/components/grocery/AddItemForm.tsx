import { type FormEvent, useState } from 'react'
import { ErrorAlert } from '../ui/ErrorAlert'
import { TextInput } from '../ui/FormField'
import { PrimaryButton } from '../ui/PageHeader'

interface AddItemFormProps {
  onSubmit: (name: string) => Promise<{ error: string | null }>
}

/** Compact inline "add item" row shown at the top of a grocery list. */
export function AddItemForm({ onSubmit }: AddItemFormProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!name.trim()) return

    setSubmitting(true)
    const result = await onSubmit(name.trim())
    if (result.error) setError(result.error)
    else setName('')
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <TextInput
          id="grocery-item-name"
          type="text"
          placeholder="Add an item…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-0"
        />
        <PrimaryButton type="submit" disabled={submitting || !name.trim()}>
          Add
        </PrimaryButton>
      </div>
      {error && <ErrorAlert message={error} />}
    </form>
  )
}
