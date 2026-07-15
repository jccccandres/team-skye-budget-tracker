import { useState } from 'react'
import { IncomeForm } from '../components/income/IncomeForm'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { Modal } from '../components/ui/Modal'
import { PageHeader, SecondaryButton } from '../components/ui/PageHeader'
import { RecordCard, RecordCardList } from '../components/ui/RecordCard'
import { WalletSwitcher } from '../components/wallets/WalletSwitcher'
import { useIncome } from '../hooks/useIncome'
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
import type { Income } from '../types/database'

export function IncomePage() {
  const { wallets } = useWallets()
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null)
  const { items, loading, error, create, update, remove } = useIncome(activeWalletId)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Income | null>(null)

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  function openEdit(income: Income) {
    setEditing(income)
    setShowForm(true)
  }

  async function handleDelete(income: Income) {
    const message = income.transfer_id
      ? `Delete this transfer deposit from "${income.source}" (${formatCurrency(income.amount)})? This will also remove it from transfer history and update dashboard balances.`
      : `Delete income from "${income.source}" (${formatCurrency(income.amount)})?`

    if (!window.confirm(message)) {
      return
    }
    await remove(income.id)
  }

  const total = items.reduce((sum, item) => sum + Number(item.amount), 0)

  return (
    <div>
      <PageHeader
        title="Income"
        description={`${items.length} entries · ${formatCurrency(total)} total`}
      />

      <WalletSwitcher wallets={wallets} activeWalletId={activeWalletId} onChange={setActiveWalletId} />

      {error && (
        <div className="mb-4">
          <ErrorAlert message={error} />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading income…</p>
      ) : items.length === 0 ? (
        <EmptyState message="No income recorded yet. Add your first income entry." />
      ) : (
        <>
          <RecordCardList>
            {items.map((income) => (
              <RecordCard
                key={income.id}
                title={income.source}
                subtitle={formatDate(income.date)}
                amount={formatCurrency(Number(income.amount))}
                amountVariant="income"
                meta={[
                  { label: 'Frequency', value: income.frequency },
                  ...(income.transfer_id ? [{ label: 'Type', value: 'Transfer' }] : []),
                ]}
                onEdit={() => openEdit(income)}
                onDelete={() => void handleDelete(income)}
              />
            ))}
          </RecordCardList>

          <div className={`hidden md:block ${tableWrapper}`}>
            <table className={tableElement}>
              <thead className={tableHead}>
                <tr>
                  <th className={`${tableHeadCell} text-left`}>Date</th>
                  <th className={`${tableHeadCell} text-left`}>Source</th>
                  <th className={`${tableHeadCell} text-left`}>Frequency</th>
                  <th className={`${tableHeadCell} text-right`}>Amount</th>
                  <th className={`${tableHeadCell} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className={tableBody}>
                {items.map((income) => (
                  <tr key={income.id} className={tableRow}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {formatDate(income.date)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {income.source}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {income.frequency}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(Number(income.amount))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <SecondaryButton onClick={() => openEdit(income)}>Edit</SecondaryButton>
                        <SecondaryButton onClick={() => void handleDelete(income)}>
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
        <Modal title={editing ? 'Edit income' : 'Add income'} onClose={closeForm}>
          <IncomeForm
            initial={editing ?? undefined}
            onSubmit={(data) => (editing ? update(editing.id, data) : create(data))}
            onCancel={closeForm}
          />
        </Modal>
      )}
    </div>
  )
}
