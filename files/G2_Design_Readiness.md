# SDLC G2 — Design Readiness

Prepared 9 September 2026. Closes the remaining G2 evidence items not already
partially covered (items #104, #106, #108, #110, #113 already "In progress" from the
9 September backfill — this document extends, not replaces, that evidence).

**Amended 2026-09-13:** sections 3 and 4 corrected against stale claims
(refresh-token and dependency findings had already been fixed but this
document still described them as open; test/CI counts were badly out of
date). Two dedicated documents produced this same session close item #109's
remaining half (`Privacy_Impact_Assessment.md`) and item #110's remaining
gap (`Security_Design.md`), referenced below rather than duplicated.

## 1. Architecture description (item #106)

**Context view:** A single-origin React/TypeScript SPA (`frontend/`) talks to a
FastAPI backend (`backend/`) over HTTPS/JSON. The backend is the sole source of truth;
the frontend holds no durable state. A second, isolated in-memory session exists for
the staff support console (`adminSession`, `frontend/src/lib/adminAuth.tsx`), sharing
the same origin and codebase but never sharing a token with the consumer session.

**Component view:**
- Backend: FastAPI app (`backend/app/main.py`) → per-resource routers
  (`app/routers/{auth,accounts,categories,transactions,recurring_bills,savings_goals,
  reports,notifications,admin,portability}.py`) → SQLAlchemy models (`app/models.py`)
  → PostgreSQL, with Alembic-managed schema (`alembic/versions/`).
- Frontend: route-level pages (`src/pages/`) → shared primitives (`src/components/`)
  → per-resource API client modules (`src/lib/resources/*`) → two isolated
  request/session clients (`src/lib/api.ts`).

**Deployment view:** CI/CD exists (`.github/workflows/ci.yml`, test + rls-verification
jobs, green on every push). A hosting target is now recommended
(`Hosting_Decision_Finance_Management_Platform.md`, 2026-09-13): Render, one web
service for the API, managed Postgres, two static sites for the consumer/admin
split. Not yet actually deployed — no Render account was linked to this repo as of
this writing, and the draft `render.yaml` blueprint is unvalidated.

**Data-flow view:** Client → HTTPS → FastAPI router → SQLAlchemy session (tenant-scoped
by `tenant_id` in application code) → PostgreSQL, with Postgres row-level security as a
second, independent enforcement layer (`alembic/versions/20260907_postgres_rls.py`).
Every tenant-scoped table carries `tenant_id`; RLS policies (`tenant_isolation_<table>`)
reject cross-tenant rows at the database layer even if application code had a bug.

This closes item #106 to Complete — all four required views now exist, three of them
(context, component, data-flow) grounded in real code, the fourth (deployment)
honestly marked as not yet decided rather than invented.

## 2. Architecture Decision Records (item #107)

Recorded retroactively — these decisions were already made in code before this
governance process existed; recording them now is honest documentation of what
happened, not a claim that a formal ADR process was followed at the time.

| ADR | Decision | Rejected/considered alternatives | Rationale |
|---|---|---|---|
| ADR-001 | FastAPI + PostgreSQL backend | Django, Node/Express | Async-friendly, strong typing via Pydantic, mature SQLAlchemy/Alembic ecosystem |
| ADR-002 | Tenant isolation via `tenant_id` column + Postgres RLS (defense in depth) | Schema-per-tenant, database-per-tenant | RLS gives a second, independent enforcement layer without the operational cost of per-tenant schemas/databases at current scale (NFR-5 targets 50,000 tenants on one schema) |
| ADR-003 | JWT access + refresh tokens, bcrypt password hashing | Session cookies with server-side session store | Stateless horizontal scaling (NFR-4); **however, see the threat-model finding below — the refresh-token half of this decision is currently unimplemented server-side, a real gap, not a rejected alternative** |
| ADR-004 | React + TypeScript + Vite frontend, Tailwind v4 with the "Stitch" design token system | Plain CSS, a different component library | Type safety, fast dev iteration; design tokens sourced from `_stitch_extracted/.../modern_financial_trust/DESIGN.md` |
| ADR-005 | In-memory-only token storage on the client, two isolated sessions (consumer/staff) | localStorage/sessionStorage tokens, shared session | Eliminates XSS-driven token theft via storage APIs; keeps staff and consumer privilege boundaries structurally separate |
| ADR-006 | No CI/CD, no version control at this stage | — | **Superseded 2026-09-13:** was an acknowledged gap (risk R1/R2) at Gate 1; both now exist — git since 2026-09-09, CI (`.github/workflows/ci.yml`) since 2026-09-11. Row retained for the historical record, not because the gap is still open. |

## 3. Threat model and privacy assessment (item #109)

**Assets:** tenant financial data (accounts, transactions, balances), user credentials
(password hashes, JWTs), and — once built — bank-aggregator tokens and payment data.

**Trust boundaries:** browser ↔ backend (HTTPS); backend ↔ database (network-internal,
assumed trusted); consumer session ↔ staff session (structurally separate, no shared
token — verified in code).

**Top threats and current mitigation status:**

| Threat | Mitigated? | Evidence |
|---|---|---|
| Cross-tenant data access via application bug | Mitigated (defense in depth) | Postgres RLS policies independently enforce tenant scoping even if app-layer scoping fails; cross-tenant isolation is one of the 4 automated backend tests (verified passing) |
| Credential theft via password storage | Mitigated | bcrypt hashing (`security.py`) |
| Token theft via browser storage (XSS) | Mitigated | In-memory-only tokens, confirmed via source scan (no `localStorage`/`sessionStorage` token use found) |
| Session refresh | **Fixed same day, 9 Sep 2026** | Found broken (no `/auth/refresh` endpoint despite one being issued/redeemed client-side), fixed within hours (commit `5fb7146`), and re-verified passing 2026-09-13 (3 backend + 3 frontend tests). This row is retained to show the finding-to-fix timeline, not because the gap is still open — a stale copy of this same finding was mistakenly carried into a later gate decision's conditions and had to be corrected (`Compensating_Assurance_Role_Separation.md` documents the same discipline for a different finding). |
| Refresh-token revocation | Mitigated | `RefreshToken` table exists and rotates/revokes correctly, tested |
| Dependency vulnerabilities | **Mostly mitigated, 2026-09-13** | CI now runs `pip-audit`/`npm audit` on every push. 23 of 24 known vulnerabilities closed (fastapi/starlette, python-jose, pytest bumps); `ecdsa` has no upstream fix but is a verified dead code path (`Security_Design.md` §1, HS256 never exercises it) — accepted residual risk |
| Secrets exposure | Partially mitigated | Only placeholders found in the repo (gitleaks-scanned every push); no secret-store/vault integration yet for when real secrets are introduced (risk R7) — see `Security_Design.md` §3 |
| **Health endpoint leaking DB credentials** | **Fixed 2026-09-13, new finding** | `GET /health` returned `settings.database_url` (live DB credentials in production) unauthenticated. Found while writing `Security_Design.md`, fixed same session — see that document §1 |
| **CORS wildcard with credentials enabled** | **Fixed 2026-09-13, new finding** | Same fix pass — production now fails closed without an explicit `ALLOWED_ORIGINS` |
| Brute-force / credential stuffing on login | **Not mitigated, open** | No rate-limiting exists anywhere in `backend/app` — see `Privacy_Impact_Assessment.md` §5, P3 |
| Bank-token compromise (future) | N/A yet | Bank linking is unbuilt; NFR-13 (envelope encryption via KMS) is specified but not implementable until the feature exists |

**Privacy assessment:** completed 2026-09-13 as a dedicated document,
`Privacy_Impact_Assessment.md` — full data inventory, legal basis, third-party
sharing (Stripe), data-subject-rights coverage, and risk findings. Two of its
findings (P1/P2) were fixed during its own preparation; the rest (P3-P7) are
disclosed as open. Still mandatory before any bank-linking work per the FRS
Implementation Plan's own blocking rule, which this document does not lift.

This is a genuine, if first-pass, threat model — not exhaustive, and explicitly not a
substitute for the independent security review this project cannot currently obtain
(role-separation gap, `Gate1_G0_Intake_Record.md` §10).

## 4. Test strategy, environment plan, migration approach, observability, support model, backup/rollback (item #111)

**Updated 2026-09-13** — the 9 September version of this section is badly stale
(cited 4 backend tests and "no CI at all"); corrected against current, re-verified
counts rather than left to compound the staleness this project has already found
and fixed once (see the PM/SDLC gate backfill work, tracker items #105/#113/#122).

- **Test strategy:** substantially built out since 9 September. 36 backend tests
  (`test_api.py`, `test_masking.py`, `test_rls_policies.py` — 6 of these need real
  Postgres, `test_subscriptions.py`), a 71-case frontend Vitest suite, and a 4-spec
  Playwright E2E suite (signup/onboarding, multi-currency + CSV import, recurring-bill
  generation, account deletion) run against the real backend and frontend together.
  All re-verified passing 2026-09-13. Not implemented: load/performance testing, and
  no formal regression suite distinct from these (same disclosed gap as tracker item
  #121).
- **Environment plan:** resolved as a recommendation, not yet executed — Render
  (`Hosting_Decision_Finance_Management_Platform.md`), one web service for the API,
  managed Postgres, two static sites for the consumer/admin split. No account-linked
  deployment exists yet; a draft `render.yaml` blueprint is committed but unvalidated.
- **Migration approach:** real and working — Alembic-managed schema migrations (**11**
  migration files as of 2026-09-13 — corrected same-session after an earlier version of
  this very edit undercounted them as 5 — including the RLS migration and the admin
  RLS-bypass migration), verified via CI's `rls-verification` job running
  `alembic upgrade head` against real Postgres on every push.
- **Observability:** still not implemented in code — confirmed by absence, no
  structured-log library, no metrics/tracing, no error-tracking SaaS anywhere in
  `backend/app` (`Security_Design.md` §5). **Concept, now that a host is chosen:**
  Render's web services expose stdout logs and basic CPU/memory/request metrics out
  of the box at the Starter tier with no extra setup — sufficient to close the
  observability floor for this project's current scale without adding a dedicated
  APM product; a structured-logging library (e.g. Python's own `logging` with a JSON
  formatter) is the concrete next code change, not yet made.
- **Support model:** still not established — solo operator, no on-call rotation, no
  incident process document. Realistic for a Class A project's floor: a single-page
  runbook (who to contact, how to roll back, where logs live) rather than a full
  on-call program, appropriately scaled to a solo team rather than skipped entirely.
- **Backup/rollback concept:** resolved as a concept, not yet operating (no
  environment exists to back up). Backup: Render's managed Postgres provides
  continuous point-in-time recovery on paid plans (3-7 days' window depending on
  plan tier) once actually provisioned, plus on-demand manual exports retained 7
  days regardless of tier — a real, sourced capability
  (`Hosting_Decision_Finance_Management_Platform.md`), not NFR-8's daily-backup
  language, which predates this hosting choice and should be reconciled with it
  rather than treated as a separate requirement. Rollback: `git revert` for
  application code, `alembic downgrade` for schema changes -- both mechanically
  available today, neither exercised in a rehearsed drill yet.

This item stays **In progress**, not Complete — test strategy and migration approach
are genuinely strong; environment/backup/rollback now have a real concept behind
them (not just "undecided"); observability and a written support runbook remain
genuinely unbuilt.

## 5. Risky assumptions validated with controlled prototypes or spikes (item #112)

Two real, already-executed spikes qualify, both documented in
`files/FRS_Finance_Management_Platform_Implementation_Plan.md` §6:

1. **Tenant isolation under RLS** — validated by the cross-tenant isolation test
   (independently re-run this session, passing), confirming the risky assumption that
   RLS + application-layer scoping would correctly prevent cross-tenant access.
2. **CSV import correctness** — the implementation plan documents two real defects
   found and fixed during Increment 3 wiring (`Decimal`/`float` mismatch, raw-string
   date mismatch in `portability.py`), verified with a live import moving an account
   balance from 0.00 to 957.50. This is a genuine spike that surfaced and resolved a
   risky assumption about CSV parsing correctness, not a hypothetical.

No dedicated bank-linking spike exists yet — appropriate, since that work is blocked
pending provider/legal/security approval.

## 6. Assurance effort as a distinct delivery-plan line item (item #105)

**Not started.** No delivery-plan budget exists at all yet (Gate 2 condition, item #17,
due 2026-10-09) — an assurance-effort line item cannot be carved out of a budget that
doesn't exist. This item is blocked by the same open Gate 2 condition, not a new gap.

## 7. G2 decision (item #114)

Recorded 2026-09-09: Approve with conditions (see the tracker's own SDLC G2 gate
decision record).

## 8. Accessibility findings and fixes (WCAG 2.1 AA prep, added 2026-09-09)

Phase 4 of the FRS-gap closure plan. Two passes: automated (`eslint-plugin-jsx-a11y`,
newly added to the frontend as a real dev dependency, not just referenced) and manual
review of the custom interactive widgets an automated linter structurally cannot
verify (real keyboard/focus behavior, not just JSX shape).

**Automated pass — genuinely clean, not skipped.** `npx eslint src` runs jsx-a11y's
full "recommended" ruleset (34 rules confirmed active via `--print-config`, verified
before trusting a zero-finding result) plus the two classic react-hooks rules, across
all ~30 `.tsx` files. Result: **zero violations.** This is a real, positive finding —
not because nothing was checked, but because the codebase's existing form/label/ARIA
conventions (the shared `Field` component's `htmlFor`/label pairing, `Banner`'s
`role="alert"` on error tone, `ConfirmDialog`'s pre-existing `role="dialog"`) already
satisfied the automatable subset of WCAG 2.1 AA before this session started.

**Manual pass — found and fixed 3 real gaps automated tooling cannot detect:**

| # | Component | Gap | WCAG reference | Fix |
|---|---|---|---|---|
| 1 | `ConfirmDialog.tsx` | `role="dialog" aria-modal="true"` existed, but nothing actually moved focus into the dialog on open, trapped Tab within it, closed on Escape, or restored focus to the trigger on close — a `role` attribute alone doesn't make something operable as a dialog | 2.4.3 Focus Order; 2.1.1/2.1.2 Keyboard/No Keyboard Trap | Added focus-on-open (phrase input if present, else Cancel — never the destructive button), a Tab/Shift+Tab trap, Escape-to-cancel, focus restoration on close, and `aria-labelledby` pointing at the title for a proper accessible name |
| 2 | `States.tsx` (`LoadingState`, `ErrorState`) | Loading→loaded and loading→error transitions were silent to screen-reader users — no live region announced the state change | 4.1.3 Status Messages | Added `role="status"` to `LoadingState` and `role="alert"` to `ErrorState` (matching the pattern `Banner.tsx` already used for its own error tone) |
| 3 | `AppShell.tsx` user-menu dropdown | Openable by mouse or keyboard (`aria-expanded`/`aria-haspopup` were already correct), but had no Escape-to-close and didn't return focus to the trigger button when dismissed | 2.1.1 Keyboard | Added an Escape handler that closes the menu and refocuses the trigger button |

**Verified clean, not just assumed:** `Money.tsx`'s income/expense coloring already
includes an explicit `+`/`-` sign via `Intl.NumberFormat`'s `signDisplay: 'exceptZero'`
— color is a supplementary cue, not the sole indicator, satisfying 1.4.1 Use of Color
without any change needed.

**Not done in this pass — genuinely out of scope, not overlooked:**
- No live screen-reader (NVDA/VoiceOver) session was run; this was a code-level review
  against WCAG success criteria, not an assistive-technology field test.
- Color-contrast ratios were not measured against the design system's actual rendered
  values (would need a contrast-checking tool run against `theme.css`'s token values).
- No full page-by-page manual keyboard walkthrough of every route — the shared
  components above were prioritized because fixes there compound across every page
  that uses them, per the plan's own reasoning.

This is real progress on FRS accessibility requirements (FE-N.8–FE-N.12, previously
"Not validated" in the coverage matrix), not a completed accessibility sign-off — an
independent reviewer and an actual AT session remain items for Gate 4.
