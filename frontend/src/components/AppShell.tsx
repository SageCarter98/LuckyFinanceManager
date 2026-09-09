import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Icon } from './Icon'
import { Banner } from './Banner'
import { useAuth } from '../lib/auth'
import { listNotifications } from '../lib/resources/notifications'
import { t } from '../lib/strings'

interface NavItem {
  to: string
  label: string
  icon: string
  locked?: boolean
}

const navItems: NavItem[] = [
  { to: '/', label: t('nav.dashboard'), icon: 'grid_view' },
  { to: '/transactions', label: t('nav.transactions'), icon: 'receipt_long' },
  { to: '/accounts', label: t('nav.accounts'), icon: 'account_balance' },
  { to: '/categories', label: t('nav.categories'), icon: 'pie_chart' },
  { to: '/bills', label: t('nav.bills'), icon: 'calendar_clock' },
  { to: '/goals', label: t('nav.goals'), icon: 'flag' },
  { to: '/reports', label: t('nav.reports'), icon: 'analytics' },
  { to: '/banking', label: t('nav.banking'), icon: 'savings', locked: true },
  { to: '/subscription', label: t('nav.subscription'), icon: 'workspace_premium', locked: true },
  { to: '/settings/profile', label: t('nav.settings'), icon: 'settings' },
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, pendingVerificationToken, dismissPendingVerificationToken } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  // A disclosure widget openable only by mouse (no Escape to dismiss, focus
  // never returned to the trigger) fails keyboard operability -- a real gap
  // no automated linter flags for a custom dropdown like this.
  useEffect(() => {
    if (!menuOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  useEffect(() => {
    let active = true
    listNotifications()
      .then((items) => {
        if (active) setUnreadCount(items.filter((item) => !item.is_read).length)
      })
      .catch(() => {
        if (active) setUnreadCount(null)
      })
    return () => {
      active = false
    }
  }, [])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased">
      <aside className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col justify-between bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col">
          <div className="flex h-16 items-center gap-space-sm px-space-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary">
              <Icon name="account_balance" className="text-[18px]" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface">Lucky Finance</span>
              <span className="mt-space-3xs font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                Finance Management
              </span>
            </div>
          </div>
          <nav className="flex flex-col gap-space-2xs px-space-md py-space-sm" aria-label="Main navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between gap-space-sm rounded-xl px-space-md py-space-sm font-body-md text-body-md transition-all ${
                    isActive
                      ? 'bg-primary-container font-title text-on-primary'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`
                }
              >
                <span className="flex items-center gap-space-sm">
                  <Icon name={item.icon} className="text-[20px]" />
                  <span>{item.label}</span>
                </span>
                {item.locked && <Icon name="lock" className="text-[16px] text-on-surface-variant" />}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="p-space-md">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-space-sm rounded-xl px-space-md py-space-sm font-body-md text-body-md text-on-surface-variant transition-colors hover:bg-expense-crimson-tint hover:text-expense-crimson"
          >
            <Icon name="logout" className="text-[20px]" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="pl-72">
        <header className="fixed left-72 right-0 top-0 z-40 flex h-16 items-center justify-end bg-surface-container-lowest/90 px-space-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
          <div className="flex items-center gap-space-md">
            <button
              type="button"
              aria-label={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
              onClick={() => navigate('/settings/notifications')}
              className="relative rounded-xl p-space-xs text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            >
              <Icon name="notifications" className="text-[22px]" />
              {Boolean(unreadCount) && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-expense-crimson" />
              )}
            </button>
            <div className="relative">
              <button
                ref={menuButtonRef}
                type="button"
                aria-expanded={menuOpen}
                aria-haspopup="true"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-space-sm rounded-full py-space-2xs pl-space-xs pr-space-sm transition-colors hover:bg-surface-container"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container font-label-sm text-label-sm text-on-primary">
                  {user ? initials(user.full_name) : '·'}
                </span>
                <span className="hidden flex-col text-left leading-tight md:flex">
                  <span className="font-label-md text-label-md font-semibold text-on-surface">{user?.full_name}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{user?.email}</span>
                </span>
                <Icon name="expand_more" className="text-[18px] text-on-surface-variant" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-50 mt-space-2xs w-56 rounded-xl bg-surface-container-lowest p-space-xs shadow-[0_4px_6px_-1px_rgba(15,23,42,0.08),0_2px_4px_-2px_rgba(15,23,42,0.04)]">
                  <NavLink
                    to="/settings/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-space-sm rounded-lg px-space-sm py-space-xs font-body-md text-body-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                  >
                    <Icon name="manage_accounts" className="text-[18px]" />
                    Profile
                  </NavLink>
                  <NavLink
                    to="/settings/data"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-space-sm rounded-lg px-space-sm py-space-xs font-body-md text-body-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                  >
                    <Icon name="policy" className="text-[18px]" />
                    Data &amp; privacy
                  </NavLink>
                  <div className="my-space-2xs h-px bg-surface-container-high" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-space-sm rounded-lg px-space-sm py-space-xs font-body-md text-body-md text-expense-crimson transition-colors hover:bg-expense-crimson-tint"
                  >
                    <Icon name="logout" className="text-[18px]" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="min-h-screen w-full bg-surface px-gutter-desktop py-space-lg pt-[calc(4rem+var(--spacing-space-lg))]">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-space-lg">
            {pendingVerificationToken && !user?.email_verified && (
              <Banner tone="warning" title="Development mode — verify your email" onDismiss={dismissPendingVerificationToken}>
                No email provider is connected yet, so nothing was actually sent. Use this link to
                complete verification:{' '}
                <Link
                  to={`/verify-email?token=${encodeURIComponent(pendingVerificationToken)}`}
                  className="font-semibold underline"
                >
                  Verify email
                </Link>
                .
              </Banner>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
