import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { BarChart3, FileText, DollarSign, Wallet, CreditCard, TrendingDown, PiggyBank, ShoppingCart } from 'lucide-react'
import { FabVisibilityToggle } from './FabVisibilityToggle'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '../hooks/useAuth'

const menuNavGroups = [
  {
    label: 'Reports',
    items: [
      { to: '/reports/expenses', label: 'Expense report', icon: BarChart3 },
      { to: '/reports/income', label: 'Income report', icon: BarChart3 },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/expenses', label: 'Expenses', icon: FileText },
      { to: '/income', label: 'Income', icon: DollarSign },
    ],
  },
  {
    label: 'Accounts',
    items: [
      { to: '/wallets', label: 'Wallets', icon: Wallet },
      { to: '/credit-cards', label: 'Credit cards', icon: CreditCard },
      { to: '/debts', label: 'Debts', icon: TrendingDown },
      { to: '/savings', label: 'Savings', icon: PiggyBank },
    ],
  },
  {
    label: 'Tools',
    items: [{ to: '/grocery', label: 'Grocery lists', icon: ShoppingCart }],
  },
] as const

function menuNavClass({ isActive }: { isActive: boolean }) {
  return [
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
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
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden relative">
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
        <>
          {/* Backdrop: closes the menu on tap and dims the page behind it,
              so the drawer reads as an overlay instead of pushing page
              content down the way an inline expansion would. */}
          <div
            className="fixed inset-0 z-20 bg-slate-950/40"
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 top-full z-30 max-h-[calc(100vh-5rem)] overflow-y-auto border-t border-slate-200 bg-white px-4 py-3 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <nav className="space-y-1">
              {menuNavGroups.map((group, index) => (
                <div
                  key={group.label}
                  className={index > 0 ? 'border-t border-slate-100 pt-3 dark:border-slate-800' : undefined}
                >
                  <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {group.label}
                  </p>
                  <div className="space-y-0.5 pb-2">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const isReportChild = item.to.startsWith('/reports/')
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={({ isActive }) => [
                            menuNavClass({ isActive }),
                            isReportChild ? 'ml-3' : '',
                          ].filter(Boolean).join(' ')}
                          onClick={closeMenu}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </NavLink>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
            <div className="border-t border-slate-200 pt-2 dark:border-slate-800">
              <ThemeToggle />
              <FabVisibilityToggle />
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
                className="mt-2 w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  )
}
