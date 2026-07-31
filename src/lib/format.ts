export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount)
}

export function formatDate(date: string): string {
  const [year, month, day] = date.split('-')
  if (!year || !month || !day) return date
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
    'en-US',
    { month: 'short', day: 'numeric', year: 'numeric' },
  )
}

export function formatMonthDay(date: string): string {
  const [year, month, day] = date.split('-')
  if (!year || !month || !day) return date
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
    'en-US',
    { month: 'short', day: 'numeric' },
  )
}

/**
 * Formats a full ISO timestamp (e.g. a `created_at` column), unlike
 * `formatDate` which expects a plain `YYYY-MM-DD` date-only string.
 */
export function formatDateTime(timestamp: string): string {
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return timestamp
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function todayISO(): string {
  return dateToLocalISO(new Date())
}

export type ReportPreset = 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'allTime'

export const REPORT_PRESET_LABELS: Record<ReportPreset, string> = {
  thisMonth: 'This month',
  lastMonth: 'Last month',
  thisYear: 'This year',
  lastYear: 'Last year',
  allTime: 'All time',
}

/** "All time" is capped at 24 months back rather than truly unbounded, so
 * the trend chart doesn't end up with hundreds of empty month buckets. */
export function reportPresetRange(preset: ReportPreset): { start: string; end: string } {
  const now = new Date()
  const end = dateToLocalISO(now)

  if (preset === 'thisMonth') {
    return { start: dateToLocalISO(new Date(now.getFullYear(), now.getMonth(), 1)), end }
  }

  if (preset === 'lastMonth') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    return { start: dateToLocalISO(start), end: dateToLocalISO(lastMonthEnd) }
  }

  if (preset === 'thisYear') {
    return { start: dateToLocalISO(new Date(now.getFullYear(), 0, 1)), end }
  }

  if (preset === 'lastYear') {
    const start = new Date(now.getFullYear() - 1, 0, 1)
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31)
    return { start: dateToLocalISO(start), end: dateToLocalISO(lastYearEnd) }
  }

  // allTime
  const start = new Date(now.getFullYear(), now.getMonth() - 23, 1)
  return { start: dateToLocalISO(start), end }
}

function dateToLocalISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export { dateToLocalISO }

export function monthRange(referenceDate: Date = new Date()): { start: string; end: string } {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0)
  return {
    start: dateToLocalISO(start),
    end: dateToLocalISO(end),
  }
}
