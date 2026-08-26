import { useState } from 'react'
import { DashboardActionMenu } from '../components/quick-add/DashboardActionMenu'
import { QuickAddModals } from '../components/quick-add/QuickAddModals'
import type { QuickAddAction, QuickAddScope } from '../components/quick-add/types'
import { VerificationStatusBanner } from '../components/verification/VerificationStatusBanner'
import { VerifyBalanceModal } from '../components/verification/VerifyBalanceModal'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { PageHeader, PrimaryButton } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { WalletSwitcher } from '../components/wallets/WalletSwitcher'
import { useBalanceVerifications } from '../hooks/useBalanceVerifications'
import { useCreditCards } from '../hooks/useCreditCards'
import { useDebts } from '../hooks/useDebts'
import { useSavingsGoals } from '../hooks/useSavings'
import { useToast } from '../hooks/useToast'
import { type CombinedTransaction, useTransactionsData } from '../hooks/useTransactionsData'
import { useWallets } from '../hooks/useWallets'
import { listPanel } from '../lib/classes'
import { formatCurrency, formatDate } from '../lib/format'
import { transferDestinationLabel, transferSourceLabel } from '../lib/transfers'
import { transferCategoryLabel } from '../types/database'

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

interface TransactionActionContext {
  title: string
  scope: QuickAddScope
  walletId: string | null
}

export function TransactionsPage() {
  const { wallets } = useWallets()
  const { items: goals } = useSavingsGoals()
  const { items: debts } = useDebts()
  const { items: creditCards } = useCreditCards()
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [actionMenu, setActionMenu] = useState<TransactionActionContext | null>(null)
  const [activeForm, setActiveForm] = useState<QuickAddAction | null>(null)
  const [formWalletId, setFormWalletId] = useState<string | null>(null)
  const [verifyScope, setVerifyScope] = useState<QuickAddScope>({
    scopeType: 'personal',
    walletId: null,
    savingsGoalId: null,
  })

  const { data, loading, error } = useTransactionsData(activeWalletId)
  const { latestForScope, createVerification } = useBalanceVerifications()
  const { showToast } = useToast()

  const activeScope = {
    scopeType: (activeWalletId ? 'wallet' : 'personal') as 'wallet' | 'personal',
    walletId: activeWalletId,
    savingsGoalId: null,
  }

  const latestVerification = latestForScope(activeScope)

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

  function rowLabel(txn: CombinedTransaction): string {
    if (txn.type !== 'transfer') return txn.label
    const sourceLabel = transferSourceLabel(txn.transfer, wallets)
    const destinationLabel = transferDestinationLabel(txn.transfer, wallets, goals, debts, creditCards)
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

  function openActionMenu(context: TransactionActionContext) {
    setActionMenu(context)
  }

  function handleActionSelect(action: QuickAddAction) {
    if (!actionMenu) return

    setFormWalletId(actionMenu.walletId)
    setVerifyScope(actionMenu.scope)
    setActionMenu(null)
    setActiveForm(action)
  }

  function closeActiveForm() {
    setActiveForm(null)
  }

  function openDirectAction(action: QuickAddAction, context: TransactionActionContext) {
    setFormWalletId(context.walletId)
    setVerifyScope(context.scope)
    setActiveForm(action)
  }

  const currentScope: QuickAddScope = {
    scopeType: activeWalletId ? 'wallet' : 'personal',
    walletId: activeWalletId,
    savingsGoalId: null,
  }

  const transactionContext: TransactionActionContext = {
    title: activeWalletId ? wallets.find((wallet) => wallet.id === activeWalletId)?.name ?? 'Wallet' : 'Personal',
    scope: currentScope,
    walletId: activeWalletId,
  }

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="All-time overview"
        action={<PrimaryButton onClick={() => setShowVerifyModal(true)}>Verify balance</PrimaryButton>}
      />

      <WalletSwitcher wallets={wallets} activeWalletId={activeWalletId} onChange={setActiveWalletId} />

      <div className="mb-4">
        <VerificationStatusBanner
          latestVerifiedAt={latestVerification?.created_at ?? null}
          label={activeWalletId ? 'This wallet' : 'Personal balance'}
        />
      </div>

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
            <StatCard
              label="Income"
              value={formatCurrency(data.monthIncome)}
              variant="positive"
              onClick={() => openDirectAction('income', transactionContext)}
            />
            <StatCard
              label="Expenses"
              value={formatCurrency(data.monthExpenses)}
              variant="negative"
              breakdown={
                data.creditCardExpenses > 0
                  ? { label: 'Credit card', value: formatCurrency(data.creditCardExpenses), variant: 'warning' }
                  : undefined
              }
              onClick={() => openDirectAction('expense', transactionContext)}
            />
            <StatCard
              label="Transferred"
              value={formatCurrency(data.transferredOut)}
              hint="Total sent out"
              variant={data.transferredOut > 0 ? 'negative' : 'default'}
              onClick={() => openDirectAction('transfer', transactionContext)}
            />
            <StatCard
              label="Balance"
              value={formatCurrency(data.netBalance)}
              hint="Income minus wallet-paid expenses minus transferred"
              variant={data.netBalance >= 0 ? 'positive' : 'negative'}
              onClick={() => openActionMenu(transactionContext)}
            />
          </div>

          <section className="mt-8">
            <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
              All transactions
            </h3>
            {data.transactions.length === 0 ? (
              <EmptyState message="No income, expenses, or transfers yet." />
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
                          {txn.type === 'transfer' && txn.transfer.category
                            ? ` · ${transferCategoryLabel(txn.transfer.category)}`
                            : ''}
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

      {actionMenu && (
        <DashboardActionMenu
          title={actionMenu.title}
          onSelect={handleActionSelect}
          onClose={() => setActionMenu(null)}
        />
      )}

      <QuickAddModals
        activeForm={activeForm}
        walletId={formWalletId}
        verifyScope={verifyScope}
        onClose={closeActiveForm}
        onWalletIdChange={setFormWalletId}
      />

      {showVerifyModal && (
        <VerifyBalanceModal
          wallets={wallets}
          savingsGoals={goals}
          defaultScope={activeScope}
          onClose={() => setShowVerifyModal(false)}
          onVerify={handleVerify}
        />
      )}
    </div>
  )
}
