import { useCallback, useEffect, useMemo, useState } from 'react'
import { monthRange } from '../lib/format'
import { supabase } from '../lib/supabaseClient'
import type { Transfer } from '../types/database'
import { useAuth } from './useAuth'
import { sumTransfersOut, useTransfers } from './useTransfers'

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
  const [rawIncome, setRawIncome] = useState<
    { id: string; amount: number; source: string; date: string; created_at: string }[]
  >([])
  const [rawExpenses, setRawExpenses] = useState<
    { id: string; amount: number; category: string; description: string | null; date: string; created_at: string }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { items: transfers, loading: transfersLoading, refresh: refreshTransfers } = useTransfers()
  const { start, end } = monthRange(referenceDate)

  const refresh = useCallback(async () => {
    if (!supabase || !user) {
      setRawIncome([])
      setRawExpenses([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Transfer-linked income/expense rows are excluded here - they're
    // already represented by their originating Transfer row, so showing
    // both would double-list the same money movement.
    let incomeQuery = supabase
      .from('income')
      .select('id, amount, source, date, created_at')
      .gte('date', start)
      .lte('date', end)
      .is('transfer_id', null)
    let expensesQuery = supabase
      .from('expenses')
      .select('id, amount, category, description, date, created_at')
      .gte('date', start)
      .lte('date', end)
      .is('transfer_id', null)

    incomeQuery = walletId ? incomeQuery.eq('wallet_id', walletId) : incomeQuery.is('wallet_id', null)
    expensesQuery = walletId
      ? expensesQuery.eq('wallet_id', walletId)
      : expensesQuery.is('wallet_id', null)

    const [incomeResult, expensesResult] = await Promise.all([incomeQuery, expensesQuery])

    const firstError = incomeResult.error ?? expensesResult.error
    if (firstError) {
      setError(firstError.message)
      setRawIncome([])
      setRawExpenses([])
      setLoading(false)
      return
    }

    setRawIncome(incomeResult.data ?? [])
    setRawExpenses(expensesResult.data ?? [])
    await refreshTransfers()
    setLoading(false)
  }, [user, walletId, start, end, refreshTransfers])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const data = useMemo<TransactionsData>(() => {
    if (!user) return emptyData

    const monthIncome = rawIncome.reduce((sum, r) => sum + Number(r.amount), 0)
    const monthExpenses = rawExpenses.reduce((sum, r) => sum + Number(r.amount), 0)
    const transferredOut = sumTransfersOut(transfers, walletId ?? null, start, end, user.id)

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

    const transactions: CombinedTransaction[] = [
      ...rawIncome.map((r) => ({
        type: 'income' as const,
        id: r.id,
        date: r.date,
        createdAt: r.created_at,
        amount: Number(r.amount),
        label: r.source,
      })),
      ...rawExpenses.map((r) => ({
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
      monthIncome,
      monthExpenses,
      transferredOut,
      netBalance: monthIncome - monthExpenses - transferredOut,
      transactions,
    }
  }, [user, walletId, start, end, rawIncome, rawExpenses, transfers])

  return { data, loading: loading || transfersLoading, error, refresh }
}
