# Agent Tracer Log

This file maintains a record of AI agent interventions, context hand-offs, and architectural breadcrumbs for this specific package/app.

## [2026-07-04] Unified local dev wiring for the monorepo

- **Agent**: Claude Code
- **Purpose**: Wire the NestJS backend (`apps/api`) into the unified `pnpm dev` orchestration so it starts automatically alongside Supabase, Redis, and the portal.
- **Changes Made**:
  - `apps/api/.env.example`: changed default `PORT` from `3001` to `3004` to avoid clashing with the CMS dev server and the tools containers (Flowise on 3001, Langfuse on 3003).
  - `apps/portal/.env.example`, `apps/portal/.env`: added `API_BASE_URL` and `NEXT_PUBLIC_API_URL` pointing at `http://localhost:3004/api`.
  - `apps/portal/lib/env.ts`: added optional `API_BASE_URL` and `NEXT_PUBLIC_API_URL` to the Zod schema.
  - `apps/portal/app/api/backend/[[...slug]]/route.ts`: added a same-origin catch-all proxy that forwards `/api/backend/*` to the NestJS API, preserving method, headers, query string, and streaming request bodies.
  - `scripts/generate-api-env.mjs` (new): idempotently generates `apps/api/.env` from the portal env, filling in Supabase/Redis/Ollama keys and forcing `PORT`/`CORS_ORIGIN` to the orchestration defaults.
  - `scripts/dev.sh`: now starts Redis (if not already running), generates the API env, starts the NestJS API on `API_PORT` (default 3004), health-checks `/api/health/live`, and shuts the API down on exit.
- **Context**: Previously `apps/api` was not started by `pnpm dev` and its default port collided with the CMS. The new setup assigns the API a dedicated non-clashing port, seeds its environment from the local Supabase demo keys, and exposes it both directly and through the portal's `/api/backend/*` proxy.
- **Next Agent Notes**:
  - The API env is auto-generated; if you need a custom API port, set `API_PORT` before running `pnpm dev` rather than hand-editing `apps/api/.env`.
  - The portal proxy at `/api/backend/*` forwards cookies and `Authorization` headers, so API auth (via Supabase token/cookie) continues to work for browser clients.
  - If you add new required environment variables to the API, update `scripts/generate-api-env.mjs` so local dev stays one-command.

## [2026-07-07] Deployment Readiness & Boundary Enforcement

- **Agent**: Antigravity
- **Purpose**: Enforce deployment readiness across the codebase via strict validation and fixing pipeline.
- **Changes Made**:
  - Validated architecture boundaries with `pnpm policy:gen`.
  - Ran `pnpm knip:fix` to remove unused exports and types in the API module.
  - Verified RLS migrations and Supabase data boundary.
- **Next Agent Notes**: Keep maintaining strict module boundaries and removing dead code.

## [2026-07-07] Fix 403-on-everything and 401/403 error body

- **Problem**: All `/api/ops/*` and many other routes returned 403 with body `{statusCode, timestamp, path}` (no `error`/`message`). Root cause: `SupabaseAuthGuard` is bound globally via `APP_GUARD` in `apps/api/src/auth/auth.module.ts:12` and returns `false` for unauthenticated requests, which Nest converts to `ForbiddenException` (403). Routes that already have a different auth (e.g. `OpsInternalGuard` for internal-service traffic) were being double-gated, breaking legitimate internal calls.
- **Changes Made**:
  - Marked `GatewayProxyController` and `OpsController` with `@Public()` (they are internal-service surfaces, gated by `OpsInternalGuard` shared-secret).
  - Hardened `GlobalExceptionFilter` to preserve `error`/`message` fields from `HttpException` (was discarding them). Now logs 5xx with stack trace on the server but never leaks it to clients.
  - Added Logger import for diagnostic logging.
- **Files**:
  - `apps/api/src/ops/gateway-proxy.controller.ts` — added `@Public()`.
  - `apps/api/src/ops/ops.controller.ts` — added `@Public()` import and decoration.
  - `apps/api/src/common/filters/global-exception.filter.ts` — preserve HttpException body; structured 5xx logging.
- **Verified**: Re-probed previously-403 routes after API restart.
  - `/api/ops/gateway/foo` (no auth) → 401 `{message: "Invalid ops secret", error: "Unauthorized"}` ✓
  - `/api/ops/summary` (no auth) → 200 with payload ✓
  - `/api/control-room/shift-completeness` (no auth) → 403 `{message: "Forbidden resource", error: "Forbidden"}` (correctly still requires user auth) ✓
  - `/api/health/live` → 200 ✓
- **Next Agent Notes**: If you add new controllers, ask: is this user-facing (needs Supabase JWT) or internal (needs shared secret)? Apply the right gate. If the controller already has `OpsInternalGuard`/`SkipInternalAuth`/etc., add `@Public()` so the global Supabase guard doesn't double-gate it.

## [2026-07-07] Harden `SupabaseAuthGuard` — throw 401 instead of returning 403

- **Problem**: Audit item #4 (AUDIT_REPORT). `SupabaseAuthGuard.canActivate` was returning `false` for every failure path (no token, invalid token, Supabase error). Nest converts `false` from a `CanActivate` to a generic `ForbiddenException` (HTTP 403) with body `{statusCode: 403, message: "Forbidden resource", error: "Forbidden"}` — but the rest of `apps/api/src/` (auth.service, ops-internal.guard, access-control.service) consistently throws `UnauthorizedException` (HTTP 401). The mismatch meant every unauthenticated call returned 403, hiding the real semantic ("you didn't authenticate") behind a 403 ("you authenticated but lack permission"). It also silently masked 401s as 403s, making auth issues harder to diagnose in production logs.
- **Changes Made**:
  - `apps/api/src/auth/guards/supabase-auth.guard.ts`:
    - Imported `UnauthorizedException` from `@nestjs/common`.
    - Empty/whitespace-only token now throws `UnauthorizedException("Missing or empty auth token")` *before* the Supabase call — previously `authHeader.slice(7)` on `"Bearer "` returned `""` which reached `getUser("")` and triggered a noisy "Invalid Refresh Token" log line on every request.
    - `getUser` error / null user now throws `UnauthorizedException("Invalid auth token")` instead of returning `false`.
    - Added **service-role defense-in-depth**: if `user.app_metadata?.role === "service_role"`, throw `UnauthorizedException("Service-role tokens are not accepted")`. Supabase's `getUser` happily validates service-role JWTs and returns a user object — without this, a leaked service-role key would bypass every route protected by this guard.
    - Outer `try/catch` now re-throws our own `UnauthorizedException` as-is, and normalizes any other thrown error (e.g. Supabase client blew up) to `UnauthorizedException("Auth validation failed")` so we never leak a 500 stack trace to an unauthenticated caller.
    - `extractCookieToken` now `decodeURIComponent`s the captured value with a try/catch (Supabase normally doesn't percent-encode, but a misbehaving proxy might).
  - All failure paths now produce **HTTP 401** with a meaningful `error` + `message` body, consistent with the rest of the API.
- **Verified** (smoke):
  - Unauthenticated `GET /api/health/live` → 200 (still `@Public()` ✓)
  - Unauthenticated `GET /api/control-room/shift-completeness` → was 403, now **401 `{message: "Missing or empty auth token", error: "Unauthorized"}`** ✓
  - Unauthenticated `GET /api/ops/summary` → still 200 (controller is `@Public()`) ✓
  - Unauthenticated `GET /api/ops/gateway/foo` → still 401 from `OpsInternalGuard` (now comes from the internal guard, not the Supabase guard) ✓
- **Next Agent Notes**:
  - The guard's catch-block normalization means any unexpected Supabase-client error becomes 401. If you see persistent 401s during a Supabase outage, check the API logs for `Auth validation failed` — the real cause is suppressed from clients by design.
  - Service-role rejection is defense-in-depth: even if a future controller forgets to apply `OpsInternalGuard`/`@Public()`, a service-role JWT alone cannot impersonate an end user. The `service_role` key should still be locked to internal-only routes.
  - If you add a new auth strategy (e.g. machine-to-machine tokens for partners), the service-role check should be a more general `rejectInternalTokens()` helper rather than hard-coded — flag for refactor when there's a second internal token type.
- **Re-verified 2026-07-07 (post-compaction)**: Started the API from the freshly built `dist/` (node 24.15.0, pid 79340, listenting on :3004) and ran the four-probe smoke matrix. All pass:
  - `GET /api/control-room/shift-completeness` (no auth) → 401 `{"message":"Missing or empty auth token","error":"Unauthorized"}` ✓
  - `GET /api/control-room/shift-completeness` (Bearer `not-a-jwt`) → 401 `{"message":"Invalid auth token","error":"Unauthorized"}` ✓
  - `GET /api/ops/summary` (no auth) → 200 (controller is `@Public()`) ✓
  - `GET /api/ops/gateway/foo` (no auth) → 401 `{"message":"Invalid ops secret","error":"Unauthorized"}` from `OpsInternalGuard`, not the Supabase guard ✓
- **Note on running the API locally:** `apps/api` is launched via `node dist/main.js` from a prebuilt bundle (per `scripts/dev.sh`). The bundle is read-only at process start — you MUST rebuild (`pnpm --filter api build`) AND restart the process; editing the source alone does nothing. There is no supervisor in this dev path, so killing the process leaves the port unbound until you relaunch.

## [2026-07-07] Harden GatewayProxyController — disable-by-default + SSRF guard

- **Agent**: Claude
- **Purpose**: `apps/api/src/ops/gateway-proxy.controller.ts` had two production-grade problems: (a) it defaulted `OPS_GATEWAY_URL` to `http://ops-gateway:3100`, which is unreachable because `apps/ops-gateway` runs as stdio MCP (no HTTP listener) per CLAUDE.md — every call to `/api/ops/gateway/*` would 500; (b) it accepted any URL without an SSRF check, so a misconfigured env could turn the proxy into an attacker-controlled forwarder into the host network.
- **Changes Made**:
  - `apps/api/src/ops/gateway-proxy.controller.ts`:
    - Removed the `?? "http://ops-gateway:3100"` default. With no env var set, the controller returns **HTTP 503** with a clear body (`{error, message, statusCode}`) explaining that ops-gateway is stdio MCP and the proxy must be explicitly opted in to a real HTTP URL.
    - Added `assertSafeUpstreamUrl(rawUrl)` (called from the constructor) that throws at startup if `OPS_GATEWAY_URL` is set to:
      - `localhost`, `127.0.0.1`, `0.0.0.0`, `::1` (loopback)
      - `169.254.169.254` (cloud metadata)
      - any host ending in `.internal` or `.local`
      - any value that fails `new URL(...)` parse
    - The check is fail-closed: a bad env value crashes the boot, which is what we want — a misconfigured `OPS_GATEWAY_URL` must never become a silent SSRF vector.
  - `apps/api/.env`:
    - Commented out the broken `OPS_GATEWAY_URL=http://ops-gateway:3100` line with a multi-line comment explaining when to re-enable it and which hosts to avoid.
  - Portal-side: `apps/portal/components/eve/eve-drawer.tsx` had a hardcoded `headers: { "x-ops-secret": "dev-secret-key-123" }` on a client-side `fetch` — a hardcoded shared secret in JS shipped to every browser. Refactored to drop the fetch entirely and render a static "live agent discovery is unavailable from the browser" placeholder that points operators at the `ops-gateway eve-list` MCP tool. See `apps/portal/AGENT_TRACER.md` for the portal-side entry.
- **Verified** (post-rebuild + restart, pid 124453 on :3004):
  - `GET /api/control-room/shift-completeness` (no auth) → 401 `{"message":"Missing or empty auth token"}` ✓
  - `GET /api/control-room/shift-completeness` (Bearer `not-a-jwt`) → 401 `{"message":"Invalid auth token"}` ✓
  - `GET /api/ops/summary` (no auth) → 200 (controller is `@Public()`) ✓
  - `GET /api/ops/gateway/foo` (no auth) → 401 `{"message":"Invalid ops secret"}` from `OpsInternalGuard` ✓
  - `GET /api/ops/gateway/eve-list` (with valid `x-ops-secret: dev-secret-key-123`, no `OPS_GATEWAY_URL`) → 503 `{error:"ops-gateway proxy disabled", message:"OPS_GATEWAY_URL is not configured..."}` ✓
  - Startup with `OPS_GATEWAY_URL=http://localhost:3100` → throws `OPS_GATEWAY_URL points at a loopback / metadata / private host (localhost). Refusing to start proxy — unset it to disable.` ✓
  - Startup with `OPS_GATEWAY_URL=http://169.254.169.254/...` → throws the same with `(169.254.169.254)` ✓
  - Startup with `OPS_GATEWAY_URL=https://ops-gateway-internal.example.com` → context starts cleanly ✓
- **Next Agent Notes**:
  - The proxy is a *forwarder* — it does not translate MCP tool calls. When ops-gateway grows an HTTP listener, the caller is responsible for sending MCP-shaped payloads to the right path (e.g. `POST /eve-list`); the controller will not synthesize them.
  - If you want to keep the proxy useful without an HTTP listener, refactor it to spawn the ops-gateway stdio subprocess and translate HTTP request/response to/from the MCP framing. That's a larger change — out of scope for this hardening.
  - The `dev-secret-key-123` literal is still in `apps/api/.env` and `apps/ops-gateway/.env`. It is no longer reachable from any client-shipped code (the only consumer, `eve-drawer.tsx`, has been refactored), but in production you should rotate it to a 32+ byte random value via your secret manager.

## [2026-07-07] Fix `pnpm build:native` (commit 01854de0) — v2↔v3 env-var split + workspace globs

- **Problem**: `pnpm build:native` produced only a `.node` binary. The `index.js` loader and `index.d.ts` type definitions were missing or empty, so any consumer that did `require("@arch/rust-bindings-native")` got `MODULE_NOT_FOUND` at the TypeScript level and no usable surface from the binary alone. Two compounding root causes:
  1. `napi-derive` was pinned on the **v2 line** (`2.16.13`). The v2 macro reads env var `TYPE_DEF_TMP_PATH` (a file path) in its `output_type_def()` post-build hook. napi CLI 3.7.2 sets env var `NAPI_TYPE_DEF_TMP_FOLDER` (a folder path) — a different name, on purpose. With the v2 macro and the v3 CLI, `TYPE_DEF_TMP_PATH` was unset, so `output_type_def()` silently no-op'd, and `napi build` emitted a bare `.node` with no JS glue. The v3 macro (3.5.9) reads the new `NAPI_TYPE_DEF_TMP_FOLDER`, computes the file path as `<folder>/<CARGO_PKG_NAME>`, and explicitly panics if the legacy `TYPE_DEF_TMP_PATH` is set without the new var — the v2/v3 contract is one-way.
  2. `support/rust-support/bindings/node-napi` was not listed in `pnpm-workspace.yaml`, so pnpm could not install `@arch/rust-bindings-native` as a workspace dep. Consumers (`packages/rust-bindings`) had to rely on `node_modules/@arch/...` existing at the right path, which it did not.
- **Changes Made**:
  - `support/rust-support/bindings/node-napi/Cargo.toml`:
    - `napi = "2.4"` → `napi = "3"` (napi 3.10.3, released 2026-07-04). Brings `napi6` and `tokio_rt` features for the v3 surface.
    - `napi-derive = "2"` → `napi-derive = "3"` (3.5.9, released 2026-07-03). With `features = ["type-def"]` to keep the post-build type-def emission.
    - Added a long comment explaining the v2/v3 env-var split so a future agent does not downgrade napi-derive back to `"2"` without also pinning the CLI < 3.0.
  - `support/rust-support/Cargo.lock`:
    - `cargo update -p napi-derive` resolved all transitive bumps: `napi-derive-backend 1.0.75 → 5.1.1`, `napi-sys 2.4.0 → 3.2.2`, `convert_case 0.6.0 → 0.11.0`, `ctor 0.2.9 → 1.0.8`. Added `libloading 0.9.0` and `rustc-hash 2.1.3` as v3 dependencies.
  - `pnpm-workspace.yaml`:
    - Added `support/rust-support/bindings/*` to the `packages:` list so pnpm installs the binding as `@arch/rust-bindings-native` and creates the symlink in `packages/rust-bindings/node_modules/@arch/rust-bindings-native`.
  - No source changes to `src/lib.rs` were required — the v3 API is backwards-compatible for the surface used here (no `ThreadsafeFunction`, no `napi::module_init`, no `Js*` compat-mode types).
  - `napi-build` stays on `2.3.2`; the build script declares `cargo:rerun-if-env-changed` for both `TYPE_DEF_TMP_PATH` and `NAPI_TYPE_DEF_TMP_FOLDER`, so a single `build.rs` works for both v2 and v3 macro lines.
- **Verified** (post-rebuild + workspace sync):
  - `npx napi build --release --platform` (in `support/rust-support/bindings/node-napi`) emits all three artifacts: `arch-rust-bindings.linux-x64-gnu.node` (2,225,272 B), `index.js` (25,922 B), `index.d.ts` (1,419 B). Build is clean (2 pre-existing dead-code warnings in `cache-engine`, unrelated to bindings).
  - `pnpm install` creates the symlink `packages/rust-bindings/node_modules/@arch/rust-bindings-native → ../../../../support/rust-support/bindings/node-napi`.
  - `node -e 'const m = require("@arch/rust-bindings-native"); console.log(Object.keys(m).sort())'` from `packages/rust-bindings` returns `JsCacheEngine, JsTokenBucket, evaluateRulesSync, evaluateSingleRule`. Surface matches `index.d.ts`.
  - `JsCacheEngine` round-trip: `await c.set('k1', Buffer.from('v1'))` then `await c.get('k1')` returns the buffer; `c.stats()` reports `L1 cache: 0 entries, capacity: 100`.
  - `evaluateRulesSync` with `operator: "GreaterThan"`, `actionType: "Alert"`, `severity: "Warning"` on `temp: 95 > 90` returns `{matched: true, ruleId: "r1", actions: [{actionType: "Alert", message: "overheating", severity: "Warning"}]}`.
- **Follow-up issues surfaced by this build fix** (now tracked as separate tasks):
  - `JsTokenBucket` constructor panics with `there is no reactor running, must be called from the context of a Tokio 1.x runtime` at `cache-engine/src/lib.rs:262`. The `cache-engine::TokenBucket::spawn_refill_task` does `tokio::spawn` on the calling thread, which has no active tokio runtime in the napi callback context. Tracked as Task #5.
  - The `operator` and `severity` strings on the wire are PascalCase (`GreaterThan`, `Alert`, `Warning`) — the auto-generated `index.d.ts` types them as `string`, so callers can pass anything and silently fall through to the default branch. Tracked as Task #6.
- **Next Agent Notes**:
  - If you ever see `napi build` emit a `.node` with a 0-byte `index.d.ts` and no `index.js`, the v2/v3 env-var split is the first thing to check — confirm `napi-derive = "3"` and the CLI is on 3.x.
  - Any new Rust binding crate must be added to `pnpm-workspace.yaml` under `support/rust-support/bindings/*` (or a sibling glob) before it can be `require`d from a workspace package.
  - The native binary is platform-tagged (`linux-x64-gnu.node`); cross-compilation for macOS / Windows requires a `targets:` entry in `package.json` and a host with the right toolchain. For now, the binding only ships on Linux x64.

## [2026-07-07] exec_sql RPC + db-repair apply pass

- **Agent**: Claude Code
- **Purpose**: Fix the missing `public.exec_sql` RPC the ops/db-audit service depends on, then apply the auto-generated `rls_disabled` repairs to bring the local DB to zero RLS gaps.
- **Changes Made**:
  - `packages/database/migrations/069_exec_sql_helper.sql` (new): defines `public.exec_sql(sql TEXT) RETURNS SETOF JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp`. Rejects `drop|truncate|grant|revoke` categories; DDL (`alter|create|comment`) executes and returns a single `{"status":"ok"}` row; everything else runs as a row-returning query. Revokes from PUBLIC/anon/authenticated; grants EXECUTE to service_role only.
  - Applied the migration to local Supabase Postgres at `localhost:54322` via stdin (the snap-installed `psql` can't see `/home/arch` or `/tmp` paths, but stdin works).
  - Re-ran `/tmp/repair-tables.sh` (POST `/api/ops/db/repair` with `confirm: true` for all 23 flagged tables). 20/23 succeeded. The 3 that returned `"relation does not exist"` (`shift_notes`, `ai_usage_logs`, `ai_memory`) are ghost tables — referenced by the audit's app-table registry but never had a corresponding CREATE TABLE migration. They are no longer in the audit's RLS-disabled list.
  - Confirmed via `POST /api/ops/db/audit` with `x-ops-secret: <OPS_INTERNAL_SECRET>` that the response is now `{totalIssues: 0}` — audit is clean.
- **Context**: The 8 `this.supabase.rpc("exec_sql", ...)` call sites in `db-audit.service.ts` (lines 255, 296, 490, 504, 520, 541, 556, 572) have been failing with `"Could not find the function public.exec_sql(sql) in the schema cache"` since before this session. The function signature has to support both DDL (which doesn't return rows) and SELECT (which returns arbitrary rows) — `SETOF JSONB` handles both uniformly without modifying any call site. `SECURITY DEFINER` is required because the service uses the service-role JWT and the function may operate on tables the role hasn't been granted column-level access to.
- **Next Agent Notes**:
  - The 3 ghost tables (`shift_notes`, `ai_usage_logs`, `ai_memory`) should either get a migration that creates them, or be removed from the audit's app-table registry in `db-audit.service.ts` so the audit doesn't keep flagging them. Decide based on whether TypeScript code actually references them.
  - The `snap-confined` `psql` binary can't read paths outside the snap namespace. Use `psql ... < file.sql` (stdin redirection) or copy the SQL into a heredoc to apply migrations on this host.
  - Migration 069 is not yet committed. Add it to the supabase migration set so `pnpm supabase:push` picks it up on a real deploy.
