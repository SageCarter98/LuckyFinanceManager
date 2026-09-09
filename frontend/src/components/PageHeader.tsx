import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-col justify-between gap-space-md md:flex-row md:items-end">
      <div className="flex max-w-2xl flex-col gap-space-3xs">
        {eyebrow && (
          <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
            {eyebrow}
          </span>
        )}
        <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">{title}</h1>
        {description && <p className="font-body-md text-body-md text-on-surface-variant">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-space-xs self-start md:self-auto">{actions}</div>}
    </header>
  )
}
