import { useEffect, useRef, useState } from 'react'
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

const TITLE_ID = 'confirm-dialog-title'

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
  const containerRef = useRef<HTMLDivElement>(null)
  const phraseInputRef = useRef<HTMLInputElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  // Real WCAG 2.1 AA gaps a linter can't catch: a role="dialog" element
  // with no actual focus management isn't a dialog to a keyboard or
  // screen-reader user. This handles focus-on-open (2.4.3), a Tab trap
  // (2.1.2's spirit -- nothing outside the dialog should be reachable
  // while it's open), Escape-to-close, and focus restoration on close.
  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    // Focus what the user needs to act on first -- the confirmation phrase
    // input if one exists, otherwise Cancel. Never auto-focus the
    // destructive confirm button itself.
    ;(requirePhrase ? phraseInputRef.current : cancelButtonRef.current)?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
        return
      }
      if (event.key !== 'Tab' || !containerRef.current) return
      const focusable = containerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused.current?.focus()
    }
    // requirePhrase/onCancel are stable per dialog instance in every call
    // site; re-running this per keystroke would refocus the field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const locked = Boolean(requirePhrase) && typed !== requirePhrase

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-navy-deep/45 p-space-md backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
    >
      <div className="flex w-full max-w-md flex-col gap-space-md rounded-lg bg-surface-container-lowest p-space-lg shadow-2xl">
        <div className={`flex items-center gap-space-sm ${destructive ? 'text-expense-crimson' : 'text-on-surface'}`}>
          <span className={`rounded-lg p-space-2xs ${destructive ? 'bg-expense-crimson-tint' : 'bg-surface-container'}`}>
            <Icon name={destructive ? 'warning' : 'help'} className="text-[22px]" />
          </span>
          <h2 id={TITLE_ID} className="font-headline-sm text-headline-sm text-on-surface">
            {title}
          </h2>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{description}</p>
        {requirePhrase && (
          <label className="flex flex-col gap-space-2xs">
            <span className="font-label-sm text-label-sm font-semibold text-on-surface">
              Type "{requirePhrase}" to confirm
            </span>
            <input
              ref={phraseInputRef}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              className="h-10 rounded border border-slate-border bg-surface-container-low px-space-sm font-body-md text-body-md text-on-surface outline-none focus:border-info-sky focus:ring-2 focus:ring-info-sky/20"
              autoComplete="off"
            />
          </label>
        )}
        <div className="flex items-center justify-end gap-space-sm pt-space-xs">
          <button
            ref={cancelButtonRef}
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
