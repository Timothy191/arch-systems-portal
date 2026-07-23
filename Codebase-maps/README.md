# Codebase Maps

This directory contains visual and structured reference maps of the **Arch Systems Portal** monorepo architecture, application layers, packages, and data flows.

---

## Maps Included

| Map Document                                                                                                                         | Description                                                                                                          |
| :----------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| [`monorepo-structure-map.md`](file:///home/timothy/Projects/Codebase-maps/monorepo-structure-map.md)                                 | High-level workspace map, directory breakdown (`apps/`, `packages/`, `.agents/`, `.claude/`), and boundary rules.    |
| [`data-flow-and-api-map.md`](file:///home/timothy/Projects/Codebase-maps/data-flow-and-api-map.md)                                   | Map of client components, Server Actions, Next.js 16 API Route Handlers, Supabase RLS, and Redis L1/L2 cache layers. |
| [`packages-and-dependencies-map.md`](file:///home/timothy/Projects/Codebase-maps/packages-and-dependencies-map.md)                   | Dependency graph of all `@repo/*` packages, their exports, consumption rules, and isolation guarantees.              |
| [`architectural-graph-matrix-and-tooling.md`](file:///home/timothy/Projects/Codebase-maps/architectural-graph-matrix-and-tooling.md) | 4-layer graph matrix (Workspace, Next.js Codebase, Dataflow/Backend, Observability) and recommended tooling stack.   |

---

## Monorepo Architecture Overview

```
                      +----------------------------------+
                      |         Portal UI (App)          |
                      |     apps/portal (Next.js 16)     |
                      +----------------+-----------------+
                                       |
           +---------------------------+---------------------------+
           |                           |                           |
           v                           v                           v
+--------------------+      +--------------------+      +--------------------+
|  @repo/contract    |      |  @repo/supabase    |      |    @repo/redis     |
| (Zod Validation)   |      | (Auth, PostgREST)  |      | (L1/L2 Cache, v2)  |
+--------------------+      +--------------------+      +--------------------+
           |                           |                           |
           +---------------------------+---------------------------+
                                       |
                                       v
                      +----------------------------------+
                      |     Control Plane / Gateway      |
                      |   apps/ops-gateway (MCP Bridge)  |
                      +----------------------------------+
```
