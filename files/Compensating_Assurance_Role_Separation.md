# Compensating Assurance for Role Separation

Prepared 13 September 2026, at the direction of Freston Kenny Adedeme
(Sponsor / Project Manager / Technical Lead / Service Owner, and Executive
Authority / Executive Sponsor per PM Framework §3.4). Resolves PM
Framework §3.3 and SDLC role-separation requirements for this Class A / SDLC
Class 3 project, closing tracker items #37, #38 (PM Gate 3), #116, #118,
#124 (SDLC G3), and #146 (SDLC G4 — see §6, added 2026-09-13). Freston no
longer holds Release Authority as of §6 below; it is delegated to Milton.

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

## 2a. Update 2026-09-13: permission raised to write

Milton's access was raised from **read** to **write** (push) the same day,
at the direction of Freston Kenny Adedeme (Executive Authority), so he can
merge pull requests he has reviewed rather than only approve them. Verified
against the GitHub API after the change: `permissions.push: true`,
`role_name: "write"`.

This does not reopen the least-privilege reasoning in section 2 by itself:
branch protection on `master` (item #117) still requires a passing PR with
1 approving review and green status checks for any non-admin, Milton
included — write access lets him act on a review he's already given
(merge), it does not let him bypass the review requirement or push directly
around it. `enforce_admins: false` remains scoped to the repo owner only;
Milton is not an admin and is not exempt from these checks.

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
  Sponsor, PM and reviewers): Milton accepted the collaborator invitation
  on 2026-09-13 (confirmed against the GitHub API -- `read` permission on
  record, zero pending invitations remaining), but has signed nothing.
  That item stays In progress -- its blocker changed from "no independent
  party exists" to "the named party accepted but hasn't signed anything
  yet," which is further progress but still not completion.
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

## 6. Release Authority delegation (2026-09-13)

Separate from the Technical/Quality Reviewer role in §2 above (compensating
assurance for code review, PM §3.3), this section addresses a different,
larger role: **Release Authority**, defined in `KenAddme_SDLC_Framework_
v1.2.md`'s "Key roles and accountabilities" table as holding *"the final
institutional decision to authorise a production deployment at G4 and to
require its rollback,"* and closing tracker item #146 ("release authority
is not the sole author of the release").

**The gap:** per that same table, *"the role must not be held by the sole
author of the release."* Until this section, Freston held every named role
on this project, Release Authority included (see this document's own
header before today's edit) — the same structural problem §1-§5 already
disclosed for code review, but for the G4 deployment decision specifically,
which is materially higher-stakes than a single PR review.

**Delegation:** per the framework's own language — *"the Executive
Sponsor or a formally recorded delegate is the release authority for
Class 3 and Class 4"* — Freston Kenny Adedeme, as Executive Sponsor,
formally delegates Release Authority for this project to **Milton
(GitHub: `MiltonBello15`)**, effective 2026-09-13.

**What this role actually holds:** the go/no-go decision to authorise a
production deployment at G4 (tracker #148, and the PM Gate 4 decision,
#51), and the authority to require a rollback of a live deployment.
It does **not** include hands-on deployment execution (item #142, "build
and deployment credentials kept separate" — Freston retains operational/
DevOps execution access; Milton holds the decision, not the button) and
does not replace the separate Technical/Quality Reviewer role in §2,
though one person may hold both.

**What this does not yet resolve, disclosed not hidden:** unlike §2's
GitHub invitation, there is no equivalent technical mechanism to verify
Milton's acceptance of this specific responsibility at the moment this
document is written — unlike an invite accept/reject, "release authority"
isn't a GitHub permission this repo's API can confirm. This delegation is
recorded as Freston's directed appointment; Milton's actual acknowledgment
is intended to be evidenced by his own review/approval on the pull request
carrying this document (same evidence model as items #37/#116/#118/#124),
not assumed from the appointment alone. Until that lands, treat this as
"appointed, acknowledgment pending," not "fully in effect."

**Review point:** reconsidered at the same checkpoint as §4 (SDLC G4 or
2026-12-13, whichever comes first) — not a permanent structure, same as
the reviewer role.

## Approval

Approved by Freston Kenny Adedeme, Executive Authority (PM Framework §3.4),
13 September 2026, by directing this arrangement and Milton's invitation
directly. §6's Release Authority delegation approved and directed the same
way, same date.
