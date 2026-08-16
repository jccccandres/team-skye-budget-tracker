import { EmptyState } from '../ui/EmptyState'
import { listPanel } from '../../lib/classes'
import { formatCurrency, formatDate } from '../../lib/format'
import type { IncomeSourceEntry } from '../../hooks/useIncomeReportsData'

export function SourceIncomeList({ entries }: { entries: IncomeSourceEntry[] }) {
  if (entries.length === 0) {
    return <EmptyState message="No income entries for the selected source and range." />
  }

  const total = entries.reduce((sum, entry) => sum + entry.amount, 0)

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
        {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} · {formatCurrency(total)} total
      </p>
      <ul className={listPanel}>
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {formatDate(entry.date)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{entry.frequency}</p>
            </div>
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {formatCurrency(entry.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
