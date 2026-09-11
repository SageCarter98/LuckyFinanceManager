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

**Updated 2026-09-11**: a remote now exists (`github.com/SageCarter98/LuckyFinanceManager`) and
a CI pipeline now exists (`.github/workflows/ci.yml`, see §4) — the blocker this section
originally cited ("requiring checks has no CI to check yet") is resolved. Branch protection
itself has not yet been applied via the GitHub API: pending the user's go-ahead to push the
new CI workflow and confirm it runs green first (applying branch protection is a real,
repo-settings change). When applied, it will require the `test`/`rls-verification` checks
to pass but will deliberately **not** require an approving review — a solo contributor
requiring review of their own PRs would just invite the self-approval bypass this
framework's own precedent warns against; disclosed, not silently worked around. Item #116
(reviewer evidence specifically) stays **Not started** — that needs a second contributor,
which CI cannot substitute for.

## 3. Peer review (item #118)

**Not started — same disclosed role-separation gap** as Gate 1 §10 and Gate 3 #37/#38.
No second reviewer currently exists on this project. This is the same root cause
appearing for the fourth time across four gates; it is not a new finding.

## 4. Automated tests, build retention, CI (items #119, #120, #121)

**Updated 2026-09-11.** Backend test count is now 23 (`test_api.py` + `test_subscriptions.py`),
plus 3 Postgres-only RLS tests (`test_rls_policies.py`) that skip cleanly under the default
SQLite dev/test setup. A CI pipeline now exists at `.github/workflows/ci.yml` with two jobs:
`test` (backend pytest, frontend lint+build, gitleaks secret scan, pip-audit, pip-licenses,
npm audit) and `rls-verification` (a real Postgres service container, a least-privilege
non-superuser role, `alembic upgrade head`, then the RLS test file) — the first time this
project's migration chain, RLS policies included, would run against real Postgres in an
automated way. Every command in the workflow has been verified to work when run locally by
hand; the workflow itself has **not yet run on GitHub Actions** (this machine has no
Docker/Postgres to dry-run it, and it has not been pushed yet — pending the user's go-ahead).
Zero frontend unit tests still exist (out of scope for this pass). All three items remain
**In progress**, not Complete, until the workflow has actually executed successfully on GitHub.

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

This covered **direct** dependencies only when first written — **updated 2026-09-11**:
`pip-audit` and `pip-licenses` are now installed and wired into CI's `test` job
(`pip-audit -r requirements.txt`, `pip-licenses --format=json` uploaded as a build artifact,
plus `npm audit` for the frontend). Running `pip-audit` locally surfaced real, previously
undetected vulnerabilities: `python-jose` 3.3.0 (2 CVEs, central to JWT auth — not upgraded
yet, needs regression testing first), `pytest` 8.3.3 (fix is a major 9.x bump, deferred),
`starlette` 0.38.6 pulled in transitively via the pinned `fastapi==0.115.0` (multiple CVEs,
fix requires a `fastapi` upgrade, deferred), and `ecdsa` 0.19.2 (`PYSEC-2026-1325`, no fixed
version exists upstream — an accepted residual risk). Two low-risk bumps *were* applied
(`python-dotenv` 1.0.1→1.2.2, `python-multipart` 0.0.9→0.0.31), with the full test suite
re-verified passing (23/23) afterward. This item stays **In progress**, not Complete — the
SBOM tool gap is closed, but real, disclosed vulnerabilities remain unresolved (see the
known-defect register below) and this is still direct-dependency coverage, not a full
transitive SBOM (`pip-licenses`/`pip-audit` cover the installed set, not a formal CycloneDX/
SPDX document).

## 6. Secrets management (item #123)

**Updated 2026-09-11**: automated secret scanning (`gitleaks/gitleaks-action@v2`) is now
wired into CI's `test` job, replacing the prior manual `git status` re-check before each
commit. Only `.env.example` placeholders exist, no real secret has been found committed,
but no approved secret store/vault exists for when real secrets are introduced. **In
progress.**

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
genuine addition to the defect record, not a restatement.

**Updated 2026-09-11**: `pip-audit` (see §5) surfaced further real, previously-undetected
defects: vulnerable pinned versions of `python-jose`, `pytest`, and `starlette` (via
`fastapi`), plus an unfixable residual risk in the transitive `ecdsa` dependency
(`PYSEC-2026-1325`, no patched version exists upstream). Full detail recorded in this
project's PM/SDLC tracker, item #126. Two low-risk dependency bumps were applied and
verified (`python-dotenv`, `python-multipart`); the higher-risk ones were deliberately
deferred, not silently skipped. Still **In progress**, not Complete — there is no
dedicated, centralized issue tracker; defects are recorded in governance documents and
the tracker rather than a controlled register.

## 10. G3 decision (item #127)

Recommend **Approve with conditions** for the SDLC track specifically (not a PM-track
decision — G3 has no separate PM gate per the alignment table). Real, verifiable
progress exists across most items; the remaining gaps (PR/review workflow, branch
protection, CI, independent peer review) share the same root causes already tracked as
open conditions on Gates 1-3, plus one new item: whether to set up a remote repository.
