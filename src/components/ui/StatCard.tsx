interface StatCardBreakdown {
  label: string
  value: string
  variant?: 'default' | 'positive' | 'negative' | 'warning'
}

interface StatCardProps {
  label: string
  value: string
  hint?: string
  variant?: 'default' | 'positive' | 'negative' | 'warning'
  /** An optional secondary figure shown under the main value/hint, e.g.
   * breaking out the portion of an expense total paid by credit card. */
  breakdown?: StatCardBreakdown
}

const valueColors = {
  default: 'text-slate-900 dark:text-slate-100',
  positive: 'text-emerald-700 dark:text-emerald-400',
  negative: 'text-red-700 dark:text-red-400',
  warning: 'text-amber-700 dark:text-amber-400',
}

export function StatCard({ label, value, hint, variant = 'default', breakdown }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${valueColors[variant]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      {breakdown && (
        <p className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${valueColors[breakdown.variant ?? 'default']}`}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
          {breakdown.label}: {breakdown.value}
        </p>
      )}
    </div>
  )
}
