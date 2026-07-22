import { type FormEvent, useState } from 'react'
import { ErrorAlert } from '../ui/ErrorAlert'
import { FormField, TextInput } from '../ui/FormField'
import { Modal } from '../ui/Modal'
import { PrimaryButton } from '../ui/PageHeader'

interface PricePromptModalProps {
  itemName: string
  onConfirm: (price: number | null) => void
  onCancel: () => void
}

/**
 * Shown right after an item is checked off. Price is optional - the user
 * can confirm with no price and the item still counts as checked, it just
 * won't contribute to the list total.
 */
export function PricePromptModal({ itemName, onConfirm, onCancel }: PricePromptModalProps) {
  const [price, setPrice] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!price.trim()) {
      onConfirm(null)
      return
    }

    const parsed = Number(price)
    if (Number.isNaN(parsed) || parsed < 0) {
      setError('Enter a valid price, or leave it blank.')
      return
    }

    onConfirm(parsed)
  }

  return (
    <Modal title={`Price for "${itemName}"`} onClose={onCancel}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Price (optional)" htmlFor="grocery-item-price">
          <TextInput
            id="grocery-item-price"
            type="number"
            min="0"
            step="0.01"
            autoFocus
            placeholder="Leave blank to skip"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
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
          <PrimaryButton type="submit">Confirm</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
