import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

// text-base (16px) below sm: iOS Safari auto-zooms the page when focusing
// an input/select with a font-size under 16px. text-sm (14px) at sm+ keeps
// the original compact desktop look, where zoom-on-focus doesn't happen.
const inputClass =
  'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400 dark:focus:ring-slate-400'

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
