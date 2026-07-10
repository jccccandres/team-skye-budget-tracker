interface ProgressBarProps {
  current: number
  target: number
}

export function ProgressBar({ current, target }: ProgressBarProps) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0

  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all dark:bg-emerald-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{pct}% of target</p>
    </div>
  )
}
