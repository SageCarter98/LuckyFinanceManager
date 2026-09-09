import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-space-xs rounded-lg border border-slate-border bg-surface-container-lowest p-space-xl text-on-surface-variant"
    >
      <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-outline-variant border-t-slate-navy-deep" />
      <span className="font-body-md text-body-md">{label}</span>
    </div>
  )
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
}: {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-space-xs rounded-lg border border-dashed border-slate-border bg-surface-container-lowest p-space-xl text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Icon name={icon} className="text-[24px]" />
      </span>
      <p className="font-title text-title text-on-surface">{title}</p>
      {description && <p className="max-w-sm font-body-sm text-body-sm text-on-surface-variant">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-space-xs rounded-lg border border-expense-crimson/30 bg-expense-crimson-tint p-space-xl text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-lowest text-expense-crimson">
        <Icon name="error" className="text-[24px]" />
      </span>
      <p className="font-title text-title text-on-surface">Something went wrong</p>
      <p className="max-w-sm font-body-sm text-body-sm text-on-surface-variant">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded bg-slate-navy-deep px-space-md py-space-xs font-label-md text-label-md text-on-primary transition-colors hover:bg-primary-container"
        >
          Try again
        </button>
      )}
    </div>
  )
}
