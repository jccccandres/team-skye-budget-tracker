import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { CreditCardPayment } from '../types/database'
import { useAuth } from './useAuth'

/**
 * Credit card bill payments are only ever created through the Transfer
 * feature (Personal or a Wallet -> a Credit card), so this hook only lists
 * and removes them - no `create`. Removing a payment also removes its
 * linked transfer (handled server-side by a trigger). Unlike debts, credit
 * cards have no stored balance to restore - "amount owed" is always
 * recomputed from expenses minus payments, so deleting a payment just makes
 * it disappear from that computation.
 */
export function useCreditCardPayments(creditCardId: string | null) {
  const { user } = useAuth()
  const [items, setItems] = useState<CreditCardPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase || !user || !creditCardId) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('credit_card_payments')
      .select('*')
      .eq('credit_card_id', creditCardId)
      .order('date', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setItems([])
    } else {
      setItems((data as CreditCardPayment[]) ?? [])
    }

    setLoading(false)
  }, [user, creditCardId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const remove = useCallback(
    async (id: string) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const { error: deleteError } = await supabase.from('credit_card_payments').delete().eq('id', id)

      if (deleteError) return { error: deleteError.message }

      await refresh()
      return { error: null }
    },
    [user, refresh],
  )

  return { items, loading, error, remove, refresh }
}
