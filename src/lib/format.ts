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

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export type ReportPreset = 'last3' | 'last6' | 'last12' | 'thisYear' | 'allTime'

export const REPORT_PRESET_LABELS: Record<ReportPreset, string> = {
  last3: 'Last 3 months',
  last6: 'Last 6 months',
  last12: 'Last 12 months',
  thisYear: 'This year',
  allTime: 'All time',
}

/** "All time" is capped at 24 months back rather than truly unbounded, so
 * the trend chart doesn't end up with hundreds of empty month buckets. */
export function reportPresetRange(preset: ReportPreset): { start: string; end: string } {
  const now = new Date()
  const end = now.toISOString().slice(0, 10)

  if (preset === 'thisYear') {
    return { start: new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10), end }
  }

  const monthsBack = { last3: 2, last6: 5, last12: 11, allTime: 23 }[preset]
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)
  return { start: start.toISOString().slice(0, 10), end }
}

export function monthRange(referenceDate: Date = new Date()): { start: string; end: string } {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}
