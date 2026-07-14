import { useMemo, useState } from 'react'
import { DebtForm } from '../components/debts/DebtForm'
import { DebtPaymentHistory } from '../components/debts/DebtPaymentHistory'
import { TransferForm } from '../components/transfers/TransferForm'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { Modal } from '../components/ui/Modal'
import { PageHeader, PrimaryButton, SecondaryButton } from '../components/ui/PageHeader'
import { RecordCard, RecordCardList } from '../components/ui/RecordCard'
import { useDebts } from '../hooks/useDebts'
import {
  tableBody,
  tableElement,
  tableHead,
  tableHeadCell,
  tableRow,
  tableWrapper,
} from '../lib/classes'
import { formatCurrency, formatDate } from '../lib/format'
import {
  DEBT_CATEGORIES,
  debtCategoryLabel,
  type Debt,
  type DebtCategory,
} from '../types/database'

type DebtFilter = 'all' | DebtCategory

const FILTER_TABS: { value: DebtFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...DEBT_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
]

function debtTypeLabel(type: Debt['type']) {
  return type === 'installment' ? 'Installment' : 'One-time'
}

function sumRemaining(debts: Debt[]) {
  return debts.reduce((sum, item) => sum + Number(item.remaining_balance), 0)
}

function sumMonthly(debts: Debt[]) {
  return debts.reduce((sum, item) => sum + Number(item.monthly_payment ?? 0), 0)
}

export function DebtsPage() {
  const { items, loading, error, create, update, remove } = useDebts()
  const [activeFilter, setActiveFilter] = useState<DebtFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [createCategory, setCreateCategory] = useState<DebtCategory>('other')
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null)
  const [historyDebt, setHistoryDebt] = useState<Debt | null>(null)

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return items
    return items.filter((debt) => debt.category === activeFilter)
  }, [items, activeFilter])

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  function openCreate() {
    setEditing(null)
    setCreateCategory(activeFilter === 'all' ? 'other' : activeFilter)
    setShowForm(true)
  }

  function openEdit(debt: Debt) {
    setEditing(debt)
    setShowForm(true)
  }

  async function handleDelete(debt: Debt) {
    if (!window.confirm(`Delete debt "${debt.name}"?`)) {
      return
    }
    await remove(debt.id)
  }

  const totalRemaining = sumRemaining(filteredItems)
  const totalMonthly = sumMonthly(filteredItems)

  return (
    <div>
      <PageHeader
        title="Debts"
        description={`${filteredItems.length} shown · ${formatCurrency(totalRemaining)} remaining · ${formatCurrency(totalMonthly)}/mo payments`}
        action={
          <PrimaryButton onClick={openCreate}>Add debt</PrimaryButton>
        }
      />

      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:mb-6 md:flex-wrap md:px-0">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveFilter(tab.value)}
            className={[
              'shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              activeFilter === tab.value
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700',
            ].join(' ')}
          >
            {tab.label}
            {tab.value !== 'all' && (
              <span className="ml-1.5 text-xs opacity-75">
                ({items.filter((d) => d.category === tab.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {error && <div className="mb-4"><ErrorAlert message={error} /></div>}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading debts…</p>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          message={
            activeFilter === 'all'
              ? 'No debts tracked yet. Add a loan or credit card to monitor balances.'
              : `No ${debtCategoryLabel(activeFilter as DebtCategory).toLowerCase()} debts yet.`
          }
        />
      ) : (
        <>
          <RecordCardList>
            {filteredItems.map((debt) => (
              <RecordCard
                key={debt.id}
                title={debt.name}
                subtitle={debtCategoryLabel(debt.category)}
                amount={formatCurrency(Number(debt.remaining_balance))}
                amountVariant="debt"
                meta={[
                  { label: 'Payment', value: debtTypeLabel(debt.type) },
                  { label: 'Total', value: formatCurrency(Number(debt.total_amount)) },
                  {
                    label: 'Monthly',
                    value: debt.monthly_payment
                      ? formatCurrency(Number(debt.monthly_payment))
                      : '—',
                  },
                  {
                    label: 'Due',
                    value: debt.due_date ? formatDate(debt.due_date) : '—',
                  },
                ]}
                onEdit={() => openEdit(debt)}
                onDelete={() => void handleDelete(debt)}
                extraActions={
                  <>
                    <SecondaryButton className="min-h-10 flex-1" onClick={() => setPayingDebt(debt)}>
                      Pay
                    </SecondaryButton>
                    <SecondaryButton className="min-h-10 flex-1" onClick={() => setHistoryDebt(debt)}>
                      History
                    </SecondaryButton>
                  </>
                }
              />
            ))}
          </RecordCardList>

          <div className={`hidden md:block ${tableWrapper}`}>
          <table className={tableElement}>
            <thead className={tableHead}>
              <tr>
                <th className={`${tableHeadCell} text-left`}>Name</th>
                {activeFilter === 'all' && (
                  <th className={`${tableHeadCell} text-left`}>Category</th>
                )}
                <th className={`${tableHeadCell} text-left`}>Payment</th>
                <th className={`${tableHeadCell} text-right`}>Total</th>
                <th className={`${tableHeadCell} text-right`}>Remaining</th>
                <th className={`${tableHeadCell} text-right`}>Monthly</th>
                <th className={`${tableHeadCell} text-left`}>Due</th>
                <th className={`${tableHeadCell} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className={tableBody}>
              {filteredItems.map((debt) => (
                <tr key={debt.id} className={tableRow}>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">{debt.name}</td>
                  {activeFilter === 'all' && (
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {debtCategoryLabel(debt.category)}
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{debtTypeLabel(debt.type)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-300">
                    {formatCurrency(Number(debt.total_amount))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-amber-700 dark:text-amber-400">
                    {formatCurrency(Number(debt.remaining_balance))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-300">
                    {debt.monthly_payment
                      ? formatCurrency(Number(debt.monthly_payment))
                      : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                    {debt.due_date ? formatDate(debt.due_date) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <div className="flex justify-end gap-2">
                      <SecondaryButton onClick={() => setPayingDebt(debt)}>Pay</SecondaryButton>
                      <SecondaryButton onClick={() => setHistoryDebt(debt)}>History</SecondaryButton>
                      <SecondaryButton onClick={() => openEdit(debt)}>
                        Edit
                      </SecondaryButton>
                      <SecondaryButton onClick={() => void handleDelete(debt)}>
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
        <Modal title={editing ? 'Edit debt' : 'Add debt'} onClose={closeForm}>
          <DebtForm
            initial={editing ?? undefined}
            defaultCategory={editing?.category ?? createCategory}
            onSubmit={(data) => (editing ? update(editing.id, data) : create(data))}
            onCancel={closeForm}
          />
        </Modal>
      )}

      {payingDebt && (
        <Modal title={`Pay · ${payingDebt.name}`} onClose={() => setPayingDebt(null)}>
          <TransferForm
            presetDebtId={payingDebt.id}
            onDone={() => setPayingDebt(null)}
            onCancel={() => setPayingDebt(null)}
          />
        </Modal>
      )}

      {historyDebt && (
        <Modal title={`Payment history · ${historyDebt.name}`} onClose={() => setHistoryDebt(null)}>
          <DebtPaymentHistory debt={historyDebt} />
        </Modal>
      )}
    </div>
  )
}
