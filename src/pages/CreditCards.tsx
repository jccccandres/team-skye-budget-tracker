import { useState } from 'react'
import { CreditCardForm } from '../components/credit-cards/CreditCardForm'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { Modal } from '../components/ui/Modal'
import { PageHeader, SecondaryButton } from '../components/ui/PageHeader'
import { RecordCard, RecordCardList } from '../components/ui/RecordCard'
import { useCreditCards } from '../hooks/useCreditCards'
import { tableBody, tableElement, tableHead, tableHeadCell, tableRow, tableWrapper } from '../lib/classes'
import { formatCurrency } from '../lib/format'
import type { CreditCard } from '../types/database'

export function CreditCardsPage() {
  const { items, loading, error, create, update, remove } = useCreditCards()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CreditCard | null>(null)

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  function openEdit(card: CreditCard) {
    setEditing(card)
    setShowForm(true)
  }

  async function handleDelete(card: CreditCard) {
    if (!window.confirm(`Delete credit card "${card.name}"?`)) {
      return
    }
    await remove(card.id)
  }

  const totalLimit = items.reduce((sum, item) => sum + Number(item.limit_amount), 0)

  return (
    <div>
      <PageHeader
        title="Credit cards"
        description={`${items.length} cards · ${formatCurrency(totalLimit)} total limit`}
        action={
          <SecondaryButton onClick={() => setShowForm(true)}>
            Add card
          </SecondaryButton>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorAlert message={error} />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading credit cards…</p>
      ) : items.length === 0 ? (
        <EmptyState message="No credit cards tracked yet. Add one to monitor limit, balance, and due dates." />
      ) : (
        <>
          <RecordCardList>
            {items.map((card) => {
              const availableCredit = Number(card.limit_amount)
              return (
                <RecordCard
                  key={card.id}
                  title={card.name}
                  subtitle={`Cutoff ${card.cutoff_day} · Due ${card.due_day}`}
                  amount={formatCurrency(Number(card.limit_amount))}
                  amountVariant="debt"
                  meta={[
                    { label: 'Limit', value: formatCurrency(Number(card.limit_amount)) },
                    { label: 'Available', value: formatCurrency(availableCredit) },
                  ]}
                  onEdit={() => openEdit(card)}
                  onDelete={() => void handleDelete(card)}
                />
              )
            })}
          </RecordCardList>

          <div className={`hidden md:block ${tableWrapper}`}>
            <table className={tableElement}>
              <thead className={tableHead}>
                <tr>
                  <th className={`${tableHeadCell} text-left`}>Card</th>
                  <th className={`${tableHeadCell} text-left`}>Cutoff</th>
                  <th className={`${tableHeadCell} text-left`}>Due</th>
                  <th className={`${tableHeadCell} text-right`}>Payable</th>
                  <th className={`${tableHeadCell} text-right`}>Available</th>
                  <th className={`${tableHeadCell} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className={tableBody}>
                {items.map((card) => {
                  const availableCredit = Number(card.limit_amount)
                  return (
                    <tr key={card.id} className={tableRow}>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {card.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        Day {card.cutoff_day}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        Day {card.due_day}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-amber-700 dark:text-amber-400">
                        {formatCurrency(0)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-300">
                        {formatCurrency(availableCredit)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        <div className="flex justify-end gap-2">
                          <SecondaryButton onClick={() => openEdit(card)}>Edit</SecondaryButton>
                          <SecondaryButton onClick={() => void handleDelete(card)}>Delete</SecondaryButton>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit credit card' : 'Add credit card'} onClose={closeForm}>
          <CreditCardForm
            initial={editing ?? undefined}
            onSubmit={(data) => (editing ? update(editing.id, data) : create(data))}
            onCancel={closeForm}
          />
        </Modal>
      )}
    </div>
  )
}
