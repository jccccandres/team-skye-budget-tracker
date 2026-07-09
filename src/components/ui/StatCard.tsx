interface StatCardProps {
  label: string
  value: string
  hint?: string
  variant?: 'default' | 'positive' | 'negative'
}

const valueColors = {
  default: 'text-slate-900 dark:text-slate-100',
  positive: 'text-emerald-700 dark:text-emerald-400',
  negative: 'text-red-700 dark:text-red-400',
}

export function StatCard({ label, value, hint, variant = 'default' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${valueColors[variant]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  )
}
