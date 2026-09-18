# Security and Privacy Review — G4.09

Prepared 2026-09-18. Closes tracker item #136's remaining gap: "Security/
privacy scan and review records" -- item #136's own note going into this
session read *"a source-level security scan for the frontend token/
credential boundary was performed and recorded; no platform-wide security/
privacy review has happened."* This document is that platform-wide review:
authentication, authorization, secrets, dependencies, transport/response
hardening, and the privacy documents' currency against the codebase as it
actually stands today -- not a restatement of `Security_Design.md` or
`Privacy_Impact_Assessment.md`, both of which it checks and, where stale,
corrects in place (see "Documents corrected" below).

Scope: the whole platform as of `master` at the start of this session
(`2878e42`), backend and frontend, including Banking (FE-14.x, shipped
2026-09-14) -- the newest and most sensitive surface, and the one least
covered by the existing security/privacy documents, both dated 2026-09-13.

## Method

Read the actual code for every trust boundary (auth, tenant/RLS context,
admin bypass, entitlement gating, webhook signature verification, CORS,
secrets loading) rather than re-deriving conclusions from prior documents.
Ran `pip-audit` and `npm audit` fresh against the pinned dependency sets
rather than citing prior scan results. Checked the two governing documents
(`Security_Design.md`, `Privacy_Impact_Assessment.md`) against the current
`models.py`/router set for drift since they were written, one day before
Banking shipped.

## Findings

### F1 — No production fail-closed guard on the default `SECRET_KEY` (fixed this session)

`app/config.py` shipped `SECRET_KEY` with a checked-into-the-repo default
(`"dev-secret-key-change-me"`, disclosed in `Security_Design.md` §3 and
`Defect_Register.md` G5). Unlike `DATABASE_URL` -- which `app/database.py`
already refuses to boot on on a sqlite value in production -- nothing
stopped a production deploy that forgot to set `SECRET_KEY` from silently
signing every JWT with a secret anyone with read access to this public
repo already has. That's a full authentication bypass: forge an access
token for any user id, including an admin, with no credential needed.

**Fix**: `app/config.py`'s `get_settings()` now raises `RuntimeError` if
`environment=production` and `secret_key` still equals the known default --
same fail-closed shape as the existing `DATABASE_URL` guard, deliberately
consistent with it rather than a new pattern. Verified by
`tests/test_security_hardening.py::test_production_boot_fails_closed_on_default_secret_key`
and `..._succeeds_with_real_secret_key` (subprocess-isolated, since
`get_settings()` is `@lru_cache`d and already populated by every other test
in the suite) -- both passing.

Severity: **High (S2)** as found (real, currently-exploitable-if-misconfigured
gap with no compensating control); resolved to **closed** by this session's
fix, pending PR review before it counts as landed (same "fixed but not yet
merged" discipline as D4/D5 in `Defect_Register.md`).

### F2 — No security response headers (fixed this session)

Grepped the whole backend for `X-Frame-Options`, `Content-Security-Policy`,
`X-Content-Type-Options`, `Strict-Transport-Security`: none exist anywhere.
`Security_Design.md` §4 correctly notes TLS termination is Render's job,
not this app's, but response headers are not a transport concern --
nothing add those, on any hosting layer, unless the application (or an
explicit reverse-proxy config that doesn't exist here either) sets them.

**Fix**: `app/main.py` gained a `security_headers` middleware setting
`Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`,
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: no-referrer`, and `Strict-Transport-Security` on every
response. The strict CSP is safe here specifically because this backend
only ever serves JSON -- the SPA is a separate build/origin, so there is no
HTML response from this service that could need a script-src exception.
Verified by `test_responses_carry_hardening_headers` (passing).

Severity: **Low-Medium** (defense-in-depth; nothing in this codebase's own
threat model depends on the *absence* of these headers, but their absence
removes a real layer against clickjacking/MIME-sniffing/protocol-downgrade
for zero functional cost to add).

### F3 — Dependency vulnerability posture: confirmed clean except one accepted, unfixable finding

Fresh `pip-audit -r backend/requirements.txt` (all 55 resolved packages,
direct and transitive) today: **zero vulnerabilities** except `ecdsa`
0.19.2 (`PYSEC-2026-1325` / `CVE-2024-23342`, Minerva timing attack on
P-256 signing -- no fixed version exists upstream, the maintainers
consider side-channel attacks out of scope). This is a transitive
dependency of `python-jose` regardless of the `[cryptography]` extra
(`python-jose` unconditionally requires `ecdsa` and `rsa`, confirmed via
`pip show -f python-jose`) -- but this app only ever signs/verifies HS256
(HMAC), so `security.py`'s `jwt.encode`/`decode` never exercise the
RSA/ECDSA path `ecdsa` exists for. Same conclusion the 2026-09-13
remediation commit (`7f44af0`) already reached and accepted as residual
risk -- independently re-verified today, not just carried forward.

`npm audit --omit=dev` on the frontend: **zero vulnerabilities** across 38
production dependencies.

**This finding is about documentation currency, not a new vulnerability**:
`G3_Code_Complete_Assessment.md` item #126 (§5/§9) and `ci.yml`'s
pip-audit step comment both still describe `python-jose`, `pytest`, and
`starlette` (via `fastapi`) as unpatched, deferred findings -- accurate as
of 2026-09-11, but commit `7f44af0` (2026-09-13) already remediated all
three, closing 23 CVEs, verified by the full backend suite (36/36) at the
time. Neither document was updated afterward to say so. **Fixed this
session**: `ci.yml`'s comment now reflects the current, single remaining
finding. `G3_Code_Complete_Assessment.md` item #126 is left for its own
owner to update (this review does not rewrite G3's gate narrative) but is
flagged here so it isn't missed.

### F4 — `Privacy_Impact_Assessment.md` and `Security_Design.md` predated Banking by one day (fixed this session)

Both documents are dated 2026-09-13. Banking (FE-14.x) shipped 2026-09-14
and added two new tables (`linked_accounts`, `linked_account_transactions`)
carrying a new category of financial PII (linked institution name, account
type, last-4, native balance, external transaction history) and attached
`require_active_entitlement` to a real router for the first time. Neither
document was revisited against the changed `models.py`/`dependencies.py`.
Specifically:

- `Privacy_Impact_Assessment.md` §1's data-enumeration table explicitly
  said *"no bank account/routing numbers (Workstream F/bank-linking is
  unbuilt and blocked)"* -- false as of 2026-09-14.
- `Security_Design.md` §2 said `require_active_entitlement` is
  *"intentionally unattached to any router today"* -- false as of
  2026-09-14; `dependencies.py`'s own docstring said the same thing.

**Fix**: all three corrected in place this session (see "Documents
corrected" below), each with a dated note rather than a silent rewrite, per
this project's own documentation convention.

**Not a new risk finding**: Banking's actual data model was already
reviewed as part of building it (`models.py`'s `LinkedAccount` docstring
records the no-real-credential, last4-only design decisions directly) --
the gap here is specifically that the two governance documents didn't
reflect a design that was already sound, not that the design itself has a
new problem.

### F5 — No systematic access/performance/resilience testing (pre-existing, out of this review's scope)

Confirmed via `tracker items --track SDLC --gate G4`: #131 ("Security,
privacy, performance, accessibility, compatibility, migration, backup/
restore and resilience testing") is honestly already In progress with
notes disclosing performance, accessibility depth, cross-browser
compatibility, and resilience/chaos testing as shallow or absent. This
review is the security/privacy half of that item (#136 specifically); the
performance/accessibility/resilience half is unchanged by this session and
remains its own open item, not re-litigated here.

## What is genuinely strong (not just "no finding")

- **Tenant isolation, two independent layers** (application-level filter +
  Postgres RLS with `FORCE ROW LEVEL SECURITY`), with the admin bypass
  proven read-only by dedicated tests
  (`test_rls_bypass_flag_does_not_relax_write_check`).
- **Mass-assignment surface checked directly**: `PUT /auth/me` does a
  blanket `setattr` loop over `payload.model_dump(exclude_unset=True))`,
  which would be a privilege-escalation risk if `UserUpdate` carried a
  `role`/`tenant_id`/`email_verified` field -- checked `schemas.py`
  directly: it doesn't (`full_name`, `timezone`, `preferred_currency`,
  `notification_preferences` only). No finding, but worth recording that
  this was checked, not assumed, since the pattern itself is a real risk
  shape.
- **Stripe webhook**: correctly uses `stripe.Webhook.construct_event` with
  the raw request body and `stripe-signature` header as the sole auth
  boundary for an intentionally-unauthenticated endpoint -- the right
  pattern, not a gap.
- **Token handling**: in-memory only on the client (never `localStorage`/
  `sessionStorage`, confirmed by source scan, not just the code comment
  claiming it); refresh tokens hashed at rest and rotated single-use;
  password reset revokes every existing refresh token for that user.
- **Banking's data model**: no real provider credential or full account
  number ever stored, by construction (`external_account_ref` is an opaque
  stub reference, not a token); consent lifecycle (`active`/`lapsed`) has
  server-side state, not just a client-side flag.
- **CI already runs** gitleaks (secret scanning), pip-audit, npm audit, and
  a real RLS-policy-verification job against actual Postgres in a
  dedicated CI job -- this is meaningfully more than "a scan exists
  somewhere"; the gap being closed here was the absence of a *manual,
  platform-wide* review layered on top of the automated scans, not the
  scans themselves.

## Documents corrected this session (evidence, not a claim)

| File | Change |
|---|---|
| `backend/app/config.py` | Added the F1 fail-closed guard |
| `backend/app/main.py` | Added the F2 security-headers middleware |
| `backend/app/dependencies.py` | Fixed the stale `require_active_entitlement` docstring (F4) |
| `backend/tests/test_security_hardening.py` | New -- verifies F1 and F2 |
| `files/Defect_Register.md` | D5 row corrected from "fixed but not yet merged" to "fixed and merged," re-verified against `gh pr view 9` directly |
| `files/Security_Design.md` | §2 entitlement-gating line corrected (F4) |
| `files/Privacy_Impact_Assessment.md` | §1 data table gained the two Banking rows; stale "no bank account numbers" line corrected (F4) |
| `.github/workflows/ci.yml` | pip-audit step comment updated to the current single finding (F3) |

## What this review does not close

- **G3_Code_Complete_Assessment.md item #126** is flagged (F3) but not
  rewritten here -- that document's own gate narrative belongs to its own
  session, not a side effect of a security review.
- **#131** (performance/accessibility/compatibility/resilience testing) is
  unchanged, disclosed above (F5) as explicitly out of scope for the
  security/privacy half of G4 testing.
- **G2** (no Stripe DPA reviewed, `Defect_Register.md`) is unaffected --
  still a legal review, not something a code-level security review
  resolves.
- This review is **not** the independent, external security assessment a
  Class 3 project would ideally have before accepting real financial data
  at scale -- it is the compensating, documented, in-house review this
  project's current arrangement (`Compensating_Assurance_Role_Separation.md`)
  relies on, performed by the same assistant that writes the code, under
  Freston's direction. That limitation is the same one `G3_Code_Complete_
  Assessment.md` item #124 already discloses about this project's AI-
  assisted development model generally -- restated here because it applies
  to this specific document too, not assumed away because the artifact is
  a "review."

## Tracker disposition

Item #136 moves from *"a source-level scan exists; no platform-wide review
has happened"* to: a platform-wide review has happened, is dated, cites
concrete evidence, and produced two real fixes (pending PR/merge) plus
three documentation corrections. Recorded as **In progress**, not
**Complete** -- F1 and F2 are real code changes that need the same
PR-and-Milton-review path every other auth-adjacent change in this
codebase has gone through (D4, D5, the original rate-limiting fix), not a
direct-to-master push for security-sensitive code. #136 should move to
Complete once that PR merges with a real recorded review, consistent with
how #135 (D4/D5) was handled -- not before.
