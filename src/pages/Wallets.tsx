import { type FormEvent, useState } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { FormField, TextInput } from '../components/ui/FormField'
import { PageHeader, PrimaryButton, SecondaryButton } from '../components/ui/PageHeader'
import { listPanel } from '../lib/classes'
import { useWallets } from '../hooks/useWallets'

export function WalletsPage() {
  const { wallets, loading, error, createWallet, inviteToWallet, leaveWallet } = useWallets()
  const [newWalletName, setNewWalletName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [inviteEmails, setInviteEmails] = useState<Record<string, string>>({})
  const [invitingWalletId, setInvitingWalletId] = useState<string | null>(null)
  const [inviteErrors, setInviteErrors] = useState<Record<string, string | null>>({})
  const [inviteSuccess, setInviteSuccess] = useState<Record<string, boolean>>({})

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setCreateError(null)

    if (!newWalletName.trim()) {
      setCreateError('Enter a wallet name.')
      return
    }

    setCreating(true)
    const result = await createWallet({ name: newWalletName.trim() })
    setCreating(false)

    if (result.error) {
      setCreateError(result.error)
    } else {
      setNewWalletName('')
    }
  }

  async function handleInvite(walletId: string) {
    const email = inviteEmails[walletId]?.trim()
    setInviteErrors((prev) => ({ ...prev, [walletId]: null }))
    setInviteSuccess((prev) => ({ ...prev, [walletId]: false }))

    if (!email) {
      setInviteErrors((prev) => ({ ...prev, [walletId]: 'Enter an email address.' }))
      return
    }

    setInvitingWalletId(walletId)
    const result = await inviteToWallet(walletId, email)
    setInvitingWalletId(null)

    if (result.error) {
      setInviteErrors((prev) => ({ ...prev, [walletId]: result.error }))
    } else {
      setInviteEmails((prev) => ({ ...prev, [walletId]: '' }))
      setInviteSuccess((prev) => ({ ...prev, [walletId]: true }))
    }
  }

  return (
    <div>
      <PageHeader
        title="Shared wallets"
        description="Create a wallet to share expenses and income with someone else, like a partner."
      />

      {error && (
        <div className="mb-4">
          <ErrorAlert message={error} />
        </div>
      )}

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
          Create a wallet
        </h3>
        <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <FormField label="Wallet name" htmlFor="wallet-name">
              <TextInput
                id="wallet-name"
                type="text"
                placeholder="e.g. Household"
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
              />
            </FormField>
          </div>
          <PrimaryButton type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create wallet'}
          </PrimaryButton>
        </form>
        {createError && (
          <div className="mt-3">
            <ErrorAlert message={createError} />
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading wallets…</p>
      ) : wallets.length === 0 ? (
        <EmptyState message="No shared wallets yet. Create one above to start sharing with your partner." />
      ) : (
        <div className="space-y-6">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {wallet.name}
                </h3>
                <SecondaryButton onClick={() => void leaveWallet(wallet.id)}>Leave</SecondaryButton>
              </div>

              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Members
              </p>
              <ul className={`${listPanel} mb-4`}>
                {wallet.members.map((member) => (
                  <li
                    key={member.user_id}
                    className="flex items-center justify-between px-4 py-2 text-sm"
                  >
                    <span className="text-slate-700 dark:text-slate-300">
                      {member.user_id.slice(0, 8)}…
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{member.role}</span>
                  </li>
                ))}
              </ul>

              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Invite by email
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <TextInput
                  id={`invite-${wallet.id}`}
                  type="email"
                  placeholder="partner@email.com"
                  value={inviteEmails[wallet.id] ?? ''}
                  onChange={(e) =>
                    setInviteEmails((prev) => ({ ...prev, [wallet.id]: e.target.value }))
                  }
                  className="sm:flex-1"
                />
                <SecondaryButton
                  disabled={invitingWalletId === wallet.id}
                  onClick={() => void handleInvite(wallet.id)}
                >
                  {invitingWalletId === wallet.id ? 'Sending…' : 'Send invite'}
                </SecondaryButton>
              </div>
              {inviteErrors[wallet.id] && (
                <div className="mt-2">
                  <ErrorAlert message={inviteErrors[wallet.id] as string} />
                </div>
              )}
              {inviteSuccess[wallet.id] && (
                <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
                  Invite sent. They'll see it next time they log in.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
