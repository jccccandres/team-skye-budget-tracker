import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { CreateTransferInput, Transfer } from '../types/database'
import { useAuth } from './useAuth'

export function useTransfers() {
  const { user } = useAuth()
  const [items, setItems] = useState<Transfer[]>([])
  const [creatorEmails, setCreatorEmails] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase || !user) {
      setItems([])
      setCreatorEmails({})
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
      setCreatorEmails({})
      setLoading(false)
      return
    }

    const transfers = (data as Transfer[]) ?? []
    setItems(transfers)

    const peerIds = [...new Set(transfers.map((t) => t.user_id).filter((id) => id !== user.id))]
    if (peerIds.length === 0) {
      setCreatorEmails({})
    } else {
      const { data: emailRows } = await supabase.rpc('get_wallet_peer_emails', {
        peer_user_ids: peerIds,
      })

      const emails: Record<string, string> = {}
      for (const row of (emailRows as { user_id: string; email: string }[] | null) ?? []) {
        emails[row.user_id] = row.email
      }
      setCreatorEmails(emails)
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
        p_fee: input.fee,
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

  return { items, creatorEmails, loading, error, createTransfer, refresh }
}

function inDateRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

/**
 * Sum of transfers moving money OUT of a given source within a date range
 * (inclusive), for subtracting from that source's net balance.
 * Pass `walletId: null` for Personal. Only counts transfers by `userId`.
 */
export function sumTransfersOut(
  transfers: Transfer[],
  walletId: string | null,
  start: string,
  end: string,
  userId: string,
): number {
  return transfers
    .filter((t) => t.user_id === userId)
    .filter((t) => inDateRange(t.date, start, end))
    .filter((t) =>
      walletId === null ? t.source_type === 'personal' : t.source_wallet_id === walletId,
    )
    .reduce((sum, t) => sum + Number(t.amount), 0)
}

/**
 * Transfers by other users into a shared wallet this month. These appear as
 * wallet income but should not count toward the logged-in user's dashboard.
 */
export function sumTransfersInByOthers(
  transfers: Transfer[],
  walletId: string,
  start: string,
  end: string,
  userId: string,
): number {
  return transfers
    .filter((t) => t.user_id !== userId)
    .filter((t) => inDateRange(t.date, start, end))
    .filter(
      (t) => t.destination_type === 'wallet' && t.destination_wallet_id === walletId,
    )
    .reduce((sum, t) => sum + Number(t.amount), 0)
}
