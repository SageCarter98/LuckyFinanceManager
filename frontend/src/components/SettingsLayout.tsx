import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from './PageHeader'

const tabs = [
  { to: '/settings/profile', label: 'Profile' },
  { to: '/settings/notifications', label: 'Notifications' },
  { to: '/settings/data', label: 'Data & privacy' },
]

export function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader eyebrow="Your account" title="Settings" />
      <div className="flex gap-space-xs border-b border-slate-border">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `-mb-px border-b-2 px-space-sm py-space-xs font-label-md text-label-md transition-colors ${
                isActive
                  ? 'border-slate-navy-deep text-on-surface'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      {children}
    </>
  )
}
