import { NavLink, Outlet } from 'react-router-dom'
import { InviteBanner } from './wallets/InviteBanner'
import { MobileHeader } from './MobileHeader'
import { MobileNav } from './MobileNav'
import { QuickAddFab } from './QuickAddFab'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '../hooks/useAuth'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/reports', label: 'Reports' },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/expenses', label: 'Expenses' },
      { to: '/income', label: 'Income' },
      { to: '/transactions', label: 'Transactions' },
    ],
  },
  {
    label: 'Accounts',
    items: [
      { to: '/wallets', label: 'Wallets' },
      { to: '/credit-cards', label: 'Credit cards' },
      { to: '/debts', label: 'Debts' },
      { to: '/savings', label: 'Savings' },
    ],
  },
  {
    label: 'Tools',
    items: [{ to: '/grocery', label: 'Grocery lists' }],
  },
] as const

function navLinkClass({ isActive }: { isActive: boolean }) {
  return [
    'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100',
  ].join(' ')
}

export function Layout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 md:flex">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex">
        <div className="border-b border-slate-200 px-4 py-5 dark:border-slate-800">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Budget Tracker</h1>
          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navGroups.map((group, index) => (
            <div
              key={group.label}
              className={index > 0 ? 'border-t border-slate-100 pt-3 dark:border-slate-800' : undefined}
            >
              <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {group.label}
              </p>
              <div className="space-y-0.5 pb-2">
                {group.items.map((item) => (
                  <NavLink key={item.to} to={item.to} className={navLinkClass}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-800">
          <ThemeToggle />
          <NavLink to="/change-password" className={navLinkClass}>
            Change password
          </NavLink>
          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <MobileHeader />

        <main className="flex-1 overflow-auto px-4 py-4 pb-[calc(7rem+env(safe-area-inset-bottom))] md:px-6 md:py-8 md:pb-8">
          <div className="mx-auto max-w-5xl">
            <InviteBanner />
            <Outlet />
          </div>
        </main>

        <MobileNav />
      </div>

      <QuickAddFab />
    </div>
  )
}
