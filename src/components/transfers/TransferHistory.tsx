import { useAuth } from '../../hooks/useAuth'
import { useDebts } from '../../hooks/useDebts'
import { useSavingsGoals } from '../../hooks/useSavings'
import { useTransfers } from '../../hooks/useTransfers'
import { useWallets } from '../../hooks/useWallets'
import { listPanel } from '../../lib/classes'
import { formatCurrency, formatDate } from '../../lib/format'
import {
  transferCreatorLabel,
  transferDestinationLabel,
  transferSourceLabel,
} from '../../lib/transfers'
import { EmptyState } from '../ui/EmptyState'

export function TransferHistory() {
  const { user } = useAuth()
  const { wallets } = useWallets()
  const { items: goals } = useSavingsGoals()
  const { items: debts } = useDebts()
  const { items, creatorEmails, loading } = useTransfers()

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Loading transfers…</p>
  }

  if (items.length === 0) {
    return <EmptyState message="No transfers yet." />
  }

  return (
    <ul className={listPanel}>
      {items.map((transfer) => (
        <li key={transfer.id} className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {transferSourceLabel(transfer, wallets)}
              {' → '}
              {transferDestinationLabel(transfer, wallets, goals, debts)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatDate(transfer.date)}
              {' · Created by '}
              {user ? transferCreatorLabel(transfer, user.id, creatorEmails) : '—'}
              {transfer.note ? ` · ${transfer.note}` : ''}
              {transfer.fee ? ` · Fee ${formatCurrency(Number(transfer.fee))}` : ''}
            </p>
          </div>
          <div className="text-right">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {formatCurrency(Number(transfer.amount))}
            </span>
            {transfer.fee ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                + {formatCurrency(Number(transfer.fee))} fee
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
