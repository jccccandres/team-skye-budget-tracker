import { StatCard } from '../ui/StatCard'
import { formatCurrency } from '../../lib/format'
import type { DashboardData } from '../../hooks/useDashboard'

export function WalletDashboardSection({
  walletData,
}: {
  walletData: DashboardData
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <StatCard
        label="Income this month"
        value={formatCurrency(walletData.monthIncome)}
        variant="positive"
      />
      <StatCard
        label="Expenses this month"
        value={formatCurrency(walletData.monthExpenses)}
        variant="negative"
        breakdown={
          walletData.creditCardExpenses > 0
            ? { label: 'Credit card', value: formatCurrency(walletData.creditCardExpenses), variant: 'warning' }
            : undefined
        }
      />
      <StatCard
        label="Transferred out"
        value={formatCurrency(walletData.transferredOut)}
        hint="Your transfers to savings this month"
        variant={walletData.transferredOut > 0 ? 'negative' : 'default'}
      />
      <StatCard
        label="Net balance"
        value={formatCurrency(walletData.netBalance)}
        hint="Income minus wallet-paid expenses minus transfers out"
        variant={walletData.netBalance >= 0 ? 'positive' : 'negative'}
      />
    </div>
  )
}
