# RLS Policy and Best Practices

## Overview

Row Level Security (RLS) is a critical security feature in PostgreSQL, enforced by Supabase, that restricts which database rows users can access based on defined policies. It ensures that data access is automatically filtered and authorized at the database level, preventing unauthorized data exposure and ensuring compliance with data privacy regulations.

**RLS is mandatory for all tables containing sensitive or user-specific data.**

## Core Principles

1.  **Default Deny**: All new tables should default to `RLS ENABLED` and `RLS FORCED` with a restrictive default policy (e.g., `FOR SELECT USING (false)`) until specific policies are defined. This ensures no data is accidentally exposed.
2.  **Explicit Policies**: Access to data must be explicitly granted through RLS policies. Implicit access should be avoided.
3.  **Least Privilege**: Policies should grant the minimum necessary permissions for users or roles to perform their intended functions.
4.  **Security by Design**: RLS policies must be considered during schema design and data modeling, not as an afterthought.
5.  **Auditability**: All RLS policies must be auditable, with clear documentation and version control.

## Implementation Guidelines

### 1. Enabling RLS

Every table created or modified in `packages/database/migrations/` **MUST** include the following statement:

```sql
ALTER TABLE your_table_name ENABLE ROW LEVEL SECURITY;
```

Additionally, ensure RLS is enforced:

```sql
ALTER TABLE your_table_name FORCE ROW LEVEL SECURITY; -- Generally recommended for maximum security
```

### 2. Policy Creation

Policies define *who* can access *what* data. They are typically defined for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations.

*   **Syntax**:
    ```sql
    CREATE POLICY policy_name ON your_table_name
    FOR { ALL | SELECT | INSERT | UPDATE | DELETE }
    TO { PUBLIC | role_name | CURRENT_USER | SESSION_USER }
    USING ( condition ); -- For SELECT, UPDATE, DELETE
    WITH CHECK ( condition ); -- For INSERT, UPDATE
    ```

*   **Common Conditions**:
    *   `auth.uid()`: The current authenticated user's ID from Supabase Auth.
    *   `auth.role()`: The current authenticated user's role.
    *   `is_admin()`: A custom function to check if the user is an admin.
    *   `department_id`: Check against the user's assigned department.

*   **Examples**:

    *   **Read access to own data**:
        ```sql
        CREATE POLICY "Users can view their own profiles" ON profiles
        FOR SELECT
        TO authenticated
        USING ( auth.uid() = user_id );
        ```

    *   **Insert data with user ID**:
        ```sql
        CREATE POLICY "Users can create their own posts" ON posts
        FOR INSERT
        TO authenticated
        WITH CHECK ( auth.uid() = user_id );
        ```

    *   **Department-based access**:
        ```sql
        CREATE POLICY "Drilling team can view drilling data" ON operational_data
        FOR SELECT
        TO authenticated
        USING ( auth.role() = 'drilling_operator' AND department_id = (SELECT id FROM departments WHERE name = 'drilling') );
        ```
        (Note: complex `USING` clauses can impact performance. Consider views or security definer functions for optimization.)

### 3. Testing and Validation

*   **Automated Audit**: The `pnpm audit:rls` command (integrated into the CI quality gate) automatically checks if RLS is enabled on all tables. This **MUST** pass for all database-related PRs.
*   **Unit/Integration Tests**: Write database integration tests that specifically verify RLS policies by performing operations with different user contexts (e.g., `supabase.auth.signIn({ user_id: '...' })`).
*   **Manual Verification**: Use the Supabase SQL Editor to test policies manually by switching roles (`SET ROLE authenticated; SELECT * FROM your_table;`).

### 4. Performance Considerations

*   Complex RLS policies can introduce overhead. Profile queries with `EXPLAIN ANALYZE` to identify performance bottlenecks caused by RLS.
*   Consider creating views with `SECURITY DEFINER` functions for complex policy logic, where the view handles the filtering.
*   Ensure indexes are appropriate for columns used in RLS `USING` conditions.

### 5. Common Pitfalls

*   **Forgetting to enable RLS**: The most common mistake. `pnpm audit:rls` prevents this.
*   **Overly broad policies**: Granting `ALL` permissions or using `true` as a condition without careful consideration.
*   **Performance impact**: Inefficient policies can slow down queries.
*   **`anon` role**: Ensure the `anon` role (unauthenticated users) has only the absolute minimum required access, typically none for sensitive data.
*   **Bypassing RLS**: Be aware that `service_role` key and direct connections to the database bypass RLS. These should only be used by trusted backend services or administrators.

## Documentation and Review

*   All new or modified RLS policies **MUST** be documented within the migration files or in the `rls-policy.md` itself, explaining their purpose and the conditions they enforce.
*   Database schema changes and RLS policies must undergo thorough code review, with a focus on security implications.

---
