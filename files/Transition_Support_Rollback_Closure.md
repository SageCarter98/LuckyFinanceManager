# Transition, Training, Support, Handover, Rollback and Closure Approach

Prepared 13 September 2026. Closes tracker item #34 (PM Gate 3.11),
previously Not started. Written against the actual hosting decision
(`Hosting_Decision_Finance_Management_Platform.md`, Render) and the actual
migration chain in this repository, not a generic template.

## 1. Transition

No production environment exists yet -- transition means the first real
deploy, not a handover between teams (there is one team: one person).
Mechanism: the draft `render.yaml` Blueprint, once a Render account is
linked to this repository (in progress as of this writing). No separate
transition plan is needed beyond the deploy steps already listed in
`Hosting_Decision_Finance_Management_Platform.md` section 5 and its
`DATABASE_URL` scheme gotcha (section 4).

## 2. Training

No team exists to train. The one real onboarding need is Milton
(`Compensating_Assurance_Role_Separation.md`), who needs enough context to
review pull requests in his scope, not full project training. He has
access to: this repository's `CLAUDE.md` (documents the RLS pre-push hook,
CI, and project conventions), the actual PR diffs he's reviewing, and can
ask questions via PR comments. No separate onboarding document is
proposed -- would duplicate `CLAUDE.md` rather than add real value.

## 3. Support model

Solo operator, no on-call rotation -- realistic and disclosed, not
invented. The minimum floor this project's class actually needs is a
single-page runbook, not a full incident-management program:

- **Where logs live:** Render's web service logs (stdout, structured JSON
  per `backend/app/core/logging_config.py`) once deployed; locally, via
  `uvicorn`'s console output.
- **How to check service health:** `GET /health` (returns `status` and
  `environment` only, no credentials -- see `Security_Design.md` §1 for
  why that matters).
- **Who to contact:** Freston Kenny Adedeme -- there is no one else.
- **Known single point of failure:** one person; see risk register
  (`Gate1_G0_Intake_Record.md` §14, R4) -- not resolved by this document,
  restated here because a support model that hides its own bus-factor
  would be misleading.

## 4. Rollback

**Verified this session, not assumed:** ran `alembic downgrade -1` then
`alembic upgrade head` against the real local Postgres RLS test database
and re-ran the 6 RLS tests afterward -- clean round-trip, no errors, tests
still passing. All 11 migrations in `backend/alembic/versions/` have real
`downgrade()` implementations (not stubs), confirmed by reading each one,
not by trusting that migrations generally have downgrades.

**Two distinct rollback operations exist, and they are not interchangeable
-- a real risk found while writing this document, not previously
disclosed anywhere:**

1. **Application code rollback:** Render's dashboard "Rollback" feature
   (Deploys page, per-service) reuses a previous build's artifact and
   redeploys it. It does **not** run `alembic downgrade` -- it only
   changes which application code is running.
2. **Schema rollback:** `alembic downgrade <revision>`, run manually
   against the database.

**The risk:** if a deploy adds a migration the *old* code doesn't know
about (e.g. a new required column), clicking Render's one-click "Rollback"
puts the old code in front of the *new* schema, which can break in ways
the old code was never tested against. A safe rollback that also involves
a schema change requires running `alembic downgrade` **first**, then
rolling back the application code -- not just clicking one button and
assuming both happened. This project has 11 migrations and zero rehearsed
rollback drills against a production-shaped scenario; the verification
above proves the mechanism works in isolation, not that a real incident
response would go smoothly under pressure.

**Also noted:** triggering a Render rollback automatically disables
autodeploy for that service -- a real operational detail (confirmed via
Render's own documentation) that would otherwise surprise whoever
rolls back, expecting the next push to deploy normally.

## 5. Closure approach

No closure is anticipated in the near term (this is a live product being
built, not a time-boxed project), but the framework requires a stated
approach regardless. If this project were retired: cancel all active
Stripe subscriptions (not just deactivate accounts -- `DELETE /me`
already does this per-tenant, per `Security_Design.md`/`auth.py`), give
affected users advance notice and a window to use `GET /me/export`
(already built) before decommissioning, decommission the Render
services and database, and archive the GitHub repository rather than
deleting it, preserving the governance and evidence trail this session
has built.

## 6. Correction to a stale figure

While verifying the above, found `G2_Design_Readiness.md`'s 2026-09-13
amendment itself had already gone stale within the same session: it cited
"5 migration files" (from the original 9 September count); the real count
as of this writing is **11**. Corrected there, not just noted here, so the
same file doesn't carry two different wrong numbers depending on which
section a reader looks at.
