import { useState } from 'react'
import { Icon } from './Icon'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  /** When set, the confirm button stays disabled until the user types this exact phrase. */
  requirePhrase?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  requirePhrase,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')

  if (!open) return null

  const locked = Boolean(requirePhrase) && typed !== requirePhrase

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-navy-deep/45 p-space-md backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex w-full max-w-md flex-col gap-space-md rounded-lg bg-surface-container-lowest p-space-lg shadow-2xl">
        <div className={`flex items-center gap-space-sm ${destructive ? 'text-expense-crimson' : 'text-on-surface'}`}>
          <span className={`rounded-lg p-space-2xs ${destructive ? 'bg-expense-crimson-tint' : 'bg-surface-container'}`}>
            <Icon name={destructive ? 'warning' : 'help'} className="text-[22px]" />
          </span>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">{title}</h2>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{description}</p>
        {requirePhrase && (
          <label className="flex flex-col gap-space-2xs">
            <span className="font-label-sm text-label-sm font-semibold text-on-surface">
              Type "{requirePhrase}" to confirm
            </span>
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              className="h-10 rounded border border-slate-border bg-surface-container-low px-space-sm font-body-md text-body-md text-on-surface outline-none focus:border-info-sky focus:ring-2 focus:ring-info-sky/20"
              autoComplete="off"
            />
          </label>
        )}
        <div className="flex items-center justify-end gap-space-sm pt-space-xs">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-space-md py-space-xs font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={locked || busy}
            onClick={onConfirm}
            className={`rounded px-space-md py-space-xs font-label-md text-label-md text-on-primary transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              destructive ? 'bg-expense-crimson hover:bg-error' : 'bg-slate-navy-deep hover:bg-primary-container'
            }`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
