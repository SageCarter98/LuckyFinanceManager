# Release Package — Candidate v0.1.0

Finance Management Platform. Prepared 2026-09-13, closing SDLC G4 items
#138 (release package assembled) and #139 (release notes + immutable
build identifier). This is a **release candidate**, not an executed
release — nothing has been deployed (see `Gate4_Release_Readiness_
Checklist.md` for what's still outstanding before that can happen).

## Build identifier

- **Commit**: `9c54649` on branch `fix/rls-blocks-auth-refresh-tokens`
- **Not yet in `master`**: this branch's one commit (PR #4) fixes D4, a
  critical defect (`files/Defect_Register.md`) found this session. The
  actual release build is `master` once PR #4 merges — this package
  should be re-cut against that merge commit, not this branch tip, once
  it lands. No other changes are expected to require a re-cut.

## Scope of this release

First release candidate for the platform. Everything in the codebase as
of the commit above — there is no prior production release to diff
against.

**Headline capability**: multi-tenant personal/small-business finance
management — accounts, transactions, categories, recurring bills,
savings goals, CSV import, multi-currency support, notifications,
subscription/billing (Stripe), an isolated staff support console, and
tenant isolation enforced at both the application layer and the Postgres
row-level-security layer.

## Dependencies

- Backend: `backend/requirements.txt` (FastAPI, SQLAlchemy, Alembic,
  `psycopg`, `passlib[bcrypt]`, `python-jose`, `stripe`, `pytest`, …)
- Frontend: `frontend/package.json` (React 19, Vite 8, Tailwind 4,
  React Router 7, Vitest, Playwright)
- Dependency/licence/vulnerability scanning: CI `test` job (`pip-audit`,
  `pip-licenses`, `npm audit`) — tracker item #122, In progress (a
  standing CI check, not a one-time artifact this package can close
  alone).

## Migration

11 Alembic migrations, `20240905_initial_schema` through
`20260911_add_admin_access_log`. All have real, verified `downgrade()`
implementations (`Transition_Support_Rollback_Closure.md` §4). Includes
the Postgres row-level-security migration (`20260907_postgres_rls`) —
**Postgres-only**: this release cannot run to head against SQLite past
that point (confirmed this session — a real, previously undocumented
constraint on `DATABASE_URL=sqlite:///...`, the value `.env.example`
currently ships as its default). `.env.example` should be corrected to
default to a Postgres URL before this release ships, so a fresh
checkout's first `alembic upgrade head` doesn't fail the same way this
session's did.

## Known limitations at this release

See `files/Defect_Register.md` in full. Summary: one critical defect
(D4) fixed but not yet merged; one high-severity disclosed gap that
should block accepting real payments specifically (no Stripe DPA
reviewed, G2); the rest are low-severity, disclosed, and acceptable for
a first release.

## What this does and does not close

- Closes #138 and #139 as artifacts — this document is the release
  package and release notes tracker items #138/#139 ask for.
- Does **not** authorise a release: that's #146 (release authority not
  the sole author), #147 (deployment executed), and #148 (G4 decision
  recorded) — none of which this document can satisfy on its own. See
  `Gate4_Release_Readiness_Checklist.md`.
