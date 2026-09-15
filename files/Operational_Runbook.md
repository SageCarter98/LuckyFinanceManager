# Operational Runbook

Prepared 15 September 2026. Advances tracker item #144 (SDLC G4.17),
previously Not started — the runbook half specifically; monitoring/
alerting configuration stays disclosed as not ready (§4). Expands
`Transition_Support_Rollback_Closure.md` §3's support model into a
structure matching `KenAddme_SDLC_Framework_v1.2.md`'s own Emergency-
change procedure fields — the most concrete "what belongs in a runbook"
content that framework provides anywhere, even though it's framed there
for emergency changes specifically. No production environment exists yet,
so every field below describes what will be true at first deploy, not a
retrospective of an incident that's already happened.

## 1. Identification

- **Change/incident identifier**: the GitHub PR or issue number driving
  the change — this project already tracks real bugs as GitHub Issues
  (`CLAUDE.md`'s "Issue management process") with severity labels
  (`severity: critical/high/low`), so no separate incident-numbering
  scheme is introduced here.
- **Requester**: whoever raised the issue or need (currently only
  Freston; a client-reported issue post-launch would be logged the same
  way).
- **Authoriser**: for anything routine, none beyond normal PR review; for
  anything requiring a production rollback specifically, Milton as
  Release Authority (`Compensating_Assurance_Role_Separation.md` §6,
  restated in `Deployment_and_Rollback_Plan.md` §3's communication plan).
- **Operator**: Freston — the only person with deployment execution
  access (§6 of the Compensating Assurance document is explicit that
  Milton holds the decision, not the button).

## 2. Scope and access

- **Production access**: Render dashboard/account access, held solely by
  Freston. No shared or service-account credentials exist to separately
  scope down — this is the same single-point-of-failure already disclosed
  in `Transition_Support_Rollback_Closure.md` §3 and the risk register
  (`Gate1_G0_Intake_Record.md` §14, R4), not newly introduced here.
- **Database access**: via `DATABASE_URL` on the `finance-api` Render
  service only — no direct third-party database client access is planned
  by default.
- **What's explicitly out of scope for this runbook**: anything requiring
  a real Render account to rehearse (actual PITR restore through Render's
  own UI, actual monitoring/alert firing) — those remain open per §4.

## 3. Logs

- **Production** (once deployed): Render's own log stream for
  `finance-api`, stdout, structured JSON per
  `backend/app/core/logging_config.py`.
- **Local**: `uvicorn`'s console output.
- No log aggregation/retention service is chosen yet — logs live only as
  long as Render retains them by default, which has not been reviewed
  against any specific retention requirement.

## 4. Monitoring and alerting — not ready, disclosed

No monitoring or alerting service has been chosen or configured, and
nothing is deployed to monitor yet — matching
`Gate4_Release_Readiness_Checklist.md`'s Operations row exactly. What this
runbook *can* state ahead of that decision, so the eventual choice has
somewhere concrete to plug into:

- **What should be monitored, once something is live**: `GET /health`
  (uptime/liveness — already built, returns `status` and `environment`
  only, no credentials), Stripe webhook delivery success rate (a payment
  path silently failing is the single highest-impact failure mode for a
  finance app), and Render's own service-level metrics (CPU/memory,
  available on the Starter plan dashboard without extra tooling).
- **What this runbook does not decide**: which external service (if any)
  gets used for alerting — that is a real infra decision belonging to
  `Gate4_Release_Readiness_Checklist.md` §2 item 3, not something this
  document resolves by writing around it.

## 5. Backup-or-reason

Before any change touching production data or schema: confirm a recent
backup exists (mechanism verified — see
`Transition_Support_Rollback_Closure.md` §4a) or record explicitly why
one isn't needed for this specific change (e.g. a code-only deploy with
no migration). Never proceed on the assumption that "Render probably
backs it up" without confirming a specific, recent, restorable backup —
§4a's finding that `pg_dump` must run as a superuser/BYPASSRLS connection,
not the app's own role, means an unconfirmed backup could be silently
missing data, not just silently absent.

## 6. Rollback / containment path

Full mechanics: `Transition_Support_Rollback_Closure.md` §4 (schema vs.
application-code rollback are two distinct operations) and §4a
(backup/restore, rehearsed 15 September 2026). Decision authority and
communication: `Deployment_and_Rollback_Plan.md` §2-3. Not repeated in
full here — this runbook's job is to point to the authoritative source,
not fork it.

## 7. Smoke / safety verification

- `GET /health` must return a healthy response before a deploy is
  considered live (same check named in `Deployment_and_Rollback_Plan.md`
  §1 step 6).
- Both static frontends (`finance-consumer`, `finance-admin`) must serve
  their distinct entry points — a same-origin regression here would
  silently reintroduce the FR-11.3 gap `Defect_Register.md` G6 already
  tracks as expected-to-resolve-at-deploy-time.
- No automated smoke-test script exists yet; verification today is these
  two manual checks. Building an automated smoke-test step is reasonable
  future work, not claimed as done here.

## 8. What this does and does not close

- Advances #144's runbook content — identification, scope/access, logs,
  backup-or-reason, rollback path and smoke verification are now written
  against this project's real tooling, not a generic template.
- Does **not** close #144 outright: monitoring/alert configuration (§4)
  stays genuinely not ready, blocked on the same infra decision
  `Gate4_Release_Readiness_Checklist.md` already names.
