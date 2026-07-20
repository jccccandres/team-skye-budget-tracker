import { StatCard } from '../ui/StatCard'
import { useDashboard } from '../../hooks/useDashboard'
import { formatCurrency } from '../../lib/format'
import type { WalletWithMembers } from '../../hooks/useWallets'

export function WalletDashboardSection({
  wallet,
  referenceDate,
}: {
  wallet: WalletWithMembers
  referenceDate: Date
}) {
  const { data, loading } = useDashboard(wallet.id, referenceDate)
  const isShared = wallet.members.length > 1

  return (
    <section className="mt-8">
      <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {wallet.name}
        {isShared ? ' (shared)' : ''}
      </h3>
      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard
            label="Income this month"
            value={formatCurrency(data.monthIncome)}
            variant="positive"
          />
          <StatCard
            label="Expenses this month"
            value={formatCurrency(data.monthExpenses)}
            variant="negative"
          />
          <StatCard
            label="Transferred out"
            value={formatCurrency(data.transferredOut)}
            hint="Your transfers to savings this month"
            variant={data.transferredOut > 0 ? 'negative' : 'default'}
          />
          <StatCard
            label="Net balance"
            value={formatCurrency(data.netBalance)}
            hint="Income minus expenses minus transfers out"
            variant={data.netBalance >= 0 ? 'positive' : 'negative'}
          />
        </div>
      )}
    </section>
  )
}
