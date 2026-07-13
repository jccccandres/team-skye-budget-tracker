import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type {
  SavingsGoal,
  SavingsGoalInsert,
  SavingsGoalUpdate,
  SavingsTransaction,
  SavingsTransactionInsert,
} from '../types/database'
import { useAuth } from './useAuth'

export function useSavingsGoals() {
  const { user } = useAuth()
  const [items, setItems] = useState<SavingsGoal[]>([])
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
      .from('savings_goals')
      .select('*')
      .order('created_at', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setItems([])
    } else {
      setItems((data as SavingsGoal[]) ?? [])
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const create = useCallback(
    async (input: SavingsGoalInsert) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const { error: insertError } = await supabase.from('savings_goals').insert({
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
    async (id: string, input: SavingsGoalUpdate) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const { error: updateError } = await supabase
        .from('savings_goals')
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
        .from('savings_goals')
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

export function useSavingsTransactions(goalId: string | null) {
  const { user } = useAuth()
  const [items, setItems] = useState<SavingsTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase || !user || !goalId) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('savings_transactions')
      .select('*')
      .eq('goal_id', goalId)
      .order('date', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setItems([])
    } else {
      setItems((data as SavingsTransaction[]) ?? [])
    }

    setLoading(false)
  }, [user, goalId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // The goal's current_amount is recalculated server-side by a trigger, so
  // after any change here the caller should also refresh the goals list.
  const create = useCallback(
    async (input: SavingsTransactionInsert) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }
      if (!goalId) return { error: 'No savings goal selected.' }

      const { error: insertError } = await supabase.from('savings_transactions').insert({
        ...input,
        goal_id: goalId,
      })

      if (insertError) return { error: insertError.message }

      await refresh()
      return { error: null }
    },
    [user, goalId, refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const { error: deleteError } = await supabase
        .from('savings_transactions')
        .delete()
        .eq('id', id)

      if (deleteError) return { error: deleteError.message }

      await refresh()
      return { error: null }
    },
    [user, refresh],
  )

  return { items, loading, error, create, remove, refresh }
}
