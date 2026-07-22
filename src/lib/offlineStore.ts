// Lightweight offline-first persistence, shared across modules that need to
// keep working with no network (Grocery Lists, Expenses, ...).
//
// Design: every row gets a client-generated UUID up front, so creating
// things while offline never needs an id swap once it reaches the server -
// we can just `upsert` the same row later. Local state is mirrored into
// localStorage (instant reads on next load, works with no network at all),
// and any write that couldn't reach Supabase is queued in an "outbox" that
// gets flushed in order whenever the app is online again.
//
// This intentionally avoids IndexedDB/service-worker background sync: the
// data volume here is small and localStorage is synchronous and simple,
// which keeps the sync logic easy to reason about.

import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const PREFIX = 'budget-tracker:offline:'

export type OfflineTable = 'grocery_lists' | 'grocery_items' | 'expenses'

export interface OutboxOp {
  id: string
  table: OfflineTable
  action: 'upsert' | 'delete'
  payload: object
  createdAt: number
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readCache<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback
  try {
    const raw = window.localStorage.getItem(`${PREFIX}${key}`)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeCache<T>(key: string, value: T): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value))
  } catch {
    // Storage full/unavailable - cache is best-effort, safe to ignore.
  }
}

function getOutbox(): OutboxOp[] {
  return readCache<OutboxOp[]>('outbox', [])
}

function setOutbox(ops: OutboxOp[]): void {
  writeCache('outbox', ops)
}

/** Queue a write so it can be retried later if it fails or we're offline. */
export function enqueueOp(op: Omit<OutboxOp, 'createdAt'>): void {
  const ops = getOutbox()
  // Collapse: if there's already a pending op for this exact row, replace it
  // (e.g. editing an item twice while offline shouldn't sync twice).
  const next = ops.filter((existing) => !(existing.table === op.table && existing.id === op.id))
  next.push({ ...op, createdAt: Date.now() })
  setOutbox(next)
}

/** Drop any queued ops for a row (used when a row is deleted before it ever synced). */
export function discardOps(table: OutboxOp['table'], id: string): void {
  setOutbox(getOutbox().filter((op) => !(op.table === table && op.id === id)))
}

/** Ids of rows that have local changes not yet confirmed on the server. */
export function pendingIds(table: OutboxOp['table']): Set<string> {
  return new Set(getOutbox().filter((op) => op.table === table).map((op) => op.id))
}

export function hasPendingOps(): boolean {
  return getOutbox().length > 0
}

/**
 * Attempt to push every queued op to Supabase, in the order they were made.
 * Stops (keeping the remainder queued) at the first failure so ordering is
 * preserved for a retry - e.g. a list must sync before its items.
 */
export async function flushOutbox(): Promise<void> {
  if (!supabase) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return

  const ops = getOutbox()
  if (ops.length === 0) return

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]
    try {
      const { error } =
        op.action === 'delete'
          ? await supabase.from(op.table).delete().eq('id', op.id)
          : await supabase.from(op.table).upsert(op.payload)

      if (error) {
        console.error(`Offline sync failed for ${op.table} (${op.action}):`, error.message)
        setOutbox(ops.slice(i))
        return
      }
    } catch {
      // Network error mid-flush - keep this op and everything after it queued.
      setOutbox(ops.slice(i))
      return
    }
  }

  setOutbox([])
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    function goOnline() {
      setOnline(true)
    }
    function goOffline() {
      setOnline(false)
    }
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}
