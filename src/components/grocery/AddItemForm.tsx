import { type FormEvent, useState } from 'react'
import type { GroceryItemCategory } from '../../types/database'
import { ErrorAlert } from '../ui/ErrorAlert'
import { TextInput } from '../ui/FormField'
import { PrimaryButton } from '../ui/PageHeader'

interface AddItemFormProps {
  onSubmit: (name: string, category: GroceryItemCategory) => Promise<{ error: string | null }>
}

const categories: { value: GroceryItemCategory; label: string }[] = [
  { value: 'meat_frozen', label: 'Meat & Frozen' },
  { value: 'fruits_veggies', label: 'Fruits & Vegetables' },
  { value: 'pantry_snacks', label: 'Pantry & Snacks' },
  { value: 'household_cleaning', label: 'Household & Cleaning' },
]

/** Compact inline "add item" row shown at the top of a grocery list. */
export function AddItemForm({ onSubmit }: AddItemFormProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<GroceryItemCategory>('pantry_snacks')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!name.trim()) return

    setSubmitting(true)
    const result = await onSubmit(name.trim(), category)
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
      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategory(c.value)}
            className={
              'rounded-full px-3 py-1 text-xs font-medium transition-colors ' +
              (category === c.value
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700')
            }
            aria-pressed={category === c.value}
          >
            {c.label}
          </button>
        ))}
      </div>
      {error && <ErrorAlert message={error} />}
    </form>
  )
}
