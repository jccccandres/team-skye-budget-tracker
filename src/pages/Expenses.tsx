import { useState } from 'react'
import { ExpenseForm } from '../components/expenses/ExpenseForm'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { Modal } from '../components/ui/Modal'
import { PageHeader, PrimaryButton, SecondaryButton } from '../components/ui/PageHeader'
import { RecordCard, RecordCardList } from '../components/ui/RecordCard'
import { WalletSwitcher } from '../components/wallets/WalletSwitcher'
import { useExpenses } from '../hooks/useExpenses'
import { useWallets } from '../hooks/useWallets'
import {
  tableBody,
  tableElement,
  tableHead,
  tableHeadCell,
  tableRow,
  tableWrapper,
} from '../lib/classes'
import { formatCurrency, formatDate } from '../lib/format'
import type { Expense } from '../types/database'

export function ExpensesPage() {
  const { wallets } = useWallets()
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null)
  const { items, loading, error, create, update, remove } = useExpenses(activeWalletId)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  function openCreate() {
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(expense: Expense) {
    setEditing(expense)
    setShowForm(true)
  }

  async function handleDelete(expense: Expense) {
    const message = expense.transfer_id
      ? `Delete this transfer fee (${formatCurrency(expense.amount)})? The transfer will remain; only this expense entry is removed.`
      : `Delete expense "${expense.category}" (${formatCurrency(expense.amount)})?`

    if (!window.confirm(message)) {
      return
    }
    await remove(expense.id)
  }

  const total = items.reduce((sum, item) => sum + Number(item.amount), 0)

  return (
    <div>
      <PageHeader
        title="Expenses"
        description={`${items.length} entries · ${formatCurrency(total)} total`}
        action={<PrimaryButton onClick={openCreate}>Add expense</PrimaryButton>}
      />

      <WalletSwitcher wallets={wallets} activeWalletId={activeWalletId} onChange={setActiveWalletId} />

      {error && (
        <div className="mb-4">
          <ErrorAlert message={error} />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading expenses…</p>
      ) : items.length === 0 ? (
        <EmptyState message="No expenses yet. Add your first expense to start tracking." />
      ) : (
        <>
          <RecordCardList>
            {items.map((expense) => (
              <RecordCard
                key={expense.id}
                title={expense.category}
                subtitle={formatDate(expense.date)}
                amount={formatCurrency(Number(expense.amount))}
                amountVariant="expense"
                meta={[
                  ...(expense.description
                    ? [{ label: 'Description', value: expense.description }]
                    : []),
                  ...(expense.transfer_id ? [{ label: 'Type', value: 'Transfer fee' }] : []),
                ]}
                onEdit={() => openEdit(expense)}
                onDelete={() => void handleDelete(expense)}
              />
            ))}
          </RecordCardList>

          <div className={`hidden md:block ${tableWrapper}`}>
            <table className={tableElement}>
              <thead className={tableHead}>
                <tr>
                  <th className={`${tableHeadCell} text-left`}>Date</th>
                  <th className={`${tableHeadCell} text-left`}>Category</th>
                  <th className={`${tableHeadCell} text-left`}>Description</th>
                  <th className={`${tableHeadCell} text-right`}>Amount</th>
                  <th className={`${tableHeadCell} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className={tableBody}>
                {items.map((expense) => (
                  <tr key={expense.id} className={tableRow}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {expense.category}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {expense.description || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-red-700 dark:text-red-400">
                      {formatCurrency(Number(expense.amount))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <SecondaryButton onClick={() => openEdit(expense)}>Edit</SecondaryButton>
                        <SecondaryButton onClick={() => void handleDelete(expense)}>
                          Delete
                        </SecondaryButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit expense' : 'Add expense'} onClose={closeForm}>
          <ExpenseForm
            initial={editing ?? undefined}
            onSubmit={(data) => (editing ? update(editing.id, data) : create(data))}
            onCancel={closeForm}
          />
        </Modal>
      )}
    </div>
  )
}
