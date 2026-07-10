import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TransferForm } from '../components/transfers/TransferForm'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { Modal } from '../components/ui/Modal'
import { PageHeader, PrimaryButton } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { WalletDashboardSection } from '../components/wallets/WalletDashboardSection'
import { useDashboard } from '../hooks/useDashboard'
import { useWallets } from '../hooks/useWallets'
import { listPanel } from '../lib/classes'
import { formatCurrency, formatDate, monthRange } from '../lib/format'
import { debtCategoryLabel } from '../types/database'

export function DashboardPage() {
  const { data, loading, error, refresh } = useDashboard()
  const { wallets } = useWallets()
  const { start, end } = monthRange()
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const [showTransferForm, setShowTransferForm] = useState(false)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Overview for ${monthLabel}`}
        action={<PrimaryButton onClick={() => setShowTransferForm(true)}>Transfer money</PrimaryButton>}
      />

      {error && <div className="mb-4"><ErrorAlert message={error} /></div>}

      <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Personal</h3>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading dashboard…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Income this month"
              value={formatCurrency(data.monthIncome)}
              hint={`${formatDate(start)} – ${formatDate(end)}`}
              variant="positive"
            />
            <StatCard
              label="Expenses this month"
              value={formatCurrency(data.monthExpenses)}
              hint={`${formatDate(start)} – ${formatDate(end)}`}
              variant="negative"
            />
            <StatCard
              label="Transferred out"
              value={formatCurrency(data.transferredOut)}
              hint="Sent to wallets/savings this month"
              variant={data.transferredOut > 0 ? 'negative' : 'default'}
            />
            <StatCard
              label="Net balance"
              value={formatCurrency(data.netBalance)}
              hint="Income minus expenses minus transfers out"
              variant={data.netBalance >= 0 ? 'positive' : 'negative'}
            />
            <StatCard
              label="Car loans remaining"
              value={formatCurrency(data.debtByCategory.car_loan.remaining)}
              hint={`${formatCurrency(data.debtByCategory.car_loan.monthly)}/mo payments`}
            />
            <StatCard
              label="House loans remaining"
              value={formatCurrency(data.debtByCategory.house_loan.remaining)}
              hint={`${formatCurrency(data.debtByCategory.house_loan.monthly)}/mo payments`}
            />
            <StatCard
              label="Other debt remaining"
              value={formatCurrency(data.debtByCategory.other.remaining)}
              hint={`${formatCurrency(data.debtByCategory.other.monthly)}/mo payments`}
            />
            <StatCard
              label="Total debt remaining"
              value={formatCurrency(data.totalDebtRemaining)}
              hint="Across all categories"
            />
            <StatCard
              label="Monthly debt payments"
              value={formatCurrency(data.totalMonthlyPayments)}
              hint="Sum of installment payments"
            />
            <StatCard
              label="Available after debts"
              value={formatCurrency(data.netBalance - data.totalMonthlyPayments)}
              hint="Net balance minus monthly debt payments"
              variant={
                data.netBalance - data.totalMonthlyPayments >= 0 ? 'positive' : 'negative'
              }
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent expenses</h3>
                <Link to="/expenses" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                  View all
                </Link>
              </div>
              {data.recentExpenses.length === 0 ? (
                <EmptyState message="No expenses recorded yet." />
              ) : (
                <ul className={listPanel}>
                  {data.recentExpenses.map((expense) => (
                    <li
                      key={expense.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{expense.category}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(expense.date)}
                          {expense.description ? ` · ${expense.description}` : ''}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-red-700 dark:text-red-400">
                        {formatCurrency(Number(expense.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Upcoming due dates</h3>
                <Link to="/debts" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                  View all
                </Link>
              </div>
              {data.upcomingDebts.length === 0 ? (
                <EmptyState message="No debts with due dates set." />
              ) : (
                <ul className={listPanel}>
                  {data.upcomingDebts.map((debt) => (
                    <li
                      key={debt.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{debt.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {debtCategoryLabel(debt.category)}
                          {' · Due '}
                          {debt.due_date ? formatDate(debt.due_date) : '—'}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        {formatCurrency(Number(debt.remaining_balance))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {wallets.map((wallet) => (
            <WalletDashboardSection key={wallet.id} wallet={wallet} />
          ))}
        </>
      )}

      {showTransferForm && (
        <Modal title="Transfer money" onClose={() => setShowTransferForm(false)}>
          <TransferForm
            onDone={() => {
              setShowTransferForm(false)
              void refresh()
            }}
            onCancel={() => setShowTransferForm(false)}
          />
        </Modal>
      )}
    </div>
  )
}
