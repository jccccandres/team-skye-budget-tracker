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
import type { GroceryItem, GroceryItemCategory, GroceryItemUpdate } from '../types/database'
import { useAuth } from './useAuth'

function cacheKey(listId: string) {
  return `items:${listId}`
}

export function useGroceryItems(listId: string | null) {
  const { user } = useAuth()
  const online = useOnlineStatus()
  const [items, setItems] = useState<GroceryItem[]>(() =>
    listId ? readCache<GroceryItem[]>(cacheKey(listId), []) : [],
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Set<string>>(() => pendingIds('grocery_items'))
  const itemsRef = useRef(items)
  itemsRef.current = items

  const persist = useCallback(
    (next: GroceryItem[]) => {
      itemsRef.current = next
      setItems(next)
      if (listId) writeCache(cacheKey(listId), next)
    },
    [listId],
  )

  const refresh = useCallback(async () => {
    if (!user || !listId) {
      persist([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    await flushOutbox()
    setPending(pendingIds('grocery_items'))

    if (!supabase || !navigator.onLine) {
      setLoading(false)
      return
    }

    const { data, error: fetchError } = await supabase
      .from('grocery_items')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      const server = (data as GroceryItem[]) ?? []
      const stillPending = pendingIds('grocery_items')
      const unsynced = itemsRef.current.filter(
        (i) => stillPending.has(i.id) && !server.some((s) => s.id === i.id),
      )
      persist([...server, ...unsynced])
      setPending(stillPending)
    }

    setLoading(false)
  }, [user, listId, persist])

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, listId])

  useEffect(() => {
    if (online) void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  const addItem = useCallback(
    async (name: string, category: GroceryItemCategory) => {
      if (!user || !listId) return { error: 'No list selected.' }

      const row: GroceryItem = {
        id: crypto.randomUUID(),
        list_id: listId,
        name,
        category,
        checked: false,
        price: null,
        created_at: new Date().toISOString(),
      }

      persist([...itemsRef.current, row])
      setPending((prev) => new Set(prev).add(row.id))
      enqueueOp({ id: row.id, table: 'grocery_items', action: 'upsert', payload: row })
      void flushOutbox().then(() => setPending(pendingIds('grocery_items')))

      return { error: null }
    },
    [user, listId, persist],
  )

  const updateItem = useCallback(
    async (id: string, input: GroceryItemUpdate) => {
      if (!user) return { error: 'Not authenticated.' }

      const existing = itemsRef.current.find((i) => i.id === id)
      if (!existing) return { error: 'Item not found.' }

      const row: GroceryItem = { ...existing, ...input }
      persist(itemsRef.current.map((i) => (i.id === id ? row : i)))
      setPending((prev) => new Set(prev).add(id))
      enqueueOp({ id, table: 'grocery_items', action: 'upsert', payload: row })
      void flushOutbox().then(() => setPending(pendingIds('grocery_items')))

      return { error: null }
    },
    [user, persist],
  )

  // Toggling checked prompts for an optional price via the caller (the
  // page owns the price-prompt modal); this just applies the result.
  const setChecked = useCallback(
    (id: string, checked: boolean, price: number | null) => updateItem(id, { checked, price }),
    [updateItem],
  )

  const removeItem = useCallback(
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
        discardOps('grocery_items', id)
      } else {
        enqueueOp({ id, table: 'grocery_items', action: 'delete', payload: { id } })
        void flushOutbox()
      }

      return { error: null }
    },
    [user, pending, persist],
  )

  const total = items.filter((i) => i.checked).reduce((sum, i) => sum + (i.price ?? 0), 0)
  const checkedCount = items.filter((i) => i.checked).length

  return {
    items,
    loading,
    error,
    online,
    pendingIds: pending,
    total,
    checkedCount,
    addItem,
    updateItem,
    setChecked,
    removeItem,
    refresh,
  }
}
