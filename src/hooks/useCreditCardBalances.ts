import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useDataChangeListener } from '../lib/dataSync'
import type { Expense, CreditCardPayment } from '../types/database'
import { useAuth } from './useAuth'

export interface CreditCardBalance {
  /** Total ever charged to this card (all-time, not scoped to a billing cycle). */
  totalCharged: number
  /** Total ever paid toward this card's bill via a transfer. */
  totalPaid: number
  /** Amount currently owed = totalCharged - totalPaid (a running statement balance). */
  owed: number
}

/**
 * All-time owed balance per credit card, computed the same way a debt's
 * remaining_balance would be if it weren't a stored column: total expenses
 * ever charged to the card minus total payments ever made toward it. Not
 * scoped to a billing cycle - "Payable" reflects everything outstanding,
 * same as a real card statement + any purchases since.
 */
export function useCreditCardBalances() {
  const { user } = useAuth()
  const [balances, setBalances] = useState<Record<string, CreditCardBalance>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase || !user) {
      setBalances({})
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const [expensesResult, paymentsResult] = await Promise.all([
      supabase.from('expenses').select('*').eq('payment_source', 'credit_card'),
      supabase.from('credit_card_payments').select('*'),
    ])

    const firstError = expensesResult.error ?? paymentsResult.error
    if (firstError) {
      setError(firstError.message)
      setBalances({})
      setLoading(false)
      return
    }

    const expenses = (expensesResult.data as Expense[]) ?? []
    const payments = (paymentsResult.data as CreditCardPayment[]) ?? []

    const next: Record<string, CreditCardBalance> = {}

    for (const expense of expenses) {
      if (!expense.credit_card_id) continue
      const entry = next[expense.credit_card_id] ?? { totalCharged: 0, totalPaid: 0, owed: 0 }
      entry.totalCharged += Number(expense.amount)
      next[expense.credit_card_id] = entry
    }

    for (const payment of payments) {
      const entry = next[payment.credit_card_id] ?? { totalCharged: 0, totalPaid: 0, owed: 0 }
      entry.totalPaid += Number(payment.amount)
      next[payment.credit_card_id] = entry
    }

    for (const entry of Object.values(next)) {
      entry.owed = entry.totalCharged - entry.totalPaid
    }

    setBalances(next)
    setLoading(false)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useDataChangeListener(refresh)

  return { balances, loading, error, refresh }
}
