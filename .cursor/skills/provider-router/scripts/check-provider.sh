#!/usr/bin/env bash
# Provider health check — probe a single provider/model endpoint
# Usage: check-provider.sh <provider-name> [key-index]
# Returns: JSON with {provider,model,status,code,error}
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "$(cd "$(dirname "$0")/../../../.." && pwd)")"
STATE_DIR="${ROOT}/.crush/provider-state"
mkdir -p "$STATE_DIR"

PROVIDER="${1:-}"
[[ -z "$PROVIDER" ]] && { echo '{"error":"no provider specified","status":"skip"}'; exit 1; }

KEY_INDEX="${2:-0}"

# Source env
if [[ -f "${ROOT}/.env" ]]; then
  set -a; source "${ROOT}/.env"; set +a
fi

# Session stickiness — inherited from parent if set, else generated
ROUTER_SESSION_ID="${ROUTER_SESSION_ID:-}"
if [[ -z "$ROUTER_SESSION_ID" ]]; then
  SESSION_FILE="${ROOT}/.crush/.session_id"
  if [[ -f "$SESSION_FILE" ]]; then
    ROUTER_SESSION_ID="$(cat "$SESSION_FILE")"
  else
    ROUTER_SESSION_ID="arch-$(date +%s)-$$-$(python3 -c 'import uuid;print(uuid.uuid4().hex[:12])')"
    echo "$ROUTER_SESSION_ID" > "$SESSION_FILE"
  fi
fi

MODEL=""
KEY=""
URL=""
PAYLOAD=""
AUTH_HEADER=""
EXTRA_HEADERS=()

case "$PROVIDER" in
  groq)
    MODEL="${GROQ_FREE_MODEL:-llama-3.3-70b-versatile}"
    KEY="${GROQ_API_KEY:-}"
    URL="${GROQ_BASE_URL:-https://api.groq.com/openai/v1}/chat/completions"
    ;;
  cerebras)
    MODEL="${CEREBRAS_FREE_MODEL:-llama-3.3-70b}"
    KEY="${CEREBRAS_API_KEY:-}"
    URL="${CEREBRAS_BASE_URL:-https://api.cerebras.ai/v1}/chat/completions"
    ;;
  gemini)
    MODEL="${GEMINI_FREE_MODEL:-gemini-2.0-flash-exp}"
    KEY="${GEMINI_API_KEY:-}"
    URL="https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${KEY}"
    PAYLOAD='{"contents":[{"role":"user","parts":[{"text":"respond with just the letter y"}]}],"generationConfig":{"maxOutputTokens":5}}'
    ;;
  mistral)
    MODEL="${MISTRAL_FREE_MODEL:-mistral-small-latest}"
    KEY="${MISTRAL_API_KEY:-}"
    URL="${MISTRAL_BASE_URL:-https://api.mistral.ai/v1}/chat/completions"
    ;;
  openrouter)
    IFS=',' read -ra KEY_POOL <<< "${OPENROUTER_KEY_POOL:-}"
    KEY="${KEY_POOL[$KEY_INDEX]:-}"
    MODEL="${OPENROUTER_FREE_MODEL:-cohere/north-mini-code:free}"
    URL="${OPENROUTER_BASE_URL:-https://openrouter.ai/api/v1}/chat/completions"
    EXTRA_HEADERS+=(-H "HTTP-Referer: ${OPENROUTER_HTTP_REFERER:-http://localhost:3000}" -H "X-Title: ${OPENROUTER_APP_TITLE:-Arch Systems}")
    ;;
  deepseek)
    MODEL="${DEEPSEEK_FREE_MODEL:-deepseek-chat}"
    KEY="${DEEPSEEK_API_KEY:-}"
    URL="${DEEPSEEK_BASE_URL:-https://api.deepseek.com/v1}/chat/completions"
    ;;
  ollama)
    MODEL="${OLLAMA_DEFAULT_MODEL:-gemma4:latest}"
    KEY="${OLLAMA_API_KEY:-}"
    URL="${OLLAMA_URL:-http://localhost:11434}"
    URL="${URL%/}/api/chat"
    PAYLOAD='{"model":"'"${MODEL}"'","messages":[{"role":"user","content":"respond with just the letter y"}],"stream":false}'
    ;;
  huggingface)
    MODEL="${HF_FREE_MODEL:-meta-llama/Meta-Llama-3-8B-Instruct}"
    KEY="${HF_API_KEY:-}"
    URL="${HF_BASE_URL:-https://api-inference.huggingface.co}/models/${MODEL}/v1/chat/completions"
    ;;
  opencode)
    MODEL="${OPENCODE_MODEL:-deepseek-v4-flash}"
    KEY="${OPENCODE_API_KEY:-}"
    URL="${OPENCODE_BASE_URL:-https://opencode.ai/zen/go/v1}/chat/completions"
    ;;
  aihubmix)
    MODEL="${AIHUBMIX_MODEL:-coding-glm-4.6-free}"
    KEY="${AIHUBMIX_API_KEY:-}"
    URL="${AIHUBMIX_BASE_URL:-https://api.aihubmix.com/v1}/chat/completions"
    ;;
  venice)
    MODEL="${VENICE_MODEL:-kimi-k3}"
    KEY="${VENICE_API_KEY:-}"
    URL="${VENICE_BASE_URL:-https://api.venice.ai/api/v1}/chat/completions"
    ;;
  cohere)
    MODEL="${COHERE_MODEL:-command-r}"
    KEY="${COHERE_API_KEY:-}"
    URL="${COHERE_BASE_URL:-https://api.cohere.ai/v1}/chat"
    PAYLOAD="{\"model\":\"${MODEL}\",\"message\":\"respond with just the letter y\",\"max_tokens\":5}"
    AUTH_HEADER="-H Authorization: Bearer ${KEY}"
    ;;
  anthropic)
    MODEL="${ANTHROPIC_MODEL:-claude-sonnet-4-20250514}"
    KEY="${ANTHROPIC_API_KEY:-}"
    URL="https://api.anthropic.com/v1/messages"
    PAYLOAD="{\"model\":\"${MODEL}\",\"max_tokens\":5,\"messages\":[{\"role\":\"user\",\"content\":\"respond with just the letter y\"}]}"
    ;;
  perplexity)
    MODEL="${PERPLEXITY_MODEL:-sonar-pro}"
    KEY="${PERPLEXITY_API_KEY:-}"
    URL="${PERPLEXITY_BASE_URL:-https://api.perplexity.ai}/chat/completions"
    ;;
  together)
    MODEL="${TOGETHER_MODEL:-meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo}"
    KEY="${TOGETHER_API_KEY:-}"
    URL="${TOGETHER_BASE_URL:-https://api.together.xyz/v1}/chat/completions"
    ;;
esac

# Default payload for OpenAI-compatible providers
if [[ -z "$PAYLOAD" ]] && [[ "$PROVIDER" != "gemini" ]] && [[ "$PROVIDER" != "anthropic" ]] && [[ "$PROVIDER" != "cohere" ]] && [[ "$PROVIDER" != "ollama" ]]; then
  PAYLOAD="{\"model\":\"${MODEL}\",\"messages\":[{\"role\":\"user\",\"content\":\"respond with just the letter y\"}],\"max_tokens\":5}"
fi

# Skip if no key (local Ollama does not require a key)
if [[ -z "$KEY" ]]; then
  if [[ "$PROVIDER" == "ollama" ]] && [[ "${OLLAMA_URL:-http://localhost:11434}" != *"ollama.com"* ]]; then
    :
  else
    echo "{\"provider\":\"${PROVIDER}\",\"model\":\"${MODEL}\",\"status\":\"no-key\",\"code\":0,\"http_code\":0,\"key_index\":${KEY_INDEX},\"latency_ms\":0,\"error\":\"no-key\"}"
    exit 0
  fi
fi

# Probe with minimal request
CODE=0
ERROR=""
OUTPUT=""
HTTP_CODE=""

# Build curl args
CURL_ARGS=(-s -w "\n%{http_code}\n%{time_total}" --connect-timeout 10 --max-time 15)
if [[ "$PROVIDER" == "gemini" ]]; then
  CURL_ARGS+=(-H "Content-Type: application/json")
  CURL_ARGS+=(-H "X-Session-Id: ${ROUTER_SESSION_ID}")
  CURL_ARGS+=(-d "$PAYLOAD")
  CURL_ARGS+=("$URL")
elif [[ "$PROVIDER" == "anthropic" ]]; then
  CURL_ARGS+=(-H "Content-Type: application/json")
  CURL_ARGS+=(-H "x-api-key: ${KEY}")
  CURL_ARGS+=(-H "anthropic-version: 2023-06-01")
  CURL_ARGS+=(-H "X-Session-Id: ${ROUTER_SESSION_ID}")
  CURL_ARGS+=(-d "$PAYLOAD")
  CURL_ARGS+=("$URL")
elif [[ "$PROVIDER" == "cohere" ]]; then
  CURL_ARGS+=(-H "Content-Type: application/json")
  CURL_ARGS+=(-H "Authorization: Bearer ${KEY}")
  CURL_ARGS+=(-H "X-Session-Id: ${ROUTER_SESSION_ID}")
  CURL_ARGS+=(-d "$PAYLOAD")
  CURL_ARGS+=("$URL")
elif [[ "$PROVIDER" == "ollama" ]]; then
  CURL_ARGS+=(-H "Content-Type: application/json")
  CURL_ARGS+=(-H "X-Session-Id: ${ROUTER_SESSION_ID}")
  if [[ -n "$KEY" ]]; then
    CURL_ARGS+=(-H "Authorization: Bearer ${KEY}")
  fi
  CURL_ARGS+=(-d "$PAYLOAD")
  CURL_ARGS+=("$URL")
else
  CURL_ARGS+=(-H "Content-Type: application/json")
  CURL_ARGS+=(-H "Authorization: Bearer ${KEY}")
  CURL_ARGS+=(-H "X-Session-Id: ${ROUTER_SESSION_ID}")
  [[ ${#EXTRA_HEADERS[@]} -gt 0 ]] && CURL_ARGS+=("${EXTRA_HEADERS[@]}")
  CURL_ARGS+=(-d "$PAYLOAD")
  CURL_ARGS+=("$URL")
fi

OUTPUT="$(curl "${CURL_ARGS[@]}" 2>/dev/null || true)"

HTTP_CODE="$(echo "$OUTPUT" | tail -2 | head -1)"
latency_sec="$(echo "$OUTPUT" | tail -1)"
latency_ms=$(python3 -c "print(int(float('${latency_sec}') * 1000))" 2>/dev/null || echo 0)
BODY="$(echo "$OUTPUT" | head -n -2)"

if [[ -z "$HTTP_CODE" ]]; then
  ERROR="connection_failed"
  CODE=1
elif [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "201" ]]; then
  ERROR="ok"
  CODE=0
elif [[ "$HTTP_CODE" == "429" ]]; then
  ERROR="rate_limited"
  CODE=0
elif [[ "$HTTP_CODE" == "401" ]] || [[ "$HTTP_CODE" == "403" ]]; then
  ERROR="auth_failed"
  CODE=0
elif [[ "$HTTP_CODE" == "5"* ]]; then
  ERROR="server_error_${HTTP_CODE}"
  CODE=0
else
  ERROR="http_${HTTP_CODE}"
  CODE=0
fi

# Save state — key-indexed so we track per-key exhaustion
STATE_FILE="${STATE_DIR}/${PROVIDER}.json"
if [[ "$KEY_INDEX" -gt 0 ]]; then
  STATE_FILE="${STATE_DIR}/${PROVIDER}_key${KEY_INDEX}.json"
fi
echo "{\"provider\":\"${PROVIDER}\",\"model\":\"${MODEL}\",\"status\":\"${ERROR:-ok}\",\"code\":${CODE},\"http_code\":${HTTP_CODE:-0},\"key_index\":${KEY_INDEX},\"latency_ms\":${latency_ms:-0},\"checked_at\":$(date +%s)}" > "$STATE_FILE"

# Output
echo "{\"provider\":\"${PROVIDER}\",\"model\":\"${MODEL}\",\"status\":\"${ERROR:-ok}\",\"code\":${CODE},\"http_code\":${HTTP_CODE:-0},\"key_index\":${KEY_INDEX},\"latency_ms\":${latency_ms:-0},\"error\":\"${ERROR}\"}"
exit $CODE
