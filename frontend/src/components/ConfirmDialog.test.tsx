import { describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from './ConfirmDialog'

function renderDialog(overrides: Partial<ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  const utils = render(
    <ConfirmDialog
      open
      title="Delete account"
      description='"Main checking" will be permanently deleted.'
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  )
  return { ...utils, onConfirm, onCancel }
}

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    render(<ConfirmDialog open={false} title="t" description="d" onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('exposes an accessible dialog labeled by its title', () => {
    renderDialog()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName('Delete account')
  })

  it('moves focus to the Cancel button on open when no confirmation phrase is required', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('moves focus to the phrase input on open when a confirmation phrase is required', () => {
    renderDialog({ requirePhrase: 'DELETE' })
    expect(screen.getByLabelText('Type "DELETE" to confirm')).toHaveFocus()
  })

  it('restores focus to the previously-focused element on close', () => {
    const trigger = document.createElement('button')
    trigger.textContent = 'Delete'
    document.body.appendChild(trigger)
    trigger.focus()

    const { rerender, onCancel } = renderDialog()
    expect(trigger).not.toHaveFocus()

    rerender(
      <ConfirmDialog open={false} title="Delete account" description="d" onConfirm={vi.fn()} onCancel={onCancel} />,
    )
    expect(trigger).toHaveFocus()
    trigger.remove()
  })

  it('calls onCancel when Escape is pressed', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderDialog()
    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onConfirm when the confirm button is clicked and no phrase is required', async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderDialog({ confirmLabel: 'Delete account' })
    await user.click(screen.getByRole('button', { name: 'Delete account' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('keeps the confirm button disabled until the exact required phrase is typed', async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderDialog({ requirePhrase: 'DELETE', confirmLabel: 'Delete account' })
    const confirmButton = screen.getByRole('button', { name: 'Delete account' })
    const input = screen.getByLabelText('Type "DELETE" to confirm')

    expect(confirmButton).toBeDisabled()

    await user.type(input, 'delet')
    expect(confirmButton).toBeDisabled()

    await user.type(input, 'e')
    // Case-sensitive: "delete" !== "DELETE".
    expect(confirmButton).toBeDisabled()

    await user.clear(input)
    await user.type(input, 'DELETE')
    expect(confirmButton).toBeEnabled()

    await user.click(confirmButton)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('disables the confirm button and shows a busy label while busy', () => {
    renderDialog({ busy: true, confirmLabel: 'Delete account' })
    const confirmButton = screen.getByRole('button', { name: 'Working…' })
    expect(confirmButton).toBeDisabled()
  })
})
