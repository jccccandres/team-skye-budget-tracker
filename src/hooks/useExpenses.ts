import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Expense, ExpenseInsert, ExpenseUpdate } from '../types/database'
import { useAuth } from './useAuth'

function normalizeExpensePayload(input: ExpenseInsert, walletId?: string | null) {
  return {
    ...input,
    wallet_id: walletId ?? null,
    credit_card_id: input.payment_source === 'credit_card' ? input.credit_card_id : null,
    payment_source: input.payment_source,
  }
}

/**
 * @param walletId - Pass a wallet id to scope to a shared wallet, or omit/null
 * for the signed-in user's personal (wallet_id IS NULL) expenses.
 */
export function useExpenses(walletId?: string | null) {
  const { user } = useAuth()
  const [items, setItems] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase || !user) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let query = supabase.from('expenses').select('*').order('date', { ascending: false })
    query = walletId ? query.eq('wallet_id', walletId) : query.is('wallet_id', null)

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
      setItems([])
    } else {
      setItems((data as Expense[]) ?? [])
    }

    setLoading(false)
  }, [user, walletId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const create = useCallback(
    async (input: ExpenseInsert) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const payload = normalizeExpensePayload(input, walletId)

      const { error: insertError } = await supabase
        .from('expenses')
        .insert({
          ...payload,
          user_id: user.id,
        })

      if (insertError) return { error: insertError.message }

      await refresh()
      return { error: null }
    },
    [user, walletId, refresh],
  )

  const update = useCallback(
    async (id: string, input: ExpenseUpdate) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const payload = normalizeExpensePayload(input, walletId)
      const { error: updateError } = await supabase.from('expenses').update(payload).eq('id', id)

      if (updateError) return { error: updateError.message }

      await refresh()
      return { error: null }
    },
    [user, walletId, refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const { error: deleteError } = await supabase.from('expenses').delete().eq('id', id)

      if (deleteError) return { error: deleteError.message }

      await refresh()
      return { error: null }
    },
    [user, refresh],
  )

  return { items, loading, error, create, update, remove, refresh }
}
