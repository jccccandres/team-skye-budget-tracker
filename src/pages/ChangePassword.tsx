import { type FormEvent, useState } from 'react'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { FormField, TextInput } from '../components/ui/FormField'
import { PageHeader, PrimaryButton } from '../components/ui/PageHeader'
import { useAuth } from '../hooks/useAuth'

export function ChangePasswordPage() {
  const { user, changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.')
      return
    }

    setSubmitting(true)
    const result = await changePassword(currentPassword, newPassword)
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSuccess('Password updated successfully.')
  }

  return (
    <div>
      <PageHeader
        title="Change password"
        description={user?.email ? `Signed in as ${user.email}` : undefined}
      />

      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Current password" htmlFor="current-password">
            <TextInput
              id="current-password"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </FormField>

          <FormField label="New password" htmlFor="new-password">
            <TextInput
              id="new-password"
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </FormField>

          <FormField label="Confirm new password" htmlFor="confirm-password">
            <TextInput
              id="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </FormField>

          {error && <ErrorAlert message={error} />}

          {success && (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              {success}
            </p>
          )}

          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? 'Updating…' : 'Update password'}
          </PrimaryButton>
        </form>
      </div>
    </div>
  )
}
