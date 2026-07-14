import type { ReactNode } from 'react'
import { SecondaryButton } from './PageHeader'

type AmountVariant = 'expense' | 'income' | 'debt' | 'neutral'

interface RecordMeta {
  label: string
  value: string
}

interface RecordCardProps {
  title: string
  subtitle?: string
  amount: string
  amountVariant?: AmountVariant
  meta?: RecordMeta[]
  extraActions?: ReactNode
  onEdit: () => void
  onDelete: () => void
}

const amountColors: Record<AmountVariant, string> = {
  expense: 'text-red-700 dark:text-red-400',
  income: 'text-emerald-700 dark:text-emerald-400',
  debt: 'text-amber-700 dark:text-amber-400',
  neutral: 'text-slate-900 dark:text-slate-100',
}

export function RecordCard({
  title,
  subtitle,
  amount,
  amountVariant = 'neutral',
  meta = [],
  extraActions,
  onEdit,
  onDelete,
}: RecordCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-slate-900 dark:text-slate-100">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
        <p className={`shrink-0 text-sm font-semibold ${amountColors[amountVariant]}`}>{amount}</p>
      </div>

      {meta.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {meta.map((item) => (
            <div key={item.label}>
              <dt className="text-slate-400 dark:text-slate-500">{item.label}</dt>
              <dd className="font-medium text-slate-700 dark:text-slate-300">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {extraActions}
        <SecondaryButton className="min-h-10 flex-1" onClick={onEdit}>
          Edit
        </SecondaryButton>
        <SecondaryButton className="min-h-10 flex-1" onClick={onDelete}>
          Delete
        </SecondaryButton>
      </div>
    </article>
  )
}

export function RecordCardList({ children }: { children: ReactNode }) {
  return <div className="space-y-3 md:hidden">{children}</div>
}
