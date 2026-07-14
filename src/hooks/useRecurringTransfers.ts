import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { RecurringTransfer, RecurringTransferInsert } from '../types/database'
import { useAuth } from './useAuth'

function currentMonthStart(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

/** Clamp a day-of-month (1-31) to a real date in the current month, e.g.
 * day_of_month=31 in February becomes Feb 28/29. */
export function dateForDayThisMonth(dayOfMonth: number): string {
  const now = new Date()
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const day = Math.min(dayOfMonth, lastDayOfMonth)
  const clamped = new Date(now.getFullYear(), now.getMonth(), day)
  return clamped.toISOString().slice(0, 10)
}

export function useRecurringTransfers() {
  const { user } = useAuth()
  const [items, setItems] = useState<RecurringTransfer[]>([])
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
      .from('recurring_transfers')
      .select('*')
      .order('day_of_month', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setItems([])
    } else {
      setItems((data as RecurringTransfer[]) ?? [])
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const create = useCallback(
    async (input: RecurringTransferInsert) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const { error: insertError } = await supabase
        .from('recurring_transfers')
        .insert({ ...input, user_id: user.id })

      if (insertError) return { error: insertError.message }

      await refresh()
      return { error: null }
    },
    [user, refresh],
  )

  const setActive = useCallback(
    async (id: string, active: boolean) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const { error: updateError } = await supabase
        .from('recurring_transfers')
        .update({ active })
        .eq('id', id)

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
        .from('recurring_transfers')
        .delete()
        .eq('id', id)

      if (deleteError) return { error: deleteError.message }

      await refresh()
      return { error: null }
    },
    [user, refresh],
  )

  const markApplied = useCallback(
    async (id: string) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const { error: updateError } = await supabase
        .from('recurring_transfers')
        .update({ last_applied_month: currentMonthStart() })
        .eq('id', id)

      if (updateError) return { error: updateError.message }

      await refresh()
      return { error: null }
    },
    [user, refresh],
  )

  // Rules that are active, whose day has arrived this month, and that
  // haven't already been applied this month.
  const dueNow = useMemo(() => {
    const monthStart = currentMonthStart()
    const todayDay = new Date().getDate()

    return items.filter(
      (rule) =>
        rule.active &&
        rule.day_of_month <= todayDay &&
        rule.last_applied_month !== monthStart,
    )
  }, [items])

  return { items, loading, error, create, setActive, remove, markApplied, dueNow, refresh }
}
