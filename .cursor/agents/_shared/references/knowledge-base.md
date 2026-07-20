# Agent Knowledge Base & Best Practices

This file is a shared knowledge base where agents, subagents, and automated loops record observed best practices, workspace findings, and optimization tips.

---

## 1. Multi-Provider AI Routing (Observed)

- **Status:** Operational
- **Key Observations:**
  - Groq and Cerebras are the fastest free-tier endpoints. Use them for rapid code generation and simple audits.
  - OpenRouter has a large pool of 50 keys, but they require periodic check probes.
  - Always verify provider status using `pnpm provider:route` before executing heavy tasks.
  - In case of repeated HTTP 429 (Rate Limit) on OpenRouter, run `pnpm provider:route --reset` to clear key cooldown states.

## 2. Monorepo & Type Safety (Observed)

- **Status:** Verified (0 errors)
- **Key Observations:**
  - TypeScript typecheck errors in Next.js test files (`*.test.ts`) are excluded by default from `next build`, but are captured by `tsc --noEmit` and `turbo run type-check`.
  - Never use `as any` or `: any` to bypass typecheck warnings. Use precise casts like `as unknown as T` with short explanations to comply with the project's strict `ts-no-any` rule.
  - Avoid `ReturnType<typeof fn>` for defining contract shapes. Define and export explicit named interfaces from the source module instead.

## 3. Agent Communication & Delegation (Observed)

- **Status:** Enforced
- **Key Observations:**
  - Always supply system prompts and specifications when delegating tasks to subagents.
  - Download screenshot or design images to local `/tmp/` files and reference them as absolute paths rather than using large base64 dumps.

## 4. Redis Caching Best Practices (Observed)

- Use redis L2 cache for portal caching operations.
- Optimize redis-caching using precise expiry keys.
- Always clear redis caches on deployment.

## 5. Token Cache Habits (Observed)

- Put stable policy / tool defs / skill catalog first; task-specific context last.
- Prefer entry → `references/` progressive disclosure (agents ≤65, skills ≤80 lines).
- Probe providers with `pnpm provider:route --check` before heavy parallel work; reuse results within cooldown windows.

## 6. Detected Errors & Gotchas (Auto-Logged)

- 2026-07-20: [TypeScript Error] Redis client connection failed on ioredis.connect
