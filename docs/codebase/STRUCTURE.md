# Codebase Structure

## Core Sections (Required)

### 1) Top-Level Map
| Path    | Purpose   | Evidence |
| ------- | --------- | -------- |
| apps/   | Three Next.js applications: portal (operations dashboard), cms (Payload CMS), overview (architecture/flow viewer) | apps/ directory listing |
| packages/ | Shared libraries and utilities (supabase, database, theme, ui, redis, rate-limiter, utils, errors, eslint-config, typescript-config) | packages/ directory listing |
| scripts/ | DevOps and deployment scripts (deploy.sh, dev.sh, monitor-hud.sh, etc.) | scripts/ directory |
| tools/  | Internal tooling including policy compiler, preflight MCP, audit tools | tools/ directory |
| docs/   | Documentation including wiki and codebase documentation | docs/ directory |
| .agentic-tools-mcp/ | Agentic tools MCP server for project memory and task management | .agentic-tools-mcp/ directory |
| .aistack/ | Additional internal tooling including Repowise and other MCP servers | .aistack/ directory |

### 2) Entry Points
- Main runtime entry: apps/portal (Next.js 16 operations dashboard)
- Secondary entry points: 
  - apps/api (NestJS 11 backend server on Fastify 5)
  - apps/ai-agents (FastAPI CrewAI/LangGraph orchestration stub)
- How entry is selected: Package manager scripts in package.json (dev, build, deploy commands filter by workspace)

### 3) Module Boundaries
| Boundary       | What belongs here | What must not be here |
| -------------- | ----------------- | --------------------- |
| @repo/supabase | Data access layer (Supabase client, server, middleware, Kysely, typed DB) | apps/* importing directly, UI components |
| @repo/database | SQL migrations source of truth ONLY (not imported by apps) | Direct import by applications |
| @repo/theme    | Design tokens + Tailwind preset | Importing @repo/ui or @repo/supabase |
| @repo/ui       | shadcn-style presentational primitives (no data-layer imports) | Importing @repo/supabase or @repo/database |
| @repo/redis    | Redis client + caching helpers | Business logic |
| @repo/rate-limiter | Shared rate-limiting utilities | App-specific logic |
| @repo/utils    | Shared utility functions | App-specific business logic |
| @repo/errors   | Shared error types and utilities | Error handling logic |

### 4) Naming and Organization Rules
- File naming pattern: kebab-case for config/scripts, camelCase for TypeScript (.ts, .tsx)
- Directory organization pattern: Feature-based for apps (apps/portal, apps/api, apps/ai-agents), layer-based for packages (@repo/supabase, @repo/theme, @repo/ui)
- Import aliasing or path conventions: Workspace imports use @repo/package-name format (e.g., "@repo/supabase": "workspace:*")

### 5) Evidence
- apps/ directory listing
- packages/ directory listing  
- package.json: scripts section showing workspace filtering
- CLAUDE.md: Repository Overview section detailing app/package structure
- apps/portal/package.json: dependencies showing workspace imports