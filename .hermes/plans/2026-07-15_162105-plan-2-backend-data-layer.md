# Plan 2 — Backend + Data Layer: Local-Deploy Postgres + Redis + API + ops-gateway

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task. Each task is 2-5 min of focused work; commit after every task.

**Goal:** On a fresh machine with Docker + Node 22 + pnpm 9.15.9, `pnpm dev` brings up postgres + redis + ops-gateway + NestJS API + portal, all migrations apply, the API serves `/api/health/live` and a real `POST /api/auth/login` against the local DB, and the API's data layer is RLS-enforced (no service-role abuse).

**Architecture:** This plan touches ONLY the backend + data layer. Frontend (apps/portal) is out of scope; that's Plan 3. The plan restores the partial-checkout's missing data infra (Supabase CLI or a local-Postgres+RLS-emulation strategy), then wires the API against it.

**Tech Stack:** Postgres 15 · Redis 7 · NestJS 11 on Fastify 5 · @supabase/supabase-js 2.x · @supabase/ssr · Kysely · Inngest 4.x · BullMQ · @nestjs/throttler · @nestjs/terminus · ioredis · zod

**Reference target state** (what "Plan 2 done" looks like):
- `docker compose up -d` (root + portal compose) brings up postgres:15, redis:7, portal, api, nginx, all healthy.
- All 70 migrations apply to the local DB on a fresh `pnpm db:reset` (or equivalent).
- `pnpm --filter api dev` starts the NestJS API on :3001.
- `curl http://localhost:3001/api/health/live` returns 200 with `{"status":"ok"}`.
- `curl http://localhost:3001/api/health` checks both Supabase and Redis and reports 200.
- `POST http://localhost:3001/api/auth/login` with a seeded user returns a session.
- The API uses a **per-request JWT-scoped Supabase client** (anon + the user's bearer token), with `service-role` reserved for explicit admin paths (jobs, ops, agent triggers) — R7 of the master audit.
- `APP_GUARD: ThrottlerGuard` is wired globally (R8 of the master audit).
- `apps/ops-gateway` is buildable, has a Dockerfile, and runs in the compose stack.
- `acc.db` files are no longer tracked (Plan 1).
- 0 client-side `@repo/database` imports remain in `apps/portal/lib/data/*` (those are Plan 3's job, but we lay the server-side API ground for them here).

**ASSUMPTION** (must be verified at the start of Plan 2 — see Task 1):
This plan assumes the project intends to use Supabase but currently lacks a `supabase start` setup (no `supabase/config.toml`, no `supabase/migrations/` symlink to `packages/database/migrations/`, no Docker Compose service for Supabase Studio). The audit confirmed: `supabase/` at root has only an empty `snippets/` dir. **There are two viable paths:**

- **Path A (use real Supabase CLI locally):** install Supabase CLI, `supabase init` (or restore from git if the dir is recoverable), wire `packages/database/migrations/` as the source of migrations, `supabase start` brings up the full stack (Postgres + GoTrue + PostgREST + Realtime + Studio). More faithful to production but heavier.
- **Path B (use stock Postgres + emulate the auth pieces locally):** keep `docker-compose.yml` (postgres+redis only), add a small `auth` service or use `apps/api` for auth directly. Lighter but requires more glue.

**Default: Path A.** If `supabase start` is too heavy or you want a faster local loop, fall back to Path B. The choice is made in Task 2.

---

## Task 1: Verify the audit's data-layer ground truth and decide Path A vs B

**Objective:** Confirm the database state before changing anything.

**Files:**
- Read-only inspection
- Update: `.hermes/plans/AUDIT-SUMMARY.md` with the chosen path

**Step 1:** Run:
```bash
ls supabase/
echo "---"
cat supabase/config.toml 2>&1 | head -20
echo "---"
ls packages/database/migrations/ | head -5
echo "---"
ls packages/supabase/src/
echo "---"
grep -E 'export|SUPABASE_' apps/portal/.env.example 2>/dev/null | head -20
grep -E 'export|SUPABASE_' apps/api/.env.example 2>/dev/null | head -20
grep -E 'export|SUPABASE_' apps/ops-gateway/.env.example 2>/dev/null | head -20
```

**Step 2:** Decide Path A vs B:
- If `supabase init` is desired and the project history shows Supabase was the design intent (CLAUDE.md confirms: `@supabase/ssr` is used, RLS is mandatory, `apps/portal/proxy.ts` uses `createMiddlewareClient`) → **Path A**.
- If you want the lightest possible local stack and don't mind reimplementing the auth bits → **Path B**.

Default to Path A — the user is in a Supabase shop. The rest of this plan assumes Path A.

**Step 3:** Commit the decision:
```bash
git add .hermes/plans/AUDIT-SUMMARY.md
git commit -m "docs(plans): confirm Path A (Supabase CLI local stack) for Plan 2"
```

---

## Task 2: Initialize or restore the Supabase project layout

**Objective:** Make `supabase/` a real working tree (config.toml + migrations symlink + seed).

**Files:**
- Create: `supabase/config.toml`
- Symlink: `supabase/migrations` → `../../packages/database/migrations`
- Update: `supabase/config.toml` to point at `packages/database/migrations/` (not `supabase/migrations/`)

**Step 1:** Check whether `supabase init` is interactive (it usually asks for a project name). To avoid that, create the files directly:

```bash
ls supabase/  # confirm empty snippets/
```

**Step 2:** Create `supabase/config.toml` (minimal, sufficient for local dev):
```toml
# Supabase local config
project_id = "arch-mk2-local"

[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 15

[db.pooler]
enabled = false

[realtime]
enabled = true

[studio]
enabled = true
port = 54323

[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]
jwt_expiry = 3600
enable_signup = true

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false
```

**Step 3:** Create the symlink so Supabase's CLI finds the migrations:
```bash
cd supabase
ln -s ../../packages/database/migrations migrations
cd ..
ls -la supabase/migrations | head -3
```
Expected: symlink visible. `ls supabase/migrations/` should show the same files as `ls packages/database/migrations/`.

**Step 4:** Smoke-test the Supabase CLI (don't actually start it yet):
```bash
supabase --version 2>&1 | head -1
```
Expected: version string. (`supabase` is in root devDeps as `^2.98.2`.)

**Step 5:** Commit:
```bash
git add supabase/config.toml
git commit -m "feat(supabase): add supabase/config.toml + migrations symlink for local stack"
```

NOTE: the symlink is created on local disk; in CI/other machines it needs to be re-created. Consider replacing the symlink with a copy script (`scripts/sync-supabase-migrations.sh`) for portability. **Decision: keep the symlink for now; document in README.md.**

---

## Task 3: Start Supabase locally and verify it boots

**Objective:** `supabase start` should bring up the full stack (Postgres, GoTrue, PostgREST, Realtime, Studio).

**Files:**
- Update: `supabase/config.toml` (refine if errors)
- No code changes

**Step 1:** Start the stack:
```bash
supabase start 2>&1 | tee /tmp/supabase-start.log
```
Expected: a list of started services with their URLs and anon/service-role keys. May take 2-5 minutes the first time (Docker pulls images).

If it fails with "Docker not running" — start Docker Desktop and retry.

**Step 2:** Capture the output keys:
```bash
grep -E 'API URL|anon key|service_role|JWT secret|DB URL' /tmp/supabase-start.log
```

**Step 3:** Verify Postgres is reachable:
```bash
PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT 1;"
```
Expected: `?column?` row with `1`.

**Step 4:** Verify Studio is reachable:
```bash
curl -sf http://localhost:54323/ -o /dev/null && echo "Studio up" || echo "Studio down"
```
Expected: `Studio up`.

**Step 5:** Document the URLs and keys in `.hermes/plans/AUDIT-SUMMARY.md` under "Plan 2 — local Supabase URLs".

**Step 6:** No commit needed (services are runtime state).

---

## Task 4: Apply the migrations to the local Supabase Postgres

**Objective:** All 70 migrations from `packages/database/migrations/` apply cleanly to the local DB.

**Files:**
- Read-only verification
- No code changes

**Step 1:** Use Supabase's migration runner:
```bash
supabase db reset 2>&1 | tail -20
```
This drops and recreates the public schema, then applies all migrations. Expected: a list of applied migrations, no errors.

**Step 2:** Verify RLS is on for the canonical tables:
```bash
PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c "
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('departments','employees','machines','daily_logs','access_logs','webhook_endpoints')
  ORDER BY tablename;
"
```
Expected: every row has `rowsecurity = t`.

**Step 3:** Verify the table count matches the audit (58 distinct tables per audit):
```bash
PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -t -c "
  SELECT count(*) FROM pg_tables WHERE schemaname = 'public';
"
```
Expected: ~58 (or whatever the current count is — the audit's 58 was on this branch's working tree).

**Step 4:** Document the table count + RLS verification result in AUDIT-SUMMARY.md.

**Step 5:** No commit needed (database state is runtime).

---

## Task 5: Add a seed admin user to the local DB

**Objective:** Have a known-good login for `POST /api/auth/login` testing.

**Files:**
- Create: `packages/database/seeds/local-admin.sql` (or extend an existing seed)

**Step 1:** Check what seed files already exist:
```bash
ls packages/database/seeds/ 2>/dev/null
ls packages/database/migrations/*seed* 2>/dev/null
```

**Step 2:** If no seed for an admin user exists, create `packages/database/seeds/local-admin.sql`:
```sql
-- Local dev seed: an admin user with known credentials.
-- DO NOT use these credentials in any deployed environment.
-- Email: admin@arch-mk2.local
-- Password: admin12345
-- This is inserted via Supabase's auth schema (GoTrue-managed).

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, recovery_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@arch-mk2.local',
  crypt('admin12345', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Match the audit's documented role
INSERT INTO public.employees (auth_id, role, accessible_departments, department_id)
SELECT id, 'admin', ARRAY[]::uuid[], NULL
FROM auth.users
WHERE email = 'admin@arch-mk2.local'
ON CONFLICT (auth_id) DO NOTHING;
```

**Step 3:** Apply the seed:
```bash
PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -f packages/database/seeds/local-admin.sql
```
Expected: `INSERT 0 1` (or `0 1` if already exists).

**Step 4:** Verify the user can authenticate via the GoTrue HTTP API:
```bash
curl -X POST http://localhost:54321/auth/v1/token?grant_type=password \
  -H "Content-Type: application/json" \
  -H "apikey: <ANON_KEY_FROM_TASK_3>" \
  -d '{"email":"admin@arch-mk2.local","password":"admin12345"}'
```
Expected: JSON with `access_token`, `refresh_token`, `user.id`.

**Step 5:** Commit the seed:
```bash
git add packages/database/seeds
git commit -m "feat(db): add local-dev admin user seed for local API testing"
```

---

## Task 6: Wire `apps/portal/.env` and `apps/api/.env` to the local Supabase

**Objective:** Set the real env vars in the local `.env` files (which are gitignored, so safe to populate).

**Files:**
- Modify: `apps/portal/.env` (already untracked)
- Modify: `apps/api/.env` (already untracked)
- Modify: `apps/ops-gateway/.env` (currently does not exist — create it)

**Step 1:** Read the current `.env.example` files to know which keys are required:
```bash
cat apps/portal/.env.example
echo "==="
cat apps/api/.env.example
echo "==="
cat apps/ops-gateway/.env.example
```

**Step 2:** Get the keys from `supabase status`:
```bash
supabase status 2>&1 | grep -E 'API URL|anon key|service_role|JWT secret|DB URL|Studio'
```

**Step 3:** Populate `apps/portal/.env` (replace `<...>` with values from `supabase status`):
```bash
cat > apps/portal/.env <<EOF
# Local dev only — auto-generated by Plan 2 Task 6
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
SUPABASE_JWT_SECRET=<JWT_SECRET>
API_BASE_URL=http://localhost:3001
EOF
```

**Step 4:** Populate `apps/api/.env`:
```bash
cat > apps/api/.env <<EOF
# Local dev only — auto-generated by Plan 2 Task 6
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
SUPABASE_JWT_SECRET=<JWT_SECRET>
PORT=3001
REDIS_URL=redis://localhost:6379
INNGEST_EVENT_KEY=local
INNGEST_SIGNING_KEY=local-signing-key
INNGEST_SERVE_HOST=http://localhost:3001
EOF
```

**Step 5:** Populate `apps/ops-gateway/.env`:
```bash
cat > apps/ops-gateway/.env <<EOF
# Local dev only — auto-generated by Plan 2 Task 6
OPS_API_URL=http://localhost:3001/api/ops
OPS_SECRET=local-ops-secret
REDIS_URL=redis://localhost:6379
MCP_PORT=3100
```
The OPS_SECRET here must match what `apps/api/src/ops/ops-internal.guard.ts` reads (set OPS_INTERNAL_SECRET on the api side to the same value).

**Step 6:** Verify the files exist and are gitignored:
```bash
git status --short apps/*/.env
```
Expected: empty (untracked, gitignored).

**Step 7:** No commit — these are gitignored.

---

## Task 7: Add `docker-compose.yml` Redis service + `docker-compose.portal.yml` for the API + ops-gateway

**Objective:** The existing root `docker-compose.yml` has postgres+redis (postgres will be replaced by Supabase's own; keep redis for the API and ops-gateway). The portal compose has portal+api+nginx but no ops-gateway.

**Files:**
- Modify: `docker-compose.yml` (replace postgres with `external: supabase_local` comment OR keep postgres for the supabase external services to attach to)
- Modify: `docker-compose.portal.yml` (add ops-gateway service)

**Step 1:** Read the current compose files:
```bash
cat docker-compose.yml
echo "==="
cat docker-compose.portal.yml
```

**Step 2:** Update `docker-compose.yml` (keep postgres for any non-Supabase code that connects to it; keep redis):
```yaml
version: "3.8"

services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Postgres is provided by `supabase start` on host port 54322.
  # Comment: `supabase start` runs as a separate Docker stack; the
  # apps/api and apps/portal connect to it via host.docker.internal:54322
  # (on macOS/Windows) or localhost:54322 (on Linux).
```

**Step 3:** Update `docker-compose.portal.yml` to add ops-gateway (read first, then add the new service after the existing `api` service):
```yaml
  ops-gateway:
    build:
      context: .
      dockerfile: apps/ops-gateway/Dockerfile
    container_name: arch-ops-gateway
    restart: unless-stopped
    env_file:
      - apps/ops-gateway/.env
    ports:
      - "3100:3100"
    depends_on:
      - api
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3100/health', (r) => { if (r.statusCode !== 200) process.exit(1); }).on('error', () => process.exit(1));"]
      interval: 10s
      timeout: 5s
      retries: 3
```

**Step 4:** Verify the compose syntax:
```bash
docker compose -f docker-compose.yml config --quiet && echo "root compose OK"
docker compose -f docker-compose.portal.yml config --quiet && echo "portal compose OK"
```
Expected: both report OK. If "service not found", check the YAML indentation.

**Step 5:** Commit:
```bash
git add docker-compose.yml docker-compose.portal.yml
git commit -m "feat(compose): add ops-gateway to portal compose; document supabase-managed postgres"
```

---

## Task 8: Introduce a per-request JWT-scoped Supabase client in the API

**Objective:** Stop the API from binding `service-role` for every route (R7 of the master audit, R14 priority). Build a per-request anon client that uses the inbound request's bearer token, so RLS is the primary gate.

**Files:**
- Modify: `apps/api/src/supabase/supabase.module.ts:3-10` (replace global `SUPABASE_CLIENT = service-role` with a factory)
- Create: `apps/api/src/supabase/request-supabase.decorator.ts` (param decorator)
- Modify: `apps/api/src/auth/guards/supabase-auth.guard.ts:43-53` (attach the per-request client to `request.supabase`)

**Step 1:** Read the current module:
```bash
cat apps/api/src/supabase/supabase.module.ts
echo "==="
cat apps/api/src/auth/guards/supabase-auth.guard.ts
```

**Step 2:** Replace `apps/api/src/supabase/supabase.module.ts`:
```typescript
import { Global, Module } from '@nestjs/common';
import { createServiceRoleClient } from '@repo/supabase/service-role';
import { createServerSupabaseClient } from '@repo/supabase/server';

export const SUPABASE_SERVICE_ROLE = 'SUPABASE_SERVICE_ROLE';
export const SUPABASE_FOR_USER = 'SUPABASE_FOR_USER';

const serviceRoleProvider = {
  provide: SUPABASE_SERVICE_ROLE,
  useFactory: () => createServiceRoleClient(),
};

// Per-request client is created in the auth guard and attached to request.supabase.
// No factory here — it's request-scoped, not module-scoped.

@Global()
@Module({
  providers: [serviceRoleProvider],
  exports: [SUPABASE_SERVICE_ROLE],
})
export class SupabaseModule {}
```

**Step 3:** Update `apps/api/src/auth/guards/supabase-auth.guard.ts` so that, after `getUser()` succeeds, it builds a per-request client using the user's token and attaches it:
```typescript
// Inside the canActivate method, after the successful getUser() path:
import { createServerSupabaseClient } from '@repo/supabase/server';

// (pseudo-diff; actual implementation reads the access_token from the cookie/header)
const userToken = ...; // extract from request
(request as any).supabase = createServerSupabaseClient({ accessToken: userToken });
```

**Step 4:** Create `apps/api/src/supabase/request-supabase.decorator.ts`:
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';

export const RequestSupabase = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SupabaseClient => {
    const req = ctx.switchToHttp().getRequest();
    return req.supabase;
  },
);
```

**Step 5:** Migrate one controller to use the per-request client (smoke-test the pattern; full migration is incremental — see Task 9):
```typescript
// Example: in any controller method
async listMachines(@RequestSupabase() supabase: SupabaseClient) {
  const { data } = await supabase.from('machines').select('*');
  return data;
}
```

**Step 6:** Verify the API still starts and the smoke endpoints work:
```bash
pnpm --filter api build
echo "exit: $?"
```
Expected: builds clean.

**Step 7:** Commit:
```bash
git add apps/api/src/supabase apps/api/src/auth/guards/supabase-auth.guard.ts
git commit -m "feat(api): introduce per-request JWT-scoped Supabase client (RLS-enforced)"
```

---

## Task 9: Migrate the 19+ existing controllers to the per-request client (incremental)

**Objective:** Move every `SupabaseClient` consumer in `apps/api/src/` from the global service-role to the per-request JWT-scoped one. Do this controller-by-controller, one per commit, so each commit is reviewable.

**Files:**
- Modify: each controller in `apps/api/src/{admin,control-room,exports,access-control,weather,...}/*.controller.ts`
- Tests: extend `apps/api/src/<module>/__tests__/*.spec.ts` if any exist

**Step 1:** Inventory the controllers that use the global client:
```bash
grep -rln 'SUPABASE_CLIENT\|supabase\.from\|@Inject(SUPABASE_CLIENT' apps/api/src --include='*.controller.ts' --include='*.service.ts'
```
Expected: ~15-20 files.

**Step 2:** For each file, in this order (most security-sensitive first):
1. `admin` (already gated by `assertAdmin` — service-role OK there, leave alone)
2. `control-room` (high read traffic; should be per-request)
3. `exports` (CSV/JSON export — should be per-request for tenant isolation)
4. `access-control` (public-by-spec, but token-auth S2S — keep service-role with explicit comment)
5. `weather` (public read — leave alone)
6. `telemetry` (ECC-protected S2S — keep service-role with explicit comment)
7. `ops` (internal — keep service-role)
8. `jobs/inngest` (background — keep service-role)
9. `ai` (agent triggers — keep service-role)

For each controller in categories 2, 3:
- Change `@Inject(SUPABASE_CLIENT) supabase: SupabaseClient` → `@RequestSupabase() supabase: SupabaseClient`.
- Run `pnpm --filter api type-check`.
- Run `pnpm --filter api test -- --testPathPattern=<module>`.
- Commit with a descriptive message: `refactor(api): migrate <module> to per-request Supabase client`.

**Step 3:** Final verification:
```bash
grep -rln 'SUPABASE_CLIENT' apps/api/src --include='*.controller.ts' --include='*.service.ts' | wc -l
```
Expected: only the explicitly-allowed categories (admin, access-control, weather, telemetry, ops, jobs, ai) — roughly 6-8 files.

**Step 4:** Commit count: ~6-10 commits. Each commit is independently revertable per the incremental-implementation skill.

---

## Task 10: Wire `APP_GUARD: ThrottlerGuard` globally (R8 of master audit)

**Objective:** Stop the API from claiming throttling but having none. Add the global guard.

**Files:**
- Modify: `apps/api/src/app.module.ts:34-39` (ThrottlerModule block) + add the APP_GUARD provider

**Step 1:** Read the current module:
```bash
cat apps/api/src/app.module.ts | head -50
```

**Step 2:** Add the throttler guard provider. Edit `app.module.ts`:
```typescript
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// In the @Module decorator's `providers` array, add:
{
  provide: APP_GUARD,
  useClass: ThrottlerGuard,
},

// And keep the existing ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]) config.
```

**Step 3:** Skip throttling for health + inngest endpoints (per the recommendation):
```typescript
// In health/health.controller.ts:
import { SkipThrottle } from '@nestjs/throttler';
@SkipThrottle()
export class HealthController { ... }

// In jobs/inngest.controller.ts:
@SkipThrottle()
export class InngestController { ... }
```

**Step 4:** Verify the build:
```bash
pnpm --filter api build
echo "exit: $?"
```

**Step 5:** Smoke-test (after API is up — defer to Plan 2 Task 14):
```bash
for i in {1..150}; do
  curl -sf http://localhost:3001/api/health/live > /dev/null
done
# Expect: ~100 succeed, then 429 Too Many Requests
```

**Step 6:** Commit:
```bash
git add apps/api/src
git commit -m "feat(api): wire APP_GUARD: ThrottlerGuard globally with @SkipThrottle on health/inngest"
```

---

## Task 11: Add a `pnpm dev` root script that boots the whole local stack

**Objective:** Make the user's stated target (`pnpm dev` brings everything up) actually work.

**Files:**
- Modify: root `package.json:67-76` (replace the existing `dev` script)

**Step 1:** Read the current root `dev` script:
```bash
node -e "console.log(require('./package.json').scripts.dev)"
```

**Step 2:** Replace with a chained boot:
```json
"dev": "concurrently -n supabase,redis,ops-gateway,api,portal -c blue,green,yellow,magenta,cyan \"supabase start\" \"docker compose up redis\" \"pnpm --filter ops-gateway dev\" \"pnpm --filter api dev\" \"pnpm --filter portal dev\""
```

`concurrently` is in devDeps? Check:
```bash
node -e "console.log(require('./package.json').devDependencies.concurrently || 'NOT INSTALLED')"
```
If not installed, add it:
```bash
pnpm add -D -w concurrently
```

**Step 3:** Smoke-test (don't actually run it; just verify the script parses):
```bash
node -e "console.log(require('./package.json').scripts.dev)"
```

**Step 4:** Commit:
```bash
git add package.json pnpm-lock.yaml
git commit -m "feat(dev): chained pnpm dev brings up supabase+redis+ops-gateway+api+portal"
```

---

## Task 12: Implement or remove the `EccService` mock (R10 of master audit)

**Objective:** Either implement real ECC payload validation for telemetry push, or remove the call from the hot path. The no-op mock (`isValid: true` for everything) is a real security gap.

**Files:**
- Modify: `apps/api/src/telemetry/ecc.service.ts` (or remove the call site)

**Step 1:** Read the current implementation:
```bash
cat apps/api/src/telemetry/ecc.service.ts
echo "==="
grep -rn 'eccService\|EccService\|validateAndCorrectPayload' apps/api/src/
```

**Step 2:** Decide: implement or remove.

**Option A (implement):** Wire the `affaan-m/ECC` library that the comment references. If the library doesn't exist in npm or has a non-trivial install cost, mark as TODO and move on.

**Option B (remove):** Strip the call from the controller; leave a comment that ECC validation is deferred. This is the conservative choice for "locally deployed."

**Step 3 (Option B path):** Edit `apps/api/src/telemetry/telemetry.controller.ts` to remove the `eccService.validateAndCorrectPayload(...)` call. Replace with a passthrough + a comment:
```typescript
// ECC payload validation deferred — affaan-m/ECC not yet integrated.
// For now, telemetry push is gated by the @Public() + x-internal-secret
// header (see telemetry.service.ts) plus Supabase RLS on the telemetry table.
```

**Step 4:** Remove `EccService` from the module's providers if no other consumer:
```bash
grep -rn 'EccService' apps/api/src/
```
If only the controller uses it, drop the `@Inject(EccService)` and the provider entry.

**Step 5:** Build + test:
```bash
pnpm --filter api build
pnpm --filter api test -- --testPathPattern=telecrate
```

**Step 6:** Commit:
```bash
git add apps/api/src/telemetry
git commit -m "refactor(telemetry): remove EccService no-op mock; defer real ECC integration"
```

---

## Task 13: Build a `docker-compose.local.yml` that orchestrates the full local stack

**Objective:** A single `docker compose -f docker-compose.local.yml up -d` that brings up:
- redis (the docker one)
- ops-gateway (built from apps/ops-gateway/Dockerfile)
- api (built from apps/api/Dockerfile)
- portal (built from apps/portal/Dockerfile)
- nginx (built from a tiny image that copies config/nginx.conf)

with Supabase running on the host via `supabase start`.

**Files:**
- Create: `docker-compose.local.yml`
- Create: `docker/nginx/Dockerfile` (tiny image with the config)

**Step 1:** Create `docker/nginx/Dockerfile`:
```dockerfile
FROM nginx:1.27-alpine
COPY config/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

**Step 2:** Create `docker-compose.local.yml`:
```yaml
version: "3.8"

services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"

  ops-gateway:
    build:
      context: .
      dockerfile: apps/ops-gateway/Dockerfile
    container_name: arch-ops-gateway
    restart: unless-stopped
    env_file:
      - apps/ops-gateway/.env
    ports:
      - "3100:3100"
    depends_on:
      - api

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: arch-api
    restart: unless-stopped
    env_file:
      - apps/api/.env
    ports:
      - "3001:3001"
    depends_on:
      - redis

  portal:
    build:
      context: .
      dockerfile: apps/portal/Dockerfile
    container_name: arch-portal
    restart: unless-stopped
    env_file:
      - apps/portal/.env
    ports:
      - "3000:3000"
    depends_on:
      - api

  nginx:
    build:
      context: .
      dockerfile: docker/nginx/Dockerfile
    container_name: arch-nginx
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - api
      - portal
```

**Step 3:** Validate the compose:
```bash
docker compose -f docker-compose.local.yml config --quiet && echo "local compose OK"
```

**Step 4:** Smoke-test (don't actually start everything; just verify it parses):
```bash
docker compose -f docker-compose.local.yml config | head -20
```

**Step 5:** Commit:
```bash
git add docker-compose.local.yml docker/nginx
git commit -m "feat(compose): local stack via docker-compose.local.yml + nginx image"
```

---

## Task 14: Verify the canonical "pnpm dev" path end-to-end

**Objective:** Confirm the user's stated target: `pnpm dev` brings up everything, portal login works against the local DB.

**Step 1:** Stop any existing services:
```bash
supabase stop 2>&1 | head -3
docker compose -f docker-compose.local.yml down 2>&1 | head -3
```

**Step 2:** Start fresh:
```bash
supabase start 2>&1 | tail -10
```
Wait for "Started services" or similar.

**Step 3:** Apply migrations (if not auto-applied by supabase start):
```bash
supabase db reset 2>&1 | tail -5
```

**Step 4:** Start the rest of the stack:
```bash
docker compose -f docker-compose.local.yml up -d redis api ops-gateway portal nginx
```

**Step 5:** Wait for health:
```bash
for i in $(seq 1 30); do
  curl -sf http://localhost:3001/api/health/live > /dev/null && echo "API ready" && break
  sleep 2
done
curl -sf http://localhost:3000/ -o /dev/null && echo "Portal ready" || echo "Portal not yet up"
```

**Step 6:** Test login:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@arch-mk2.local","password":"admin12345"}'
```
Expected: JSON with a session token.

**Step 7:** Test the portal proxy:
```bash
curl -sf http://localhost:80/api/health/live
```
Expected: 200 (via nginx → api).

**Step 8:** Document the verification in `.hermes/plans/AUDIT-SUMMARY.md`:
```markdown
## Plan 2 verification

- [ ] supabase start: <pass/fail>
- [ ] supabase db reset: <pass/fail>
- [ ] Migrations applied: <N>/70
- [ ] RLS verification: <pass/fail>
- [ ] Local admin user login: <pass/fail>
- [ ] API health: <pass/fail>
- [ ] Portal reachable via nginx: <pass/fail>
- [ ] Per-request client migration: <N>/<M> controllers done
- [ ] Throttler guard active: <pass/fail>
- [ ] EccService mock removed: <pass/fail>
```

**Step 9:** Commit the verification log:
```bash
git add .hermes/plans/AUDIT-SUMMARY.md
git commit -m "docs(plans): record Plan 2 verification results"
```

---

## Done criteria

Plan 2 is complete when ALL of the following are true:

- [ ] `supabase start` brings up Postgres, GoTrue, PostgREST, Realtime, Studio locally
- [ ] `supabase db reset` applies all migrations cleanly
- [ ] RLS is enabled on every public table (verify with `pg_tables.rowsecurity = t`)
- [ ] A local admin user exists and can log in via `POST /api/auth/login`
- [ ] `pnpm --filter api dev` starts the API on :3001 with a per-request Supabase client wired
- [ ] At least 6 controllers have been migrated to the per-request client (the rest in incremental follow-up commits)
- [ ] `APP_GUARD: ThrottlerGuard` is bound; `@SkipThrottle()` on health + inngest
- [ ] `docker compose -f docker-compose.local.yml up -d` brings up redis + api + ops-gateway + portal + nginx
- [ ] `curl http://localhost:80/api/health/live` returns 200 via nginx
- [ ] `POST /api/auth/login` returns a real session against the local DB
- [ ] `apps/ops-gateway` is built and runs in the compose stack
- [ ] `EccService` mock is removed (or real ECC is wired — your call)
- [ ] All commits use conventional prefixes

**Next plan:** Plan 3 (frontend) starts the portal dev loop against the locally-deployed API from this plan.
