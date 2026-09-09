# SDLC G3 — Code Complete Assessment

Prepared 9 September 2026. Per the PM/SDLC alignment table, G3 code-complete evidence
is an engineering prerequisite for PM Gate 4 (Release Readiness) — it does not carry
its own PM-track decision, but it is the SDLC track's own gate and is assessed here
before Gate 4 work begins.

## 1. Version control (item #115)

**Now Complete.** Git was initialized this session (commit `3fd796f`) — source code,
configuration (`.env.example`, alembic config, package manifests) and this governance
documentation are all version-controlled as of today. No infrastructure-as-code exists
yet (no Dockerfile/Terraform) because no deployment target has been chosen — nothing to
version-control there yet, not a gap in this item.

## 2. Work items, commits, PRs, reviewer evidence (item #116) and branch protection (item #117)

**Both Not started.** Exactly one commit exists (today's initial commit). There is no
remote/hosted repository (GitHub, GitLab, etc.), so pull requests, branch protection,
and required status checks are not just undone but structurally impossible until a
remote is chosen. **[SPONSOR TO CONFIRM]** — whether to set up a remote now (e.g.
GitHub) is a separate decision from initializing local git; not assumed here.

## 3. Peer review (item #118)

**Not started — same disclosed role-separation gap** as Gate 1 §10 and Gate 3 #37/#38.
No second reviewer currently exists on this project. This is the same root cause
appearing for the fourth time across four gates; it is not a new finding.

## 4. Automated tests, build retention, CI (items #119, #120, #121)

Unchanged from the last verified state: 4 backend tests exist and pass (independently
re-verified this session in the previous turn), zero frontend tests, no CI pipeline
exists to run any of it automatically or retain results in a controlled way. All three
items remain **In progress** (tests/build: real but manual) or **Not started** (CI:
does not exist at all).

## 5. Dependency and licence inventory (item #122)

**Upgraded this session with a real, mechanically-verified inventory** (not previously
done — earlier evidence only cited that manifest files exist, not their actual
licenses):

**Backend (direct dependencies, licenses read from installed package metadata):**

| Package | License |
|---|---|
| fastapi | MIT |
| uvicorn | BSD |
| SQLAlchemy | MIT |
| pydantic | MIT |
| passlib | BSD |
| bcrypt | Apache-2.0 |
| python-jose | MIT |
| python-dotenv | BSD-3-Clause |
| python-multipart | Apache Software License |
| httpx | BSD |
| email-validator | Unlicense |
| alembic | MIT |
| psycopg | LGPLv3 |
| pytest | MIT |

**Frontend (direct dependencies, licenses read from each package's `package.json`):**

| Package | License |
|---|---|
| react, react-dom, react-router-dom | MIT |
| tailwindcss, @tailwindcss/vite | MIT |
| vite | MIT |
| typescript | Apache-2.0 |

**One item worth flagging, not a blocker:** `psycopg` is LGPLv3 — permissive for
dynamic linking as used here (a Python package dependency, not a statically linked
library), but worth a conscious note for a Class 3 project rather than an unexamined
assumption.

This covers **direct** dependencies only — a full software bill of materials
including transitive dependencies has not been generated (no SBOM tool such as
`pip-licenses`/`syft` is installed). This item stays **In progress**, not Complete,
for that reason — a real improvement over the prior state, not a finished artifact.

## 6. Secrets management (item #123)

Unchanged — only `.env.example` placeholders exist, no real secret has been found
committed (confirmed again in this session's `git status` review before committing),
but no approved secret store/vault exists for when real secrets are introduced.
**In progress.**

## 7. AI-generated code review and acceptance (item #124)

Unchanged assessment: this codebase is developed with an AI coding assistant under
direct, turn-by-turn human direction — every change in this session was directed,
reviewed for factual accuracy, and in several cases corrected or redirected by the
sponsor (e.g. the SRS baseline decision, the git-init decision, gate-decision framing).
That is real human oversight, but it is not **independent** review distinct from the
person requesting the change — the same role-separation gap as item #118. **In
progress**, not Complete — consistent with the precedent this framework explicitly
warns against (rounding up self-review to independent acceptance).

## 8. Documentation currency (item #125)

Unchanged — SRS, FRS Implementation Plan and this session's gate records are kept
current alongside changes. **In progress** (no code changed this session besides
`.gitignore`; the last real code-and-doc-together update was the Increment 3 CSV-import
fix, already documented).

## 9. Known-defect and deviation records (item #126)

**Strengthened this session** — `G2_Design_Readiness.md` §3 records a new, real,
previously undocumented defect (the non-functional refresh-token flow: issued and
redeemed client-side, but no backend endpoint exists to redeem it against). This is a
genuine addition to the defect record, not a restatement. Still **In progress**, not
Complete — there is no dedicated, centralized issue tracker; defects are recorded in
governance documents rather than a controlled register.

## 10. G3 decision (item #127)

Recommend **Approve with conditions** for the SDLC track specifically (not a PM-track
decision — G3 has no separate PM gate per the alignment table). Real, verifiable
progress exists across most items; the remaining gaps (PR/review workflow, branch
protection, CI, independent peer review) share the same root causes already tracked as
open conditions on Gates 1-3, plus one new item: whether to set up a remote repository.
