import { usePreferences } from '../hooks/usePreferences'

export function FabVisibilityToggle() {
  const { showFab, toggleShowFab } = usePreferences()

  return (
    <button
      type="button"
      onClick={toggleShowFab}
      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      aria-pressed={showFab}
      aria-label={showFab ? 'Hide quick-add button' : 'Show quick-add button'}
    >
      <span>Quick-add button</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          showFab
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
        }`}
      >
        {showFab ? 'On' : 'Off'}
      </span>
    </button>
  )
}
