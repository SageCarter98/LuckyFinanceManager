import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Money } from './Money'

// The currency code renders in its own nested <span>; the tone/color class
// lives on the outer wrapper span, so tone assertions read `wrapper`
// (rendered root) rather than the text node getByText resolves to.
describe('Money', () => {
  it('always renders the ISO currency code alongside the formatted amount', () => {
    const { container } = render(<Money value={1234.5} currency="EUR" />)
    expect(screen.getByText('EUR')).toBeInTheDocument()
    expect(container.textContent).toMatch(/1,234\.5/)
  })

  it('defaults to USD when no currency is given', () => {
    render(<Money value={10} currency="" />)
    expect(screen.getByText('USD')).toBeInTheDocument()
  })

  it('falls back to a plain decimal (instead of crashing) for a non-ISO currency label like "(mixed)"', () => {
    // Mixed-currency aggregates (dashboard/reports) pass a non-code label
    // when amounts were combined without conversion -- Intl.NumberFormat
    // throws a RangeError for that as a `currency` option, so this must not
    // silently misrepresent the amount by falling through to $ or crashing.
    const { container } = render(<Money value={500} currency="(mixed)" />)
    expect(screen.getByText('(mixed)')).toBeInTheDocument()
    expect(container.textContent).toMatch(/500\.00/)
  })

  it('colors a positive signed amount as growth and shows a leading +', () => {
    const { container } = render(<Money value={42} currency="USD" signed />)
    expect(container.querySelector('span.tabular-figures')?.className).toContain('text-growth-emerald-deep')
    expect(container.textContent).toMatch(/\+/)
  })

  it('colors a negative signed amount as expense', () => {
    const { container } = render(<Money value={-42} currency="USD" signed />)
    expect(container.querySelector('span.tabular-figures')?.className).toContain('text-expense-crimson')
  })

  it('applies no tone color when unsigned, even for a negative value', () => {
    const { container } = render(<Money value={-42} currency="USD" />)
    const className = container.querySelector('span.tabular-figures')?.className ?? ''
    expect(className).not.toContain('text-expense-crimson')
    expect(className).not.toContain('text-growth-emerald-deep')
  })
})
