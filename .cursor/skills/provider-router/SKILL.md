---
name: provider-router
description: >-
  Multi-provider AI router with key pool rotation. Cycles free-tier models
  and auto-rotates API keys when one is rate-limited (429). Probes health,
  tracks per-key exhaustion, failover across providers.
author: Arch Systems
version: 1.1.0
tags: [ai, provider, router, free-tier, failover, key-rotation]
---

# Provider Router

Routes AI inference across multiple free-tier providers with **key pool rotation** — when one key hits rate limit, auto-cycle to the next.

## Key Rotation

OpenRouter supports a **key pool** via `OPENROUTER_KEY_POOL` (comma-separated). The router:

1. Tries key 0 → on 429, marks key EXHAUSTED (5min cooldown) → tries key 1
2. If all keys exhausted → falls through to next provider (opencode → gemini → ...)
3. Per-key state persisted in `.crush/provider-state/`
4. Cooldown configurable via `PROVIDER_COOLDOWN_SEC`

```
                      ┌─ Key 0 ── 200 ── ✅ USE
OpenRouter ──ROTATE───├─ Key 1 ── 429 ── ⏳ EXHAUSTED (5min)
                      ├─ Key 2 ── 429 ── ⏳ EXHAUSTED
                      ├─ ...    ── 401 ── 🔴 BAD
                      └─ Key N ── 429 ── ⏳ EXHAUSTED
                                ↓ ALL EXHAUSTED
OpenCode ─────────────── try single key
Gemini ──────────────── try single key
```

## Providers Managed

| #   | Provider   | Auth         | Key Pool   | Free Model                    | Status           |
| --- | ---------- | ------------ | ---------- | ----------------------------- | ---------------- |
| 1   | OpenRouter | Bearer token | ✅ 50 keys | `cohere/north-mini-code:free` | Needs valid keys |
| 2   | OpenCode   | Bearer token | ❌         | `deepseek-v4-flash`           | Endpoint 500     |
| 3   | Gemini     | Query param  | ❌         | `gemini-2.0-flash-exp`        | Key invalid      |
| 4   | AIHubMix   | Bearer token | ❌         | `coding-glm-4.6-free`         | No key           |
| 5   | Venice.ai  | Bearer token | ❌         | `kimi-k3`                     | No key           |

## State Machine

```
IDLE → PROBE(all keys in pool order)
         ├── 200 → ACTIVE(key) → use until 429/401/403
         ├── 429 → EXHAUSTED(key, cooldown N min) → PROBE(next key)
         ├── 4xx → FAILED(key) → PROBE(next key)
         └── ALL KEYS EXHAUSTED → PROBE(next provider)
ALL_PROVIDERS_EXHAUSTED → WAIT(cooldown) → RESET → PROBE(cycle)
```

## Commands

```bash
pnpm provider:route              # List all provider/key status
pnpm provider:route --check      # Probe all providers and every key in pool
pnpm provider:route --reset      # Clear all cooldowns (keys + providers)
pnpm provider:route --execute    # Run a prompt through best available key
pnpm ai status                   # Includes provider health check phase
```

## Config (.env)

```bash
# Key pool (comma-separated, router rotates on 429)
OPENROUTER_KEY_POOL=sk-key1,sk-key2,sk-key3,...

# Single keys for other providers
OPENCODE_API_KEY=sk-xxxxx
GEMINI_API_KEY=...
AIHUBMIX_API_KEY=...
VENICE_API_KEY=...

# Router settings
PROVIDER_COOLDOWN_SEC=300
```

## Scripts

- `scripts/provider-router.sh` — Main router (status, check, execute, reset)
- `scripts/check-provider.sh` — Single provider/key probe

## References

- `references/free-models.md` — Free-tier model reference
- `references/provider-registry.json` — All provider metadata + key pool config
