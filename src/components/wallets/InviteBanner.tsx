import { useState } from 'react'
import { PrimaryButton, SecondaryButton } from '../ui/PageHeader'
import { useWallets } from '../../hooks/useWallets'

export function InviteBanner() {
  const { pendingInvites, wallets, respondToInvite } = useWallets()
  const [busyId, setBusyId] = useState<string | null>(null)

  if (pendingInvites.length === 0) return null

  return (
    <div className="mb-4 space-y-2">
      {pendingInvites.map((invite) => {
        // We may not have the wallet's name yet (it's not "our" wallet until
        // we accept), so fall back to a generic label.
        const walletName = wallets.find((w) => w.id === invite.wallet_id)?.name ?? 'a wallet'

        return (
          <div
            key={invite.id}
            className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-amber-950/40"
          >
            <p className="text-sm text-amber-900 dark:text-amber-200">
              You've been invited to share <span className="font-medium">{walletName}</span>.
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
