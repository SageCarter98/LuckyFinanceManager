# PM Gate 3 — Delivery Readiness Plan

Prepared 9 September 2026, building on `Project_Charter_Finance_Management_Platform.md`
(Gate 2, approved with conditions) rather than restating it.

## 1. Scope, deliverables, exclusions, acceptance criteria (item #24)

Unchanged from the Gate 2 charter's Scope/Exclusions and Success/Acceptance-Criteria
rows. No material change since Gate 2 approval.

## 2. Work breakdown structure (item #25)

Derived directly from the FRS Implementation Plan's own Workstreams A-H and its
Increments 1-6 (`files/FRS_Finance_Management_Platform_Implementation_Plan.md` §2, §6)
— restated as work packages, not a new decomposition:

| Work package | Status | Source |
|---|---|---|
| WP1 — Frontend foundation & security boundary | Complete | Workstream A / Increment 1 |
| WP2 — Auth & onboarding | Partially done, backend-limited | Workstream B / Increment 2 |
| WP3 — Manual finance product (accounts/categories/transactions/bills/goals/reports) | Done against real API | Workstream C / Increment 3 |
| WP4 — Notifications, export, deletion | Partially done | Workstream D / Increment 4 (partial) |
| WP5 — Subscription & billing | Not started (no backend model) | Workstream E / Increment 4 (partial) |
| WP6 — Read-only banking | Not started, blocked pending approvals | Workstream F / Increment 5 |
| WP7 — Isolated support console | Functional core done, not on separate origin | Workstream G / Increment 6 |
| WP8 — Quality, accessibility, release | Not started | Workstream H / Increment 6 |

## 3. Schedule (item #26)

**Not started.** No dependencies, milestones, estimates or contingency exist beyond the
work-package list above — this requires the cost/duration figures the sponsor
confirmed (9 Sep 2026) do not yet exist even as ranges (carried from the open Gate 2
condition, item #17, due 2026-10-09). Not invented here.

## 4. Budget (item #27)

**Not started** — same block as Section 3.

## 5. Responsibility assignment / RACI (item #28, Appendix H)

| Activity | Accountable | Responsible | Consulted | Informed |
|---|---|---|---|---|
| All development, review, testing, release decisions | Freston Kenny Adedeme | Freston Kenny Adedeme | — (no independent reviewer currently available) | — (no other stakeholders, confirmed Gate 1 §3) |

One name in every cell is the honest state of a solo project — not a template failure.
This is the same role-separation gap already disclosed and unresolved (item #37 below).

## 6. Quality plan (item #29)

Test strategy per SRS §7 and `G2_Design_Readiness.md` §4; acceptance criteria per SRS §7
launch-acceptance list and the FRS Implementation Plan §9 verification/acceptance plan
(already Complete evidence at G1, items #96/#99). Review points: this project's own
gate sequence (G1 done, G2 in progress, G3/G4 ahead) functions as the review-point
calendar in the absence of separate sprint/iteration reviews.

## 7. Risk register, response actions, issue process, escalation thresholds (item #30)

Extending the R1-R9 register (`Gate1_G0_Intake_Record.md` §14) with response actions:

| # | Risk | Response action | Escalation threshold |
|---|---|---|---|
| R1 | No version control | **Recommend initializing git now** — trivial, reversible, unblocks item #33 and future SDLC G3 items (#115+) | If not resolved before Gate 4, blocks release readiness outright |
| R2 | No CI | Add CI once a hosting/deployment decision is made | Blocks G4 |
| R3 | No frontend tests | Add alongside next frontend feature work | Blocks G4 |
| R4 | Bus factor of 1 | No action currently possible without a second contributor | Escalates automatically at any sponsor unavailability |
| R5 | Role-separation gap | Formally unresolved; revisit before G2/Gate 4 per Gate 1 decision | Blocks a clean (non-conditional) Gate 4 approval |
| R6 | Regulatory exposure | Legal/security review required before bank-linking (already enforced as a hard block in the FRS plan) | Blocks Increment 5 start |
| R7 | No secrets management | Adopt before any real secret is introduced | Blocks production deployment |
| R8 | Bank-consent design | Design work deferred until Increment 5 begins | N/A until then |
| R9 | Dual-project capacity | Carried as the Gate 1 condition, due 2026-10-09 | If unresolved, cadence must be formally reduced |

Issue process: none formally exists (no ticketing/issue tracker found in the project).
**[SPONSOR TO CONFIRM]** — whether an issue tracker should be adopted now or deferred.

## 8. Communication, stakeholder engagement, reporting calendar (item #31)

No external stakeholders exist (confirmed Gate 1 §3). Reporting calendar defaults to
the PM Framework's Class A cadence table (weekly delivery review, status at least every
two weeks) — but this is exactly the cadence the sponsor already flagged as not
confirmed sustainable (Gate 1 condition, due 2026-10-09). This item cannot be marked
Complete until that condition resolves one way or the other.

## 9. Security, privacy, data, access, backup, continuity, release controls (item #32)

Cross-references `G2_Design_Readiness.md` §3 (threat model) and §4 (test/backup
strategy) rather than duplicating them. Real: bcrypt/JWT auth, Postgres RLS.
Not real yet: backup implementation, continuity plan, release controls (no CI/CD, no
deployment target).

## 10. Change, configuration, version, document, records management (item #33)

**Not started — and cannot honestly be marked otherwise.** No version control system
exists anywhere in this project (confirmed repeatedly this session: no `.git` in the
project root, `backend/`, or `frontend/`). There is no way to satisfy "version...
management method" without one.

**Recommendation:** initialize git now. This is low-risk and fully reversible (a bare
`git init` with no remote/push), and it's the single highest-leverage action available
to unblock this item, several SDLC G3 items (source-controlled code, PR/review
evidence, peer review — all currently "Not started" and cascading from this same root
cause), and risk R1. This document does not do it unilaterally — see the question at
the end of this session's reply.

## 11. Transition, training, support, handover, rollback, closure approach (item #34)

**Not started.** No production release exists yet — appropriately too early for this
item to be anything but Not started.

## 12. Benefits review effort, operational benefit owner, default Gate 7 date (item #35)

Operational benefit owner: Freston Kenny Adedeme. Default Gate 7 timing formula (Class
A): 6 months after Gate 6, interim review at 3 months — not yet applicable (Gate 6 not
reached). Protected review effort: 2 person-days plus measurement cost per the same
table. Benefit **measures** themselves remain unrecorded — sponsor confirmed (Gate 2)
no adoption/conversion/reliability targets exist yet; not invented here.

## 13. Baseline quality tests: complete, consistent, achievable, controlled, acceptable (item #36)

**Not started.** Cannot pass "complete" while the schedule (#26) and budget (#27) are
entirely absent, or "controlled" while no version-control/change-management method
(#33) exists. This is an honest failure of the baseline-quality gate, not an oversight
in applying it.

## 14. Role separation meets Section 3.3, or compensating assurance approved (item #37)

**Not started — unresolved, unchanged from Gate 1.** See `Gate1_G0_Intake_Record.md`
§10: every named role is held by one person, and the Executive Authority who would
approve a compensating arrangement is the same person. This has not changed and this
document does not claim otherwise.

## 15. Plan readiness checklist (Appendix C), signed by Sponsor, PM and reviewers (item #38)

**Not started.** The checklist requires sign-off from parties who, per item #37, are
currently the same single person for every role — a checklist "signed by Sponsor, PM
and reviewers" cannot honestly be marked Complete while that gap is open. Recording it
as signed would misrepresent independence that doesn't exist.

## 16. Gate 3 decision (item #39)

**Recommendation, not a decision:** given how much of this gate's actual subject matter
— schedule, budget, version control, an independently reviewed and signed plan — is
genuinely absent (not merely undocumented, but not existing), an **Approve with
conditions** decision here would be carrying forward the same handful of root gaps
(cost/schedule/benefit figures, no VCS, role separation) across a third consecutive
gate. A **Hold** may be the more honest instrument at this point — signaling that Gate
3 is not yet ready to open in earnest until at least the schedule/budget figures and
version control exist, rather than accumulating conditions indefinitely. This is the
sponsor's call, not something this document decides.
