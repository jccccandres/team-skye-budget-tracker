import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { CreateTransferInput, Transfer } from '../types/database'
import { useAuth } from './useAuth'

export function useTransfers() {
  const { user } = useAuth()
  const [items, setItems] = useState<Transfer[]>([])
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
      .from('transfers')
      .select('*')
      .order('date', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setItems([])
    } else {
      setItems((data as Transfer[]) ?? [])
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createTransfer = useCallback(
    async (input: CreateTransferInput) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const { error: rpcError } = await supabase.rpc('create_transfer', {
        p_amount: input.amount,
        p_date: input.date,
        p_note: input.note,
        p_source_type: input.sourceType,
        p_source_wallet_id: input.sourceWalletId,
        p_destination_type: input.destinationType,
        p_destination_wallet_id: input.destinationWalletId,
        p_destination_savings_goal_id: input.destinationSavingsGoalId,
      })

      if (rpcError) return { error: rpcError.message }

      await refresh()
      return { error: null }
    },
    [user, refresh],
  )

  return { items, loading, error, createTransfer, refresh }
}

/**
 * Sum of transfers moving money OUT of a given source within a date range
 * (inclusive), for subtracting from that source's net balance.
 * Pass `walletId: null` for Personal.
 */
export function sumTransfersOut(
  transfers: Transfer[],
  walletId: string | null,
  start: string,
  end: string,
): number {
  return transfers
    .filter((t) => t.date >= start && t.date <= end)
    .filter((t) =>
      walletId === null ? t.source_type === 'personal' : t.source_wallet_id === walletId,
    )
    .reduce((sum, t) => sum + Number(t.amount), 0)
}
