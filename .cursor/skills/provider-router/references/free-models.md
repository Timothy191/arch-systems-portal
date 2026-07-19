# Free-Tier AI Models Reference

Discovered from project config, crush logs, and provider docs.

## Verified Working

| Provider   | Model                                   | Rate Limit  | Notes                                      |
| ---------- | --------------------------------------- | ----------- | ------------------------------------------ |
| OpenRouter | `cohere/north-mini-code:free`           | ~20 req/min | Code-optimized, confirmed working in crush |
| OpenRouter | `google/gemini-2.0-flash-exp:free`      | ~10 req/min | Fast gen, free tier                        |
| OpenRouter | `mistralai/mistral-7b-instruct:free`    | ~10 req/min | Instruct model                             |
| OpenRouter | `meta-llama/llama-3.2-3b-instruct:free` | ~10 req/min | Small & fast                               |

## Configured but Unverified

| Provider | Model                  | Key Status              |
| -------- | ---------------------- | ----------------------- |
| OpenCode | `deepseek-v4-flash`    | Has key, untested       |
| Gemini   | `gemini-2.0-flash-exp` | "API key not valid"     |
| AIHubMix | `coding-glm-4.6-free`  | "API key not valid"     |
| Venice   | `kimi-k3`              | "Authentication failed" |

## Provider Priority (router default)

```
1. OpenRouter (cohere/north-mini-code:free)  → confirmed working
2. OpenCode  (deepseek-v4-flash)             → has configured key
3. Gemini    (gemini-2.0-flash-exp)          → needs valid key
4. AIHubMix  (coding-glm-4.6-free)           → needs valid key
5. Venice    (kimi-k3)                       → needs valid key
```

## Rate Limit Behavior

- **429 Too Many Requests** → mark provider EXHAUSTED, cooldown 5 min
- **401 Unauthorized / 403 Forbidden** → mark provider FAILED, require manual re-auth
- **5xx Server Error** → mark provider DEGRADED, retry after 1 min
- **Connection Timeout** → mark provider DEGRADED, retry after 30s
