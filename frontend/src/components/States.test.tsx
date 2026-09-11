import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState, ErrorState, LoadingState } from './States'

describe('LoadingState', () => {
  it('announces itself to assistive tech via role="status"', () => {
    render(<LoadingState label="Loading accounts…" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading accounts…')
  })
})

describe('EmptyState', () => {
  it('renders title, optional description and an optional action', () => {
    render(<EmptyState title="No accounts yet" description="Add your first account." action={<button>Add</button>} />)
    expect(screen.getByText('No accounts yet')).toBeInTheDocument()
    expect(screen.getByText('Add your first account.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('omits the description when none is given', () => {
    render(<EmptyState title="No accounts yet" />)
    expect(screen.queryByText('Add your first account.')).not.toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('announces itself via role="alert" and shows the message', () => {
    render(<ErrorState message="We could not load your accounts." />)
    expect(screen.getByRole('alert')).toHaveTextContent('We could not load your accounts.')
  })

  it('omits the retry button when onRetry is not provided', () => {
    render(<ErrorState message="Failed." />)
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })

  it('calls onRetry when the retry button is clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<ErrorState message="Failed." onRetry={onRetry} />)

    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
