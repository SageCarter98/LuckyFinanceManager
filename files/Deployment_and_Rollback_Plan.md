# Deployment and Rollback Plan

Prepared 15 September 2026. Advances tracker items #141 (SDLC G4.14) and
#142 (SDLC G4.15), previously both Not started. Consolidates existing
decisions rather than re-deriving them — this document adds the two
pieces those decisions never covered (a communication plan, and an
explicit credential-separation statement), and is not a substitute for
`Hosting_Decision_Finance_Management_Platform.md` or
`Transition_Support_Rollback_Closure.md`, which remain the authoritative
sources for the deployment steps and rollback mechanics respectively.

## 1. Deployment plan

Mechanism: `render.yaml` (repository root), a draft, unvalidated Render
Blueprint — see `Hosting_Decision_Finance_Management_Platform.md` §5 for
its status and §4 for the one known pre-deploy gotcha (Render's bare
`postgres://` connection string must be hand-edited to
`postgresql+psycopg://` after first provisioning, or the backend will not
connect). Steps, in order:

1. Freston creates a Render account and links this repository.
2. Apply the `render.yaml` Blueprint (`finance-db`, `finance-api`,
   `finance-consumer`, `finance-admin`).
3. Edit `finance-api`'s `DATABASE_URL` to the `postgresql+psycopg://`
   scheme (§4 gotcha above) before first boot.
4. Set the `sync: false` environment variables in the Render dashboard —
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`,
   `FRONTEND_BASE_URL` — none of these are in the Blueprint file itself
   (see §4, credential separation).
5. First deploy runs `alembic upgrade head` as part of the build command
   automatically (already wired into `render.yaml`'s `buildCommand`) —
   no manual migration step.
6. Verify `GET /health` on `finance-api` before treating the deploy as
   live.
7. Confirm both static sites (`finance-consumer`, `finance-admin`) serve
   their correct entry points (`index.html` / `admin.html`) — this is the
   FR-11.3 two-origin split becoming real, not just built.

Every step above is still unexecuted against a real account — this
section describes the plan, not a completed deployment (see §5).

## 2. Rollback plan

Authoritative source: `Transition_Support_Rollback_Closure.md` §4,
verified this session's predecessor against real local Postgres, not
duplicated here. Restated only as a summary for this document's own
completeness:

- **Application code rollback** (Render's dashboard "Rollback" button) and
  **schema rollback** (`alembic downgrade <revision>`, run manually) are
  two distinct operations, not one — a deploy that adds a migration the
  old code doesn't expect requires running the schema rollback *first*,
  then the code rollback, not just clicking one button.
- Triggering a Render rollback disables autodeploy for that service until
  manually re-enabled.
- See `files/Transition_Support_Rollback_Closure.md` §4 and new §4a
  (backup/restore drill, added this session) for the verified mechanics.

## 3. Communication plan

Not previously written anywhere — a real gap this document closes.
Honest about the solo-operator reality (`Transition_Support...md` §3):
there is no team to notify, but there is a second named role now
(`Compensating_Assurance_Role_Separation.md` §6, Milton as Release
Authority) whose involvement this plan has to name explicitly rather than
assume:

- **Before a deploy carrying schema changes or other material risk**:
  Freston notifies Milton (as Release Authority) with the release
  package notes (`Release_Package_Notes.md`-style summary: what's
  changing, migration involved or not, rollback plan) and requests
  explicit go/no-go, per Milton's role as defined in
  `Compensating_Assurance_Role_Separation.md` §6 — this is the actual
  mechanism by which "the G4 decision" (#148) gets made, not a rubber
  stamp after the fact.
- **During a deploy**: no real-time status channel exists or is needed at
  this scale (one operator, one reviewer) — the deploy's own smoke-test
  result (§1 step 6) is the signal.
- **After a deploy**: Freston records the outcome (success, or the
  rollback path taken) and notifies Milton, closing the loop on the
  go/no-go he gave beforehand. This record is what G4.20's "actual
  deployment, deviations, approvers and outcome recorded" will consist
  of, once a real deployment happens.
- **If a deploy needs to be rolled back**: per §6 of the Compensating
  Assurance document, Milton *holds the decision* to require a rollback;
  Freston *holds the execution access* to actually perform one. A
  rollback is Freston acting on Milton's authorisation, not a unilateral
  operational call, for any deploy material enough to have gone through
  the pre-deploy notification above.

## 4. Credential separation and deployment automation (G4.15)

**Separation, by design, already true without further action:**

- `render.yaml` contains **no real secret values**. `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` and `FRONTEND_BASE_URL` are
  declared with `sync: false` — Render requires them to be entered
  directly in its dashboard, never committed to this repository.
  `SECRET_KEY` uses `generateValue: true` — Render generates it, this
  repository never sees it.
- CI (`.github/workflows/ci.yml`) and deployment are already separate
  systems with no shared secret material: CI's tests run against
  ephemeral SQLite or a throwaway Postgres service container with
  test-only credentials (`finance_app`/`finance_app_test`, matching
  [[postgres_local_setup]]'s local mirror), never against anything
  resembling a production credential.
- Per `Compensating_Assurance_Role_Separation.md` §6: Milton holds the
  deployment *decision*, Freston retains the deployment *execution
  access* (Render dashboard/account). These are already different people
  holding different capabilities — the role-separation half of this
  item is satisfied by that delegation, not by anything new here.

**Automation, by design, partially true:**

- Render's own git-push-to-deploy model, once the account exists and the
  Blueprint is applied, makes deployment automated and repeatable by
  default — no separate deploy script or pipeline is being proposed,
  because Render's platform already provides this for a service backed
  by a Blueprint.
- `alembic upgrade head` runs as part of the build command automatically
  (§1 step 5) — migrations are not a manual post-deploy step.
- **What's still unexecuted, disclosed plainly**: none of the above has
  run against a real account. "Automated by design" is not the same
  claim as "automated and proven" — that proof is G4.20 (deployment
  executed), not this item.

## 5. What this does and does not close

- Advances #141 (G4.14) and #142 (G4.15) by supplying the communication
  plan and credential-separation statement neither existing document
  covered, and by consolidating the deployment/rollback mechanics into
  one referenceable plan.
- Does **not** close either item outright: per
  `Gate4_Release_Readiness_Checklist.md`'s own Deployment row, these plans
  need Milton's actual approval as Release Authority, which has not
  happened as of this writing — naming the plan is not the same as
  approving it.
- Does **not** authorise spend, create any account, or execute any
  deployment step. Nothing here should be read as G4.20 evidence.
