import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  discardOps,
  enqueueOp,
  flushOutbox,
  pendingIds,
  readCache,
  useOnlineStatus,
  writeCache,
} from '../lib/offlineStore'
import type { GroceryList, GroceryListInsert, GroceryListUpdate } from '../types/database'
import { useAuth } from './useAuth'

const CACHE_KEY = 'lists'

export function useGroceryLists() {
  const { user } = useAuth()
  const online = useOnlineStatus()
  const [lists, setLists] = useState<GroceryList[]>(() => readCache<GroceryList[]>(CACHE_KEY, []))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Set<string>>(() => pendingIds('grocery_lists'))
  const listsRef = useRef(lists)
  listsRef.current = lists

  const persist = useCallback((next: GroceryList[]) => {
    listsRef.current = next
    setLists(next)
    writeCache(CACHE_KEY, next)
  }, [])

  const refresh = useCallback(async () => {
    if (!user) {
      persist([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    await flushOutbox()
    setPending(pendingIds('grocery_lists'))

    if (!supabase || !navigator.onLine) {
      // Offline: keep showing whatever is cached locally.
      setLoading(false)
      return
    }

    const { data, error: fetchError } = await supabase
      .from('grocery_lists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      const server = (data as GroceryList[]) ?? []
      const stillPending = pendingIds('grocery_lists')
      // Keep any local list that hasn't synced yet so we don't briefly
      // "lose" something the user just created while offline.
      const unsynced = listsRef.current.filter(
        (l) => stillPending.has(l.id) && !server.some((s) => s.id === l.id),
      )
      persist([...server, ...unsynced])
      setPending(stillPending)
    }

    setLoading(false)
  }, [user, persist])

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (online) void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  const create = useCallback(
    async (input: Omit<GroceryListInsert, 'id'>) => {
      if (!user) return { error: 'Not authenticated.' }

      const row: GroceryList = {
        id: crypto.randomUUID(),
        user_id: user.id,
        name: input.name,
        created_at: new Date().toISOString(),
      }

      persist([...listsRef.current, row])
      setPending((prev) => new Set(prev).add(row.id))
      enqueueOp({ id: row.id, table: 'grocery_lists', action: 'upsert', payload: row })
      void flushOutbox().then(() => setPending(pendingIds('grocery_lists')))

      return { error: null }
    },
    [user, persist],
  )

  const update = useCallback(
    async (id: string, input: GroceryListUpdate) => {
      if (!user) return { error: 'Not authenticated.' }

      const existing = listsRef.current.find((l) => l.id === id)
      if (!existing) return { error: 'List not found.' }

      const row: GroceryList = { ...existing, ...input }
      persist(listsRef.current.map((l) => (l.id === id ? row : l)))
      setPending((prev) => new Set(prev).add(id))
      enqueueOp({ id, table: 'grocery_lists', action: 'upsert', payload: row })
      void flushOutbox().then(() => setPending(pendingIds('grocery_lists')))

      return { error: null }
    },
    [user, persist],
  )

  const remove = useCallback(
    async (id: string) => {
      if (!user) return { error: 'Not authenticated.' }

      const wasPending = pending.has(id)
      persist(listsRef.current.filter((l) => l.id !== id))
      setPending((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })

      if (wasPending) {
        // Never reached the server - just drop the queued create/update.
        discardOps('grocery_lists', id)
      } else {
        enqueueOp({ id, table: 'grocery_lists', action: 'delete', payload: { id } })
        void flushOutbox()
      }

      return { error: null }
    },
    [user, pending, persist],
  )

  return { lists, loading, error, online, pendingIds: pending, create, update, remove, refresh }
}
