# Release Readiness Test Plan

Finance Management Platform. Prepared 2026-09-13, closing/advancing SDLC G4
items #128 (risk-based test plan with traceability), #129 (test evidence
with environment/build/tester), #130 (test execution), #131 (security/
privacy/performance/etc. testing), #132 (test environment/data note).

## 1. Build under test

- **Branch**: `fix/rls-blocks-auth-refresh-tokens`
- **Commit**: `9c54649` (2026-09-13T15:13:08Z)
- **Not yet in `master`** — PR #4 (fixes D4, the RLS/auth defect in
  `files/Defect_Register.md`) is open, pending Milton's review. This test
  plan's evidence is for this commit; re-run is not required after merge
  unless the merge itself changes anything (a clean fast-forward doesn't).
- **Tester**: Claude Sonnet 5 (this session), at the direction of Freston
  Kenny Adedeme.

## 2. Test environment

- **Backend unit/integration suite**: SQLite fallback (`os.environ.
  setdefault("DATABASE_URL", "sqlite:///...")` in `test_api.py`/
  `test_subscriptions.py`) — fast, no RLS, appropriate for logic that
  isn't RLS-specific.
- **RLS suite**: real local Postgres 16, role `finance_app` (deliberately
  non-superuser, non-BYPASSRLS — the same reasoning CI's own
  `rls-verification` job uses, so RLS is actually being tested, not
  bypassed), database `finance_rls_test`, migrated to head.
- **Manual end-to-end verification**: real local Postgres, role/database
  `finance`/`finance` (general-purpose dev role, distinct from the RLS
  test role), migrated to head — this is the closest thing to a
  production-shaped environment this project has run against yet. No
  production data exists anywhere; all data in every environment is
  synthetic, created by this session (`demo@example.com`,
  `admin@example.com`).
- **Frontend suite**: Vitest + jsdom.
- **E2E suite**: Playwright + Chromium, own ephemeral SQLite (`e2e.db`)
  and its own backend/frontend server instances (`playwright.config.ts`
  `webServer`).

This satisfies #132's "production-like environment, lawful synthetic
data" requirement for everything except a true staging deployment, which
doesn't exist pre-G4.

## 3. Results, this session (2026-09-13)

| Suite | Result | Notes |
| --- | --- | --- |
| Backend unit/integration (`pytest tests/`) | **32 passed, 6 skipped** | Skips are the RLS-only tests, correctly skipped outside the Postgres RLS environment |
| RLS policy suite (`test_rls_policies.py` against `finance_rls_test`) | **6 passed** | Re-run after the D4 fix; confirms the fix didn't weaken any RLS policy |
| Frontend (`npm run test -- --run`, Vitest) | **71 passed** (10 files) | AccountsPage, CategoriesPage, TransactionsPage, AdminConsolePage, LoginPage, Money/States/ConfirmDialog/api/errors |
| E2E (Playwright) | **Not re-run this session** | Port conflict with the manually-started dev servers this session was also using for live demo/login verification (`localhost:8000` already bound) — stopping those to free the port would have interrupted the running system the user was actively using. Evidence stands from tracker item #119/#121: 11 tests across 4 specs, corroborated via source diff in commits `f18f45d`/`0c86c3b`, not fresh. **Re-run before an actual production deploy**, not optional to skip twice. |
| Manual E2E (real browser, against real Postgres `finance` db) | **Passed** | Login (`demo@example.com`), dashboard render, staff console login (`admin@example.com`), admin tenant-search returning masked real data, non-admin correctly 403'd on the admin endpoint — see conversation evidence this session |
| Manual auth-flow curl verification (real Postgres) | **Passed** | login → `/auth/me` → refresh → logout, plus confirmed logout actually revokes (reused token correctly 401'd) — this is what caught and validated the fix for D4 |

## 4. Risk-based coverage rationale (#128)

Effort this session concentrated on the highest-risk path per this
project's own threat model (`Security_Design.md`, `Privacy_Impact_
Assessment.md`): authentication and tenant isolation. That's exactly
where D4 was found — a defect invisible to every test that ran against
SQLite (no RLS) or that tested RLS policies directly without going
through the actual auth endpoints. This is the argument for #132's
"production-like environment" requirement: the risk was real and the
SQLite/policy-only test tiers structurally couldn't see it.

Traceability: requirements coverage matrix already exists at
`files/FRS_Finance_Management_Platform_Implementation_Plan.md` §7
(tracker item #99) — this plan does not duplicate it, only adds the
execution evidence layer on top.

## 5. Security/privacy/performance testing (#131)

- **Security**: `Security_Design.md` (updated 2026-09-13), CI's `gitleaks`
  secret scan, `pip-audit`/`npm audit` dependency scans (item #122).
- **Privacy**: `Privacy_Impact_Assessment.md` (updated 2026-09-13).
- **Performance**: not load-tested — appropriate at this stage (no
  traffic exists yet), a real gap to close post-launch (G5), not
  pre-launch.
- **Accessibility**: `eslint-plugin-jsx-a11y` runs as part of `npm run
  lint`, not a full manual audit — same honest tier as performance.
- **Compatibility**: not cross-browser tested beyond Chromium (Playwright
  default) — disclosed, not a launch blocker for a first release.
- **Migration**: rollback mechanic verified end-to-end this session
  against real Postgres (`Transition_Support_Rollback_Closure.md` §4).
- **Backup/restore**: defined, not yet operating (`Defect_Register.md`
  G8) — nothing is deployed, so there's nothing to restore yet.
- **Resilience**: not chaos/failure-injection tested — disclosed, a
  post-launch G5 concern at this project's current scale.

## 6. What this does and does not close

- Advances #128, #129, #130, #131, #132 with real, dated, re-verified
  evidence — none were fabricated or assumed from stale citations.
- Does **not** claim full completion of any of them: E2E wasn't re-run
  (disclosed above, with a concrete reason and a concrete follow-up),
  and performance/accessibility/compatibility/resilience testing remain
  genuinely shallow, disclosed rather than hidden.
