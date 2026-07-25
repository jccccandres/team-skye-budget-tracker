import { useState } from 'react'
import { CreditCardForm } from '../components/credit-cards/CreditCardForm'
import { CreditCardPaymentHistory } from '../components/credit-cards/CreditCardPaymentHistory'
import { TransferForm } from '../components/transfers/TransferForm'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { Modal } from '../components/ui/Modal'
import { PageHeader, SecondaryButton } from '../components/ui/PageHeader'
import { RecordCard, RecordCardList } from '../components/ui/RecordCard'
import { useCreditCardBalances } from '../hooks/useCreditCardBalances'
import { useCreditCards } from '../hooks/useCreditCards'
import { tableBody, tableElement, tableHead, tableHeadCell, tableRow, tableWrapper } from '../lib/classes'
import { formatCurrency } from '../lib/format'
import type { CreditCard } from '../types/database'

export function CreditCardsPage() {
  const { items, loading, error, create, update, remove } = useCreditCards()
  const { balances, error: balancesError } = useCreditCardBalances()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CreditCard | null>(null)
  const [payingCard, setPayingCard] = useState<CreditCard | null>(null)
  const [historyCard, setHistoryCard] = useState<CreditCard | null>(null)

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

  function owedFor(card: CreditCard): number {
    return balances[card.id]?.owed ?? 0
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

      {balancesError && (
        <div className="mb-4">
          <ErrorAlert message={balancesError} />
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
              const owed = owedFor(card)
              const availableCredit = Number(card.limit_amount) - owed
              return (
                <RecordCard
                  key={card.id}
                  title={card.name}
                  subtitle={`Cutoff ${card.cutoff_day} · Due ${card.due_day}`}
                  amount={formatCurrency(owed)}
                  amountVariant="debt"
                  meta={[
                    { label: 'Limit', value: formatCurrency(Number(card.limit_amount)) },
                    { label: 'Available', value: formatCurrency(availableCredit) },
                  ]}
                  onEdit={() => openEdit(card)}
                  onDelete={() => void handleDelete(card)}
                  extraActions={
                    <>
                      <SecondaryButton className="min-h-10 flex-1" onClick={() => setPayingCard(card)}>
                        Pay
                      </SecondaryButton>
                      <SecondaryButton className="min-h-10 flex-1" onClick={() => setHistoryCard(card)}>
                        History
                      </SecondaryButton>
                    </>
                  }
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
                  const owed = owedFor(card)
                  const availableCredit = Number(card.limit_amount) - owed
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
                        {formatCurrency(owed)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-300">
                        {formatCurrency(availableCredit)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        <div className="flex justify-end gap-2">
                          <SecondaryButton onClick={() => setPayingCard(card)}>Pay</SecondaryButton>
                          <SecondaryButton onClick={() => setHistoryCard(card)}>History</SecondaryButton>
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

      {payingCard && (
        <Modal title={`Pay bill · ${payingCard.name}`} onClose={() => setPayingCard(null)}>
          <TransferForm
            presetCreditCardId={payingCard.id}
            onDone={() => setPayingCard(null)}
            onCancel={() => setPayingCard(null)}
          />
        </Modal>
      )}

      {historyCard && (
        <Modal title={`Payment history · ${historyCard.name}`} onClose={() => setHistoryCard(null)}>
          <CreditCardPaymentHistory card={historyCard} />
        </Modal>
      )}
    </div>
  )
}
