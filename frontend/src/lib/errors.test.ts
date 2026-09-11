import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { getErrorMessage } from './errors'

describe('getErrorMessage', () => {
  it('uses the ApiError body message', () => {
    const error = new ApiError(422, { code: 'VALIDATION_ERROR', message: 'Name is required.' })
    expect(getErrorMessage(error)).toBe('Name is required.')
  })

  it('falls back for an ApiError with an empty message', () => {
    const error = new ApiError(500, { code: 'HTTP_ERROR', message: '' })
    expect(getErrorMessage(error, 'Custom fallback.')).toBe('Custom fallback.')
  })

  it('uses a plain Error message', () => {
    expect(getErrorMessage(new Error('Network down'))).toBe('Network down')
  })

  it('falls back for a non-Error thrown value', () => {
    expect(getErrorMessage('a string was thrown', 'Custom fallback.')).toBe('Custom fallback.')
  })

  it('uses the default fallback when none is supplied', () => {
    expect(getErrorMessage(null)).toBe('Something went wrong. Please try again.')
  })
})
