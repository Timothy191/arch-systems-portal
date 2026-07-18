---
name: rls-audit
description: >-
  Verify Row Level Security coverage after database migration changes.
  Use after modifying files in packages/database/migrations/.
---

# RLS Audit

Verify that every table-creating migration has Row Level Security enabled.

## When to use

- After creating or modifying any file in `packages/database/migrations/`
- Before committing database schema changes
- As part of pre-deploy verification

## Steps

1. Run the audit:

   ```bash
   pnpm audit:rls
   ```

2. The script scans `packages/database/migrations/*.sql` and checks that every file containing `CREATE TABLE` also contains `ENABLE ROW LEVEL SECURITY`.

3. On success:

   ```
   RLS audit: N/N table-creating migrations have RLS.
   ```

4. On failure, the script lists each violating migration file:
   ```
   RLS VIOLATION: packages/database/migrations/XXX_name.sql creates a table without ENABLE ROW LEVEL SECURITY
   ```

## Fixing violations

For each violating migration, add RLS to every `CREATE TABLE` statement:

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

Child partitions created inside `format()` calls inherit RLS from their parent and are excluded from the check.

## Notes

- Every table in `packages/database/migrations/` **must** enable RLS — this is a hard security requirement.
- The audit runs in CI via `.github/workflows/quality-gate.yml` and in the pre-commit hook at `.github/hooks/pre-commit.sh`.
- After fixing RLS, also verify policies are correct for the table's access patterns.
