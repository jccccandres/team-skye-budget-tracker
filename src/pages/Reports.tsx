import { useMemo, useState } from 'react'
import { CategoryBarChart } from '../components/reports/CategoryBarChart'
import { DateRangePicker } from '../components/reports/DateRangePicker'
import { TrendChart } from '../components/reports/TrendChart'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { WalletSwitcher } from '../components/wallets/WalletSwitcher'
import { useReportsData } from '../hooks/useReportsData'
import { useWallets } from '../hooks/useWallets'
import { formatCurrency, formatDate, reportPresetRange, type ReportPreset } from '../lib/format'

export function ReportsPage() {
  const { wallets } = useWallets()
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null)

  const [preset, setPreset] = useState<ReportPreset | 'custom'>('last6')
  const [range, setRange] = useState(() => reportPresetRange('last6'))

  function handlePresetChange(p: ReportPreset) {
    setPreset(p)
    setRange(reportPresetRange(p))
  }

  function handleCustomChange(start: string, end: string) {
    setPreset('custom')
    setRange({ start, end })
  }

  const { data, loading, error } = useReportsData(activeWalletId, range.start, range.end)

  const net = useMemo(
    () => data.totalIncome - data.totalExpenses,
    [data.totalIncome, data.totalExpenses],
  )

  return (
    <div>
      <PageHeader
        title="Reports"
        description={`${formatDate(range.start)} – ${formatDate(range.end)}`}
      />

      <WalletSwitcher wallets={wallets} activeWalletId={activeWalletId} onChange={setActiveWalletId} />

      <DateRangePicker
        preset={preset}
        start={range.start}
        end={range.end}
        onPresetChange={handlePresetChange}
        onCustomChange={handleCustomChange}
      />

      {error && (
        <div className="mb-4">
          <ErrorAlert message={error} />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading reports…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total income" value={formatCurrency(data.totalIncome)} variant="positive" />
            <StatCard label="Total expenses" value={formatCurrency(data.totalExpenses)} variant="negative" />
            <StatCard
              label="Net"
              value={formatCurrency(net)}
              variant={net >= 0 ? 'positive' : 'negative'}
            />
          </div>

          <section className="mt-8">
            <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Spending by category
            </h3>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <CategoryBarChart categories={data.categoryTotals} />
            </div>
          </section>

          <section className="mt-8">
            <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Income vs expenses
            </h3>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <TrendChart points={data.monthlyTrend} />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
