The monorepo uses a layered configuration system centered on per-application .env files validated at runtime, overlaid by Docker Compose environment definitions and platform-specific build flags.

Runtime env loading (portal app) — apps/portal/lib/env.ts defines a single Zod schema (envSchema) that declares every supported variable with type coercion, defaults, and boolean transforms. A lazily-evaluated Proxy caches the parsed result; in production it throws on missing required vars, while dev/test logs warnings and applies defaults. Consumers import the typed env object instead of reading process.env directly. The companion .env.example and .env.production.example document all keys and their intended values.

Build-time / framework config — Next.js apps read NODE_ENV, CI, and ENABLE_HEAVY_PLUGINS from process to toggle PWA generation, Sentry source-map uploads, bundle analysis, and output mode (standalone vs default). nx.json declares which env vars participate in Nx task caching via namedInputs.sharedGlobals, ensuring builds invalidate when runtime flags change.

Docker Compose overlay — docker-compose.production.yml is composed on top of other compose stacks to inject production-only overrides: restart policies, resource limits, health checks, logging rotation, and secret injection via ${VAR:-default} syntax. Secrets are expected to be supplied by the orchestrator (Vercel, Kubernetes, or a secrets manager) and never committed.

Per-app configs — Each Next.js app owns its own runtime config:

- Portal: next.config.mjs + lib/env.ts
- CMS: payload.config.ts reads DATABASE_URL and PAYLOAD_SECRET
- Overview: minimal Tailwind config extending @repo/theme/tailwind

Infrastructure & observability config — config/nginx.conf defines reverse-proxy, SSL termination, security headers, and upstream routing for the portal backend. config/prometheus.yml and monitoring/prometheus.yml declare scrape targets for n8n, langfuse, and internal services. Redis cluster topology lives under support/redis-topology/config/shard-map.json.

Conventions developers should follow

1. Declare every new env var in apps/portal/lib/env.ts Zod schema with a sensible default and type; update .env.example and .env.production.example accordingly.
2. Never reference process.env.\* directly outside lib/env.ts; use the exported env proxy for typed access.
3. Keep secrets out of git — supply them through Docker Compose overlays, CI/CD variables, or platform secret stores.
4. Add new build-affecting env vars to nx.json namedInputs.sharedGlobals so task graphs re-run when they change.
5. For infrastructure-level settings (nginx, Prometheus), edit the canonical file under config/ rather than duplicating inline.
