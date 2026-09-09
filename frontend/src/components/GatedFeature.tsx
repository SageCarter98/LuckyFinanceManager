import { Icon } from './Icon'
import { PageHeader } from './PageHeader'

export function GatedFeature({
  eyebrow,
  title,
  description,
  icon,
  reasons,
}: {
  eyebrow: string
  title: string
  description: string
  icon: string
  reasons: string[]
}) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} />
      <section className="flex flex-col items-center gap-space-md rounded-lg border border-slate-border bg-surface-container-lowest p-space-2xl text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container text-slate-navy-deep">
          <Icon name={icon} className="text-[32px]" />
        </span>
        <div className="flex flex-col gap-space-2xs">
          <h2 className="font-headline-md text-headline-md text-on-surface">Not available yet</h2>
          <p className="max-w-xl font-body-md text-body-md text-on-surface-variant">{description}</p>
        </div>
        <ul className="flex flex-col gap-space-2xs text-left font-body-sm text-body-sm text-on-surface-variant">
          {reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-space-2xs">
              <Icon name="check" className="mt-0.5 shrink-0 text-[16px] text-on-surface-variant" />
              {reason}
            </li>
          ))}
        </ul>
        <div className="rounded-lg bg-growth-emerald-tint px-space-md py-space-sm font-label-md text-label-md text-growth-emerald-deep">
          Manual accounts, transactions, budgets, bills, goals and reports stay free and fully available.
        </div>
      </section>
    </>
  )
}
