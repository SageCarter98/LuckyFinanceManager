import type { ReactNode } from 'react'
import { Icon } from './Icon'

interface StatCardProps {
  label: string
  value: ReactNode
  icon?: string
  tone?: 'default' | 'positive' | 'negative'
  footer?: ReactNode
}

const iconTone: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-info-sky bg-info-sky-tint',
  positive: 'text-growth-emerald-deep bg-growth-emerald-tint',
  negative: 'text-expense-crimson bg-expense-crimson-tint',
}

export function StatCard({ label, value, icon, tone = 'default', footer }: StatCardProps) {
  return (
    <article className="flex flex-col justify-between rounded-lg border border-slate-border bg-surface-container-lowest p-space-md shadow-sm">
      <div className="flex items-center justify-between pb-space-xs">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{label}</span>
        {icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconTone[tone]}`}>
            <Icon name={icon} className="text-[18px]" />
          </span>
        )}
      </div>
      <div className="my-space-2xs">{value}</div>
      {footer && <div className="mt-space-xs border-t border-slate-border pt-space-xs">{footer}</div>}
    </article>
  )
}
