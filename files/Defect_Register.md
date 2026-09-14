# Defect and Technical-Debt Register

Finance Management Platform. Prepared 2026-09-13 as part of the SDLC G4
release-readiness package, closing tracker items #126 (known-defect record,
previously scattered across commit references) and #133 (defect register
with severity/disposition/owner/retest status). Consolidates every real
defect and disclosed gap found across this project's own governance docs,
not a fresh audit — each row cites where it was originally found.

Severity follows this project's GitHub label convention
(`severity: critical` / `high` / `low`), mapped to the SDLC framework's
S1/S2/S3 language for item #135 ("no open S1 defect").

## Defects (bugs — behavior that violates a requirement)

| ID | Description | Severity | Status | Disposition | Owner | Retest |
| --- | --- | --- | --- | --- | --- | --- |
| D1 | Health-check endpoint leaked live `DATABASE_URL` | Critical (S1) | **Fixed** | Fixed 2026-09-13, same commit that found it (PIA prep) | Freston | Verified — endpoint no longer echoes the setting (`Privacy_Impact_Assessment.md` P1) |
| D2 | Overly permissive CORS with credentials enabled | Critical (S1) | **Fixed** | Fixed 2026-09-13 alongside D1 | Freston | Verified — `ALLOWED_ORIGINS` fails closed in production (`Privacy_Impact_Assessment.md` P2) |
| D3 | No brute-force/rate-limiting on login, refresh, forgot-password | High (S2) | **Fixed** | Fixed 2026-09-13, commit `5ffdae2` | Freston | Verified this session — ran `test_rate_limit.py` directly (2 passed), not just read the commit message |
| D4 | `login`/`refresh`/`logout` insert/query `refresh_tokens` (RLS-protected, `FORCE ROW LEVEL SECURITY`) without ever setting `app.tenant_id` — login 500s, refresh always 401s a valid token, logout silently never revokes anything, all against real Postgres | **Critical (S1)** | **Fixed and merged** | PR #4, merged to master (`b3e524c`), MiltonBello15 review verified `APPROVED` | Freston (author), Milton (reviewer) | Verified end-to-end against real Postgres; full backend suite and `test_rls_policies.py` both re-run clean after merge |
| D5 | Every `add() -> commit() -> refresh()` write endpoint (`accounts`, `categories`, `notifications`, `recurring_bills`, `savings_goals`, `transactions`, `subscriptions`, and the new `banking`) 500s against real Postgres — `expire_on_commit=True` (SQLAlchemy's default) plus an explicit post-commit `db.refresh()` both need a fresh SELECT, and `app.tenant_id` (`SET LOCAL`, transaction-scoped) is gone the instant `db.commit()` ends the transaction, so `FORCE ROW LEVEL SECURITY` rejects the read | **Critical (S1)** | **Fixed** | `app/database.py`: `expire_on_commit=False`; removed every now-redundant explicit `db.refresh()` after a commit, across 8 router files | Freston (author), Milton (reviewer, pending) | Found while testing Banking against real Postgres; confirmed as pre-existing (not banking-specific) by reproducing on `POST /api/accounts`; fixed, then full backend suite + `test_rls_policies.py` both re-run clean; also surfaced and fixed a related formatting bug (D5a below) |
| D5a | With D5's fix, money fields stopped round-tripping through the DB's `NUMERIC(18,2)` column, so responses returned whatever decimal precision the client sent (e.g. `"25.5"` instead of `"25.50"`) — caught by an existing contract test (`test_cross_tenant_account_visibility_and_transaction_creation`) failing on the exact string, not a new bug the fix introduced into user-facing behavior unnoticed | Low (S3), test-only impact | **Fixed** | Added a reusable `Money` Pydantic type (`app/schemas.py`) that quantizes to 2dp on every Create/Update input field; also fixed FX-converted Gross Balance amounts, which had the same unquantized-division issue independent of D5 | Freston (author) | Full backend suite passing, including the originally-failing test, unchanged |

**D4 closes tracker item #135** ("no open S1 defect") now that it's fixed
and merged, verified against `master` directly. **D5 is fixed but not yet
merged** — a GitHub issue #8 filed; PR still needed, same discipline already
applied to D4: #135 doesn't get to claim D5 as closed until the fix
actually lands, not just exists.

## Disclosed gaps (known limitations, not requirement violations)

Carried forward from where each was originally found — restated here only
for a single release-readiness view, not re-litigated.

| ID | Description | Severity | Status | Disposition | Source |
| --- | --- | --- | --- | --- | --- |
| G1 | Soft-delete only; no actual purge job past 30 days | Low (S3) | Open, disclosed | Blocked on a job-scheduler decision, not urgent pre-launch | `Privacy_Impact_Assessment.md` P4 |
| G2 | No Stripe Data Processing Agreement reviewed | High (S2) | Open, disclosed | **Should close before accepting real payments** — a legal/contractual gap, not a code fix | `Privacy_Impact_Assessment.md` P5 |
| G3 | Email verification/reset tokens have no real delivery channel (dev-only echo) | Low (S3), fail-closed | Open, disclosed | Feature genuinely unusable in production today rather than insecure (no email path exists to leak a token over) — needs an email provider decision | `Privacy_Impact_Assessment.md` P6 |
| G4 | Free-text `transaction.note` could capture sensitive data the user doesn't expect to be "financial data" | Low (S3) | Open, accepted | Inherent to any free-text field in any finance app; disclosed rather than silently ignored | `Privacy_Impact_Assessment.md` P7 |
| G5 | No dedicated secrets vault (env vars only) | Low (S3) at current scale | Open, disclosed | Appropriate pre-launch; Render's environment-variable groups are the intended next step, not a vault | `Security_Design.md` §3 |
| G6 | Staff console (`admin.html`) is same-origin with the consumer app, not the separate origin FR-11.3 specifies | Medium — real, but has nowhere to resolve until a real deployment exists | Open, disclosed, **expected to resolve at deploy time** | The code already assumes two origins (`vite.config.ts` builds both entry points separately); only actual hosting with domain routing closes this | `Hosting_Decision_Finance_Management_Platform.md` §1; seen directly in the running staff console's own banner this session |
| G7 | `enforce_admins=false` on `master` branch protection — the repo owner can still push/merge directly, bypassing required review | Medium | Open, disclosed | Deliberate single-contributor-era tradeoff; now that Milton has write access and is reviewing real PRs (#1, #2, PR #4 pending), this should be revisited before G4 closes — flip to `enforce_admins=true` once Milton's review workflow is established as the norm, not the exception | Tracker item #117 |
| G8 | 11 migrations, zero rehearsed rollback drills against a production-shaped incident scenario (mechanism verified in isolation, not under pressure) | Low (S3) | Open, disclosed | Acceptable pre-launch; a real drill belongs in the first post-launch operational review (G5) | `Transition_Support_Rollback_Closure.md` §4 |

## What this closes and what it doesn't

- Closes #126 and #133 as a consolidated register exists now.
- Does **not** close #135 — D5 (issue #8) must actually merge first; D4
  already has, verified against `master` directly.
- G2 (no Stripe DPA) is flagged here as the one disclosed gap that should
  arguably block accepting *real* payments specifically, separate from
  general release readiness — a legal review, not something this document
  can resolve by restating it.
