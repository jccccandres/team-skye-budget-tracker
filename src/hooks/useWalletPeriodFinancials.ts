import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Expense, Income } from '../types/database'
import { useAuth } from './useAuth'
import { sumTransfersOut, useTransfers } from './useTransfers'

export interface WalletPeriodFinancials {
  incomeRows: Income[]
  expenseRows: Expense[]
  totalIncome: number
  totalExpenses: number
  transferredOut: number
  netBalance: number
}

const emptyData: WalletPeriodFinancials = {
  incomeRows: [],
  expenseRows: [],
  totalIncome: 0,
  totalExpenses: 0,
  transferredOut: 0,
  netBalance: 0,
}

/**
 * Single source of truth for income/expense/transfer totals over a date
 * range, for a wallet (or the signed-in user's personal account).
 *
 * This used to be reimplemented independently by the Dashboard,
 * Transactions, and Reports pages, which led to inconsistent results
 * between them - e.g. Transactions excluding transfer-linked income/expense
 * rows from its totals, and Reports omitting transferred-out amounts from
 * its net balance entirely. Consolidating the math here means a fix only
 * needs to happen once.
 *
 * Income/expense rows are fetched in full (including transfer-linked rows)
 * so `totalIncome`/`totalExpenses` reflect the same money movements as the
 * database - transfers into a wallet appear as income rows, and transfer
 * fees appear as expense rows. `transferredOut` separately accounts for the
 * transfer principal leaving a source (which has no corresponding expense
 * row), so `netBalance` isn't double- or under-counted either way.
 *
 * @param walletId - Pass a wallet id for a shared wallet, or omit/null for
 * the signed-in user's personal account.
 */
export function useWalletPeriodFinancials(
  walletId: string | null | undefined,
  start: string,
  end: string,
) {
  const { user } = useAuth()
  const [incomeRows, setIncomeRows] = useState<Income[]>([])
  const [expenseRows, setExpenseRows] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { items: transfers, loading: transfersLoading, refresh: refreshTransfers } = useTransfers()

  const refresh = useCallback(async () => {
    if (!supabase || !user) {
      setIncomeRows([])
      setExpenseRows([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let incomeQuery = supabase.from('income').select('*').gte('date', start).lte('date', end)
    let expensesQuery = supabase.from('expenses').select('*').gte('date', start).lte('date', end)

    incomeQuery = walletId ? incomeQuery.eq('wallet_id', walletId) : incomeQuery.is('wallet_id', null)
    expensesQuery = walletId
      ? expensesQuery.eq('wallet_id', walletId)
      : expensesQuery.is('wallet_id', null)

    const [incomeResult, expensesResult] = await Promise.all([incomeQuery, expensesQuery])

    const firstError = incomeResult.error ?? expensesResult.error
    if (firstError) {
      setError(firstError.message)
      setIncomeRows([])
      setExpenseRows([])
      setLoading(false)
      return
    }

    setIncomeRows((incomeResult.data as Income[]) ?? [])
    setExpenseRows((expensesResult.data as Expense[]) ?? [])
    await refreshTransfers()
    setLoading(false)
  }, [user, walletId, start, end, refreshTransfers])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const data = useMemo<WalletPeriodFinancials>(() => {
    if (!user) return emptyData

    const totalIncome = incomeRows.reduce((sum, r) => sum + Number(r.amount), 0)
    const totalExpenses = expenseRows.reduce((sum, r) => sum + Number(r.amount), 0)
    const transferredOut = sumTransfersOut(transfers, walletId ?? null, start, end, user.id)

    return {
      incomeRows,
      expenseRows,
      totalIncome,
      totalExpenses,
      transferredOut,
      netBalance: totalIncome - totalExpenses - transferredOut,
    }
  }, [user, walletId, start, end, incomeRows, expenseRows, transfers])

  return {
    data,
    /** Full transfer history (not date-filtered) - consumers that need
     * date-scoped transfers should filter this themselves, same as before. */
    transfers,
    loading: loading || transfersLoading,
    error,
    refresh,
  }
}
