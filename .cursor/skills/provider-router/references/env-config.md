# Provider Router — Environment Config

Add keys to `.env` (never commit). See `.env.example` for comments.

```bash
# ── Key pool (comma-separated, router rotates on 429) ──
OPENROUTER_KEY_POOL=sk-or-v1-key1,sk-or-v1-key2,...

# ── Free-tier provider keys (single) ──
GROQ_API_KEY=gsk_xxxxx
CEREBRAS_API_KEY=sk-xxxxx
GEMINI_API_KEY=AIza...
MISTRAL_API_KEY=sk-xxxxx
DEEPSEEK_API_KEY=sk-xxxxx
HF_API_KEY=hf_xxxxx
OLLAMA_API_KEY=your-ollama-cloud-key
OPENCODE_API_KEY=sk-xxxxx
AIHUBMIX_API_KEY=sk-xxxxx
VENICE_API_KEY=sk-xxxxx
COHERE_API_KEY=xxxxx

# ── Paid provider keys (fallback) ──
ANTHROPIC_API_KEY=sk-ant-xxxxx
PERPLEXITY_API_KEY=pplx-xxxxx
TOGETHER_API_KEY=xxxxx

# ── Model overrides (optional) ──
GROQ_FREE_MODEL=llama-3.3-70b-versatile
CEREBRAS_FREE_MODEL=llama-3.3-70b
GEMINI_FREE_MODEL=gemini-2.0-flash-exp
MISTRAL_FREE_MODEL=mistral-small-latest
OPENROUTER_FREE_MODEL=cohere/north-mini-code:free
DEEPSEEK_FREE_MODEL=deepseek-chat
HF_FREE_MODEL=meta-llama/Meta-Llama-3-8B-Instruct
OLLAMA_URL=https://ollama.com
OLLAMA_DEFAULT_MODEL=gemma4:latest

# ── Portal AI gateway (display vs backend) ──
AI_DISPLAY_PROVIDER=google
AI_DISPLAY_MODEL=gemini-2.0-flash-exp
AI_BACKEND_STRATEGY=ollama

# ── Router settings ──
PROVIDER_COOLDOWN_SEC=300

# ── OpenRouter app attribution (recommended by OpenRouter docs) ──
OPENROUTER_HTTP_REFERER=http://localhost:3000
OPENROUTER_APP_TITLE=Arch Systems
```

## Key status meanings

| Status                            | Action                                            |
| --------------------------------- | ------------------------------------------------- |
| `MISSING`                         | Env var not set — add to `.env`                   |
| `no-key`                          | Probe skipped — configure env var                 |
| `auth_failed`                     | Key present but rejected — replace with valid key |
| `configured_keys_all_auth_failed` | Pool loaded but all keys invalid                  |

Run `pnpm provider:route --check` after updating keys.
