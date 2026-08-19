import { Modal } from '../ui/Modal'
import { quickAddActions, type QuickAddAction } from './types'

interface DashboardActionMenuProps {
  title: string
  actions?: { key: QuickAddAction; label: string }[]
  onSelect: (action: QuickAddAction) => void
  onClose: () => void
}

export function DashboardActionMenu({
  title,
  actions = quickAddActions,
  onSelect,
  onClose,
}: DashboardActionMenuProps) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
        Choose an action for this section.
      </p>
      <div className="grid gap-2">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => onSelect(action.key)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            {action.label}
          </button>
        ))}
      </div>
    </Modal>
  )
}
