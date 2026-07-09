import { type FormEvent, useState } from 'react'
import {
  DEBT_CATEGORIES,
  type Debt,
  type DebtCategory,
  type DebtInsert,
  type DebtType,
} from '../../types/database'
import { ErrorAlert } from '../ui/ErrorAlert'
import { FormField, SelectInput, TextInput } from '../ui/FormField'
import { PrimaryButton } from '../ui/PageHeader'

interface DebtFormProps {
  initial?: Debt
  defaultCategory?: DebtCategory
  onSubmit: (data: DebtInsert) => Promise<{ error: string | null }>
  onCancel: () => void
}

export function DebtForm({ initial, defaultCategory = 'other', onSubmit, onCancel }: DebtFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<DebtCategory>(initial?.category ?? defaultCategory)
  const [type, setType] = useState<DebtType>(initial?.type ?? 'installment')
  const [totalAmount, setTotalAmount] = useState(initial?.total_amount?.toString() ?? '')
  const [monthlyPayment, setMonthlyPayment] = useState(
    initial?.monthly_payment?.toString() ?? '',
  )
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '')
  const [remainingBalance, setRemainingBalance] = useState(
    initial?.remaining_balance?.toString() ?? '',
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const parsedTotal = Number(totalAmount)
    const parsedRemaining = Number(remainingBalance)
    const parsedMonthly = monthlyPayment ? Number(monthlyPayment) : null

    if (!name.trim()) {
      setError('Name is required.')
      setSubmitting(false)
      return
    }

    if (!parsedTotal || parsedTotal < 0) {
      setError('Enter a valid total amount.')
      setSubmitting(false)
      return
    }

    if (parsedRemaining < 0) {
      setError('Remaining balance cannot be negative.')
      setSubmitting(false)
      return
    }

    if (type === 'installment' && (!parsedMonthly || parsedMonthly < 0)) {
      setError('Monthly payment is required for installment debts.')
      setSubmitting(false)
      return
    }

    const result = await onSubmit({
      name: name.trim(),
      category,
      type,
      total_amount: parsedTotal,
      monthly_payment: type === 'installment' ? parsedMonthly : null,
      due_date: dueDate || null,
      remaining_balance: parsedRemaining,
    })

    if (result.error) setError(result.error)
    else onCancel()

    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Category" htmlFor="debt-category">
        <SelectInput
          id="debt-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as DebtCategory)}
        >
          {DEBT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </SelectInput>
      </FormField>

      <FormField label="Name" htmlFor="debt-name">
        <TextInput
          id="debt-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. BPI car loan, Credit card"
        />
      </FormField>

      <FormField label="Payment type" htmlFor="debt-payment-type">
        <SelectInput
          id="debt-payment-type"
          value={type}
          onChange={(e) => setType(e.target.value as DebtType)}
        >
          <option value="installment">Installment</option>
          <option value="one_time">One-time</option>
        </SelectInput>
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Total amount" htmlFor="debt-total">
          <TextInput
            id="debt-total"
            type="number"
            min="0"
            step="0.01"
            required
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
          />
        </FormField>

        <FormField label="Remaining balance" htmlFor="debt-remaining">
          <TextInput
            id="debt-remaining"
            type="number"
            min="0"
            step="0.01"
            required
            value={remainingBalance}
            onChange={(e) => setRemainingBalance(e.target.value)}
          />
        </FormField>
      </div>

      {type === 'installment' && (
        <FormField label="Monthly payment" htmlFor="debt-monthly">
          <TextInput
            id="debt-monthly"
            type="number"
            min="0"
            step="0.01"
            required
            value={monthlyPayment}
            onChange={(e) => setMonthlyPayment(e.target.value)}
          />
        </FormField>
      )}

      <FormField label="Due date" htmlFor="debt-due">
        <TextInput
          id="debt-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
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
          {submitting ? 'Saving…' : initial ? 'Update' : 'Add debt'}
        </PrimaryButton>
      </div>
    </form>
  )
}
