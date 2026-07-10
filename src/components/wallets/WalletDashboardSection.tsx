import { StatCard } from '../ui/StatCard'
import { useDashboard } from '../../hooks/useDashboard'
import { formatCurrency } from '../../lib/format'
import type { Wallet } from '../../types/database'

export function WalletDashboardSection({ wallet }: { wallet: Wallet }) {
  const { data, loading } = useDashboard(wallet.id)

  return (
    <section className="mt-8">
      <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {wallet.name} (shared)
      </h3>
      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
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
            label="Net balance"
            value={formatCurrency(data.netBalance)}
            hint="Income minus expenses"
            variant={data.netBalance >= 0 ? 'positive' : 'negative'}
          />
        </div>
      )}
    </section>
  )
}
