import type { ReactNode } from 'react'

export const inputClass =
  'h-10 rounded border border-slate-border bg-surface-container-low px-space-sm font-body-md text-body-md text-on-surface outline-none transition-all placeholder:text-outline-variant focus:border-info-sky focus:bg-surface-container-lowest focus:ring-2 focus:ring-info-sky/20'

export function Field({
  label,
  hint,
  error,
  required,
  children,
  htmlFor,
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
  htmlFor?: string
}) {
  return (
    <div className="flex flex-col gap-space-2xs">
      <label htmlFor={htmlFor} className="font-label-md text-label-md font-semibold text-on-surface">
        {label} {required && <span className="text-expense-crimson">*</span>}
      </label>
      {children}
      {hint && !error && <span className="font-body-sm text-body-sm text-on-surface-variant">{hint}</span>}
      {error && (
        <span className="font-body-sm text-body-sm text-expense-crimson" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
