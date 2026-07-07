# Memory: Unifying Agent Dispatchers

Unified TUI agent terminology across the codebase by replacing "Eve" references with "Agent" in `apps/api` and `apps/ops-gateway`.

## Context & Motivation

Historically, TUI agents (like `opencode`, `kilo`, and `agy`) were referred to as `Eve` agents inside the incident engine and gateway. This created confusion and inconsistency because external tools and documentation referred to them simply as "TUI agents" or "Agents".

We unified the terminology to "Agent" across the entire monorepo stack, including database schema, API configuration, gateway state, and tool definitions.

## Key Changes

### 1. Database & NestJS API (`apps/api/`)

- Renamed column/property `eve_dispatchers` to `agent_dispatchers` in the gateway settings.
- Updated `ops.controller.ts`, `ops.module.ts`, and `ops.service.ts` to fetch and handle `agent_dispatchers`.
- Maintained compatibility with existing database rows by mapping dynamically if needed, keeping database operations intact.

### 2. Ops-Gateway Configuration (`apps/ops-gateway/`)

- Updated `config.ts` to rename:
  - `enableEveDispatch` -> `enableAgentDispatch`
  - `eveDispatchers` -> `agentDispatchers`
- Updated environment variables mapping to refer to `ENABLE_AGENT_DISPATCH`.

### 3. Dispatcher Module (`apps/ops-gateway/src/dispatcher/`)

- Renamed `eve-dispatcher.ts` to [agent-dispatcher.ts](file:///home/arch/Applications/Arch-Mk2/apps/ops-gateway/src/dispatcher/agent-dispatcher.ts).
- Renamed all TypeScript types in [types.ts](file:///home/arch/Applications/Arch-Mk2/apps/ops-gateway/src/dispatcher/types.ts):
  - `EveConfig` -> `AgentConfig`
  - `EveDispatch` -> `AgentDispatch`
  - `EveId` -> `AgentId`
  - `DEFAULT_EVE_CONFIGS` -> `DEFAULT_AGENT_CONFIGS`
- Updated state management in `agent-dispatcher.ts` to track `agent` rather than `eve`.

### 4. Incident Engine (`apps/ops-gateway/src/incident/`)

- Updated [engine.ts](file:///home/arch/Applications/Arch-Mk2/apps/ops-gateway/src/incident/engine.ts) to:
  - Import from `../dispatcher/agent-dispatcher.js`.
  - Rename helper function `dispatchToEve` -> `dispatchToAgent`.
  - Check `config.enableAgentDispatch` instead of `enableEveDispatch`.

### 5. MCP Tools (`apps/ops-gateway/src/mcp/`)

- Updated [tools.ts](file:///home/arch/Applications/Arch-Mk2/apps/ops-gateway/src/mcp/tools.ts) to export:
  - `agent-dispatch` instead of `eve-dispatch`
  - `agent-list` instead of `eve-list`
  - `dispatch-status` (with agent parameters instead of eve)
- Changed descriptions and return types to refer to `agent` rather than `eve`.

## Verification & Outcomes

- Typecheck runs cleanly across the entire monorepo: `pnpm type-check`
- Lint checks pass cleanly: `pnpm lint`
- All tests pass: `pnpm test`
- Build compiles successfully: `pnpm --filter ops-gateway build`
