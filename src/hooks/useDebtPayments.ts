import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { DebtPayment } from '../types/database'
import { useAuth } from './useAuth'

/**
 * Debt payments are only ever created through the Transfer feature (Personal
 * or a Wallet -> a Debt), so this hook only lists and removes them - no
 * `create`. Removing a payment also removes its linked transfer and restores
 * the debt's remaining_balance (handled server-side by triggers).
 */
export function useDebtPayments(debtId: string | null) {
  const { user } = useAuth()
  const [items, setItems] = useState<DebtPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase || !user || !debtId) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('debt_payments')
      .select('*')
      .eq('debt_id', debtId)
      .order('date', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setItems([])
    } else {
      setItems((data as DebtPayment[]) ?? [])
    }

    setLoading(false)
  }, [user, debtId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const remove = useCallback(
    async (id: string) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const { error: deleteError } = await supabase.from('debt_payments').delete().eq('id', id)

      if (deleteError) return { error: deleteError.message }

      await refresh()
      return { error: null }
    },
    [user, refresh],
  )

  return { items, loading, error, remove, refresh }
}
