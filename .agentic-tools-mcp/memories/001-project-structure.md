# Project Structure

**Date**: 2026-07-06
**Context**: Initial codebase scan

## Root Configuration

- The project is an Nx monorepo (`nx.json`, `pnpm-workspace.yaml`, `package.json`, `turbo.json`).
- Central configuration includes `docker-compose.*.yml` files (portal, tools, monitoring, security, production).
- Strict linting and boundary checks exist (`eslint.boundaries.cjs`, `.husky/`).

## Monorepo Apps

- `apps/api`: The main backend service API.
- `apps/cms`: The content management system app.
- `apps/overview`: An overview dashboard application.
- `apps/portal`: The primary frontend portal application.

## Packages / Shared

- Contains internal shared components (`packages/api-client`, `packages/cli`, `packages/core`, etc.).

## Tools / Extensibility

- `tools/memex`: Context management and long-term memory system.
- `tools/repowise`: Codebase intelligence and documentation syncing.
- `tools/secrin`: Codebase security analysis engine.
- `tools/sense`: Go codebase navigation and comprehension tool.
- `tools/n8n-mcp`: Workflow orchestration layer.
- `tools/preflight-mcp`: Initialization / diagnostics.

## Documentation

- `docs/`, `wiki/`, `.qoder/repowiki/`
- Standardized markdown files like `AGENTS.md`, `CLAUDE.md`, `ARCH-MK2_COMPLIANCE_REPORT.md` exist to guide AI agents and define project architectures.
