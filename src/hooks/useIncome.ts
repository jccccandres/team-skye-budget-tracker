import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Income, IncomeInsert, IncomeUpdate } from '../types/database'
import { useAuth } from './useAuth'

export function useIncome() {
  const { user } = useAuth()
  const [items, setItems] = useState<Income[]>([])
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

    const { data, error: fetchError } = await supabase
      .from('income')
      .select('*')
      .order('date', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setItems([])
    } else {
      setItems((data as Income[]) ?? [])
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const create = useCallback(
    async (input: IncomeInsert) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const { error: insertError } = await supabase.from('income').insert({
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
    async (id: string, input: IncomeUpdate) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const { error: updateError } = await supabase
        .from('income')
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
        .from('income')
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
