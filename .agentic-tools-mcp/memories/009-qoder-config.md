# Qoder Configuration — Complete Inventory

**Date**: 2026-07-06
**Context**: All Qoder CLI settings, skills, and repowiki documentation

## Settings

### `.qoder/settings.json`

- Repowise distill commands enabled

### `.qoder/settings.local.json`

- Extensive Bash permissions (70+ allowed patterns)
- MCP tool permissions (`mcp__github-official__*`)
- Permissions accumulated from interactive approval history

## Skills (`.qoder/skills/`)

| Skill          | Files                    | Purpose                                                                                                                       |
| -------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `run-portal`   | `SKILL.md`, `driver.mjs` | Launch and smoke-test the Portal (Next.js frontend). Checks `/`, `/auth/login`, `/api/health`                                 |
| `run-api`      | `SKILL.md`, `driver.mjs` | Launch and smoke-test the API (NestJS + Fastify). Auto-starts Supabase. Checks `/api/health/live`, `/api/docs`, `/api/health` |
| `run-cms`      | `SKILL.md`, `driver.mjs` | Launch and smoke-test the CMS (PayloadCMS v3). Auto-creates `.env`. Checks `/`, `/admin`                                      |
| `run-overview` | `SKILL.md`, `driver.mjs` | Launch and smoke-test the Overview app (static). Checks `/` for architecture diagrams                                         |
| `verify`       | `SKILL.md`               | Run lint, type-check, and unit tests. Supports per-package scoping                                                            |

### Additional Built-in Skills (available via slash commands)

- `simplify` — Review changed code for reuse, quality, efficiency
- `security-review` — STRIDE threat-model review of pending changes
- `quest` — Intelligent workflow orchestrator for feature development
- `mcp-config` — Interactively add/update/remove MCP servers
- `loop` — Run prompts on a recurring interval
- `run` — Launch and drive the project's app
- `agent-creator` — Guide for creating custom agents
- `hook-config` — Guide for creating/configuring hooks
- `sdk` — Guide for Qoder TypeScript SDK
- `skill-creator` — Guide for creating skills
- `microsoft-foundry` — Deploy/evaluate/fine-tune Foundry agents

## RepoWiki (`.agentic-tools-mcp/repowiki/`, symlinked at `.qoder/repowiki/`)

100+ documentation pages in `.agentic-tools-mcp/repowiki/en/content/` covering:

| Category                  | Topics                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Architecture & Design     | Application structure, design patterns, module boundaries                                          |
| Portal Application        | Pages, layouts, components, state management                                                       |
| Department Features       | 8 departments: drilling, production, control-room, maintenance, safety, hr, logistics, engineering |
| Database & Data Models    | Supabase schema, migrations, RLS policies                                                          |
| API Reference             | REST endpoints, auth, health, AI/ML, telemetry                                                     |
| AI & Machine Learning     | Tool definitions, embedding generation, vector search, caching                                     |
| Real-time & Live Data     | WebSocket, streaming, shift data                                                                   |
| Security & Authentication | Supabase auth, JWT, CSP, rate limiting                                                             |
| Performance & Caching     | Redis caching strategies, optimization                                                             |
| Testing & QA              | Playwright E2E, Jest unit tests, quality gates                                                     |
| Deployment & DevOps       | Docker, CI/CD, environment management                                                              |
| Shared Packages           | ui, utils, redis, supabase, theme, database, errors                                                |
| Troubleshooting & FAQ     | Common issues and resolutions                                                                      |

### Metadata

- `.qoder/repowiki/en/meta/repowiki-metadata.json` — Wiki metadata
- `.qoder/repowiki/knowledge/en/_index.yaml` — Knowledge index

## Integration with AGENTS.md

Section 6 of `.agents/AGENTS.md` mandates:

- Maintain RepoWiki after code changes
- Maintain Skills after startup/verification script changes
- Keep `.qoder/settings.local.json` updated for new CLI tools
