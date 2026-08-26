import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Expense, Income } from '../types/database'
import { useAuth } from './useAuth'
import { sumTransfersOut, useTransfers } from './useTransfers'

export interface CreditCardExpenseByWalletRow {
  walletId: string | null
  walletName: string
  total: number
  count: number
}

export interface WalletPeriodFinancials {
  incomeRows: Income[]
  expenseRows: Expense[]
  /** All expense rows (including those paid by credit card) */
  totalIncome: number
  totalExpenses: number
  /** Expenses that are paid from a wallet (not credit-card-paid) */
  totalExpensesExcludingCard: number
  /** Total of expenses paid using credit cards */
  totalCreditCardExpenses: number
  /** Expense rows that were paid using a credit card */
  creditCardExpenseRows: Expense[]
  /** Credit-card spending grouped by wallet for the current scope/date range. */
  creditCardExpensesByWallet: CreditCardExpenseByWalletRow[]
  transferredOut: number
  /** Net balance that excludes credit-card-paid expenses */
  netBalance: number
}

const emptyData: WalletPeriodFinancials = {
  incomeRows: [],
  expenseRows: [],
  totalIncome: 0,
  totalExpenses: 0,
  totalExpensesExcludingCard: 0,
  totalCreditCardExpenses: 0,
  creditCardExpenseRows: [],
  creditCardExpensesByWallet: [],
  transferredOut: 0,
  netBalance: 0,
}

/**
 * Single source of truth for income/expense/transfer totals over a date
 * range, for a wallet (or the signed-in user's personal account). Omit
 * `start`/`end` for an all-time total across every transaction.
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
 * @param options.skipRows - Pass `true` when the caller only needs the
 * totals, not the underlying income/expense rows (e.g. Dashboard, which
 * fetches its own "recent expenses" separately). This computes totals via
 * a `SUM()` aggregate on the database (`get_wallet_totals`) instead of
 * fetching every income/expense/transfer row to the browser, which keeps
 * the query fast regardless of how much transaction history exists.
 * Callers that render a transaction list or category breakdown (
 * Transactions, Reports) need the actual rows and should leave this
 * `false` (the default).
 */
export function useWalletPeriodFinancials(
  walletId: string | null | undefined,
  start?: string,
  end?: string,
  options?: { skipRows?: boolean },
) {
  const skipRows = options?.skipRows ?? false
  const { user } = useAuth()
  const [incomeRows, setIncomeRows] = useState<Income[]>([])
  const [expenseRows, setExpenseRows] = useState<Expense[]>([])
  const [aggregateTotals, setAggregateTotals] = useState<{
    totalIncome: number
    totalExpenses: number
    totalCreditCardExpenses: number
    transferredOut: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Skipped entirely (no fetch) when `skipRows` is set - the aggregate RPC
  // already includes `transferredOut`, so the full transfer list isn't
  // needed in that case.
  const { items: transfers, loading: transfersLoading, refresh: refreshTransfers } = useTransfers(!skipRows)

  const refresh = useCallback(async () => {
    if (!supabase || !user) {
      setIncomeRows([])
      setExpenseRows([])
      setAggregateTotals(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    if (skipRows) {
      const { data: totalsRow, error: rpcError } = await supabase
        .rpc('get_wallet_totals', {
          p_wallet_id: walletId ?? null,
          p_start: start ?? null,
          p_end: end ?? null,
        })
        .single()

      if (rpcError) {
        setError(rpcError.message)
        setAggregateTotals(null)
        setLoading(false)
        return
      }

      const row = totalsRow as {
        total_income: number
        total_expenses: number
        total_credit_card_expenses: number
        transferred_out: number
      }
      setAggregateTotals({
        totalIncome: Number(row.total_income),
        totalExpenses: Number(row.total_expenses),
        totalCreditCardExpenses: Number(row.total_credit_card_expenses),
        transferredOut: Number(row.transferred_out),
      })
      setIncomeRows([])
      setExpenseRows([])
      setLoading(false)
      return
    }

    let incomeQuery = supabase.from('income').select('*')
    let expensesQuery = supabase.from('expenses').select('*')

    if (start) incomeQuery = incomeQuery.gte('date', start)
    if (end) incomeQuery = incomeQuery.lte('date', end)
    if (start) expensesQuery = expensesQuery.gte('date', start)
    if (end) expensesQuery = expensesQuery.lte('date', end)

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
  }, [user, walletId, start, end, skipRows, refreshTransfers])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const data = useMemo<WalletPeriodFinancials>(() => {
    if (!user) return emptyData

    if (skipRows) {
      if (!aggregateTotals) return emptyData
      const { totalIncome, totalExpenses, totalCreditCardExpenses, transferredOut } = aggregateTotals
      const totalExpensesExcludingCard = totalExpenses - totalCreditCardExpenses
      return {
        incomeRows: [],
        expenseRows: [],
        totalIncome,
        totalExpenses,
        totalExpensesExcludingCard,
        totalCreditCardExpenses,
        creditCardExpenseRows: [],
        creditCardExpensesByWallet: [],
        transferredOut,
        netBalance: totalIncome - totalExpensesExcludingCard - transferredOut,
      }
    }

      const totalIncome = incomeRows.reduce((sum, r) => sum + Number(r.amount), 0)

      const totalExpenses = expenseRows.reduce((sum, r) => sum + Number(r.amount), 0)
      const creditCardExpenseRows = expenseRows.filter((r) => r.payment_source === 'credit_card')
      const totalCreditCardExpenses = creditCardExpenseRows.reduce((sum, r) => sum + Number(r.amount), 0)
      const totalExpensesExcludingCard = totalExpenses - totalCreditCardExpenses
      const creditCardExpensesByWallet = Array.from(
        creditCardExpenseRows.reduce<Map<string | null, { total: number; count: number }>>((map, row) => {
          const key = row.wallet_id ?? null
          const current = map.get(key) ?? { total: 0, count: 0 }
          current.total += Number(row.amount)
          current.count += 1
          map.set(key, current)
          return map
        }, new Map()),
      )
        .map(([walletIdKey, value]) => ({
          walletId: walletIdKey,
          walletName: walletIdKey ? 'Shared wallet' : 'Personal',
          total: value.total,
          count: value.count,
        }))
        .sort((a, b) => b.total - a.total)

      const transferredOut = sumTransfersOut(transfers, walletId ?? null, start, end, user.id)

      return {
        incomeRows,
        expenseRows,
        totalIncome,
        totalExpenses,
        totalExpensesExcludingCard,
        totalCreditCardExpenses,
        creditCardExpenseRows,
        creditCardExpensesByWallet,
        transferredOut,
        netBalance: totalIncome - totalExpensesExcludingCard - transferredOut,
      }
    }, [user, walletId, start, end, skipRows, aggregateTotals, incomeRows, expenseRows, transfers])

  return {
    data,
    /** Full transfer history (not date-filtered) - consumers that need
     * date-scoped transfers should filter this themselves, same as before.
     * Empty when `skipRows` is set (see `options.skipRows` above). */
    transfers,
    loading: loading || transfersLoading,
    error,
    refresh,
  }
}
