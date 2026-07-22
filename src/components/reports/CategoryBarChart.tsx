import { formatCurrency } from '../../lib/format'
import type { CategoryTotal } from '../../hooks/useReportsData'

const barColors = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-sky-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-slate-500',
]

interface CategoryBarChartProps {
  categories: CategoryTotal[]
  onSelectCategory: (category: string) => void
}

export function CategoryBarChart({ categories, onSelectCategory }: CategoryBarChartProps) {
  if (categories.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No expenses in this date range.
      </p>
    )
  }

  const max = Math.max(...categories.map((c) => c.total))

  return (
    <div className="space-y-3">
      {categories.map((c, i) => (
        <button
          key={c.category}
          type="button"
          onClick={() => onSelectCategory(c.category)}
          className="block w-full rounded-md text-left transition-opacity hover:opacity-80"
        >
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="font-medium text-slate-700 underline decoration-slate-300 decoration-dotted underline-offset-4 dark:text-slate-300 dark:decoration-slate-600">
              {c.category}
            </span>
            <span className="text-slate-500 dark:text-slate-400">{formatCurrency(c.total)}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full ${barColors[i % barColors.length]}`}
              style={{ width: `${max > 0 ? (c.total / max) * 100 : 0}%` }}
            />
          </div>
        </button>
      ))}
    </div>
  )
}
