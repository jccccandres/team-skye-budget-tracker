import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10.5 12 3l9 7.5M5.25 9v10.125c0 .621.504 1.125 1.125 1.125h3.375v-5.25c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v5.25h3.375c.621 0 1.125-.504 1.125-1.125V9"
      />
    </svg>
  )
}

function TransactionsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m17.25 6.75-3-3m3 3-3 3m3-3H6.75A2.25 2.25 0 0 0 4.5 9v.75" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m6.75 17.25 3 3m-3-3 3-3m-3 3h10.5a2.25 2.25 0 0 0 2.25-2.25V14.25"
      />
    </svg>
  )
}

function SavingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7.5A2.25 2.25 0 0 1 5.25 5.25h13.5A2.25 2.25 0 0 1 21 7.5v9A2.25 2.25 0 0 1 18.75 18.75H5.25A2.25 2.25 0 0 1 3 16.5v-9Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 12h7.5M12 8.25v7.5" />
    </svg>
  )
}

const navItems: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/transactions', label: 'Transactions', icon: <TransactionsIcon /> },
  { to: '/savings', label: 'Savings', icon: <SavingsIcon /> },
]

function bottomNavClass({ isActive }: { isActive: boolean }) {
  return [
    'flex flex-1 items-center justify-center rounded-lg px-1 py-2 transition-colors',
    isActive
      ? 'text-slate-900 dark:text-slate-100'
      : 'text-slate-500 dark:text-slate-400',
  ].join(' ')
}

export function MobileNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-lg px-2 pt-1">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={bottomNavClass} aria-label={item.label}>
            {({ isActive }) => (
              <span
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-full',
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                ].join(' ')}
                aria-hidden="true"
              >
                {item.icon}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
