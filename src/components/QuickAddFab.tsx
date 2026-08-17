import { useState } from 'react'
import { usePreferences } from '../hooks/usePreferences'
import { QuickAddModals } from './quick-add/QuickAddModals'
import { quickAddActions, type QuickAddAction, type QuickAddScope } from './quick-add/types'

const defaultScope: QuickAddScope = {
  scopeType: 'personal',
  walletId: null,
  savingsGoalId: null,
}

export function QuickAddFab() {
  const { showFab } = usePreferences()
  const [expanded, setExpanded] = useState(false)
  const [activeForm, setActiveForm] = useState<QuickAddAction | null>(null)
  const [walletId, setWalletId] = useState<string | null>(null)
  const [verifyScope, setVerifyScope] = useState<QuickAddScope>(defaultScope)

  if (!showFab) return null

  function openForm(form: QuickAddAction) {
    setExpanded(false)
    setWalletId(null)
    setVerifyScope(defaultScope)
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
            {quickAddActions.map((action) => (
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
          className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-3xl font-light text-white shadow-lg transition-transform hover:scale-105 dark:bg-slate-100 dark:text-slate-900 opacity-40 hover:opacity-100"
        >
          <span
            className="inline-block transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(45deg)' : 'rotate(0deg)' }}
          >
            +
          </span>
        </button>
      </div>

      <QuickAddModals
        activeForm={activeForm}
        walletId={walletId}
        verifyScope={verifyScope}
        onClose={closeForm}
        onWalletIdChange={setWalletId}
      />
    </>
  )
}
