# Provider Router — Key Rotation & State

## API Endpoint Map

See `references/provider-registry.json` for full endpoint metadata and `endpoint_verbs_summary`.

## Key Rotation

OpenRouter supports a **key pool** via `OPENROUTER_KEY_POOL` (comma-separated). Every other provider uses a single key. The router:

1. Tries provider[0] (e.g. Groq) → on 429, marks EXHAUSTED (5min cooldown) → tries next provider
2. For OpenRouter: tries key 0 → 429 → marks key EXHAUSTED → tries key N → all keys exhausted → next provider
3. Per-key and per-provider state persisted in `.crush/provider-state/`
4. Cooldown configurable via `PROVIDER_COOLDOWN_SEC`

## State Machine

```
IDLE → PROBE(priority order)
         ├── 200 → ACTIVE(provider) → use until 429/401/403
         ├── 429 → EXHAUSTED(provider, cooldown N min) → PROBE(next)
         ├── 4xx → FAILED(provider) → PROBE(next)
         └── ALL EXHAUSTED → WAIT(cooldown) → RESET → PROBE(cycle)
```

### Per-Provider States

| State       | Meaning                         | Action               |
| ----------- | ------------------------------- | -------------------- |
| ✅ ACTIVE   | Provider responded with success | Use for requests     |
| ⏳ COOLDOWN | Rate limited, waiting N min     | Skip, try next       |
| 🔴 FAILED   | Auth/connection failed          | Skip until reset     |
| ❓ UNKNOWN  | Not yet probed this session     | Probe on first use   |
| ⚠️ NO-KEY   | No API key configured           | Skip, configure .env |

## Auth Failure Resolution

When a provider returns `auth_failed` (HTTP 401):

1. `get_working_key()` skips it in sequential and omni modes
2. `pnpm provider:route --retry-auth` — re-probe after fixing `.env` keys
3. `pnpm provider:route --rotate-keys` — inspect/cycle OpenRouter keys
4. State persists until `--reset` or a successful re-probe
5. Persistent failures: verify the key in `.env`, then re-probe
