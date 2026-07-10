import type { Wallet } from '../../types/database'

interface WalletSwitcherProps {
  wallets: Wallet[]
  activeWalletId: string | null
  onChange: (walletId: string | null) => void
}

function tabClass(isActive: boolean) {
  return [
    'shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
      : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
  ].join(' ')
}

export function WalletSwitcher({ wallets, activeWalletId, onChange }: WalletSwitcherProps) {
  if (wallets.length === 0) return null

  return (
    <div className="mb-4 flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/50">
      <button type="button" className={tabClass(activeWalletId === null)} onClick={() => onChange(null)}>
        Personal
      </button>
      {wallets.map((wallet) => (
        <button
          key={wallet.id}
          type="button"
          className={tabClass(activeWalletId === wallet.id)}
          onClick={() => onChange(wallet.id)}
        >
          {wallet.name}
        </button>
      ))}
    </div>
  )
}
