/**
 * Single source of truth for locale-aware formatting. Before this file,
 * 13 call sites across 8 components each hardcoded 'en-US' independently --
 * fine for a single-market launch, but wrong the moment a non-US user
 * opens the app, and impossible to fix in one place. Uses the browser's
 * own language preference rather than assuming one.
 */
export function getUserLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language
  return 'en-US'
}

/**
 * Date formatting should follow the user's chosen timezone (User.timezone,
 * added this session), not the browser's -- someone traveling, or using a
 * shared/misconfigured device, should still see dates in their own
 * timezone. `timezone` is optional because a few call sites (e.g. a
 * relative "just now" export timestamp) don't have a user in scope.
 */
export function formatDate(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions,
  timezone?: string,
): string {
  return new Intl.DateTimeFormat(getUserLocale(), { ...options, timeZone: timezone }).format(new Date(value))
}

export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(getUserLocale(), options).format(value)
}
