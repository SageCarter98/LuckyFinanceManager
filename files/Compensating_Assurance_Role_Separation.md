# Compensating Assurance for Role Separation

Prepared 13 September 2026, at the direction of Freston Kenny Adedeme
(Sponsor / Project Manager / Technical Lead / Service Owner / Release
Authority, and Executive Authority per PM Framework §3.4). Resolves PM
Framework §3.3 and SDLC role-separation requirements for this Class A / SDLC
Class 3 project, closing tracker items #37, #38 (PM Gate 3) and #116, #118,
#124 (SDLC G3).

## 1. The gap this addresses

Section 3.3: *"No individual may be the sole author, reviewer, tester and
approver of the same material deliverable... Where staffing prevents the
required separation, the Project Authority must approve a named reviewer
who is independent of delivery, the evidence to be checked and the time
limit. Class A compensating arrangements require Executive Authority
approval."* Since this project's inception (`Gate1_G0_Intake_Record.md` §10),
one person has held every named governance and delivery role, with no
independent reviewer -- this document names one.

## 2. Named independent reviewer

**Milton (GitHub: `MiltonBello15`)**, invited as a collaborator on this
repository 2026-09-13 with **read** access -- the minimum permission
GitHub requires for a collaborator's review to count toward this repo's
required-approving-review branch protection rule, chosen deliberately over
write access per this project's own least-privilege posture (the same
reasoning behind the RLS bypass scoping in the admin console, item #126).

**Independence check performed, not assumed:** Milton is an existing
collaborator on a separate KenAddme-governed repository
(`premium-basic-school-management-system`, "PBSMS"), not a contributor to
this project, satisfying "independent of delivery" for this codebase.

**Correction to an unverified claim:** it was stated that Milton's review
of this project "is almost done, initiated prior to the application
development." Checked directly against the primary source before writing
anything here -- all 87 pull requests on the PBSMS repository, plus a
full-repository comment and involvement search for `MiltonBello15` -- and
found **zero** recorded review activity, comments, or involvement from that
account anywhere in that repository's history. Every formal PR review found
there is a self-review by the repository owner. This document therefore
records Milton's assignment as **starting 2026-09-13**, not as crediting
prior review work that could not be verified. If review work genuinely
occurred outside GitHub (in person, another tool), it is not evidenced here
and should be added as a correction with its own primary-source reference
if it exists.

## 3. Scope

Per §3.3's own language ("critical security, data, payment or
infrastructure changes") and this project's actual risk surface: changes
to authentication/session handling (`backend/app/core/security.py`,
`app/routers/auth.py`), tenant isolation and Postgres RLS (`app/tenant.py`,
`alembic/versions/*rls*`), the admin/support console and its audit
controls (`app/routers/admin.py`, `masking.py`), billing/Stripe integration
(`app/routers/subscriptions.py`), and any database migration. Milton's
approving review is required on pull requests touching these areas before
merge; review on other changes (UI copy, tests, documentation) is welcomed
but not mandated by this arrangement.

## 4. Time limit

This arrangement is reviewed for continuation or replacement at whichever
comes first: **SDLC G4 (release readiness)**, or **2026-12-13** (90 days
from this record). At that point, the Sponsor/Executive Authority
re-confirms Milton's continued availability and independence, or names a
replacement -- this is not a permanent substitute for genuine team growth.

## 5. What this does and does not resolve

- Closes item **#37** (PM Gate 3.14): its own description ("compensating
  assurance approved and recorded") is exactly what this document is --
  a named reviewer, scope, and time limit, approved by the Executive
  Authority. This item is Complete.
- Does **not** close item **#38** (plan readiness checklist signed by
  Sponsor, PM and reviewers): Milton has been invited but has not yet
  accepted, and has signed nothing. That item stays In progress -- its
  blocker changed from "no independent party exists" to "the named party
  hasn't acted yet," which is real progress but not completion.
- Does **not** close items **#116, #118, #124** (SDLC G3): these require
  actual reviewer evidence on actual pull requests. None exist yet under
  this arrangement. They stay In progress, now unblocked in principle but
  not yet in practice.
- Does not retroactively make any of this project's ~20 prior self-approved
  commits/pushes independently reviewed -- those remain what they were
  (single-contributor work, several pushed directly to master bypassing
  required review, per item #117's own disclosure).
- Does not waive any legal, security, privacy or financial control, per
  §3.3's own limit on compensating arrangements.

## Approval

Approved by Freston Kenny Adedeme, Executive Authority (PM Framework §3.4),
13 September 2026, by directing this arrangement and Milton's invitation
directly.
