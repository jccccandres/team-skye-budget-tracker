import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

const inputClass =
  'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400 dark:focus:ring-slate-400'

interface FormFieldProps {
  label: string
  htmlFor: string
  children?: ReactNode
}

export function FormField({ label, htmlFor, children }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
    </div>
  )
}

export function TextInput({
  id,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  return <input id={id} className={[inputClass, className].filter(Boolean).join(' ')} {...props} />
}

export function SelectInput({
  id,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { id: string; children: ReactNode }) {
  return (
    <select id={id} className={[inputClass, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </select>
  )
}
