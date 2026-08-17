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
  onClick?: () => void
}

const valueColors = {
  default: 'text-slate-900 dark:text-slate-100',
  positive: 'text-emerald-700 dark:text-emerald-400',
  negative: 'text-red-700 dark:text-red-400',
  warning: 'text-amber-700 dark:text-amber-400',
}

const cardClassName =
  'rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900'

const clickableCardClassName =
  'cursor-pointer transition-colors hover:border-slate-300 hover:bg-slate-50 dark:hover:border-slate-600 dark:hover:bg-slate-800/50'

export function StatCard({ label, value, hint, variant = 'default', breakdown, onClick }: StatCardProps) {
  const content = (
    <>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${valueColors[variant]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      {breakdown && (
        <p className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${valueColors[breakdown.variant ?? 'default']}`}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
          {breakdown.label}: {breakdown.value}
        </p>
      )}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left ${cardClassName} ${clickableCardClassName}`}
      >
        {content}
      </button>
    )
  }

  return <div className={cardClassName}>{content}</div>
}
