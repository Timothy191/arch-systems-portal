## System Overview

The repository uses a multi-layered build system centered on **pnpm workspaces** for dependency resolution, **Nx** for task orchestration and caching, and **Turbo** for Docker image pruning. The root orchestrator coordinates three Next.js applications (`apps/portal`, `apps/cms`, `apps/overview`) and shared packages under `packages/*`, with additional tooling in `tools/`.

## Core Build Stack

- **Package Manager**: pnpm 9.15.9 (enforced via `packageManager` field and Volta), with workspace catalog for shared dependency versions across apps and packages
- **Task Runner**: Nx with `run-many` targets (`build`, `lint`, `test`, `type-check`) and `targetDefaults` defining inputs/outputs/cache behavior per target type
- **Docker Pruning**: Turbo prune (`turbo prune --scope=portal --docker`) generates minimal workspace slices for container builds
- **Containerization**: Multi-stage Dockerfile (pruner → deps → builder → production) producing distroless images from Next.js standalone output
- **CI**: GitHub Actions workflows for cache warmup and policy evaluation gates

## Project Graph & Tagging Convention

Each project declares scope tags in its `project.json`:
- Apps: `scope:app`, `scope:app:<name>`
- Packages: `scope:package`, `scope:package:<category>` (ui, db, supabase, theme, etc.)
- Tools: `scope:tool`

These tags feed the **Policy SSoT Compiler** (`tools/policy-compiler.cjs`) which generates Nx boundary rules, security checks, and architecture constraints from a single source of truth. The compiler enforces forbidden import paths (e.g., UI cannot reach database internals, tools cannot import runtime code).

## Build Targets & Caching

Nx `targetDefaults` defines:
- `build`: depends on `^build` and `^codegen` (transitive dependencies), excludes test/stories files from inputs, caches `.next/**` and `dist/**`
- `type-check`: caches `.tsbuildinfo` outputs
- `lint`: caches ESLint cache, includes tsconfig and config files as inputs
- `test`: caches coverage directories
- `dev`: explicitly uncached for live reload

Environment variables like `NODE_ENV`, `VERCEL_ENV`, `CI`, `PORTAL_VERSION` are declared as named inputs to invalidate caches appropriately.

## Development vs Production Flows

**Local development**: `scripts/dev.sh` starts Supabase locally, runs dev servers with hot reload, and manages Docker tooling (Redis, n8n, Flowise, Langfuse)

**Deployment**: `scripts/deploy.sh` is a comprehensive phased script supporting `local|staging|production` modes:
1. Pre-flight validation (Node version, pnpm, Docker, Git repo)
2. Port conflict detection and cleanup
3. Environment file validation per mode
4. Backup creation (production only)
5. Service stop (systemd, background processes, Docker compose)
6. Build via `pnpm turbo build --filter=portal...`
7. Infrastructure start (Supabase local, Docker tools, monitoring stack)
8. Database migrations (`pnpx supabase db push` for staging/production)
9. Portal deployment (background process or systemd service)
10. Health checks and monitoring terminal launch

## Container Strategy

Production images use a four-stage build:
1. **Pruner**: Turbo prune to extract only portal's dependency graph
2. **Dependencies**: Install from pruned lockfile with pnpm store cache mount
3. **Builder**: Full build with Next.js cache mount, embeds build-time env vars
4. **Production**: Distroless Node 22 image serving only the standalone output

Docker Compose stacks separate concerns: `docker-compose.tools.yml` (development services), `docker-compose.production.yml` (resource limits, health checks, restart policies), `docker-compose.monitoring.yml` (Prometheus/Grafana).

## Versioning & Release

- Root `package.json` version `1.5.1` serves as the monorepo version
- Each app/package maintains its own `package.json` version
- Vercel deployment configured via `vercel.json` building only the portal app
- Rollback support built into deploy script with backup directory management

## Developer Conventions

- Run `pnpm quality` for full lint/type-check/test suite across all projects
- Use `pnpm --filter <project>` for targeted operations
- Policy changes require running `pnpm policy:gen` and committing generated files
- Husky hooks enforce commit messages and pre-commit checks
- All Node.js code must run on Node ≥22 (enforced by engines field and Volta)