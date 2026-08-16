import { useState } from 'react'
import { PrimaryButton, SecondaryButton } from '../ui/PageHeader'
import type { GroceryListInvite } from '../../types/database'
import type { GroceryListWithMembers } from '../../hooks/useGroceryLists'

interface GroceryInviteBannerProps {
  pendingInvites: GroceryListInvite[]
  lists: GroceryListWithMembers[]
  respondToInvite: (invite: GroceryListInvite, accept: boolean) => Promise<{ error: string | null }>
}

export function GroceryInviteBanner({ pendingInvites, lists, respondToInvite }: GroceryInviteBannerProps) {
  const [busyId, setBusyId] = useState<string | null>(null)

  if (pendingInvites.length === 0) return null

  return (
    <div className="mb-4 space-y-2">
      {pendingInvites.map((invite) => {
        const listName = lists.find((list) => list.id === invite.list_id)?.name ?? 'a grocery list'

        return (
          <div
            key={invite.id}
            className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-amber-950/40"
          >
            <p className="text-sm text-amber-900 dark:text-amber-200">
              You have been invited to share <span className="font-medium">{listName}</span>.
            </p>
            <div className="flex gap-2">
              <PrimaryButton
                disabled={busyId === invite.id}
                onClick={async () => {
                  setBusyId(invite.id)
                  await respondToInvite(invite, true)
                  setBusyId(null)
                }}
              >
                Accept
              </PrimaryButton>
              <SecondaryButton
                disabled={busyId === invite.id}
                onClick={async () => {
                  setBusyId(invite.id)
                  await respondToInvite(invite, false)
                  setBusyId(null)
                }}
              >
                Decline
              </SecondaryButton>
            </div>
          </div>
        )
      })}
    </div>
  )
}
