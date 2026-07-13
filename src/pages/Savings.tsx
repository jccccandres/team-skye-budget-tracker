import { useState } from 'react'
import { ProgressBar } from '../components/savings/ProgressBar'
import { SavingsGoalForm } from '../components/savings/SavingsGoalForm'
import { SavingsTransactionForm } from '../components/savings/SavingsTransactionForm'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { Modal } from '../components/ui/Modal'
import { PageHeader, PrimaryButton, SecondaryButton } from '../components/ui/PageHeader'
import { useSavingsGoals, useSavingsTransactions } from '../hooks/useSavings'
import { formatCurrency, formatDate } from '../lib/format'
import type { SavingsGoal } from '../types/database'

function GoalCard({ goal, onEdit, onDelete }: { goal: SavingsGoal; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [showTxnForm, setShowTxnForm] = useState(false)
  const { items: transactions, loading, create, remove } = useSavingsTransactions(
    expanded || showTxnForm ? goal.id : null,
  )
  const { refresh: refreshGoals } = useSavingsGoals()

  async function handleAddTransaction(data: Parameters<typeof create>[0]) {
    const result = await create(data)
    if (!result.error) await refreshGoals()
    return result
  }

  async function handleDeleteTransaction(id: string) {
    if (!window.confirm('Delete this transaction?')) return
    await remove(id)
    await refreshGoals()
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-slate-900 dark:text-slate-100">{goal.name}</h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {formatCurrency(goal.current_amount)}
            {goal.target_amount ? ` of ${formatCurrency(goal.target_amount)}` : ' saved'}
            {goal.target_date ? ` · Target ${formatDate(goal.target_date)}` : ''}
          </p>
        </div>
      </div>

      {goal.target_amount ? (
        <div className="mt-3">
          <ProgressBar current={goal.current_amount} target={goal.target_amount} />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <PrimaryButton onClick={() => setShowTxnForm(true)}>Deposit / Withdraw</PrimaryButton>
        <SecondaryButton onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Hide history' : 'View history'}
        </SecondaryButton>
        <SecondaryButton onClick={onEdit}>Edit</SecondaryButton>
        <SecondaryButton onClick={onDelete}>Delete</SecondaryButton>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading history…</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No transactions yet.</p>
          ) : (
            <ul className="space-y-2">
              {transactions.map((txn) => (
                <li key={txn.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-slate-700 dark:text-slate-300">{formatDate(txn.date)}</span>
                    {txn.note ? (
                      <span className="text-slate-400 dark:text-slate-500"> · {txn.note}</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        txn.type === 'deposit'
                          ? 'font-medium text-emerald-700 dark:text-emerald-400'
                          : 'font-medium text-red-700 dark:text-red-400'
                      }
                    >
                      {txn.type === 'deposit' ? '+' : '−'}
                      {formatCurrency(txn.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDeleteTransaction(txn.id)}
                      className="text-xs text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showTxnForm && (
        <Modal title={`Add transaction · ${goal.name}`} onClose={() => setShowTxnForm(false)}>
          <SavingsTransactionForm
            onSubmit={handleAddTransaction}
            onCancel={() => setShowTxnForm(false)}
          />
        </Modal>
      )}
    </div>
  )
}

export function SavingsPage() {
  const { items, loading, error, create, update, remove } = useSavingsGoals()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SavingsGoal | null>(null)

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  async function handleDelete(goal: SavingsGoal) {
    if (!window.confirm(`Delete savings goal "${goal.name}"? This also removes its history.`)) {
      return
    }
    await remove(goal.id)
  }

  const totalSaved = items.reduce((sum, g) => sum + Number(g.current_amount), 0)

  return (
    <div>
      <PageHeader
        title="Savings"
        description={`${items.length} goal${items.length === 1 ? '' : 's'} · ${formatCurrency(totalSaved)} total saved`}
        action={
          <PrimaryButton
            onClick={() => {
              setEditing(null)
              setShowForm(true)
            }}
          >
            Add goal
          </PrimaryButton>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorAlert message={error} />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading savings goals…</p>
      ) : items.length === 0 ? (
        <EmptyState message="No savings goals yet. Add one to start setting money aside." />
      ) : (
        <div className="space-y-4">
          {items.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => {
                setEditing(goal)
                setShowForm(true)
              }}
              onDelete={() => void handleDelete(goal)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit goal' : 'Add savings goal'} onClose={closeForm}>
          <SavingsGoalForm
            initial={editing ?? undefined}
            onSubmit={(data) => (editing ? update(editing.id, data) : create(data))}
            onCancel={closeForm}
          />
        </Modal>
      )}
    </div>
  )
}
