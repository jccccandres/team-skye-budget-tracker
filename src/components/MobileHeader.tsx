import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '../hooks/useAuth'

const menuNavItems = [
  { to: '/debts', label: 'Debts' },
  { to: '/credit-cards', label: 'Credit cards' },
  { to: '/savings', label: 'Savings' },
  { to: '/reports', label: 'Reports' },
  { to: '/wallets', label: 'Shared wallets' },
] as const

function menuNavClass({ isActive }: { isActive: boolean }) {
  return [
    'block rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100',
  ].join(' ')
}

export function MobileHeader() {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
  }

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
          aria-label="Menu"
        >
          ☰
        </button>
      </div>

      {menuOpen && (
        <div className="space-y-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <nav className="space-y-1">
            {menuNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={menuNavClass}
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-slate-200 pt-2 dark:border-slate-800">
            <ThemeToggle />
            <NavLink
              to="/change-password"
              className={menuNavClass}
              onClick={closeMenu}
            >
              Change password
            </NavLink>
            <button
              type="button"
              onClick={() => {
                closeMenu()
                void signOut()
              }}
              className="mt-2 w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
