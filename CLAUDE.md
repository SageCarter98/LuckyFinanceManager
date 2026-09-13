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
