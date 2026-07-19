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

case "$PROVIDER" in
  openrouter)
    MODEL="${OPENROUTER_FREE_MODEL:-cohere/north-mini-code:free}"
    # Key pool support — pick key by index
    IFS=',' read -ra KEY_POOL <<< "${OPENROUTER_KEY_POOL:-}"
    KEY="${KEY_POOL[$KEY_INDEX]:-}"
    URL="${OPENROUTER_BASE_URL:-https://openrouter.ai/api/v1}/chat/completions"
    ;;
  opencode)
    MODEL="${OPENCODE_MODEL:-deepseek-v4-flash}"
    KEY="${OPENCODE_API_KEY:-}"
    URL="${OPENCODE_BASE_URL:-https://opencode.ai/zen/go/v1}/chat/completions"
    ;;
  gemini)
    MODEL="${GEMINI_FREE_MODEL:-gemini-2.0-flash-exp}"
    KEY="${GEMINI_API_KEY:-}"
    URL="https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${KEY}"
    PAYLOAD='{"contents":[{"role":"user","parts":[{"text":"respond with just the word ok"}]}]}'
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
  *)
    echo "{\"error\":\"unknown provider: ${PROVIDER}\",\"status\":\"skip\"}"
    exit 1
    ;;
esac

# Skip if no key
if [[ -z "$KEY" ]]; then
  echo "{\"provider\":\"${PROVIDER}\",\"model\":\"${MODEL}\",\"status\":\"no-key\",\"code\":0,\"error\":\"no API key configured\",\"key_index\":${KEY_INDEX}}"
  exit 0
fi

# Probe with minimal request
PAYLOAD="${PAYLOAD:-{\"model\":\"${MODEL}\",\"messages\":[{\"role\":\"user\",\"content\":\"respond with just the letter y\"}],\"max_tokens\":5}}"

CODE=0
ERROR=""
OUTPUT=""
HTTP_CODE=""

# Capture both HTTP code and response body
if [[ "$PROVIDER" == "gemini" ]]; then
  OUTPUT="$(curl -s -w "\n%{http_code}" --connect-timeout 10 --max-time 15 \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "$URL" 2>/dev/null || true)"
else
  OUTPUT="$(curl -s -w "\n%{http_code}" --connect-timeout 10 --max-time 15 \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${KEY}" \
    -d "$PAYLOAD" \
    "$URL" 2>/dev/null || true)"
fi

HTTP_CODE="$(echo "$OUTPUT" | tail -1)"
BODY="$(echo "$OUTPUT" | head -n -1)"

if [[ -z "$HTTP_CODE" ]]; then
  CODE=1
  ERROR="connection_failed"
elif [[ "$HTTP_CODE" == "200" ]]; then
  CODE=0
  ERROR=""
elif [[ "$HTTP_CODE" == "429" ]]; then
  CODE=29
  ERROR="rate_limited"
elif [[ "$HTTP_CODE" == "401" ]] || [[ "$HTTP_CODE" == "403" ]]; then
  CODE=1
  ERROR="auth_failed"
elif [[ "$HTTP_CODE" -ge 500 ]]; then
  CODE=$(("$HTTP_CODE" / 100))
  ERROR="server_error_${HTTP_CODE}"
else
  CODE=1
  ERROR="http_${HTTP_CODE}"
fi

# Save state — key-indexed so we track per-key exhaustion
STATE_FILE="${STATE_DIR}/${PROVIDER}.json"
if [[ "$KEY_INDEX" -gt 0 ]]; then
  STATE_FILE="${STATE_DIR}/${PROVIDER}_key${KEY_INDEX}.json"
fi
echo "{\"provider\":\"${PROVIDER}\",\"model\":\"${MODEL}\",\"status\":\"${ERROR:-ok}\",\"code\":${CODE},\"http_code\":${HTTP_CODE:-0},\"key_index\":${KEY_INDEX},\"checked_at\":$(date +%s)}" > "$STATE_FILE"

# Output
echo "{\"provider\":\"${PROVIDER}\",\"model\":\"${MODEL}\",\"status\":\"${ERROR:-ok}\",\"code\":${CODE},\"http_code\":${HTTP_CODE:-0},\"key_index\":${KEY_INDEX},\"error\":\"${ERROR}\"}"
exit $CODE
