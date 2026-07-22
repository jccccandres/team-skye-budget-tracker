import { EmptyState } from '../ui/EmptyState'
import { listPanel } from '../../lib/classes'
import { formatCurrency, formatDate } from '../../lib/format'
import type { CategoryExpense } from '../../hooks/useReportsData'

export function CategoryExpenseList({ expenses }: { expenses: CategoryExpense[] }) {
  if (expenses.length === 0) {
    return <EmptyState message="No expenses in this category for the selected range." />
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
        {expenses.length} entr{expenses.length === 1 ? 'y' : 'ies'} · {formatCurrency(total)} total
      </p>
      <ul className={listPanel}>
        {expenses.map((expense) => (
          <li key={expense.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {formatDate(expense.date)}
              </p>
              {expense.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{expense.description}</p>
              )}
            </div>
            <span className="text-sm font-medium text-red-700 dark:text-red-400">
              {formatCurrency(expense.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
