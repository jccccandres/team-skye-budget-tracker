import { StatCard } from '../ui/StatCard'
import { formatCurrency } from '../../lib/format'
import type { DashboardData } from '../../hooks/useDashboard'

export interface DashboardStatCardActions {
  onIncome: () => void
  onExpense: () => void
  onTransfer: () => void
  onNetBalance: () => void
}

export function DashboardStatCards({
  data,
  actions,
  transferHint,
}: {
  data: DashboardData
  actions?: DashboardStatCardActions
  transferHint: string
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total income"
        value={formatCurrency(data.monthIncome)}
        hint="All-time"
        variant="positive"
        onClick={actions?.onIncome}
      />
      <StatCard
        label="Total expenses"
        value={formatCurrency(data.monthExpenses)}
        hint="All-time"
        variant="negative"
        breakdown={
          data.creditCardExpenses > 0
            ? { label: 'Credit card', value: formatCurrency(data.creditCardExpenses), variant: 'warning' }
            : undefined
        }
        onClick={actions?.onExpense}
      />
      <StatCard
        label="Transferred out"
        value={formatCurrency(data.transferredOut)}
        hint={transferHint}
        variant={data.transferredOut > 0 ? 'negative' : 'default'}
        onClick={actions?.onTransfer}
      />
      <StatCard
        label="Net balance"
        value={formatCurrency(data.netBalance)}
        hint="Income minus wallet-paid expenses minus transfers out"
        variant={data.netBalance >= 0 ? 'positive' : 'negative'}
        onClick={actions?.onNetBalance}
      />
    </div>
  )
}
