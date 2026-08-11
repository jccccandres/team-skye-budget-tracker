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
        label="Total income"
        value={formatCurrency(walletData.monthIncome)}
        hint="All-time"
        variant="positive"
      />
      <StatCard
        label="Total expenses"
        value={formatCurrency(walletData.monthExpenses)}
        hint="All-time"
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
        hint="Transfers out of this wallet, all-time"
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
