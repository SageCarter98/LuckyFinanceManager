import { HttpResponse } from 'msw'
import type { HttpHandler } from 'msw'

/**
 * Empty by default — every unhandled request fails the test loudly (see
 * `onUnhandledRequest: 'error'` in setup.ts) rather than silently hitting
 * the network or returning undefined. Each test file adds the handlers it
 * needs via `server.use(...)`, scoped to that test, so a contract test
 * actually pins down the request shape it cares about instead of relying
 * on a shared fixture that drifts from the real backend.
 */
export const handlers: HttpHandler[] = []

// Small helpers kept here (not per-test-file) because the response shapes
// they build (FastAPI's real error envelopes, from lib/api.ts's parseError)
// are shared contract fixtures, not test-specific fixtures.
export function httpErrorDetail(status: number, detail: string) {
  return HttpResponse.json({ detail }, { status })
}

export function httpValidationError(
  status: number,
  fields: { loc: (string | number)[]; msg: string; type: string }[],
) {
  return HttpResponse.json({ detail: fields }, { status })
}
