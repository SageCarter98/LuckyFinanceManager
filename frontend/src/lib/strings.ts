/**
 * Deliberately minimal-scope internationalization infrastructure (FRS
 * §8.4, Phase 5). A full library (react-i18next etc.) and an app-wide
 * string migration were NOT done -- hundreds of literal strings remain
 * throughout the page components. That's a disclosed scope decision, not
 * an oversight: it's not worth the churn for a single-language app today.
 *
 * What's here is real, not vaporware -- every key is actually consumed via
 * t() (ConfirmDialog's default labels, AppShell's main navigation), not
 * just declared. It's the seam a future language addition would use:
 * add a sibling dictionary with the same keys, and pick it in t() based
 * on the user's language preference (no such field exists yet --
 * getUserLocale() only drives number/date formatting today, see locale.ts).
 */
const en = {
  'dialog.confirm': 'Confirm',
  'dialog.cancel': 'Cancel',
  'nav.dashboard': 'Dashboard',
  'nav.transactions': 'Transactions',
  'nav.accounts': 'Accounts',
  'nav.categories': 'Categories',
  'nav.bills': 'Recurring Bills',
  'nav.goals': 'Goals',
  'nav.reports': 'Reports',
  'nav.banking': 'Banking',
  'nav.subscription': 'Subscription',
  'nav.settings': 'Settings',
} as const

export type StringKey = keyof typeof en

export function t(key: StringKey): string {
  return en[key]
}
