# Smart Adaptive Profile (SAP) — Real-World Code Quality Framework

*Version 1.0 — Last Updated: 2026-07-06*

## Purpose

This profile defines the baseline for **real-world production code quality** in Arch-Mk2. Every agent operating in this workspace MUST read this profile and adapt their output to match the standards defined here. **No fake methods, fake rules, fake data, or hallucinated output.**

## Core Principles

### 1. Verifiable Output Only
Everything produced must be **runnable, testable, and proven in the actual codebase**:
- ✅ Code must parse (`node --check` passes)
- ✅ Tests must exist and pass (`pnpm test` or per-package test)
- ✅ Configuration changes must be validated (`pnpm mcp:check`)
- ❌ No placeholder functions, TODO stubs, or "implement-me" comments
- ❌ No referencing modules/packages that don't exist in `package.json`

### 2. Industry-Grade Patterns (FAANG+ Level)

| Dimension | Standard | Enforcement |
|---|---|---|
| **Error Handling** | Typed error hierarchy with codes, context, and cause chains | `packages/errors/` |
| **Type Safety** | Strict TypeScript, no `any`, no `@ts-ignore` | `tsconfig strict` + eslint |
| **Testing** | Unit tests for all logic, E2E for critical paths | `pnpm test`, playwright |
| **Security** | RLS on every table, env var injection, no secrets in code | `.husky/pre-commit`, `.audit/` |
| **Observability** | Structured logging, health endpoints, tracing | `packages/errors/tracing.ts` |
| **Documentation** | ADRs for architecture decisions, README for modules | `docs/` |
| **API Design** | RESTful resources, typed request/response, validation | Zod schemas |

### 3. Self-Adaptive Behavior

The profile adapts its enforcement level based on context:

| Context | Enforcement Level | What's Required |
|---|---|---|
| **New File** | MAX | Full typed API, tests, docs, error handling |
| **Bug Fix** | HIGH | Regression test, minimal change, traceability |
| **Refactor** | MEDIUM | Same behavior preserved, deprecation strategy |
| **Config/Tooling** | LOW-MEDIUM | Verified with `node --check` or equivalent |

### 4. Anti-Patterns to Never Produce

| Anti-Pattern | Why It's Banned | Real-World Alternative |
|---|---|---|
| **Mock-only tests** | Tests become brittle, don't validate real behavior | Use integration tests where possible |
| **`any` types** | Circumvents TypeScript safety | `unknown` + type guards |
| **Magic strings/numbers** | Impossible to trace | Named constants, config objects |
| **Silent error swallowing** | Hides production failures | Log + re-throw or structured fallback |
| **Hardcoded paths** | Doesn't deploy across environments | `path.resolve()`, env vars |
| **Duplicate codepaths** | Maintenance nightmare | Extract shared logic |
| **Unbounded collections** | Memory leak risk | Pagination, streaming, limits |
| **Missing input validation** | Security vulnerability | Zod schemas at API boundaries |

### 5. Quality Gate Checklist

Before any agent-produced code is considered "done":

```
[ ] Code compiles with strict mode — `pnpm type-check`
[ ] All new code has tests — `pnpm test -- --coverage`
[ ] No lint errors — `pnpm lint`
[ ] Formatted — `pnpm format:check`
[ ] No secrets leaked — `pnpm secretlint`
[ ] No console.log left in production code
[ ] Error paths are typed — uses AppError hierarchy
[ ] Input validated at boundaries
[ ] Dependencies declared in package.json
[ ] Documentation updated if public API changed
[ ] CHANGELOG-style commit message
```

### 6. MCP Tool Usage Profile

When using MCP tools, agents MUST:

1. **Prefer concrete tools over vague ones** — `sense_blast` > "search codebase"
2. **Verify results** — If an MCP tool returns data, check it against actual files
3. **Honor `verified: true`** — Trust but still validate with a sample
4. **Request minimum context** — Don't load entire files; use line ranges

### 7. Real-World Readiness Rubric

Rate each deliverable on this scale:

| Score | Meaning | Action Required |
|---|---|---|
| 5 | Production-ready | Ship it |
| 4 | Minor gaps (docstrings, edge cases) | Fix gaps, ship |
| 3 | Moderate gaps (missing tests, no error handling) | Blocked — fix before shipping |
| 2 | Major gaps (no tests, untyped, untested) | Requires architectural review |
| 1 | POC quality only | Do not deploy; rewrite |

**Target: Score 4+ for all deliverables.**

### 8. Self-Correction Protocol

If an agent detects profile violations in its own output:

1. Log the violation in `/.agentic-tools-mcp/memories/006-dont-repeat.md`
2. Fix the violation before proceeding
3. If fix isn't possible, flag for human review with rationale
4. Update the profile if the rule needs adjustment
