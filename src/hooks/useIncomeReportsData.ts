import { useMemo } from 'react'
import { useDataChangeListener } from '../lib/dataSync'
import { useAuth } from './useAuth'
import { useWalletPeriodFinancials } from './useWalletPeriodFinancials'

export interface IncomeSourceTotal {
  category: string
  total: number
}

export interface IncomeSourceEntry {
  id: string
  amount: number
  source: string
  frequency: string
  date: string
}

interface IncomeReportsData {
  sourceTotals: IncomeSourceTotal[]
  incomeBySource: Map<string, IncomeSourceEntry[]>
  totalIncome: number
  transferredOut: number
  netBalance: number
}

const emptyData: IncomeReportsData = {
  sourceTotals: [],
  incomeBySource: new Map(),
  totalIncome: 0,
  transferredOut: 0,
  netBalance: 0,
}

/**
 * @param walletId - Pass a wallet id for a shared wallet's report, or
 * omit/null for the signed-in user's personal report.
 */
export function useIncomeReportsData(walletId: string | null, start: string, end: string) {
  const { user } = useAuth()
  const { data: financials, loading, error, refresh } = useWalletPeriodFinancials(walletId, start, end)

  useDataChangeListener(refresh)

  const data = useMemo<IncomeReportsData>(() => {
    if (!user) return emptyData

    const sourceMap = new Map<string, number>()
    const incomeBySource = new Map<string, IncomeSourceEntry[]>()

    for (const row of financials.incomeRows) {
      const source = row.source?.trim() ? row.source : 'Other'
      sourceMap.set(source, (sourceMap.get(source) ?? 0) + Number(row.amount))

      const list = incomeBySource.get(source) ?? []
      list.push({
        id: row.id,
        amount: Number(row.amount),
        source,
        frequency: row.frequency,
        date: row.date,
      })
      incomeBySource.set(source, list)
    }

    for (const list of incomeBySource.values()) {
      list.sort((a, b) => (a.date < b.date ? 1 : -1))
    }

    const sourceTotals = [...sourceMap.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)

    return {
      sourceTotals,
      incomeBySource,
      totalIncome: financials.totalIncome,
      transferredOut: financials.transferredOut,
      netBalance: financials.netBalance,
    }
  }, [user, financials])

  return { data, loading, error, refresh }
}
