# Repository Guidelines

## Project Overview
This project is an AI-orchestrated, monorepo-based application featuring a primary UI built with Next.js 16 (App Router) and a control-plane bridge for MCP (Model Context Protocol) operations. It emphasizes rigorous AI-agent integration, spec-driven development, and strict adherence to architectural boundaries between the product monorepo and agentic AI surfaces.

## Architecture & Data Flow
The architecture follows a strict separation between:
- **Product Monorepo**: `Server/apps/`, `Server/packages/`, product scripts (in `Server/scripts/`), and `turbo` build tasks.
- **Agentic AI**: `.cursor/`, `.claude/`, agents, skills, `pnpm ai` tools, and maintenance scripts.

Data flow for core features typically involves:
- **Portal (`Server/apps/portal/`)**: Handles UI, user interactions, and calls library/feature-based data fetching functions.
- **Backend/Lib (`Server/apps/portal/src/lib/` & `Server/packages/`)**: Contains shared business logic, API clients, and data access layers (`@repo/supabase`).
- **Control Plane (`Server/apps/ops-gateway/`)**: Manages external integrations, MCP tools, and event-driven tasks.

## Key Directories
- `Server/apps/portal/`: Primary deployable Next.js 16 UI.
- `Server/apps/ops-gateway/`: MCP bridge, dispatcher, and subscriber services.
- `Server/packages/`: Framework-agnostic shared libraries (e.g., `@repo/contract`, `@repo/database`, `@repo/ui`).
- `.cursor/`: Project-specific agents, skills, and layout standards.
- `.claude/`: Claude Code harness configuration and surfaces.
- `Server/scripts/`: Shared scripts for development, deployment, and AI maintenance.
- `.agents/knowledge/`: Shared cross-agent knowledge base (repowiki) — single source of truth.

## Shared Knowledge Base (Repowiki)
Single source of truth for cross-agent codebase knowledge: `.agents/knowledge/`.
- READ `.agents/knowledge/index.md` before non-trivial work.
- WRITE durable learnings (dated, evidence-cited) and update `index.md`; supersede, never delete.
- Tool paths resolve here via symlinks (`.claude/knowledge`, `.cursor/knowledge`, `.qoder/repowiki`), created by `.claude/scripts/sync-surfaces.sh`.
- Not for end-user product memory (`packages/database/migrations/009_ai_memory.sql`).
- Enforced by `pnpm ai check`. Full protocol: `.agents/knowledge/README.md`.

## Development Commands
### Product (Standalone)
- `pnpm dev`: Full stack dev mode (Docker + Next.js).
- `pnpm dev --quick`: Portal-only dev, skips infra.
- `pnpm build`: Full project build (Turborepo).
- `pnpm quality`: Pre-commit check (lint + type-check + test + prettier).

### Agentic AI
- `pnpm ai`: AI system health check.
- `pnpm ai check`: Validate AI surfaces drift/compliance.
- `pnpm agent:delegate`: Delegate tasks to subagents.

## Code Conventions & Common Patterns
- **TypeScript**: Strict (TS 5.7+), no `any`, no `@ts-ignore`.
- **Validation**: Zod (all external input).
- **Errors**: `@repo/errors` (typed `AppError` subclasses).
- **Styling**: Tailwind CSS (via `@repo/theme`, light-mode only).
- **Async/Jobs**: Inngest 4 for background jobs.
- **Boundary**: Never import from `apps/` inside `packages/`. Never add application logic to `packages/`.

## Important Files
- `package.json`: Main workspace configuration.
- `pnpm-workspace.yaml`: Workspace definition.
- `turbo.json`: Build pipeline configuration.
- `apps/portal/.env.example`: Env var templates.
- `AGENTS.md`: Canonical AI policy.

## Runtime/Tooling Preferences
- **Runtime**: Node.js >= 22 (Volta pinned: 24).
- **Package Manager**: pnpm 9 (strict).
- **Build**: Turborepo 2.

## Testing & QA
- **Framework**: Jest (`turbo run test`).
- **Quality Gate**: `pnpm quality` must pass before marking tasks as "done".
- **Coverage**: Expected for all permanent feature changes and API modifications.

---

## Next.js 16 Caching & Data Fetching
When applying the native `"use cache"` directive to Server Components or data-fetching functions:
- **Do not read `cookies()` or `headers()` inside a `"use cache"` scope.** This includes indirect calls via `createServerSupabaseClient` or `assertAccessControlRole()`.
- **Decouple Auth from Caching**: To cache global/department data securely, split your function. Use an outer, un-cached function to verify authorization (`assertAccessControlRole`), then call an inner `_getCached...` function containing `"use cache"` and `cacheTag`.
- **Use `createAdminClient()` in Cache**: The inner cached function should fetch data using `createAdminClient()` to avoid requiring user cookies, as the outer function has already validated access.

---
*For canonical rulebook, see AGENTS.md in project root.*
