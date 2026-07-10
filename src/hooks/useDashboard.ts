import { useCallback, useEffect, useMemo, useState } from 'react'
import { monthRange } from '../lib/format'
import { supabase } from '../lib/supabaseClient'
import type { Debt, DebtCategory, Expense } from '../types/database'
import { useAuth } from './useAuth'
import { sumTransfersOut, useTransfers } from './useTransfers'

export interface DebtBreakdown {
  remaining: number
  monthly: number
}

export interface DashboardData {
  monthIncome: number
  monthExpenses: number
  transferredOut: number
  netBalance: number
  totalDebtRemaining: number
  totalMonthlyPayments: number
  debtByCategory: Record<DebtCategory, DebtBreakdown>
  recentExpenses: Expense[]
  upcomingDebts: Debt[]
}

const emptyBreakdown: Record<DebtCategory, DebtBreakdown> = {
  other: { remaining: 0, monthly: 0 },
  car_loan: { remaining: 0, monthly: 0 },
  house_loan: { remaining: 0, monthly: 0 },
}

const emptyData: DashboardData = {
  monthIncome: 0,
  monthExpenses: 0,
  transferredOut: 0,
  netBalance: 0,
  totalDebtRemaining: 0,
  totalMonthlyPayments: 0,
  debtByCategory: emptyBreakdown,
  recentExpenses: [],
  upcomingDebts: [],
}

function breakdownForCategory(debts: Debt[], category: DebtCategory): DebtBreakdown {
  const filtered = debts.filter((debt) => debt.category === category)
  return {
    remaining: filtered.reduce((sum, debt) => sum + Number(debt.remaining_balance), 0),
    monthly: filtered.reduce((sum, debt) => sum + Number(debt.monthly_payment ?? 0), 0),
  }
}

/**
 * @param walletId - Pass a wallet id to get a shared wallet's income/expense
 * summary (no debts - debts remain personal-only). Omit/null for the
 * signed-in user's personal dashboard, which includes debts.
 */
export function useDashboard(walletId?: string | null) {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { items: transfers, loading: transfersLoading } = useTransfers()

  const refresh = useCallback(async () => {
    if (!supabase || !user) {
      setData(emptyData)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { start, end } = monthRange()
    const isWallet = Boolean(walletId)

    let incomeQuery = supabase.from('income').select('amount').gte('date', start).lte('date', end)
    let expensesQuery = supabase.from('expenses').select('*').gte('date', start).lte('date', end)
    let recentQuery = supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
      .limit(5)

    incomeQuery = isWallet ? incomeQuery.eq('wallet_id', walletId) : incomeQuery.is('wallet_id', null)
    expensesQuery = isWallet
      ? expensesQuery.eq('wallet_id', walletId)
      : expensesQuery.is('wallet_id', null)
    recentQuery = isWallet ? recentQuery.eq('wallet_id', walletId) : recentQuery.is('wallet_id', null)

    const [incomeResult, expensesResult, debtsResult, recentResult] = await Promise.all([
      incomeQuery,
      expensesQuery,
      // Debts are personal-only, so only fetch them for the personal dashboard.
      isWallet
        ? Promise.resolve({ data: [] as Debt[], error: null })
        : supabase.from('debts').select('*'),
      recentQuery,
    ])

    const firstError =
      incomeResult.error ?? expensesResult.error ?? debtsResult.error ?? recentResult.error

    if (firstError) {
      setError(firstError.message)
      setData(emptyData)
      setLoading(false)
      return
    }

    const monthIncome = (incomeResult.data ?? []).reduce(
      (sum, row) => sum + Number(row.amount),
      0,
    )
    const monthExpenses = (expensesResult.data ?? []).reduce(
      (sum, row) => sum + Number(row.amount),
      0,
    )
    const debts = (debtsResult.data as Debt[]) ?? []

    const totalDebtRemaining = debts.reduce(
      (sum, debt) => sum + Number(debt.remaining_balance),
      0,
    )
    const totalMonthlyPayments = debts.reduce(
      (sum, debt) => sum + Number(debt.monthly_payment ?? 0),
      0,
    )

    const upcomingDebts = [...debts]
      .filter((debt) => debt.due_date)
      .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
      .slice(0, 5)

    setData({
      monthIncome,
      monthExpenses,
      transferredOut: 0,
      netBalance: monthIncome - monthExpenses,
      totalDebtRemaining,
      totalMonthlyPayments,
      debtByCategory: {
        other: breakdownForCategory(debts, 'other'),
        car_loan: breakdownForCategory(debts, 'car_loan'),
        house_loan: breakdownForCategory(debts, 'house_loan'),
      },
      recentExpenses: (recentResult.data as Expense[]) ?? [],
      upcomingDebts,
    })
    setLoading(false)
  }, [user, walletId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const finalData = useMemo<DashboardData>(() => {
    const { start, end } = monthRange()
    const transferredOut = sumTransfersOut(transfers, walletId ?? null, start, end)

    return {
      ...data,
      transferredOut,
      netBalance: data.monthIncome - data.monthExpenses - transferredOut,
    }
  }, [data, transfers, walletId])

  return { data: finalData, loading: loading || transfersLoading, error, refresh }
}
