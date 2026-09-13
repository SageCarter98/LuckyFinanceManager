# LuckyFinanceManager

## RLS pre-push hook

`scripts/git-hooks/pre-push` mirrors `.github/workflows/ci.yml`'s
`rls-verification` job locally: before a push, it runs
`backend/tests/test_rls_policies.py` against a `finance_app`/`finance_rls_test`
Postgres setup, so a broken row-level-security policy is caught before CI does.

It is committed but not auto-active (git only runs hooks from
`core.hooksPath`, which itself is a local config setting, not something clone
or push carries over). Enable it once per checkout with:

```
git config core.hooksPath scripts/git-hooks
```

The hook fails soft (prints a note, does not block the push) if
`finance_rls_test` isn't reachable on the machine — it depends on a local
Postgres 16 setup:

- Role `finance_app` / password `finance_app_test`
- Database `finance_rls_test`, owned by `finance_app`, migrated with
  `alembic upgrade head` (`backend/`, `DATABASE_URL` pointed at the database
  above)

`finance_app` deliberately has no superuser/BYPASSRLS privilege — those bypass
row-level security unconditionally even under `FORCE ROW LEVEL SECURITY`, so
testing as a superuser would be a false-positive test (same reasoning as the
CI job's own setup step).

## Issue management process

Real bugs and incidents (as distinct from *risks*, which live in the risk
register — `files/Gate1_G0_Intake_Record.md` §14) are tracked as GitHub
Issues on this repo, not a separate tool — established 2026-09-13 to close
PM tracker item #30 (Gate 3.07).

- **Severity labels**: `severity: critical`, `severity: high`,
  `severity: low`. A `severity: critical` issue escalates the same way a
  critical risk-register item does — immediate attention, not queued
  behind other work.
- **Link every issue to the PR or commit that resolves it** — reference the
  issue number in the commit message or PR description so GitHub closes it
  automatically on merge. This is also the evidence tracker item #116
  ("work items, commits and pull/merge requests linked with reviewer
  evidence") looks for.
- No SLA timers or formal workflow states beyond open/closed + labels —
  deliberately lightweight for a solo-operator project; this is a
  convention to follow, not a tool that enforces itself.
