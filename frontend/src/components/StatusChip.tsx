import type { ReactNode } from 'react'

export type StatusTone = 'positive' | 'warning' | 'negative' | 'info' | 'neutral'

const toneClass: Record<StatusTone, string> = {
  positive: 'bg-growth-emerald-tint text-growth-emerald-deep border border-growth-emerald-deep/20',
  warning: 'bg-warning-amber-tint text-warning-amber border border-warning-amber/30',
  negative: 'bg-expense-crimson-tint text-expense-crimson border border-expense-crimson/20',
  info: 'bg-info-sky-tint text-info-sky border border-info-sky/20',
  neutral: 'bg-surface-container text-on-surface-variant border border-outline-variant',
}

export function StatusChip({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-space-xs py-space-3xs font-label-sm text-label-sm font-semibold ${toneClass[tone]}`}
    >
      {children}
    </span>
  )
}
