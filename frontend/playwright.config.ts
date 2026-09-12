import { defineConfig, devices } from '@playwright/test'

const FRONTEND_PORT = 5173
const BACKEND_PORT = 8000

export default defineConfig({
  testDir: './e2e',
  // Generous for this dev machine specifically (4GB RAM, often near its
  // limit) -- every timeout hit so far has resolved with the expected final
  // state already on screen, just slower to get there than a normal machine.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  // 1, not more: this dev machine has 4GB RAM total and is often down to
  // ~500MB free even at rest -- a second concurrent Chromium instance is
  // exactly the kind of spike that gets a background process killed for
  // low memory here. Raise this on a machine that actually has headroom.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'retain-on-failure',
    // Runs headless against the full Chromium build (already installed via
    // `npx playwright install chromium`) instead of the separate
    // "chromium headless shell" package Playwright Test defaults to for
    // headless runs -- that second ~100MB download kept getting killed by
    // this machine's low-memory guard. No test-visible behavior difference;
    // this only changes which already-working binary runs the browser.
    channel: 'chromium',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Two real, unmocked servers -- this is what actually distinguishes E2E
  // from the component/contract tests in src/**/*.test.tsx (Vitest + MSW),
  // which stub every backend response on purpose.
  webServer: [
    {
      command: 'python -m uvicorn app.main:app --port 8000',
      cwd: '../backend',
      // A dedicated SQLite file, not backend/finance.db (the manual dev
      // database) -- keeps E2E runs from reading/writing a developer's own
      // working data, and vice versa. Each test still uses a fresh random
      // email per run, so this file only needs a schema, not a clean slate.
      env: { DATABASE_URL: 'sqlite:///./e2e.db' },
      url: `http://127.0.0.1:${BACKEND_PORT}/health`,
      // Always false, deliberately, even outside CI: Playwright's own
      // reuse check is just "does this URL respond" -- it can't verify the
      // server already listening on this port was started with *this*
      // env var. It once wasn't (a stale server from before this env
      // config existed), and every E2E run silently wrote into
      // backend/finance.db, the real local dev database, instead of this
      // dedicated file, until that got noticed and cleaned up by hand.
      // `--strictPort` below closes the matching hole on the frontend side.
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npm run dev -- --port ${FRONTEND_PORT} --strictPort`,
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
