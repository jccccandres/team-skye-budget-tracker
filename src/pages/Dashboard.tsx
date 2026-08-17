import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TransferHistory } from '../components/transfers/TransferHistory'
import { ProgressBar } from '../components/savings/ProgressBar'
import { VerifyBalanceModal } from '../components/verification/VerifyBalanceModal'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { PageHeader, PrimaryButton } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { WalletDashboardSection } from '../components/wallets/WalletDashboardSection'
import { useBalanceVerifications } from '../hooks/useBalanceVerifications'
import { useDashboard } from '../hooks/useDashboard'
import { useSavingsGoals } from '../hooks/useSavings'
import { useToast } from '../hooks/useToast'
import { useWallets } from '../hooks/useWallets'
import { listPanel } from '../lib/classes'
import { formatCurrency, formatDate, formatDateTime, formatMonthDay } from '../lib/format'
import { debtCategoryLabel, type DebtCategory, type Wallet } from '../types/database'
import type { DebtBreakdown } from '../hooks/useDashboard'
import type { WalletWithMembers } from '../hooks/useWallets'

function expenseSourceLabel(walletId: string | null, wallets: Wallet[]): string {
  if (!walletId) return 'Personal'
  const wallet = wallets.find((w) => w.id === walletId)
  return wallet ? `${wallet.name} (shared)` : 'Shared wallet'
}

function categoryHasDebt(breakdown: DebtBreakdown): boolean {
  return breakdown.remaining > 0 || breakdown.monthly > 0
}

const debtCategoryCards: { category: DebtCategory; label: string }[] = [
  { category: 'car_loan', label: 'Car loans remaining' },
  { category: 'house_loan', label: 'House loans remaining' },
  { category: 'other', label: 'Other debt remaining' },
]

function CollapsibleWalletSection({
  wallet,
  data,
  latestVerifiedAt,
  isExpanded,
  onToggle,
}: {
  wallet: WalletWithMembers
  data: ReturnType<typeof useDashboard>['data']
  latestVerifiedAt: string | null
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={onToggle}
        className="mb-3 flex items-center justify-between w-full group"
      >
        <div className="text-left">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {wallet.name}
            {wallet.members.length > 1 ? ' (shared)' : ''}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {latestVerifiedAt ? `Last verified ${formatDateTime(latestVerifiedAt)}` : 'Not verified yet'}
          </p>
        </div>
        <span
          className="text-lg text-slate-400 transition-transform group-hover:text-slate-600 dark:group-hover:text-slate-300"
          style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        >
          ▼
        </span>
      </button>

      {isExpanded ? (
        <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: '1000px' }}>
          <WalletDashboardSection walletData={data} />
        </div>
      ) : (
        <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: '125px' }}>
          <WalletNetBalanceCard walletData={data} />
        </div>
      )}
    </section>
  )
}

function PersonalDashboardSection({
  data,
}: {
  data: ReturnType<typeof useDashboard>['data']
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total income"
        value={formatCurrency(data.monthIncome)}
        hint="All-time"
        variant="positive"
      />
      <StatCard
        label="Total expenses"
        value={formatCurrency(data.monthExpenses)}
        hint="All-time"
        variant="negative"
        breakdown={
          data.creditCardExpenses > 0
            ? { label: 'Credit card', value: formatCurrency(data.creditCardExpenses), variant: 'warning' }
            : undefined
        }
      />
      <StatCard
        label="Transferred out"
        value={formatCurrency(data.transferredOut)}
        hint="Your transfers to wallets/savings, all-time"
        variant={data.transferredOut > 0 ? 'negative' : 'default'}
      />
      <StatCard
        label="Net balance"
        value={formatCurrency(data.netBalance)}
        hint="Income minus wallet-paid expenses minus transfers out"
        variant={data.netBalance >= 0 ? 'positive' : 'negative'}
      />
    </div>
  )
}

function PersonalNetBalanceCard({
  data,
}: {
  data: ReturnType<typeof useDashboard>['data']
}) {
  return (
    <StatCard
      label="Net balance"
      value={formatCurrency(data.netBalance)}
      hint="Income minus wallet-paid expenses minus transfers out"
      variant={data.netBalance >= 0 ? 'positive' : 'negative'}
    />
  )
}

function WalletNetBalanceCard({
  walletData,
}: {
  walletData: ReturnType<typeof useDashboard>['data']
}) {
  return (
    <StatCard
      label="Net balance"
      value={formatCurrency(walletData.netBalance)}
      hint="Income minus wallet-paid expenses minus transfers out"
      variant={walletData.netBalance >= 0 ? 'positive' : 'negative'}
    />
  )
}

// This component calls useDashboard for each wallet,
// so all wallet data is preloaded when the wallets render
function WalletWithPreloadedData({
  wallet,
  latestVerifiedAt,
  isExpanded,
  onToggle,
}: {
  wallet: WalletWithMembers
  latestVerifiedAt: string | null
  isExpanded: boolean
  onToggle: () => void
}) {
  const { data } = useDashboard(wallet.id)
  return (
    <CollapsibleWalletSection
      wallet={wallet}
      data={data}
      latestVerifiedAt={latestVerifiedAt}
      isExpanded={isExpanded}
      onToggle={onToggle}
    />
  )
}

// Desktop wallet section (always expanded, no toggle)
function WalletDesktopSection({
  wallet,
  latestVerifiedAt,
}: {
  wallet: WalletWithMembers
  latestVerifiedAt: string | null
}) {
  const { data } = useDashboard(wallet.id)
  return (
    <section className="mt-8">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {wallet.name}
          {wallet.members.length > 1 ? ' (shared)' : ''}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {latestVerifiedAt ? `Last verified ${formatDateTime(latestVerifiedAt)}` : 'Not verified yet'}
        </p>
      </div>
      <WalletDashboardSection walletData={data} />
    </section>
  )
}

export function DashboardPage() {
  // 0 = current month, -1 = last month, etc. Capped so you can't browse
  // into the future.
  const [expandedWallets, setExpandedWallets] = useState(new Set<string>())
  const [isPersonalExpanded, setIsPersonalExpanded] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)

  const { data, loading, error } = useDashboard(undefined)
  const { wallets } = useWallets()
  const { items: savingsGoals, loading: savingsLoading } = useSavingsGoals()
  const { latestForScope, createVerification } = useBalanceVerifications()
  const { showToast } = useToast()

  const personalLatest = latestForScope({
    scopeType: 'personal',
    walletId: null,
    savingsGoalId: null,
  })

  const walletVerificationInfo = useMemo(
    () =>
      wallets.map((wallet) => ({
        walletId: wallet.id,
        latest: latestForScope({
          scopeType: 'wallet',
          walletId: wallet.id,
          savingsGoalId: null,
        }),
      })),
    [wallets, latestForScope],
  )

  const unverifiedSummaryText = useMemo(() => {
    const unverifiedWalletCount = walletVerificationInfo.filter((item) => !item.latest).length
    const unverifiedSavingsCount = savingsGoals.filter(
      (goal) =>
        !latestForScope({ scopeType: 'savings_goal', walletId: null, savingsGoalId: goal.id }),
    ).length

    const parts: string[] = []
    if (!personalLatest) parts.push('Personal')
    if (unverifiedWalletCount > 0) {
      parts.push(`${unverifiedWalletCount} wallet${unverifiedWalletCount === 1 ? '' : 's'}`)
    }
    if (unverifiedSavingsCount > 0) {
      parts.push(`${unverifiedSavingsCount} savings goal${unverifiedSavingsCount === 1 ? '' : 's'}`)
    }

    if (parts.length === 0) return null
    return `Not yet verified: ${parts.join(', ')}.`
  }, [walletVerificationInfo, savingsGoals, latestForScope, personalLatest])

  async function handleVerify(input: {
    scopeType: 'personal' | 'wallet' | 'savings_goal'
    walletId: string | null
    savingsGoalId: string | null
    actualAmount: number
    date: string
    note: string | null
  }) {
    const result = await createVerification(input)
    if (result.error) {
      showToast(result.error, 'error')
      return { error: result.error }
    }

    const verified = result.verification
    if (!verified) {
      showToast('Balance verification failed.', 'error')
      return { error: 'Balance verification failed.' }
    }

    if (Math.abs(Number(verified.delta)) < 0.01) {
      showToast('Balance verified. No adjustment was needed.', 'success')
    } else {
      showToast('Balance verified. A reconciliation transaction was added.', 'success')
    }

    return { error: null }
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="All-time overview"
        action={<PrimaryButton onClick={() => setShowVerifyModal(true)}>Verify balance</PrimaryButton>}
      />

      {unverifiedSummaryText && (
        <div className="mb-4">
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            {unverifiedSummaryText}
          </p>
        </div>
      )}

      {error && <div className="mb-4"><ErrorAlert message={error} /></div>}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading dashboard…</p>
      ) : (
        <>
          {/* Desktop: Always expanded */}
          <div className="hidden lg:block">
            <div className="mb-3 mt-8">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Personal</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {personalLatest ? `Last verified ${formatDateTime(personalLatest.created_at)}` : 'Not verified yet'}
              </p>
            </div>
            <PersonalDashboardSection data={data} />
          </div>

          {/* Mobile: Collapsible */}
          <section className="block lg:hidden mt-8">
            <button
              type="button"
              onClick={() => setIsPersonalExpanded(!isPersonalExpanded)}
              className="mb-3 flex items-center justify-between w-full group"
            >
              <div className="text-left">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Personal
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {personalLatest ? `Last verified ${formatDateTime(personalLatest.created_at)}` : 'Not verified yet'}
                </p>
              </div>
              <span
                className="text-lg text-slate-400 transition-transform group-hover:text-slate-600 dark:group-hover:text-slate-300"
                style={{ transform: isPersonalExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
              >
                ▼
              </span>
            </button>

            {isPersonalExpanded ? (
              <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: '1000px' }}>
                <PersonalDashboardSection data={data} />
              </div>
            ) : (
              <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: '125px' }}>
                <PersonalNetBalanceCard data={data} />
              </div>
            )}
          </section>

          {wallets.length > 0 && (
            <>
              {/* Desktop: Always expanded */}
              <div className="hidden lg:block">
                {wallets.map((wallet) => (
                  <WalletDesktopSection
                    key={wallet.id}
                    wallet={wallet}
                    latestVerifiedAt={
                      walletVerificationInfo.find((item) => item.walletId === wallet.id)?.latest?.created_at ?? null
                    }
                  />
                ))}
              </div>

              {/* Mobile: Collapsible */}
              <div className="block lg:hidden">
                {wallets.map((wallet) => (
                  <WalletWithPreloadedData
                    key={wallet.id}
                    wallet={wallet}
                    latestVerifiedAt={
                      walletVerificationInfo.find((item) => item.walletId === wallet.id)?.latest?.created_at ?? null
                    }
                    isExpanded={expandedWallets.has(wallet.id)}
                    onToggle={() => {
                      setExpandedWallets((prev) => {
                        const next = new Set(prev)
                        if (next.has(wallet.id)) {
                          next.delete(wallet.id)
                        } else {
                          next.add(wallet.id)
                        }
                        return next
                      })
                    }}
                  />
                ))}
              </div>
            </>
          )}

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Savings</h3>
              <Link
                to="/savings"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                View all
              </Link>
            </div>
            {savingsLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading savings…</p>
            ) : savingsGoals.length === 0 ? (
              <EmptyState message="No savings goals yet. Add one from the Savings page." />
            ) : (
              <>
                <StatCard
                  label="Total saved"
                  value={formatCurrency(
                    savingsGoals.reduce((sum, g) => sum + Number(g.current_amount), 0),
                  )}
                  hint={`Across ${savingsGoals.length} goal${savingsGoals.length === 1 ? '' : 's'}`}
                  variant="positive"
                />
                <div className="mt-4 space-y-3">
                  {savingsGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{goal.name}</p>
                        <p className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
                          {formatCurrency(goal.current_amount)}
                          {goal.target_amount ? ` of ${formatCurrency(goal.target_amount)}` : ' saved'}
                        </p>
                      </div>
                      {goal.target_amount ? (
                        <div className="mt-3">
                          <ProgressBar current={goal.current_amount} target={goal.target_amount} />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {data.creditCards.length > 0 && (
            <section className="mt-8">
              <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
                Credit cards
              </h3>
              <div className="space-y-4">
                {data.creditCards.map((card) => (
                  <div key={card.id}>
                    <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      {card.name}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <StatCard
                        label="This month's bill"
                        value={formatCurrency(card.billableThisMonth)}
                        hint={`Due ${formatMonthDay(card.dueDateThisMonth)}`}
                        variant="negative"
                      />
                      <StatCard
                        label="Next month's bill"
                        value={formatCurrency(card.billableNextMonth)}
                        hint={`Due ${formatMonthDay(card.dueDateNextMonth)}`}
                        variant="negative"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.hasDebts && (
            <section className="mt-8">
              <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
                Loans &amp; debts
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {debtCategoryCards
                  .filter(({ category }) => categoryHasDebt(data.debtByCategory[category]))
                  .map(({ category, label }) => (
                    <StatCard
                      key={category}
                      label={label}
                      value={formatCurrency(data.debtByCategory[category].remaining)}
                      hint={`${formatCurrency(data.debtByCategory[category].monthly)}/mo payments`}
                    />
                  ))}
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
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Upcoming due dates
                  </h4>
                  <Link
                    to="/debts"
                    className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  >
                    View all
                  </Link>
                </div>
                {data.upcomingDebts.length === 0 ? (
                  <EmptyState message="No debts with due dates set." />
                ) : (
                  <ul className={listPanel}>
                    {data.upcomingDebts.map((debt) => (
                      <li key={debt.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {debt.name}
                          </p>
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
              </div>
            </section>
          )}

          <section className="mt-8">
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
                        {' · '}
                        {expenseSourceLabel(expense.wallet_id, wallets)}
                        {expense.description ? ` · ${expense.description}` : ''}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        expense.payment_source === 'credit_card'
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {formatCurrency(Number(expense.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-8">
            <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Transfer history
            </h3>
            <TransferHistory />
          </section>
        </>
      )}

      {showVerifyModal && (
        <VerifyBalanceModal
          wallets={wallets}
          savingsGoals={savingsGoals}
          defaultScope={{ scopeType: 'personal', walletId: null, savingsGoalId: null }}
          onClose={() => setShowVerifyModal(false)}
          onVerify={handleVerify}
        />
      )}
    </div>
  )
}
