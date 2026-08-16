import { useState } from 'react'
import { CategoryBarChart } from '../components/reports/CategoryBarChart'
import { DateRangePicker } from '../components/reports/DateRangePicker'
import { SourceIncomeList } from '../components/reports/SourceIncomeList'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { WalletSwitcher } from '../components/wallets/WalletSwitcher'
import { useIncomeReportsData } from '../hooks/useIncomeReportsData'
import { useWallets } from '../hooks/useWallets'
import { formatCurrency, formatDate, reportPresetRange, type ReportPreset } from '../lib/format'

export function IncomeReportsPage() {
  const { wallets } = useWallets()
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null)

  const [preset, setPreset] = useState<ReportPreset | 'custom'>('thisMonth')
  const [range, setRange] = useState(() => reportPresetRange('thisMonth'))
  const [selectedSource, setSelectedSource] = useState<string | null>(null)

  function handlePresetChange(nextPreset: ReportPreset) {
    setPreset(nextPreset)
    setRange(reportPresetRange(nextPreset))
  }

  function handleCustomChange(start: string, end: string) {
    setPreset('custom')
    setRange({ start, end })
  }

  const { data, loading, error } = useIncomeReportsData(activeWalletId, range.start, range.end)

  return (
    <div>
      <PageHeader
        title="Income reports"
        description={`${formatDate(range.start)} - ${formatDate(range.end)}`}
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
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading income reports...</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total income" value={formatCurrency(data.totalIncome)} variant="positive" />
            <StatCard
              label="Transferred"
              value={formatCurrency(data.transferredOut)}
              hint="Sent out this period"
              variant={data.transferredOut > 0 ? 'negative' : 'default'}
            />
            <StatCard
              label="Net"
              value={formatCurrency(data.netBalance)}
              hint="Income minus wallet-paid expenses minus transferred"
              variant={data.netBalance >= 0 ? 'positive' : 'negative'}
            />
            <StatCard
              label="Sources"
              value={String(data.sourceTotals.length)}
              hint="Income sources in this range"
            />
          </div>

          <section className="mt-8">
            <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Income by source
            </h3>
            <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
              Tap a source to see its income entries.
            </p>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <CategoryBarChart categories={data.sourceTotals} onSelectCategory={setSelectedSource} />
            </div>
          </section>
        </>
      )}

      {selectedSource && (
        <Modal title={selectedSource} onClose={() => setSelectedSource(null)}>
          <SourceIncomeList entries={data.incomeBySource.get(selectedSource) ?? []} />
        </Modal>
      )}
    </div>
  )
}
