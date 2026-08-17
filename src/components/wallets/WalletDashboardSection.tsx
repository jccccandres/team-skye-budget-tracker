import { DashboardStatCards, type DashboardStatCardActions } from '../dashboard/DashboardStatCards'
import type { DashboardData } from '../../hooks/useDashboard'

export function WalletDashboardSection({
  walletData,
  actions,
}: {
  walletData: DashboardData
  actions?: DashboardStatCardActions
}) {
  return (
    <DashboardStatCards
      data={walletData}
      actions={actions}
      transferHint="Transfers out of this wallet, all-time"
    />
  )
}
