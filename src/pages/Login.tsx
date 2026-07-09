import { type FormEvent, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { FormField, TextInput } from '../components/ui/FormField'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { signIn, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: signInError } = await signIn(email, password)
    if (signInError) {
      setError(signInError)
    }

    setSubmitting(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <div className="absolute right-4 top-4 w-44" style={{ top: 'max(1rem, env(safe-area-inset-top))' }}>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Sign in</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Welcome back. Track your budget in one place.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <FormField label="Email" htmlFor="email">
            <TextInput
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>

          <FormField label="Password" htmlFor="password">
            <TextInput
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>

          {error && <ErrorAlert message={error} />}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          No account?{' '}
          <Link to="/signup" className="font-medium text-slate-900 hover:underline dark:text-slate-100">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
