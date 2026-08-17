import { ExpenseForm } from '../expenses/ExpenseForm'
import { IncomeForm } from '../income/IncomeForm'
import { TransferForm } from '../transfers/TransferForm'
import { VerifyBalanceModal } from '../verification/VerifyBalanceModal'
import { FormField, SelectInput } from '../ui/FormField'
import { Modal } from '../ui/Modal'
import { useBalanceVerifications } from '../../hooks/useBalanceVerifications'
import { useExpenses } from '../../hooks/useExpenses'
import { useIncome } from '../../hooks/useIncome'
import { useSavingsGoals } from '../../hooks/useSavings'
import { useToast } from '../../hooks/useToast'
import { useWallets } from '../../hooks/useWallets'
import type { QuickAddAction, QuickAddScope } from './types'

function WalletPicker({
  walletId,
  onChange,
}: {
  walletId: string | null
  onChange: (id: string | null) => void
}) {
  const { wallets } = useWallets()
  if (wallets.length === 0) return null

  return (
    <FormField label="Log to" htmlFor="quick-add-wallet">
      <SelectInput
        id="quick-add-wallet"
        value={walletId ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Personal</option>
        {wallets.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </SelectInput>
    </FormField>
  )
}

interface QuickAddModalsProps {
  activeForm: QuickAddAction | null
  walletId: string | null
  verifyScope: QuickAddScope
  onClose: () => void
  onWalletIdChange: (id: string | null) => void
}

export function QuickAddModals({
  activeForm,
  walletId,
  verifyScope,
  onClose,
  onWalletIdChange,
}: QuickAddModalsProps) {
  const { wallets } = useWallets()
  const { items: savingsGoals } = useSavingsGoals()
  const { createVerification } = useBalanceVerifications()
  const { showToast } = useToast()
  const { create: createExpense } = useExpenses(walletId)
  const { create: createIncome } = useIncome(walletId)

  async function handleVerify(input: {
    scopeType: QuickAddScope['scopeType']
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
    <>
      {activeForm === 'transfer' && (
        <Modal title="Transfer money" onClose={onClose}>
          <TransferForm onDone={onClose} onCancel={onClose} />
        </Modal>
      )}

      {activeForm === 'expense' && (
        <Modal title="Add expense" onClose={onClose}>
          <div className="space-y-4">
            <WalletPicker walletId={walletId} onChange={onWalletIdChange} />
            <ExpenseForm onSubmit={createExpense} onCancel={onClose} />
          </div>
        </Modal>
      )}

      {activeForm === 'income' && (
        <Modal title="Add income" onClose={onClose}>
          <div className="space-y-4">
            <WalletPicker walletId={walletId} onChange={onWalletIdChange} />
            <IncomeForm onSubmit={createIncome} onCancel={onClose} />
          </div>
        </Modal>
      )}

      {activeForm === 'verify' && (
        <VerifyBalanceModal
          wallets={wallets}
          savingsGoals={savingsGoals}
          defaultScope={verifyScope}
          onClose={onClose}
          onVerify={handleVerify}
        />
      )}
    </>
  )
}
