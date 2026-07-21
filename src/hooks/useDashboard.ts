import { useCallback, useEffect, useMemo, useState } from 'react'
import { monthRange } from '../lib/format'
import { supabase } from '../lib/supabaseClient'
import type { CreditCard, Debt, DebtCategory, Expense } from '../types/database'
import { useAuth } from './useAuth'
import { sumTransfersOut, useTransfers } from './useTransfers'

export interface DebtBreakdown {
  remaining: number
  monthly: number
}

export interface CreditCardSummary {
  id: string
  name: string
  billableThisMonth: number,
  billableNextMonth: number,
  limit: number
  available: number
  cutoffDay: number
  dueDay: number
}

export interface DashboardData {
  monthIncome: number
  monthExpenses: number
  transferredOut: number
  netBalance: number
  hasDebts: boolean
  totalDebtRemaining: number
  totalMonthlyPayments: number
  debtByCategory: Record<DebtCategory, DebtBreakdown>
  recentExpenses: Expense[]
  upcomingDebts: Debt[]
  creditCards: CreditCardSummary[]
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
  hasDebts: false,
  totalDebtRemaining: 0,
  totalMonthlyPayments: 0,
  debtByCategory: emptyBreakdown,
  recentExpenses: [],
  upcomingDebts: [],
  creditCards: [],
}

function breakdownForCategory(debts: Debt[], category: DebtCategory): DebtBreakdown {
  const filtered = debts.filter((debt) => debt.category === category)
  return {
    remaining: filtered.reduce((sum, debt) => sum + Number(debt.remaining_balance), 0),
    monthly: filtered.reduce((sum, debt) => sum + Number(debt.monthly_payment ?? 0), 0),
  }
}

function cycleRangeForCard(now: Date, cutoffDay: number): { start: string; end: string } {
  const start = new Date(now.getFullYear(), now.getMonth() - 1, cutoffDay + 1)
  const end = new Date(now.getFullYear(), now.getMonth(), cutoffDay)

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

/**
 * @param walletId - Pass a wallet id to get a shared wallet's income/expense
 * summary (no debts - debts remain personal-only). Omit/null for the
 * signed-in user's personal dashboard, which includes debts.
 * @param referenceDate - Any date within the month to show. Defaults to
 * today, so the dashboard shows the current month unless a specific month
 * is being browsed. Debts, credit card cycles, and savings always reflect
 * their actual current state regardless of this - only the income/expense/
 * transfer flow and the recent expenses list are month-scoped.
 */
export function useDashboard(walletId?: string | null, referenceDate: Date = new Date()) {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { items: transfers, loading: transfersLoading, refresh: refreshTransfers } = useTransfers()
  const { start: rangeStart, end: rangeEnd } = monthRange(referenceDate)

  const refresh = useCallback(async () => {
    if (!supabase || !user) {
      setData(emptyData)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { start, end } = monthRange(referenceDate)
    const isWallet = Boolean(walletId)

    let incomeQuery = supabase.from('income').select('amount').gte('date', start).lte('date', end)
    let expensesQuery = supabase.from('expenses').select('*').gte('date', start).lte('date', end)
    let creditCardExpensesQuery = supabase.from('expenses').select('*').eq('payment_source', 'credit_card')
    let recentQuery = supabase
      .from('expenses')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10)

    incomeQuery = isWallet ? incomeQuery.eq('wallet_id', walletId) : incomeQuery.is('wallet_id', null)
    expensesQuery = isWallet
      ? expensesQuery.eq('wallet_id', walletId)
      : expensesQuery.is('wallet_id', null)
    // Personal dashboard: show this month's expenses from personal + shared wallets (RLS filters access).
    if (isWallet) {
      recentQuery = recentQuery.eq('wallet_id', walletId)
    }

    const [incomeResult, expensesResult, creditCardExpensesResult, debtsResult, recentResult, creditCardsResult] = await Promise.all([
      incomeQuery,
      expensesQuery,
      creditCardExpensesQuery,
      // Debts are personal-only, so only fetch them for the personal dashboard.
      isWallet
        ? Promise.resolve({ data: [] as Debt[], error: null })
        : supabase.from('debts').select('*'),
      recentQuery,
      isWallet
        ? Promise.resolve({ data: [] as CreditCard[], error: null })
        : supabase.from('credit_cards').select('*'),
    ])

    const firstError =
      incomeResult.error ??
      expensesResult.error ??
      creditCardExpensesResult.error ??
      debtsResult.error ??
      recentResult.error ??
      creditCardsResult.error

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
    const creditCards = (creditCardsResult.data as CreditCard[]) ?? []
    const now = new Date()
    const monthCardExpenses = (creditCardExpensesResult.data as Expense[]) ?? []

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

    const groupedBillableByCard = creditCards.reduce<Record<string, { current: number; next: number }>>((acc, card) => {
      const { start, end } = cycleRangeForCard(now, Number(card.cutoff_day))

      // Next billing cycle
      const nextStartDate = new Date(start)
      nextStartDate.setMonth(nextStartDate.getMonth() + 1)
      const nextEndDate = new Date(end)
      nextEndDate.setMonth(nextEndDate.getMonth() + 1)
      const nextStart = nextStartDate.toISOString().slice(0, 10)
      const nextEnd = nextEndDate.toISOString().slice(0, 10)

      const current = monthCardExpenses
        .filter(
          (expense) =>
            expense.credit_card_id === card.id &&
            expense.date >= start &&
            expense.date <= end,
        )
        .reduce((sum, expense) => sum + Number(expense.amount), 0)

      const next = monthCardExpenses
        .filter(
          (expense) =>
            expense.credit_card_id === card.id &&
            expense.date >= nextStart &&
            expense.date <= nextEnd,
        )
        .reduce((sum, expense) => sum + Number(expense.amount), 0)

      acc[card.id] = {
        current,
        next,
      }

      return acc
    }, {})

    const creditCardsSummary = creditCards.map((card) => ({
      id: card.id,
      name: card.name,
      billableThisMonth: groupedBillableByCard[card.id]?.current ?? 0,
      billableNextMonth: groupedBillableByCard[card.id]?.next ?? 0, // TODO: calculate next month billable
      limit: Number(card.limit_amount),
      available: Number(card.limit_amount) - (groupedBillableByCard[card.id]?.current ?? 0),
      cutoffDay: Number(card.cutoff_day),
      dueDay: Number(card.due_day),
    }))

    setData({
      monthIncome,
      monthExpenses,
      transferredOut: 0,
      netBalance: monthIncome - monthExpenses,
      hasDebts: debts.length > 0,
      totalDebtRemaining,
      totalMonthlyPayments,
      debtByCategory: {
        other: breakdownForCategory(debts, 'other'),
        car_loan: breakdownForCategory(debts, 'car_loan'),
        house_loan: breakdownForCategory(debts, 'house_loan'),
      },
      recentExpenses: (recentResult.data as Expense[]) ?? [],
      upcomingDebts,
      creditCards: creditCardsSummary,
    })
    await refreshTransfers()
    setLoading(false)
  }, [user, walletId, refreshTransfers, rangeStart, rangeEnd])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const finalData = useMemo<DashboardData>(() => {
    if (!user) return data

    const transferredOut = sumTransfersOut(transfers, walletId ?? null, rangeStart, rangeEnd, user.id)

    return {
      ...data,
      transferredOut,
      netBalance: data.monthIncome - data.monthExpenses - transferredOut,
    }
  }, [data, transfers, walletId, user, rangeStart, rangeEnd])

  return { data: finalData, loading: loading || transfersLoading, error, refresh }
}
