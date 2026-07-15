import { useState } from 'react'
import { ExpenseForm } from './expenses/ExpenseForm'
import { IncomeForm } from './income/IncomeForm'
import { TransferForm } from './transfers/TransferForm'
import { FormField, SelectInput } from './ui/FormField'
import { Modal } from './ui/Modal'
import { useExpenses } from '../hooks/useExpenses'
import { useIncome } from '../hooks/useIncome'
import { useWallets } from '../hooks/useWallets'

type ActiveForm = 'transfer' | 'expense' | 'income' | null

const actions = [
  { key: 'transfer' as const, label: 'Transfer' },
  { key: 'expense' as const, label: 'Expense' },
  { key: 'income' as const, label: 'Income' },
]

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

export function QuickAddFab() {
  const [expanded, setExpanded] = useState(false)
  const [activeForm, setActiveForm] = useState<ActiveForm>(null)
  const [walletId, setWalletId] = useState<string | null>(null)

  const { create: createExpense } = useExpenses(walletId)
  const { create: createIncome } = useIncome(walletId)

  function openForm(form: ActiveForm) {
    setExpanded(false)
    setWalletId(null)
    setActiveForm(form)
  }

  function closeForm() {
    setActiveForm(null)
  }

  return (
    <>
      {expanded && (
        <button
          type="button"
          aria-label="Close quick add menu"
          onClick={() => setExpanded(false)}
          className="fixed inset-0 z-40 cursor-default bg-slate-950/20"
        />
      )}

      <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3 md:bottom-6 md:right-6">
        {expanded && (
          <div className="flex flex-col items-end gap-3">
            {actions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => openForm(action.key)}
                className="rounded-full bg-white px-6 py-4 text-base font-semibold text-slate-700 shadow-lg ring-1 ring-slate-200 transition-transform hover:scale-105 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          aria-label={expanded ? 'Close quick add menu' : 'Quick add'}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-3xl font-light text-white shadow-lg transition-transform hover:scale-105 dark:bg-slate-100 dark:text-slate-900"
        >
          <span
            className="inline-block transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(45deg)' : 'rotate(0deg)' }}
          >
            +
          </span>
        </button>
      </div>

      {activeForm === 'transfer' && (
        <Modal title="Transfer money" onClose={closeForm}>
          <TransferForm onDone={closeForm} onCancel={closeForm} />
        </Modal>
      )}

      {activeForm === 'expense' && (
        <Modal title="Add expense" onClose={closeForm}>
          <div className="space-y-4">
            <WalletPicker walletId={walletId} onChange={setWalletId} />
            <ExpenseForm onSubmit={createExpense} onCancel={closeForm} />
          </div>
        </Modal>
      )}

      {activeForm === 'income' && (
        <Modal title="Add income" onClose={closeForm}>
          <div className="space-y-4">
            <WalletPicker walletId={walletId} onChange={setWalletId} />
            <IncomeForm onSubmit={createIncome} onCancel={closeForm} />
          </div>
        </Modal>
      )}
    </>
  )
}
