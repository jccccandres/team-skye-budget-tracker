import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { notifyDataChanged } from '../lib/dataSync'
import {
  discardOps,
  enqueueOp,
  flushOutbox,
  pendingIds,
  readCache,
  useOnlineStatus,
  writeCache,
} from '../lib/offlineStore'
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

function cacheKey(walletId?: string | null) {
  return `expenses:${walletId ?? 'personal'}`
}

/**
 * @param walletId - Pass a wallet id to scope to a shared wallet, or omit/null
 * for the signed-in user's personal (wallet_id IS NULL) expenses.
 *
 * Offline-first: creates/edits/deletes apply immediately to local state and
 * are cached, then queued to sync to Supabase in the background (see
 * ../lib/offlineStore.ts). This mirrors the Grocery List module's approach
 * so expenses can be recorded with no network connection.
 */
export function useExpenses(walletId?: string | null) {
  const { user } = useAuth()
  const online = useOnlineStatus()
  const key = cacheKey(walletId)
  const [items, setItems] = useState<Expense[]>(() => readCache<Expense[]>(key, []))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Set<string>>(() => pendingIds('expenses'))
  const itemsRef = useRef(items)
  itemsRef.current = items

  const persist = useCallback(
    (next: Expense[]) => {
      itemsRef.current = next
      setItems(next)
      writeCache(key, next)
    },
    [key],
  )

  // Loading cached data for a different scope (e.g. switching wallets)
  // shouldn't show last scope's items while the new ones load.
  useEffect(() => {
    persist(readCache<Expense[]>(key, []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const refresh = useCallback(async () => {
    if (!user) {
      persist([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    await flushOutbox()
    setPending(pendingIds('expenses'))

    if (!supabase || !navigator.onLine) {
      setLoading(false)
      return
    }

    let query = supabase.from('expenses').select('*').order('date', { ascending: false })
    query = walletId ? query.eq('wallet_id', walletId) : query.is('wallet_id', null)

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
    } else {
      const server = (data as Expense[]) ?? []
      const stillPending = pendingIds('expenses')
      // Keep any local expense that hasn't synced yet so we don't briefly
      // "lose" something the user just created while offline.
      const unsynced = itemsRef.current.filter(
        (i) => stillPending.has(i.id) && !server.some((s) => s.id === i.id),
      )
      persist([...server, ...unsynced])
      setPending(stillPending)
    }

    setLoading(false)
  }, [user, walletId, persist])

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh])

  useEffect(() => {
    if (online) void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  const create = useCallback(
    async (input: ExpenseInsert) => {
      if (!user) return { error: 'Not authenticated.' }

      const payload = normalizeExpensePayload(input, walletId)
      const row: Expense = {
        id: crypto.randomUUID(),
        user_id: user.id,
        transfer_id: null,
        created_at: new Date().toISOString(),
        ...payload,
      }

      persist([row, ...itemsRef.current])
      setPending((prev) => new Set(prev).add(row.id))
      enqueueOp({ id: row.id, table: 'expenses', action: 'upsert', payload: row })
      void flushOutbox().then(() => {
        setPending(pendingIds('expenses'))
        notifyDataChanged()
      })

      return { error: null }
    },
    [user, walletId, persist],
  )

  const update = useCallback(
    async (id: string, input: ExpenseUpdate) => {
      if (!user) return { error: 'Not authenticated.' }

      const existing = itemsRef.current.find((i) => i.id === id)
      if (!existing) return { error: 'Expense not found.' }

      const payload = normalizeExpensePayload(input, walletId)
      const row: Expense = { ...existing, ...payload }
      persist(itemsRef.current.map((i) => (i.id === id ? row : i)))
      setPending((prev) => new Set(prev).add(id))
      enqueueOp({ id, table: 'expenses', action: 'upsert', payload: row })
      void flushOutbox().then(() => {
        setPending(pendingIds('expenses'))
        notifyDataChanged()
      })

      return { error: null }
    },
    [user, walletId, persist],
  )

  const remove = useCallback(
    async (id: string) => {
      if (!user) return { error: 'Not authenticated.' }

      const wasPending = pending.has(id)
      persist(itemsRef.current.filter((i) => i.id !== id))
      setPending((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })

      if (wasPending) {
        // Never reached the server - just drop the queued create/update.
        discardOps('expenses', id)
      } else {
        enqueueOp({ id, table: 'expenses', action: 'delete', payload: { id } })
        void flushOutbox().then(() => notifyDataChanged())
      }

      return { error: null }
    },
    [user, pending, persist],
  )

  return { items, loading, error, online, pendingIds: pending, create, update, remove, refresh }
}
