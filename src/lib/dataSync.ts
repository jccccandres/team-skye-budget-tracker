// Lightweight cross-hook notification so pages stay in sync with each
// other without a full page remount.
//
// Problem: Dashboard/Transactions/Reports each fetch their own data on
// mount, but nothing tells them to refetch when a mutation happens
// elsewhere while they're already mounted - e.g. adding an expense via the
// Quick Add button while sitting on the Dashboard. Navigating away and
// back "fixes" it only because that remounts the hook and re-triggers its
// initial fetch.
//
// Fix: mutation hooks (useExpenses, useIncome, useTransfers, ...) call
// `notifyDataChanged()` once their change has reached the server; any
// mounted hook that subscribes via `useDataChangeListener` re-runs its own
// refresh in response.
import { useEffect } from 'react'

type Listener = () => void

const listeners = new Set<Listener>()

export function notifyDataChanged(): void {
  for (const listener of listeners) listener()
}

export function useDataChangeListener(callback: () => void): void {
  useEffect(() => {
    listeners.add(callback)
    return () => {
      listeners.delete(callback)
    }
  }, [callback])
}
