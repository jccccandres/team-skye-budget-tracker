import { ThemeToggle } from './ThemeToggle'

export function ConfigError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="max-w-md rounded-xl border border-amber-200 bg-white p-8 shadow-sm dark:border-amber-900 dark:bg-slate-900">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Configuration required
        </h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Supabase environment variables are missing. The app cannot start without them.
        </p>
        <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <p className="font-medium">Local development</p>
          <p className="mt-1">
            Copy <code className="text-xs">.env.example</code> to{' '}
            <code className="text-xs">.env</code> and add your Supabase URL and anon key.
          </p>
          <p className="mt-3 font-medium">GitHub Pages</p>
          <p className="mt-1">
            Add <code className="text-xs">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> as repository secrets,
            then re-run the deploy workflow.
          </p>
        </div>
        <div className="mt-4">
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
