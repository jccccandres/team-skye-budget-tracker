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
import type {
  GroceryList,
  GroceryListInsert,
  GroceryListInvite,
  GroceryListMember,
  GroceryListUpdate,
} from '../types/database'
import { useAuth } from './useAuth'

const CACHE_KEY = 'lists'

export interface GroceryListWithMembers extends GroceryList {
  members: GroceryListMember[]
}

export function useGroceryLists() {
  const { user } = useAuth()
  const online = useOnlineStatus()
  const [lists, setLists] = useState<GroceryListWithMembers[]>(() =>
    readCache<GroceryListWithMembers[]>(CACHE_KEY, []),
  )
  const [pendingInvites, setPendingInvites] = useState<GroceryListInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Set<string>>(() => pendingIds('grocery_lists'))
  const listsRef = useRef(lists)
  listsRef.current = lists

  const persist = useCallback((next: GroceryListWithMembers[]) => {
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

    if (!supabase) {
      // Not configured at all: keep showing whatever is cached locally.
      setLoading(false)
      return
    }

    const [listsResult, membersResult, invitesResult] = await Promise.all([
      supabase.from('grocery_lists').select('*').order('created_at', { ascending: false }),
      supabase.from('grocery_list_members').select('*'),
      supabase.from('grocery_list_invites').select('*').eq('status', 'pending'),
    ])

    const fetchError = listsResult.error ?? membersResult.error
    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const serverLists = (listsResult.data as GroceryList[]) ?? []
    const members = (membersResult.data as GroceryListMember[]) ?? []
    const server = serverLists.map((list) => ({
      ...list,
      members: members.filter((member) => member.list_id === list.id),
    }))

    const stillPending = pendingIds('grocery_lists')
    // Keep any local list that hasn't synced yet so we don't briefly
    // "lose" something the user just created while offline.
    const unsynced = listsRef.current.filter(
      (l) => stillPending.has(l.id) && !server.some((s) => s.id === l.id),
    )
    persist([...unsynced, ...server])
    setPending(stillPending)

    if (invitesResult.error) {
      setError((prev) => prev ?? invitesResult.error!.message)
      setPendingInvites([])
    } else {
      const pendingRows = (invitesResult.data as GroceryListInvite[]) ?? []
      const myEmail = user.email?.toLowerCase()
      setPendingInvites(
        pendingRows.filter((invite) => myEmail && invite.invited_email.toLowerCase() === myEmail),
      )
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

      const row: GroceryListWithMembers = {
        id: crypto.randomUUID(),
        user_id: user.id,
        name: input.name,
        created_at: new Date().toISOString(),
        members: [],
      }

      persist([row, ...listsRef.current])
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

      const row: GroceryListWithMembers = { ...existing, ...input }
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

  const inviteToList = useCallback(
    async (listId: string, email: string) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      if (pending.has(listId)) {
        return { error: 'This list is not synced yet. Wait for sync before sharing.' }
      }

      const normalizedEmail = email.trim().toLowerCase()
      if (!normalizedEmail) return { error: 'Enter an email address.' }
      if (normalizedEmail === user.email?.toLowerCase()) {
        return { error: "You can't invite yourself." }
      }

      const { error: insertError } = await supabase.from('grocery_list_invites').insert({
        list_id: listId,
        invited_email: normalizedEmail,
        invited_by: user.id,
      })

      if (insertError) return { error: insertError.message }

      await refresh()
      return { error: null }
    },
    [user, pending, refresh],
  )

  const respondToInvite = useCallback(
    async (invite: GroceryListInvite, accept: boolean) => {
      if (!supabase || !user) return { error: 'Not authenticated.' }

      const { error: updateError } = await supabase
        .from('grocery_list_invites')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', invite.id)

      if (updateError) return { error: updateError.message }

      if (accept) {
        const { error: memberError } = await supabase
          .from('grocery_list_members')
          .insert({ list_id: invite.list_id, user_id: user.id, role: 'member' })

        if (memberError) return { error: memberError.message }
      }

      await refresh()
      return { error: null }
    },
    [user, refresh],
  )

  return {
    lists,
    pendingInvites,
    loading,
    error,
    online,
    pendingIds: pending,
    create,
    update,
    remove,
    inviteToList,
    respondToInvite,
    refresh,
  }
}
