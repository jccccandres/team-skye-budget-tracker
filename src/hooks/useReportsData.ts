import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './useAuth'

export interface CategoryTotal {
  category: string
  total: number
}

export interface MonthlyTrendPoint {
  /** YYYY-MM */
  month: string
  income: number
  expenses: number
}

interface ReportsData {
  categoryTotals: CategoryTotal[]
  monthlyTrend: MonthlyTrendPoint[]
  totalIncome: number
  totalExpenses: number
}

const emptyData: ReportsData = {
  categoryTotals: [],
  monthlyTrend: [],
  totalIncome: 0,
  totalExpenses: 0,
}

function monthKey(date: string): string {
  return date.slice(0, 7)
}

/** Every YYYY-MM between start and end (inclusive), so months with zero
 * activity still show up on the trend chart instead of just vanishing. */
function monthKeysInRange(start: string, end: string): string[] {
  const keys: string[] = []
  const cursor = new Date(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1, 1)
  const endDate = new Date(Number(end.slice(0, 4)), Number(end.slice(5, 7)) - 1, 1)

  while (cursor <= endDate) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`)
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return keys
}

/**
 * @param walletId - Pass a wallet id for a shared wallet's report, or
 * omit/null for the signed-in user's personal report.
 */
export function useReportsData(walletId: string | null, start: string, end: string) {
  const { user } = useAuth()
  const [data, setData] = useState<ReportsData>(emptyData)
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

    let expensesQuery = supabase
      .from('expenses')
      .select('amount, category, date')
      .gte('date', start)
      .lte('date', end)
    let incomeQuery = supabase
      .from('income')
      .select('amount, date')
      .gte('date', start)
      .lte('date', end)

    expensesQuery = walletId
      ? expensesQuery.eq('wallet_id', walletId)
      : expensesQuery.is('wallet_id', null)
    incomeQuery = walletId
      ? incomeQuery.eq('wallet_id', walletId)
      : incomeQuery.is('wallet_id', null)

    const [expensesResult, incomeResult] = await Promise.all([expensesQuery, incomeQuery])

    const firstError = expensesResult.error ?? incomeResult.error
    if (firstError) {
      setError(firstError.message)
      setData(emptyData)
      setLoading(false)
      return
    }

    const expenseRows = expensesResult.data ?? []
    const incomeRows = incomeResult.data ?? []

    const categoryMap = new Map<string, number>()
    for (const row of expenseRows) {
      categoryMap.set(row.category, (categoryMap.get(row.category) ?? 0) + Number(row.amount))
    }
    const categoryTotals = [...categoryMap.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)

    const trendMap = new Map<string, { income: number; expenses: number }>()
    for (const key of monthKeysInRange(start, end)) {
      trendMap.set(key, { income: 0, expenses: 0 })
    }
    for (const row of incomeRows) {
      const key = monthKey(row.date)
      const bucket = trendMap.get(key) ?? { income: 0, expenses: 0 }
      bucket.income += Number(row.amount)
      trendMap.set(key, bucket)
    }
    for (const row of expenseRows) {
      const key = monthKey(row.date)
      const bucket = trendMap.get(key) ?? { income: 0, expenses: 0 }
      bucket.expenses += Number(row.amount)
      trendMap.set(key, bucket)
    }
    const monthlyTrend = [...trendMap.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, totals]) => ({ month, ...totals }))

    setData({
      categoryTotals,
      monthlyTrend,
      totalIncome: incomeRows.reduce((sum, r) => sum + Number(r.amount), 0),
      totalExpenses: expenseRows.reduce((sum, r) => sum + Number(r.amount), 0),
    })
    setLoading(false)
  }, [user, walletId, start, end])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
