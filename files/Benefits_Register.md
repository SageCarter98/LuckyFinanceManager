# Benefits Register — Finance Management Platform

Prepared 13 September 2026. Addresses the "Measures" half of tracker item
#22 (Gate 2.11) and the Charter's "Benefits ownership and funding" row —
the other three parts of that item (operational owner, default Gate 7
date, protected review effort) were already recorded in the Charter on
2026-09-09 and are not restated here.

**This document defines what to measure, from where, and how often.**
Target numbers are either sourced from real external industry benchmarks
(clearly cited, not invented) or left for the Sponsor to set -- "the
general public" (Sponsor's own framing, 2026-09-13, of who this product
is for) describes an addressable market, not a growth number; it doesn't
by itself bound how many of them this project expects to reach. Per PM
Framework §10.5/Appendix I, Gate 7 benefits measures are about this
specific product's adoption and outcomes, not the institutional delivery
measures in §18.1 (milestone reliability, cost variance -- unaffected by
this document).

**Purpose refinement, 2026-09-13:** the Sponsor's stated purpose --
helping daily spenders track finances, avoid losing track, and avoid
overspending -- means the meaningful "activation" and "retention" signal
is *habitual, repeated* use, not a single one-off transaction. The
measures below are defined accordingly, not as a generic one-time
signup/login check.

## 1. Proposed measures

| Measure | Definition | Data source (real, in this codebase) | Owner | Frequency | Target |
|---|---|---|---|---|---|
| User adoption | Count of registered tenants (accounts created) | `tenants` table row count | Sponsor | Monthly | **100-1,000 registered accounts within 12 months of production launch** -- Sponsor-set 2026-09-13, reflecting organic growth (word of mouth, content, community posts) with no paid acquisition budget; the "production launch" date itself is not yet set (deployment pending, see `Hosting_Decision_Finance_Management_Platform.md`) |
| Activation | % of new signups that record **at least 3 transactions across at least 2 distinct days** within their first 14 days -- refined 2026-09-13 from a single-transaction check to reflect actual habitual use, matching the Sponsor's stated purpose | `transactions.created_at` grouped by `tenant_id` and day, vs. `users.created_at` -- **no reporting query for this exists yet**, would need a small new endpoint/query, not built in this pass | Sponsor | Monthly cohort | **Suggested default: 40%** -- a conventional "did the core action more than once" bar for a lightweight single-action consumer app, not a sourced market statistic; override freely |
| Free-to-paid conversion | % of tenants with `subscriptions.status` in (`trialing`, `active`) out of all active tenants | `subscriptions` joined to `tenants` | Sponsor | Monthly | **Suggested default: 2-3%** -- the sourced freemium-conversion floor for consumer apps generally (2-5%, [growthunhinged.com](https://www.growthunhinged.com/p/free-to-paid-conversion-report), [knowledgelib.io](https://knowledgelib.io/finance/saas-benchmarks/free-to-paid-conversion-benchmarks/2026)); deliberately the conservative end, not the ~28% figure sometimes cited for finance apps, since that figure assumes gamified onboarding (badges/streaks/progress) this product doesn't have |
| Retention | % of subscriptions still `active` 90 days after their trial ended | `subscriptions` table -- **real gap found while defining this**: the schema stores only *current* subscription status, not a status history, so a genuine cohort-retention-over-time calculation cannot be computed from this database alone yet; would need either a lightweight status-history table or querying Stripe's own historical event log directly | Sponsor | Monthly | **[SPONSOR TO SET]** -- industry D30 subscription-app retention runs a wide 5-25% depending on definition and cohort ([uxcam.com](https://uxcam.com/blog/mobile-app-retention-benchmarks/), [businessofapps.com](https://www.businessofapps.com/data/finance-app-benchmarks/)), too wide a range to respectfully narrow to one default for this project's specific 90-day-post-trial definition |
| Reliability | % of requests not resulting in a 5xx response | The new structured request logs (`backend/app/main.py`'s logging middleware, added this session) log `status_code` on every request -- this is the first measure on this list with real data behind it already, once deployed | Sponsor | Monthly | **Suggested default: 99% monthly (< 1% of requests 5xx)** -- a conventional small-SaaS floor, not a market-specific figure; override if a stricter or looser bar fits, but a reasonable default given the lack of a downstream aggregation tool to compute a fancier SLO yet |

## 2. Status

Adoption target set by the Sponsor 2026-09-13: 100-1,000 registered
accounts within 12 months of production launch. Activation, conversion
and reliability carry suggested defaults (§1), open to override at any
time. Retention is intentionally left open -- the sourced benchmark range
was too wide to responsibly default, and no target has been set for it
yet; revisit at Gate 7 planning or sooner if the Sponsor forms a view.

## 3. What this does not resolve

- The activation and retention measures both surfaced real, undisclosed
  data gaps (no cohort-activation query exists; no subscription-status
  history exists) -- these are now known follow-up work items, not solved
  by defining the measure.
- This document does not set Gate 7's date or protected review effort --
  already recorded in the Charter.
