# Key Functions & Entry Points

**Date**: 2026-07-06
**Context**: Graph node analysis

## Application Entry Points

- **API**: Agent Graph setup (`createInitialAgentState`, `reduceState`)
- **Portal App**: Layouts and forms (`RootLayout`, `AuthLayout`, `LoginForm`, `loginAction`)
- **Overview App**: Dashboard sections (`OverviewPage`, `SystemArchitecture`, `DatabaseSchema`, `TechStack`)
- **Scripts**: Various `driver.mjs` files representing entry points for skills (`run-api`, `run-cms`, `run-overview`, `run-portal`).

## High-Traffic Functions (Hotspots)

The following functions have exceptionally high fan-in (called frequently across the codebase):

- `append`: Core tool loop / list handling.
- `get`: Used heavily in `repowise`, `secrin`, and `api-client` components.
- `exists`: Used heavily in `cli.core.config`.
- `Run`: Used in the `sense` scanner pipeline.
- `read_text` / `parse_file`: AST parsers and ingestion logic within `repowise.core`.
- `Error` / `Close`: Standard utility error and cleanup patterns across tools.

## Important Decorators

- `@Public` decorator in the API layer for bypassing standard auth checks (`apps/api/src/auth/decorators/public.decorator.ts`).
