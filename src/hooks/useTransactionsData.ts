import { useMemo } from 'react'
import { monthRange } from '../lib/format'
import { useDataChangeListener } from '../lib/dataSync'
import type { Transfer } from '../types/database'
import { useAuth } from './useAuth'
import { useWalletPeriodFinancials } from './useWalletPeriodFinancials'

export type CombinedTransaction =
  | { type: 'income'; id: string; date: string; createdAt: string; amount: number; label: string }
  | { type: 'expense'; id: string; date: string; createdAt: string; amount: number; label: string }
  | {
      type: 'transfer'
      id: string
      date: string
      createdAt: string
      amount: number
      fee: number | null
      direction: 'in' | 'out'
      transfer: Transfer
    }

interface TransactionsData {
  monthIncome: number
  monthExpenses: number
  transferredOut: number
  netBalance: number
  transactions: CombinedTransaction[]
}

const emptyData: TransactionsData = {
  monthIncome: 0,
  monthExpenses: 0,
  transferredOut: 0,
  netBalance: 0,
  transactions: [],
}

/**
 * @param walletId - Pass a wallet id for a shared wallet's view, or
 * omit/null for the signed-in user's personal view.
 * @param referenceDate - Any date within the month to show. Defaults to
 * today.
 */
export function useTransactionsData(walletId: string | null, referenceDate: Date = new Date()) {
  const { user } = useAuth()
  const { start, end } = monthRange(referenceDate)

  const {
    data: financials,
    transfers,
    loading,
    error,
    refresh,
  } = useWalletPeriodFinancials(walletId, start, end)

  useDataChangeListener(refresh)

  const data = useMemo<TransactionsData>(() => {
    if (!user) return emptyData

    const relevantTransfers = transfers.filter((t) => {
      if (t.date < start || t.date > end) return false
      if (walletId === null) {
        return t.source_type === 'personal' && t.user_id === user.id
      }
      return (
        (t.source_type === 'wallet' && t.source_wallet_id === walletId) ||
        (t.destination_type === 'wallet' && t.destination_wallet_id === walletId)
      )
    })

    // Transfer-linked income/expense rows are excluded from the displayed
    // list - they're already represented there by their originating
    // Transfer row, so showing both would double-list the same money
    // movement. (They're still included in monthIncome/monthExpenses,
    // matching the dashboard's totals.)
    const transactions: CombinedTransaction[] = [
      ...financials.incomeRows
        .filter((r) => !r.transfer_id)
        .map((r) => ({
          type: 'income' as const,
          id: r.id,
          date: r.date,
          createdAt: r.created_at,
          amount: Number(r.amount),
          label: r.source,
        })),
      ...financials.expenseRows
        .filter((r) => !r.transfer_id)
        .map((r) => ({
          type: 'expense' as const,
          id: r.id,
          date: r.date,
          createdAt: r.created_at,
          amount: Number(r.amount),
          label: r.description ? `${r.category} · ${r.description}` : r.category,
        })),
      ...relevantTransfers.map((t) => {
        const direction: 'in' | 'out' =
          walletId !== null && t.destination_type === 'wallet' && t.destination_wallet_id === walletId
            ? 'in'
            : 'out'
        return {
          type: 'transfer' as const,
          id: t.id,
          date: t.date,
          createdAt: t.created_at,
          amount: Number(t.amount),
          fee: t.fee ? Number(t.fee) : null,
          direction,
          transfer: t,
        }
      }),
    ].sort((a, b) =>
      a.date === b.date
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : a.date < b.date
          ? 1
          : -1,
    )

    return {
      monthIncome: financials.totalIncome,
      monthExpenses: financials.totalExpenses,
      transferredOut: financials.transferredOut,
      netBalance: financials.netBalance,
      transactions,
    }
  }, [user, walletId, start, end, financials, transfers])

  return { data, loading, error, refresh }
}
