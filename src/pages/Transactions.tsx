import { useMemo, useState } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { PageHeader, SecondaryButton } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { WalletSwitcher } from '../components/wallets/WalletSwitcher'
import { useCreditCards } from '../hooks/useCreditCards'
import { useDebts } from '../hooks/useDebts'
import { useSavingsGoals } from '../hooks/useSavings'
import { type CombinedTransaction, useTransactionsData } from '../hooks/useTransactionsData'
import { useWallets } from '../hooks/useWallets'
import { listPanel } from '../lib/classes'
import { formatCurrency, formatDate } from '../lib/format'
import { transferDestinationLabel, transferSourceLabel } from '../lib/transfers'

const typeBadgeClasses: Record<CombinedTransaction['type'], string> = {
  income: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  expense: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  transfer: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400',
}

const creditCardBadgeClasses = 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'

const typeLabels: Record<CombinedTransaction['type'], string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
}

export function TransactionsPage() {
  const { wallets } = useWallets()
  const { items: goals } = useSavingsGoals()
  const { items: debts } = useDebts()
  const { items: creditCards } = useCreditCards()
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null)
  const [monthOffset, setMonthOffset] = useState(0)

  const referenceDate = useMemo(() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() + monthOffset)
    return d
  }, [monthOffset])

  const { data, loading, error } = useTransactionsData(activeWalletId, referenceDate)
  const monthLabel = referenceDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function rowLabel(txn: CombinedTransaction): string {
    if (txn.type !== 'transfer') return txn.label
    const sourceLabel = transferSourceLabel(txn.transfer, wallets)
    const destinationLabel = transferDestinationLabel(txn.transfer, wallets, goals, debts)
    return `${sourceLabel} → ${destinationLabel}`
  }

  function paymentSourceLabel(txn: CombinedTransaction): string | null {
    if (txn.type !== 'expense') return null
    if (txn.paymentSource !== 'credit_card') return 'Wallet'
    const card = creditCards.find((c) => c.id === txn.creditCardId)
    return card ? `Credit card · ${card.name}` : 'Credit card'
  }

  function rowAmountDisplay(txn: CombinedTransaction): { text: string; className: string } {
    if (txn.type === 'income') {
      return { text: `+${formatCurrency(txn.amount)}`, className: 'text-emerald-700 dark:text-emerald-400' }
    }
    if (txn.type === 'expense') {
      const className =
        txn.paymentSource === 'credit_card'
          ? 'text-amber-700 dark:text-amber-400'
          : 'text-red-700 dark:text-red-400'
      return { text: `-${formatCurrency(txn.amount)}`, className }
    }
    const sign = txn.direction === 'in' ? '+' : '-'
    const className =
      txn.direction === 'in' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
    return { text: `${sign}${formatCurrency(txn.amount)}`, className }
  }

  return (
    <div>
      <PageHeader
        title="Transactions"
        description={`Overview for ${monthLabel}`}
        action={
          <div className="flex items-center gap-2">
            <SecondaryButton aria-label="Previous month" onClick={() => setMonthOffset((v) => v - 1)}>
              ← Prev
            </SecondaryButton>
            {monthOffset !== 0 && (
              <SecondaryButton onClick={() => setMonthOffset(0)}>This month</SecondaryButton>
            )}
            <SecondaryButton
              aria-label="Next month"
              disabled={monthOffset >= 0}
              onClick={() => setMonthOffset((v) => v + 1)}
            >
              Next →
            </SecondaryButton>
          </div>
        }
      />

      <WalletSwitcher wallets={wallets} activeWalletId={activeWalletId} onChange={setActiveWalletId} />

      {error && (
        <div className="mb-4">
          <ErrorAlert message={error} />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Income" value={formatCurrency(data.monthIncome)} variant="positive" />
            <StatCard label="Expenses" value={formatCurrency(data.monthExpenses)} variant="negative" />
            {data.creditCardExpenses > 0 && (
              <StatCard
                label="Credit-card expenses"
                value={formatCurrency(data.creditCardExpenses)}
                hint="Included in expenses, excluded from balance"
                variant="warning"
              />
            )}
            <StatCard
              label="Transferred"
              value={formatCurrency(data.transferredOut)}
              hint="Sent out this month"
              variant={data.transferredOut > 0 ? 'negative' : 'default'}
            />
            <StatCard
              label="Balance"
              value={formatCurrency(data.netBalance)}
              hint="Income minus wallet-paid expenses minus transferred"
              variant={data.netBalance >= 0 ? 'positive' : 'negative'}
            />
          </div>

          <section className="mt-8">
            <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
              All transactions
            </h3>
            {data.transactions.length === 0 ? (
              <EmptyState message="No income, expenses, or transfers in this month." />
            ) : (
              <ul className={listPanel}>
                {data.transactions.map((txn) => {
                  const amount = rowAmountDisplay(txn)
                  const paymentSource = paymentSourceLabel(txn)
                  const isCreditCardExpense = txn.type === 'expense' && txn.paymentSource === 'credit_card'
                  return (
                    <li key={`${txn.type}-${txn.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              isCreditCardExpense ? creditCardBadgeClasses : typeBadgeClasses[txn.type]
                            }`}
                          >
                            {typeLabels[txn.type]}
                          </span>
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {rowLabel(txn)}
                          </p>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(txn.date)}
                          {txn.type === 'transfer' && txn.fee ? ` · ${formatCurrency(txn.fee)} fee` : ''}
                          {paymentSource ? ` · ${paymentSource}` : ''}
                        </p>
                      </div>
                      <span className={`shrink-0 text-sm font-medium ${amount.className}`}>{amount.text}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
