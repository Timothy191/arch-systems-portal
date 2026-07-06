# Memory 016: SurrealDB Migration for Agentic AI Memory Content

## Context

The project previously stored user and assistant episodic and semantic memories in a Supabase table (`memory_embeddings`). To optimize vector search performance and build a dedicated database layer for AI content, SurrealDB was introduced as the central optimized database for agentic content.

## Decisions

- **Isolation:** SurrealDB is used _only_ for the AI memory content (conversations, episodic/semantic embeddings). The rest of the project's codebase, operational statistics, and authentication databases continue to reside in Supabase.
- **Dynamic ES Module Loading:** The `surrealdb` SDK v2 is built as an ES module. Because the NestJS API compile configuration target is CommonJS, standard imports generate type errors and runtime loader crashes. We bypassed this by utilizing a dynamic runtime import (`new Function('return import("surrealdb")')()`) inside `SurrealService` and typing parameters dynamically as `any` at compile time.
- **SurrealQL Vector Search:** Replaced PostgreSQL vector operations with SurrealQL HNSW vector queries (`vector::similarity::cosine`) and BM25 full-text Search indices (`search::score`).

## Implementation Details

1. **Docker Service:** Added `plantcor-surrealdb` running on port `8000` to `docker-compose.tools.yml` with a persistent docker volume named `surrealdb_data`.
2. **Schema & Indexes:**
   - Schema defined on `memory_embeddings` table containing `session_id`, `user_id`, `content`, `embedding` (array<float, 768>), `metadata`, `memory_type`, and `created_at`.
   - Cosine HNSW vector index: `idx_memory_embeddings_hnsw` on `embedding` with `DIMENSION 768`.
   - Full-text search index: `idx_content` on `content` utilizing `english BM25` analyzer.
3. **Database Integration:** Created `SurrealService` (connection lifecycle and auto-migrations) and updated `MemoryService` to insert and query memories using SurrealQL.
4. **Health Checking:** Integrated `SurrealHealthIndicator` to ping SurrealDB via `RETURN true;` on the readiness probe (`GET /api/health`).

## Verification

- NestJS API type checks are fully resolved: `pnpm --filter api type-check`.
- Unit tests successfully ran and passed: `pnpm --filter api test` (Mocked SurrealHealthIndicator to keep specs intact).
