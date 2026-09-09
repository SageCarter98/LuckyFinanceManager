import type { ReactNode } from 'react'
import { Icon } from './Icon'

export type BannerTone = 'info' | 'warning' | 'error' | 'success' | 'locked'

const toneConfig: Record<BannerTone, { bar: string; bg: string; text: string; icon: string }> = {
  info: { bar: 'bg-info-sky', bg: 'bg-info-sky-tint', text: 'text-info-sky', icon: 'info' },
  warning: { bar: 'bg-warning-amber', bg: 'bg-warning-amber-tint', text: 'text-warning-amber', icon: 'warning' },
  error: { bar: 'bg-expense-crimson', bg: 'bg-expense-crimson-tint', text: 'text-expense-crimson', icon: 'error' },
  success: {
    bar: 'bg-growth-emerald-deep',
    bg: 'bg-growth-emerald-tint',
    text: 'text-growth-emerald-deep',
    icon: 'check_circle',
  },
  locked: { bar: 'bg-slate-navy-deep', bg: 'bg-slate-surface', text: 'text-slate-navy-deep', icon: 'lock' },
}

export function Banner({
  tone,
  title,
  children,
  onDismiss,
}: {
  tone: BannerTone
  title: string
  children?: ReactNode
  onDismiss?: () => void
}) {
  const config = toneConfig[tone]
  return (
    <div className={`relative overflow-hidden rounded-lg p-space-md ${config.bg}`} role={tone === 'error' ? 'alert' : undefined}>
      <div className={`absolute inset-y-0 left-0 w-1 ${config.bar}`} />
      <div className="flex items-start gap-space-sm pl-space-xs">
        <Icon name={config.icon} className={`text-[20px] ${config.text}`} filled />
        <div className="min-w-0 flex-1">
          <p className={`font-label-md text-label-md font-semibold ${config.text}`}>{title}</p>
          {children && <div className="mt-space-3xs font-body-sm text-body-sm text-on-surface-variant">{children}</div>}
        </div>
        {onDismiss && (
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="shrink-0 rounded p-1 text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <Icon name="close" className="text-[16px]" />
          </button>
        )}
      </div>
    </div>
  )
}
