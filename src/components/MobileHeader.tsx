import { useState } from 'react'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '../hooks/useAuth'

export function MobileHeader() {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden">
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
            Budget Tracker
          </h1>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
          aria-expanded={menuOpen}
          aria-label="Account menu"
        >
          ☰
        </button>
      </div>

      {menuOpen && (
        <div className="space-y-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}
