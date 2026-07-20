---
name: provider-router
description: >-
  Multi-provider AI router with key pool rotation and omni parallel routing.
  Use when routing inference, checking provider health, rotating OpenRouter
  keys, or configuring failover across Groq/Cerebras/Gemini/OpenRouter/etc.
  MUST use proactively before heavy AI tasks if providers may be exhausted.
author: Arch Systems
version: 3.0.0
tags: [ai, provider, router, free-tier, failover, key-rotation, multi-provider, omni, parallel]
---

# Provider Router

Routes AI inference across 15+ providers:

| Strategy       | Flag        | Behavior                          |
| -------------- | ----------- | --------------------------------- |
| **Sequential** | `--execute` | Priority failover                 |
| **Omni**       | `--omni`    | Parallel race; first success wins |

Portal gateway (`apps/portal/src/lib/ai/gateway.ts`): `ollama` | `gemini` | `router` | `omni`. Display (`AI_DISPLAY_*`) is independent of backend.

## Commands

```bash
pnpm provider:route                 # Status
pnpm provider:route --check         # Probe all
pnpm provider:route --execute <msg> # Sequential
pnpm provider:route --omni <msg>    # Parallel
pnpm provider:route --retry-auth    # Re-probe auth_failed
pnpm provider:route --rotate-keys   # OpenRouter key pool
pnpm provider:route --reset         # Clear state
pnpm provider:omni <msg>            # Omni shortcut
pnpm ai status                      # Includes provider health
```

## References

- Priority tables & agent map — [`references/provider-tables.md`](references/provider-tables.md)
- Free models — [`references/free-models.md`](references/free-models.md)
- Key rotation & auth failures — [`references/key-rotation.md`](references/key-rotation.md)
- Env vars — [`references/env-config.md`](references/env-config.md)
- Registry — [`references/provider-registry.json`](references/provider-registry.json)

## Scripts

- `scripts/provider-router.sh` — main router
- `scripts/check-provider.sh` — single probe
- `scripts/json-utils.sh` — JSON helpers (python3)
