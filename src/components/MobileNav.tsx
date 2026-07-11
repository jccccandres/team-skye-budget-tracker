import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', shortLabel: 'Dashboard' },
  { to: '/expenses', label: 'Expenses', shortLabel: 'Expenses' },
  { to: '/income', label: 'Income', shortLabel: 'Income' },
] as const

function bottomNavClass({ isActive }: { isActive: boolean }) {
  return [
    'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors',
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
          <NavLink key={item.to} to={item.to} className={bottomNavClass}>
            {({ isActive }) => (
              <>
                <span
                  className={[
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {item.shortLabel.charAt(0)}
                </span>
                <span>{item.shortLabel}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
