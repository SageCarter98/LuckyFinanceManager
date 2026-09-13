# Hosting Decision — Finance Management Platform

Prepared 13 September 2026. Resolves the "software framework alignment" /
architecture hosting question left open in
`Project_Charter_Finance_Management_Platform.md` and cited as unresolved by
tracker item #113 (SDLC G2.10) and `AdminApp.tsx`'s own comment ("Deploying
the two outputs to separate origins/subdomains is a hosting decision, still
open"). This is a recommendation for the Sponsor/Project Authority to
approve, not a completed deployment -- no account has been created and
nothing is live as of this writing.

## 1. Real requirements this has to satisfy

- **Postgres with row-level security** -- the project's whole tenant-isolation
  model depends on real Postgres RLS (`backend/alembic/versions/20260907_postgres_rls.py`),
  not a generic "any SQL database" host.
- **A long-running ASGI process** for the FastAPI backend (`uvicorn`), not
  static-only hosting.
- **Two origins for the frontend**, per FR-11.3's already-built split
  (`frontend/vite.config.ts` produces `index.html` for the consumer app and
  `admin.html` for the isolated staff console) -- the code already assumes
  this will happen, it just has nowhere to happen yet.
- **A public HTTPS endpoint** for Stripe webhooks.
- **Solo-operator simplicity** -- no dedicated DevOps role exists (same
  role-separation reality as everywhere else in this project), so anything
  requiring its own ops expertise (raw Kubernetes, self-managed VMs) is a
  worse fit than a managed platform, independent of cost.
- **Fits the $20-150/month planning range** already recorded in
  `Business_Case_Finance_Management_Platform.md` section 4.3.

## 2. Options compared

| Option | Postgres+RLS | Fits budget | Solves the 2-origin split | Notes |
|---|---|---|---|---|
| **Render** (web service + managed Postgres + 2 static sites) | Yes, standard Postgres | Yes -- **~$13/month** before storage (Starter web service $7/mo + Basic-256mb Postgres $6/mo + $0.30/GB storage) | **Yes, at no extra cost** -- Render's free tier includes 2 custom domains per static site workspace, so consumer and admin can each get a real subdomain | Single platform, single dashboard, git-push deploys -- lowest operational complexity for a solo operator |
| **Railway** (usage-based) | Yes | Usage-based, less predictable: a small always-on Postgres alone typically runs $10-20/month, and a full small SaaS (web + worker + DB) commonly lands **$40-70/month** under real traffic | Yes, via custom domains, similar mechanism | Better for bursty/variable workloads; worse fit here because a solo non-DevOps sponsor benefits more from Render's flat, predictable pricing than from usage-optimized billing |
| **Raw cloud VM / Kubernetes (AWS/GCP/Azure)** | Yes, self-managed | Could be cheaper at the compute-cost line, but requires the sponsor to run and patch the OS, configure TLS, manage backups, and operate Postgres HA themselves | Yes, but manually configured (reverse proxy, DNS, certs) | Rejected: adds real operational burden with no corresponding benefit at this project's current scale -- exactly the kind of complexity the solo-operator constraint (§1) exists to screen out |

**Recommendation: Render.** It is the only option that satisfies every
requirement in §1 (including the two-origin split, for free) while staying
at the low end of the already-approved budget range, with no dedicated
DevOps effort required.

## 3. What this resolves, and what it doesn't

- Closes the "which platform" half of tracker item #113 and the Charter's
  open hosting question.
- Does **not** close item #113 itself -- that item also requires actual
  observability/recoverability tooling to exist, which this decision alone
  doesn't provide, and no account has been created yet, so nothing is
  actually deployed.
- Does **not** authorize spend -- creating a Render account, entering
  payment details, and provisioning paid-tier resources is the Sponsor's own
  action (account creation and payment are explicitly outside what this
  assistant will do on the Sponsor's behalf), not something recorded as done
  by this document.

## 4. A real gotcha found while planning this, not yet hit in production

`backend/app/database.py` calls `create_engine(settings.database_url)`
directly, and `backend/requirements.txt` installs `psycopg[binary]==3.2.3`
(psycopg **3**), not psycopg2. SQLAlchemy needs the URL scheme
`postgresql+psycopg://...` to select that driver. Render's own Postgres
connection string is issued as `postgres://...` (the bare, driver-less
form). Pasted in unmodified, this will fail to connect on first deploy --
**not a defect in this project's code, but a real one-time manual step**:
after provisioning the Render Postgres instance, its connection string must
be edited to `postgresql+psycopg://` before it's set as `DATABASE_URL` on
the web service. Recorded here so it isn't rediscovered the hard way during
an actual deploy attempt.

## 5. Draft Blueprint (`render.yaml`)

A best-effort Render Blueprint is provided at the repository root
(`render.yaml`) to make the actual deploy close to one click once the
Sponsor creates a Render account. **It is unvalidated against a real Render
account** (no account exists to test it against) and should be reviewed
against Render's current Blueprint YAML Reference before first use --
treat it as a strong starting draft, not a guarantee.

## Approval

This is a recommendation awaiting Sponsor/Project Authority approval
(Freston Kenny Adedeme) -- not yet approved, and no infrastructure has been
provisioned.
