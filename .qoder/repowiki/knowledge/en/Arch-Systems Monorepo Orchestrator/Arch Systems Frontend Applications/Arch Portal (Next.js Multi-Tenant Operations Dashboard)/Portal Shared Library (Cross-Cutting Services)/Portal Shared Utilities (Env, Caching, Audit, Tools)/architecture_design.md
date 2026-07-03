Five independent leaf utilities with no internal dependencies on each other:
- env.ts — single Zod schema that validates all process.env entries at first access via a lazy Proxy singleton; throws in production on missing required vars, logs warnings and applies defaults otherwise. Exposes env, getEnvErrors(), resetEnv().
- server-cache.ts — thin wrapper around Next.js unstable_cache exposing cachedRSC(keyParts, fn, options) for React Server Component reads with tag-based revalidation.
- cache-utils.ts — runtime L2 cache helper withCache(fn, {category,keyParts,tags,fallback}) built on @repo/redis; deduplicates concurrent calls per key via an in-process Map, rethrows DatabaseError without caching, and falls back to L1 on transient errors.
- audit.ts — use server action logAuditEvent that authenticates via Supabase, inserts into audit_logs, then invalidates both Redis tags (table:<name>) and Next.js Data Cache tags.
- tools.ts — getTools() queries the tools table through a read-replica client and falls back to the in-memory PRODUCTIVITY_TOOLS constant; also exports static EXTERNAL_TOOLS (n8n, Flowise) whose URLs are driven by N8N_URL / FLOWISE_URL.

Dependency direction is outward only: this module depends on @repo/supabase/*, @repo/redis, and next/cache; nothing inside the scope imports from sibling portal modules except ~/lib/departments (for the fallback tools list).