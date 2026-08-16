import { formatDateTime } from '../../lib/format'

interface VerificationStatusBannerProps {
  latestVerifiedAt: string | null
  label: string
}

export function VerificationStatusBanner({ latestVerifiedAt, label }: VerificationStatusBannerProps) {
  if (latestVerifiedAt) {
    return (
      <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        {label} last verified on {formatDateTime(latestVerifiedAt)}.
      </p>
    )
  }

  return (
    <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
      {label} has not been verified yet.
    </p>
  )
}
