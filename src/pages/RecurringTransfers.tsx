import { useState } from 'react'
import { RecurringTransferForm } from '../components/transfers/RecurringTransferForm'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { Modal } from '../components/ui/Modal'
import { PageHeader, PrimaryButton, SecondaryButton } from '../components/ui/PageHeader'
import { useDebts } from '../hooks/useDebts'
import { useRecurringTransfers } from '../hooks/useRecurringTransfers'
import { useSavingsGoals } from '../hooks/useSavings'
import { useWallets } from '../hooks/useWallets'
import { listPanel } from '../lib/classes'
import { formatCurrency } from '../lib/format'
import { transferDestinationLabel, transferSourceLabel } from '../lib/transfers'

export function RecurringTransfersPage() {
  const { wallets } = useWallets()
  const { items: goals } = useSavingsGoals()
  const { items: debts } = useDebts()
  const { items, loading, error, setActive, remove } = useRecurringTransfers()
  const [showForm, setShowForm] = useState(false)

  async function handleDelete(id: string, label: string) {
    if (!window.confirm(`Delete recurring transfer "${label}"? This won't undo any past transfers already applied.`)) {
      return
    }
    await remove(id)
  }

  return (
    <div>
      <PageHeader
        title="Recurring transfers"
        description="Rules you can apply each month with one tap - nothing happens automatically in the background."
        action={<PrimaryButton onClick={() => setShowForm(true)}>Add rule</PrimaryButton>}
      />

      {error && (
        <div className="mb-4">
          <ErrorAlert message={error} />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading recurring transfers…</p>
      ) : items.length === 0 ? (
        <EmptyState message="No recurring transfers set up yet. Add one for things like a monthly loan auto-debit." />
      ) : (
        <ul className={listPanel}>
          {items.map((rule) => (
            <li key={rule.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {rule.label}
                  {!rule.active && (
                    <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                      (paused)
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {transferSourceLabel(rule, wallets)} → {transferDestinationLabel(rule, wallets, goals, debts)}
                  {' · Day '}
                  {rule.day_of_month}
                  {' of each month'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {formatCurrency(rule.amount)}
                </span>
                <SecondaryButton onClick={() => void setActive(rule.id, !rule.active)}>
                  {rule.active ? 'Pause' : 'Resume'}
                </SecondaryButton>
                <SecondaryButton onClick={() => void handleDelete(rule.id, rule.label)}>
                  Delete
                </SecondaryButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <Modal title="Add recurring transfer" onClose={() => setShowForm(false)}>
          <RecurringTransferForm onDone={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
    </div>
  )
}
