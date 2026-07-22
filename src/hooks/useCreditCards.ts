import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { readCache, writeCache } from '../lib/offlineStore'
import type { CreditCard, CreditCardInsert, CreditCardUpdate } from '../types/database'
import { useAuth } from './useAuth'

const CACHE_KEY = 'credit_cards'

export function useCreditCards() {
  const { user } = useAuth()
  const [items, setItems] = useState<CreditCard[]>(() => readCache<CreditCard[]>(CACHE_KEY, []))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Read-only cache so the credit card list (e.g. for the Expense form's
  // "pay with card" dropdown) still has options while offline. Credit card
  // management itself (create/update/delete) requires a connection.
  const refresh = useCallback(async () => {
    if (!user) {
      setItems([])
      writeCache(CACHE_KEY, [])
      setLoading(false)
      return
    }

    if (!supabase || !navigator.onLine) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      const next = (data as CreditCard[]) ?? []
      setItems(next)
      writeCache(CACHE_KEY, next)
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const create = useCallback(
    async (input: CreditCardInsert) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const { error: insertError } = await supabase.from('credit_cards').insert({
        ...input,
        user_id: user.id,
      })

      if (insertError) return { error: insertError.message }

      await refresh()
      return { error: null }
    },
    [user, refresh],
  )

  const update = useCallback(
    async (id: string, input: CreditCardUpdate) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const { error: updateError } = await supabase
        .from('credit_cards')
        .update(input)
        .eq('id', id)
        .eq('user_id', user.id)

      if (updateError) return { error: updateError.message }

      await refresh()
      return { error: null }
    },
    [user, refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const { error: deleteError } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (deleteError) return { error: deleteError.message }

      await refresh()
      return { error: null }
    },
    [user, refresh],
  )

  return { items, loading, error, create, update, remove, refresh }
}
