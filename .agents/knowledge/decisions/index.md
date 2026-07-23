---
title: Global decision log
tags: [decisions, adr]
updated: 2026-07-21
source_agent: claude-code
status: active
---

# Global decision log

Numbered, append-only ADR-lite entries that affect the whole repo or cross package
boundaries. Format mirrors
[`packages/theme/DECISIONS.md`](../../../packages/theme/DECISIONS.md): `## NNN — Title`
with **Decision**, **Why**, **Status**. Supersede rather than delete; link successors.

Package-scoped logs remain authoritative for their package:

- [`packages/theme/DECISIONS.md`](../../../packages/theme/DECISIONS.md) — theme/design
  tokens. Notably #003 (light-only `color-scheme: light`) and #010 (login token surfaces).

---

## 001 — Shared agent knowledge base lives in `.agents/knowledge/`

**Decision**: Cross-agent codebase knowledge is stored as git-tracked Markdown under
`.agents/knowledge/`, registered as canonical in [`AGENTS.md`](../../../AGENTS.md),
exposed to tools via symlinks (`.claude/knowledge`, `.cursor/knowledge`,
`.qoder/repowiki`) created by
[`.claude/scripts/sync-surfaces.sh`](../../../.claude/scripts/sync-surfaces.sh), and
enforced by `pnpm ai check`.

**Why**: Every agent tool previously kept isolated memory (`.claude/memory/`,
`.serena/memories/`, `.crush/`, `.codeep/`), and the `repowiki`/`repowise` paths referenced
in `apps/portal/GEMINI.md` never existed. A single git-tracked source of truth is readable
by every agent (even those without MCP), diff-reviewable, versioned, and works offline.

**Status**: Accepted. Markdown is the source of truth now; MCP/vector retrieval can layer
on later without moving it. The runtime `memory_embeddings` product feature
(`009_ai_memory.sql`) is intentionally kept separate.

---

## 002 — Monorepo moved to Server/ subfolder

**Decision**: The entire product codebase was moved into `Server/` to separate agentic and product boundaries. Husky pre-commit hooks were adjusted to execute commands inside the `Server/` subfolder.

**Why**: Clarifies the boundary between the active product codebase and the agent/AI harnesses at the workspace root, preventing clutter.

**Status**: Accepted.

---

## 003 — Redis offline circuit breaker (Connection Cooldown)

**Decision**: Added a 10-second connection cooldown in `packages/redis/src/client.ts` to skip reconnection attempts if the server is offline.

**Why**: When Redis is down (e.g. Docker not running locally), every page request stalled for several hundred milliseconds trying to connect. The circuit breaker restores sub-second local load speeds by immediately failing back to in-memory/direct DB mode.

**Status**: Accepted.

---

## 004 — 9Router Embeddings Job Implementation

**Decision**: Replaced stubs in `apps/portal/src/lib/jobs/embedding-generation.ts` with direct client calls to 9Router's embeddings API, storing results in `embedding_cache`.

**Why**: Connects the speculative logging embedding event to the live local/remote AI gateway.

**Status**: Accepted.

---

## 005 — Cumulative Layout Shift (CLS) Optimization

**Decision**: Converted all remaining HTML `<img>` elements in `TrustLogos.tsx`, `DepartmentReviews.tsx`, `card-actions-view.tsx`, and `CardActionsTab.tsx` to Next.js's `<Image>` component with relative container bounds.

**Why**: Prevents cumulative layout shifts (CLS) on dynamic image resolutions, improving user experience and visual stability metrics.

**Status**: Accepted.
