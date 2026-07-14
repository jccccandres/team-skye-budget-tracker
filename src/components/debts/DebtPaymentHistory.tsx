import { ErrorAlert } from '../ui/ErrorAlert'
import { EmptyState } from '../ui/EmptyState'
import { useDebtPayments } from '../../hooks/useDebtPayments'
import { formatCurrency, formatDate } from '../../lib/format'
import type { Debt } from '../../types/database'

export function DebtPaymentHistory({ debt }: { debt: Debt }) {
  const { items, loading, error, remove } = useDebtPayments(debt.id)

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this payment? This restores the amount to the remaining balance.')) {
      return
    }
    await remove(id)
  }

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Loading payment history…</p>
  }

  return (
    <div>
      {error && (
        <div className="mb-3">
          <ErrorAlert message={error} />
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState message="No payments logged yet. Use Transfer money to pay toward this debt." />
      ) : (
        <ul className="space-y-2">
          {items.map((payment) => (
            <li key={payment.id} className="flex items-center justify-between text-sm">
              <div>
                <span className="text-slate-700 dark:text-slate-300">{formatDate(payment.date)}</span>
                {payment.note ? (
                  <span className="text-slate-400 dark:text-slate-500"> · {payment.note}</span>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(payment.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => void handleDelete(payment.id)}
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
  )
}
