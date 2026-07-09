import { useCallback, useEffect, useState } from 'react'
import { monthRange } from '../lib/format'
import { supabase } from '../lib/supabaseClient'
import type { Debt, DebtCategory, Expense } from '../types/database'
import { useAuth } from './useAuth'

export interface DebtBreakdown {
  remaining: number
  monthly: number
}

export interface DashboardData {
  monthIncome: number
  monthExpenses: number
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

export function useDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase || !user) {
      setData(emptyData)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { start, end } = monthRange()

    const [incomeResult, expensesResult, debtsResult, recentResult] = await Promise.all([
      supabase.from('income').select('amount').gte('date', start).lte('date', end),
      supabase.from('expenses').select('amount').gte('date', start).lte('date', end),
      supabase.from('debts').select('*'),
      supabase.from('expenses').select('*').order('date', { ascending: false }).limit(5),
    ])

    const firstError =
      incomeResult.error ??
      expensesResult.error ??
      debtsResult.error ??
      recentResult.error

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
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
