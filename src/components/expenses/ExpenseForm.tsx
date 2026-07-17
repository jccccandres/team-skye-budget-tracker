import { type FormEvent, useEffect, useState } from 'react'
import { ErrorAlert } from '../ui/ErrorAlert'
import { FormField, SelectInput, TextInput } from '../ui/FormField'
import { PrimaryButton } from '../ui/PageHeader'
import {
  EXPENSE_CATEGORIES,
  type Expense,
  type ExpenseInsert,
  type ExpensePaymentSource,
} from '../../types/database'
import { todayISO } from '../../lib/format'
import { useCreditCards } from '../../hooks/useCreditCards'

interface ExpenseFormProps {
  initial?: Expense
  onSubmit: (data: ExpenseInsert) => Promise<{ error: string | null }>
  onCancel: () => void
}

export function ExpenseForm({ initial, onSubmit, onCancel }: ExpenseFormProps) {
  const { items: cards } = useCreditCards()
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? '')
  const [category, setCategory] = useState(initial?.category ?? EXPENSE_CATEGORIES[0])
  const [description, setDescription] = useState(initial?.description ?? '')
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [paymentSource, setPaymentSource] = useState<ExpensePaymentSource>(initial?.payment_source ?? 'wallet')
  const [creditCardId, setCreditCardId] = useState(initial?.credit_card_id ?? cards[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (cards.length > 0 && !creditCardId) {
      setCreditCardId(cards[0].id)
    }
  }, [cards, creditCardId])

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

    if (paymentSource === 'credit_card' && !creditCardId) {
      setError('Select a credit card to charge this expense to.')
      setSubmitting(false)
      return
    }

    const result = await onSubmit({
      amount: parsedAmount,
      category,
      description: description.trim() || null,
      date,
      payment_source: paymentSource,
      credit_card_id: paymentSource === 'credit_card' ? creditCardId : null,
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

      <FormField label="Payment source" htmlFor="expense-payment-source">
        <SelectInput
          id="expense-payment-source"
          value={paymentSource}
          onChange={(e) => setPaymentSource(e.target.value as ExpensePaymentSource)}
        >
          <option value="wallet">Wallet</option>
          <option value="credit_card">Credit Card</option>
        </SelectInput>
      </FormField>

      {paymentSource === 'credit_card' && (
        <FormField label="Credit card" htmlFor="expense-credit-card">
          <SelectInput
            id="expense-credit-card"
            value={creditCardId}
            onChange={(e) => setCreditCardId(e.target.value)}
          >
            {cards.length === 0 ? (
              <option value="">Add a card first</option>
            ) : (
              cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))
            )}
          </SelectInput>
        </FormField>
      )}

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
