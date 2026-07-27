import { useState } from 'react'
import { CategoryBarChart } from '../components/reports/CategoryBarChart'
import { CategoryExpenseList } from '../components/reports/CategoryExpenseList'
import { DateRangePicker } from '../components/reports/DateRangePicker'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { WalletSwitcher } from '../components/wallets/WalletSwitcher'
import { useReportsData } from '../hooks/useReportsData'
import { useWallets } from '../hooks/useWallets'
import { formatCurrency, formatDate, reportPresetRange, type ReportPreset } from '../lib/format'

export function ReportsPage() {
  const { wallets } = useWallets()
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null)

  const [preset, setPreset] = useState<ReportPreset | 'custom'>('thisMonth')
  const [range, setRange] = useState(() => reportPresetRange('thisMonth'))
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  function handlePresetChange(p: ReportPreset) {
    setPreset(p)
    setRange(reportPresetRange(p))
  }

  function handleCustomChange(start: string, end: string) {
    setPreset('custom')
    setRange({ start, end })
  }

  const { data, loading, error } = useReportsData(activeWalletId, range.start, range.end)

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total income" value={formatCurrency(data.totalIncome)} variant="positive" />
            <StatCard
              label="Total expenses"
              value={formatCurrency(data.totalExpenses)}
              variant="negative"
              breakdown={
                data.creditCardExpenses > 0
                  ? { label: 'Credit card', value: formatCurrency(data.creditCardExpenses), variant: 'warning' }
                  : undefined
              }
            />
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
          </div>

          <section className="mt-8">
            <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Spending by category
            </h3>
            <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
              Tap a category to see its expenses.
            </p>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <CategoryBarChart categories={data.categoryTotals} onSelectCategory={setSelectedCategory} />
            </div>
          </section>

        </>
      )}

      {selectedCategory && (
        <Modal title={selectedCategory} onClose={() => setSelectedCategory(null)}>
          <CategoryExpenseList expenses={data.expensesByCategory.get(selectedCategory) ?? []} />
        </Modal>
      )}
    </div>
  )
}
