#!/usr/bin/env bash
# Provider Router — Multi-provider AI router with key pool rotation
# Routes across 15+ providers with priority failover and omni (parallel) mode
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "$(cd "$(dirname "$0")/../../../.." && pwd)")"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="${ROOT}/.crush/provider-state"
mkdir -p "$STATE_DIR"

# Source env
if [[ -f "${ROOT}/.env" ]]; then
  set -a; source "${ROOT}/.env"; set +a
fi

# ── Priority order — free-tier first, paid fallback last ──────────
# Ranked by: free tier availability, speed, token limits
PROVIDERS=(
  "groq"          # 1  Fastest, permanent free, no CC
  "cerebras"      # 2  High throughput, ~1M tokens/day free
  "gemini"        # 3  Generous free tier, multimodal
  "mistral"       # 4  ~1B tokens/month experimental free
  "openrouter"    # 5  Key pool, model variety, free models
  "deepseek"      # 6  Coding-specialized, ~500 req/day free
  "ollama"        # 7  Local or ollama.com cloud (native API)
  "huggingface"   # 8  Thousands of open models, rate-limited free
  "opencode"      # 9  Open-source coding model
  "aihubmix"      # 10 Free models available
  "venice"        # 11 Privacy-focused, free tier
  "cohere"        # 12 Trial tier, RAG/embeddings
  "anthropic"     # 13 Paid fallback — Claude
  "perplexity"    # 14 Paid fallback — search-augmented
  "together"      # 15 Paid fallback — best model selection
)

# Cooldown in seconds before retrying an exhausted key/provider
COOLDOWN="${PROVIDER_COOLDOWN_SEC:-300}"  # 5 min default

# Parse key pool from env
IFS=',' read -ra OPENROUTER_KEYS <<< "${OPENROUTER_KEY_POOL:-}"
OR_KEY_COUNT="${#OPENROUTER_KEYS[@]}"

# ── Session stickiness (X-Session-Id) ──────────────────────────────
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

# ── helpers ────────────────────────────────────────────────────────
# shellcheck source=json-utils.sh
source "${SCRIPT_DIR}/json-utils.sh"

provider_state_file() {
  local provider="$1"
  local key_idx="${2:-0}"
  if [[ "$key_idx" -gt 0 ]]; then
    echo "${STATE_DIR}/${provider}_key${key_idx}.json"
  else
    echo "${STATE_DIR}/${provider}.json"
  fi
}

key_status() {
  local provider="$1"
  local key_idx="${2:-0}"
  local sf; sf="$(provider_state_file "$provider" "$key_idx")"
  if [[ ! -f "$sf" ]]; then
    echo "❓"
    return
  fi
  local st; st="$(json_field_from_file "$sf" status ok)"
  local ts; ts="$(json_field_from_file "$sf" checked_at 0)"
  local now; now="$(date +%s)"
  local age=$((now - ts))

  case "$st" in
    ""|"ok")                    echo "✅" ;;
    "rate_limited")             [[ "$age" -lt "$COOLDOWN" ]] && echo "⏳" || echo "🔄" ;;
    "auth_failed")              echo "🔴" ;;
    "server_error"*)            echo "⚠️" ;;
    "connection_failed")        echo "❌" ;;
    "no-key")                   echo "⚪" ;;
    "http_"*)                   echo "⚠️" ;;
    *)                          echo "❓" ;;
  esac
}

provider_status() {
  local provider="$1"
  local key_idx="${2:-0}"

  if [[ "$provider" == "openrouter" ]] && [[ "$key_idx" -gt 0 ]]; then
    key_status "$provider" "$key_idx"
    return
  fi

  local sf; sf="$(provider_state_file "$provider")"
  if [[ ! -f "$sf" ]]; then
    if ls "${STATE_DIR}/${provider}_key"*.json 2>/dev/null | head -1 >/dev/null; then
      local active=0; local total=0
      for kf in "${STATE_DIR}/${provider}_key"*.json; do
        total=$((total + 1))
        local st; st="$(json_field_from_file "$kf" status ok)"
        local ts; ts="$(json_field_from_file "$kf" checked_at 0)"
        local now; now="$(date +%s)"
        local age=$((now - ts))
        if [[ "$st" == "ok" ]] || ( [[ "$st" == "rate_limited" ]] && [[ "$age" -ge "$COOLDOWN" ]] ); then
          active=$((active + 1))
        fi
      done
      if [[ "$active" -gt 0 ]]; then echo "✅ ${active}/${total}"; else echo "⏳ 0/${total}"; fi
    else
      echo "❓"
    fi
    return
  fi

  key_status "$provider"
}

model_for() {
  local provider="$1"
  case "$provider" in
    groq)       echo "${GROQ_FREE_MODEL:-llama-3.3-70b-versatile}" ;;
    cerebras)   echo "${CEREBRAS_FREE_MODEL:-llama-3.3-70b}" ;;
    gemini)     echo "${GEMINI_FREE_MODEL:-gemini-2.0-flash-exp}" ;;
    mistral)    echo "${MISTRAL_FREE_MODEL:-mistral-small-latest}" ;;
    openrouter) echo "${OPENROUTER_FREE_MODEL:-cohere/north-mini-code:free}" ;;
    deepseek)   echo "${DEEPSEEK_FREE_MODEL:-deepseek-chat}" ;;
    ollama)     echo "${OLLAMA_DEFAULT_MODEL:-gemma4:latest}" ;;
    huggingface) echo "${HF_FREE_MODEL:-meta-llama/Meta-Llama-3-8B-Instruct}" ;;
    opencode)   echo "${OPENCODE_MODEL:-deepseek-v4-flash}" ;;
    aihubmix)   echo "${AIHUBMIX_MODEL:-coding-glm-4.6-free}" ;;
    venice)     echo "${VENICE_MODEL:-kimi-k3}" ;;
    anthropic)  echo "${ANTHROPIC_MODEL:-claude-sonnet-4-20250514}" ;;
    perplexity) echo "${PERPLEXITY_MODEL:-sonar-pro}" ;;
    together)   echo "${TOGETHER_MODEL:-meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo}" ;;
    cohere)     echo "${COHERE_MODEL:-command-r}" ;;
    *)          echo "unknown" ;;
  esac
}

total_keys_for() {
  local provider="$1"
  case "$provider" in
    openrouter) echo "$OR_KEY_COUNT" ;;
    *)          echo 1 ;;
  esac
}

# ── Resolve key, base_url, auth_header for a provider/key ──────────
resolve_creds() {
  local provider="$1"
  local key_idx="${2:-0}"
  local _key="" _base_url="" _model=""

  _model="$(model_for "$provider")"

  case "$provider" in
    groq)
      _key="${GROQ_API_KEY:-}"
      _base_url="${GROQ_BASE_URL:-https://api.groq.com/openai/v1}"
      ;;
    cerebras)
      _key="${CEREBRAS_API_KEY:-}"
      _base_url="${CEREBRAS_BASE_URL:-https://api.cerebras.ai/v1}"
      ;;
    gemini)
      _key="${GEMINI_API_KEY:-}"
      _base_url="https://generativelanguage.googleapis.com/v1"
      ;;
    mistral)
      _key="${MISTRAL_API_KEY:-}"
      _base_url="${MISTRAL_BASE_URL:-https://api.mistral.ai/v1}"
      ;;
    openrouter)
      IFS=',' read -ra KEY_POOL <<< "${OPENROUTER_KEY_POOL:-}"
      _key="${KEY_POOL[$key_idx]:-}"
      _base_url="${OPENROUTER_BASE_URL:-https://openrouter.ai/api/v1}"
      ;;
    deepseek)
      _key="${DEEPSEEK_API_KEY:-}"
      _base_url="${DEEPSEEK_BASE_URL:-https://api.deepseek.com/v1}"
      ;;
    ollama)
      _key="${OLLAMA_API_KEY:-}"
      _base_url="${OLLAMA_URL:-http://localhost:11434}"
      ;;
    huggingface)
      _key="${HF_API_KEY:-}"
      _base_url="${HF_BASE_URL:-https://api-inference.huggingface.co}"
      ;;
    opencode)
      _key="${OPENCODE_API_KEY:-}"
      _base_url="${OPENCODE_BASE_URL:-https://opencode.ai/zen/go/v1}"
      ;;
    aihubmix)
      _key="${AIHUBMIX_API_KEY:-}"
      _base_url="${AIHUBMIX_BASE_URL:-https://api.aihubmix.com/v1}"
      ;;
    venice)
      _key="${VENICE_API_KEY:-}"
      _base_url="${VENICE_BASE_URL:-https://api.venice.ai/api/v1}"
      ;;
    anthropic)
      _key="${ANTHROPIC_API_KEY:-}"
      _base_url="${ANTHROPIC_BASE_URL:-https://api.anthropic.com}"
      ;;
    perplexity)
      _key="${PERPLEXITY_API_KEY:-}"
      _base_url="${PERPLEXITY_BASE_URL:-https://api.perplexity.ai}"
      ;;
    together)
      _key="${TOGETHER_API_KEY:-}"
      _base_url="${TOGETHER_BASE_URL:-https://api.together.xyz/v1}"
      ;;
    cohere)
      _key="${COHERE_API_KEY:-}"
      _base_url="${COHERE_BASE_URL:-https://api.cohere.ai/v1}"
      ;;
  esac

  echo "${_key}@@@${_base_url}@@@${_model}"
}

# ── Do a curl and extract text from response ───────────────────────
provider_curl() {
  local provider="$1"
  local key="$2"
  local model="$3"
  local base_url="$4"
  local prompt="$5"

  case "$provider" in
    gemini)
      local url="${base_url}/models/${model}:generateContent?key=${key}"
      local payload='{"contents":[{"role":"user","parts":[{"text":"'"${prompt}"'"}]}],"generationConfig":{"maxOutputTokens":2048}}'
      curl -s --connect-timeout 30 --max-time 120 \
        -H "Content-Type: application/json" \
        -H "X-Session-Id: ${ROUTER_SESSION_ID}" \
        -d "$payload" \
        "$url" 2>/dev/null || true
      ;;
    anthropic)
      local url="${base_url}/v1/messages"
      local payload='{"model":"'"${model}"'","max_tokens":4096,"messages":[{"role":"user","content":"'"${prompt}"'"}]}'
      curl -s --connect-timeout 30 --max-time 120 \
        -H "Content-Type: application/json" \
        -H "x-api-key: ${key}" \
        -H "anthropic-version: 2023-06-01" \
        -H "X-Session-Id: ${ROUTER_SESSION_ID}" \
        -d "$payload" \
        "$url" 2>/dev/null || true
      ;;
    cohere)
      local url="${base_url}/chat"
      local payload='{"model":"'"${model}"'","message":"'"${prompt}"'","max_tokens":4096}'
      curl -s --connect-timeout 30 --max-time 120 \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${key}" \
        -H "X-Session-Id: ${ROUTER_SESSION_ID}" \
        -d "$payload" \
        "$url" 2>/dev/null || true
      ;;
    ollama)
      local url="${base_url%/}/api/chat"
      local payload='{"model":"'"${model}"'","messages":[{"role":"user","content":"'"${prompt}"'"}],"stream":false}'
      local -a hdrs=(
        -H "Content-Type: application/json"
        -H "X-Session-Id: ${ROUTER_SESSION_ID}"
      )
      if [[ -n "$key" ]]; then
        hdrs+=(-H "Authorization: Bearer ${key}")
      fi
      curl -s --connect-timeout 30 --max-time 120 \
        "${hdrs[@]}" \
        -d "$payload" \
        "$url" 2>/dev/null || true
      ;;
    *)
      local url="${base_url}/chat/completions"
      local payload='{"model":"'"${model}"'","messages":[{"role":"user","content":"'"${prompt}"'"}],"max_tokens":4096}'
      local -a hdrs=(
        -H "Content-Type: application/json"
        -H "Authorization: Bearer ${key}"
        -H "X-Session-Id: ${ROUTER_SESSION_ID}"
      )
      if [[ "$provider" == "openrouter" ]]; then
        hdrs+=(
          -H "HTTP-Referer: ${OPENROUTER_HTTP_REFERER:-http://localhost:3000}"
          -H "X-Title: ${OPENROUTER_APP_TITLE:-Arch Systems}"
        )
      fi
      curl -s --connect-timeout 30 --max-time 120 \
        "${hdrs[@]}" \
        -d "$payload" \
        "$url" 2>/dev/null || true
      ;;
  esac
}

# ── commands ─────────────────────────────────────────────────────────

cmd_status() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║           Provider Router — Status Overview            ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""
  printf "  %-3s %-13s %-22s %-10s %s\n" "#" "Provider" "Model" "Status" "Keys"
  printf "  %-3s %-13s %-22s %-10s %s\n" "─" "────────────" "──────────────────────" "────────" "────"
  local idx=1
  for p in "${PROVIDERS[@]}"; do
    local model; model="$(model_for "$p")"
    local status; status="$(provider_status "$p")"
    local total_k; total_k="$(total_keys_for "$p")"

    if [[ "$p" == "openrouter" ]] && [[ "$OR_KEY_COUNT" -gt 1 ]]; then
      printf "  %-3s %-13s %-22s %-10s %s\n" "$idx" "$p" "${model:0:22}" "$status" "${total_k} keys"
    else
      printf "  %-3s %-13s %-22s %-10s %s\n" "$idx" "$p" "${model:0:22}" "$status" ""
    fi
    idx=$((idx + 1))
  done
  echo ""

  echo "  ── Free-Tier Ready Providers ──"
  local free_available=0; local free_total=0
  for p in "${PROVIDERS[@]}"; do
    local st; st="$(provider_status "$p")"
    case "$p" in
      groq|cerebras|gemini|mistral|deepseek|ollama|opencode|aihubmix|venice)
        free_total=$((free_total + 1))
        [[ "$st" == "✅"* ]] && free_available=$((free_available + 1))
        ;;
      openrouter)
        if [[ "$st" == "✅"* ]]; then free_available=$((free_available + 1)); fi
        ;;
    esac
  done
  echo "  ${free_available}/${free_total} free-tier endpoints available"
  echo ""
}

cmd_check() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║         Provider Router — Health Check                 ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""

  local total=0; local available=0
  for p in "${PROVIDERS[@]}"; do
    local keys=1
    if [[ "$p" == "openrouter" ]]; then
      keys="$OR_KEY_COUNT"
    fi

    for ((ki=0; ki<keys; ki++)); do
      if [[ "$p" == "openrouter" ]] && [[ "$keys" -gt 1 ]]; then
        printf "  Probing %s [key %d/%d] ... " "$p" $((ki + 1)) "$keys"
      else
        printf "  Probing %s ... " "$p"
      fi

      local out; out="$(ROUTER_SESSION_ID="$ROUTER_SESSION_ID" "${SCRIPT_DIR}/check-provider.sh" "$p" "$ki" 2>/dev/null || true)"
      local status; status="$(echo "$out" | json_field_from_stdin status error)"
      total=$((total + 1))

      case "$status" in
        "")          echo "✅ OK"                   ; available=$((available + 1)) ;;
        "ok")        echo "✅ OK"                   ; available=$((available + 1)) ;;
        "rate_limited") echo "⏳ Rate limited"      ;;
        "auth_failed")  echo "🔴 Auth failed"       ;;
        "no-key")       echo "⚪ No key configured" ;;
        "connection_failed") echo "❌ Connection failed" ;;
        server_error*)     echo "⚠️  Server error ($status)" ;;
        http_*)            echo "⚠️  HTTP error ($status)" ;;
        *)           echo "❓ ${status}"            ;;
      esac
    done
  done

  echo ""
  echo "  Summary: ${available}/${total} endpoints available"
  echo "  Session: ${ROUTER_SESSION_ID}"
  echo ""
  return 0
}

get_working_key() {
  local provider="$1"
  local key_idx="${2:-0}"
  local sf; sf="$(provider_state_file "$provider" "$key_idx")"
  if [[ ! -f "$sf" ]]; then
    return 0
  fi
  local st; st="$(json_field_from_file "$sf" status ok)"
  local ts; ts="$(json_field_from_file "$sf" checked_at 0)"
  local now; now="$(date +%s)"
  local age=$((now - ts))

  case "$st" in
    ""|"ok")                          return 0 ;;
    "rate_limited")                   [[ "$age" -ge "$COOLDOWN" ]] && return 0 || return 1 ;;
    "auth_failed"|"no-key"|"http_"*)  return 1 ;;
    *)                                return 0 ;;
  esac
}

sort_providers_by_latency() {
  local p_list=("$@")
  python3 -c '
import json, sys, os
providers = sys.argv[1].split(",")
state_dir = sys.argv[2]
scores = []
for p in providers:
    sf = os.path.join(state_dir, f"{p}.json")
    latency = 0
    status = "ok"
    if os.path.exists(sf):
        try:
            d = json.load(open(sf))
            latency = d.get("latency_ms", 0)
            status = d.get("status", "ok")
        except:
            pass
    penalty = 0
    if status != "ok":
        penalty = 1000000
    sort_latency = latency if latency > 0 else 500
    scores.append((penalty + sort_latency, p))
scores.sort()
print(",".join([p for _, p in scores]))
' "$(IFS=,; echo "${p_list[*]}")" "$STATE_DIR"
}

cmd_execute() {
  local prompt="$1"
  if [[ -z "$prompt" ]]; then
    echo "Usage: provider-router.sh --execute <prompt>"
    echo "  Reads prompt from stdin if not provided"
    prompt="$(cat 2>/dev/null || true)"
  fi
  if [[ -z "$prompt" ]]; then
    echo "Error: no prompt provided"
    exit 1
  fi

  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║       Provider Router — Sequential Priority Routing    ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""

  local sorted_providers_str; sorted_providers_str="$(sort_providers_by_latency "${PROVIDERS[@]}")"
  IFS=',' read -ra SORTED_PROVIDERS <<< "$sorted_providers_str"

  local found=0
  for p in "${SORTED_PROVIDERS[@]}"; do
    local keys=1
    if [[ "$p" == "openrouter" ]]; then
      keys="$OR_KEY_COUNT"
    fi

    for ((ki=0; ki<keys; ki++)); do
      if get_working_key "$p" "$ki"; then
        local creds; creds="$(resolve_creds "$p" "$ki")"
        local key base_url model
        key="${creds%%@@@*}"
        base_url="${creds#*@@@}"; base_url="${base_url%%@@@*}"
        model="${creds##*@@@}"

        if [[ -z "$key" ]] && [[ "$p" != "ollama" || "${base_url}" == *"ollama.com"* ]]; then
          echo "  ${p}: no key configured, skipping..."
          continue
        fi

        echo "  ➡️  Routing to ${p} (${model})"
        echo ""

        local body; body="$(provider_curl "$p" "$key" "$model" "$base_url" "$prompt")"
        local text; text="$(json_pick_chat_text "$p" "$body" || true)"
        echo "${text:-Error: request failed}"

        found=1
        break 2
      fi
    done
  done

  if [[ "$found" -eq 0 ]]; then
    echo "  ❌ All providers exhausted or unavailable"
    echo "  Run 'pnpm provider:route --reset' to clear cooldowns"
    exit 1
  fi
}

# ── Omni (Parallel) Mode ───────────────────────────────────────────
cmd_omni() {
  local prompt="$1"
  if [[ -z "$prompt" ]]; then
    echo "Usage: provider-router.sh --omni <prompt>"
    prompt="$(cat 2>/dev/null || true)"
  fi
  if [[ -z "$prompt" ]]; then
    echo "Error: no prompt provided"
    exit 1
  fi

  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║      Provider Router — Omni Parallel Routing           ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""

  # Collect all active providers
  local -a targets=() # entries: "provider:key_idx"
  for p in "${PROVIDERS[@]}"; do
    local keys=1
    [[ "$p" == "openrouter" ]] && keys="$OR_KEY_COUNT"
    for ((ki=0; ki<keys; ki++)); do
      if get_working_key "$p" "$ki"; then
        local creds; creds="$(resolve_creds "$p" "$ki")"
        local key="${creds%%@@@*}"
        local base_url="${creds#*@@@}"; base_url="${base_url%%@@@*}"
        if [[ -z "$key" ]] && [[ "$p" != "ollama" || "${base_url}" == *"ollama.com"* ]]; then
          continue
        fi
        targets+=("$p:$ki")
        break  # one key per provider is enough
      fi
    done
  done

  if [[ ${#targets[@]} -eq 0 ]]; then
    echo "  ❌ No active providers available"
    echo "  Run 'pnpm provider:route --reset' to clear cooldowns"
    exit 1
  fi

  echo "  Omni-routing across ${#targets[@]} providers:"
  for t in "${targets[@]}"; do
    local p="${t%%:*}"
    local ki="${t##*:}"
    local m; m="$(model_for "$p")"
    echo "    ⚡ ${p}:${ki} (${m})"
  done
  echo ""

  # Parallel fire: each provider writes result to a temp file
  local omni_dir; omni_dir="$(mktemp -d /tmp/omni-$$-XXXXXX)"
  local -a pids=()
  for entry in "${targets[@]}"; do
    local p="${entry%%:*}"
    local ki="${entry##*:}"
    local creds; creds="$(resolve_creds "$p" "$ki")"
    local key="${creds%%@@@*}"
    local base_url="${creds#*@@@}"; base_url="${base_url%%@@@*}"
    local model="${creds##*@@@}"
    local out_file="${omni_dir}/${p}.txt"

    (
      local body; body="$(provider_curl "$p" "$key" "$model" "$base_url" "$prompt" 2>/dev/null || true)"
      if [[ -n "$body" ]]; then
        local text; text="$(json_pick_chat_text "$p" "$body" 2>/dev/null || true)"
        if [[ -n "$text" ]]; then
          echo "$text" > "$out_file"
        fi
      fi
    ) &
    pids+=($!)
  done

  # Wait for first success (up to 120s)
  local elapsed=0
  local winner=""
  while [[ $elapsed -lt 120 ]]; do
    for entry in "${targets[@]}"; do
      local p="${entry%%:*}"
      local f="${omni_dir}/${p}.txt"
      if [[ -f "$f" ]] && [[ -s "$f" ]]; then
        winner="$p"
        break 2
      fi
    done
    sleep 0.3
    elapsed=$((elapsed + 1))
  done

  # Kill remaining background curls
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done

  if [[ -n "$winner" ]]; then
    echo ""
    echo "  ✅ Fastest response from ${winner}:"
    echo ""
    cat "${omni_dir}/${winner}.txt"
    rm -rf "$omni_dir"
  else
    echo "  ❌ All providers timed out or returned empty"
    rm -rf "$omni_dir"
    exit 1
  fi
}

# ── Retry auth_failed providers ─────────────────────────────────────
cmd_retry_auth() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║          Re-probing auth_failed Providers               ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""

  local retried=0
  for p in "${PROVIDERS[@]}"; do
    local sf; sf="$(provider_state_file "$p" 0)"
    if [[ -f "$sf" ]]; then
      local st; st="$(json_field_from_file "$sf" status "")"
      if [[ "$st" == "auth_failed" ]]; then
        printf "  Retrying %s ... " "$p"
        local out; out="$(ROUTER_SESSION_ID="$ROUTER_SESSION_ID" "${SCRIPT_DIR}/check-provider.sh" "$p" 0 2>/dev/null || true)"
        local new_st; new_st="$(echo "$out" | json_field_from_stdin status error)"
        retried=$((retried + 1))

        case "$new_st" in
          "ok")  echo "✅ Now working!" ;;
          "auth_failed") echo "🔴 Still auth_failed" ;;
          *)      echo "⚠️  Status: ${new_st}" ;;
        esac
      fi
    fi
  done

  if [[ "$retried" -eq 0 ]]; then
    echo "  No auth_failed providers to retry."
  fi
  echo ""
}

# ── Rotate OpenRouter keys ──────────────────────────────────────────
cmd_rotate_keys() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║          OpenRouter Key Rotation                        ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""

  if [[ "$OR_KEY_COUNT" -eq 0 ]]; then
    echo "  No OpenRouter keys configured (OPENROUTER_KEY_POOL is empty)."
    echo "  Add keys to ${ROOT}/.env: OPENROUTER_KEY_POOL=sk-or-v1-key1,sk-or-v1-key2,..."
    return
  fi

  echo "  OpenRouter key pool: ${OR_KEY_COUNT} keys configured"
  echo ""

  local active=0; local exhausted=0
  for ((ki=0; ki<OR_KEY_COUNT; ki++)); do
    local sf; sf="$(provider_state_file "openrouter" "$ki")"
    if [[ ! -f "$sf" ]]; then
      echo "  Key $((ki+1)): ❓ Not yet probed"
      active=$((active + 1))
      continue
    fi
    local st; st="$(json_field_from_file "$sf" status ok)"
    case "$st" in
      "ok")           echo "  Key $((ki+1)): ✅ Active"     ; active=$((active + 1)) ;;
      "auth_failed")  echo "  Key $((ki+1)): 🔴 Auth failed"; exhausted=$((exhausted + 1)) ;;
      "rate_limited") echo "  Key $((ki+1)): ⏳ Rate limited"; exhausted=$((exhausted + 1)) ;;
      *)              echo "  Key $((ki+1)): ❓ ${st}"      ;;
    esac
  done

  echo ""
  if [[ "$exhausted" -gt 0 ]]; then
    echo "  Rotating keys: re-probing all exhausted keys..."
    for ((ki=0; ki<OR_KEY_COUNT; ki++)); do
      local sf; sf="$(provider_state_file "openrouter" "$ki")"
      if [[ -f "$sf" ]]; then
        local st; st="$(json_field_from_file "$sf" status ok)"
        if [[ "$st" != "ok" ]]; then
          printf "  Retrying key $((ki+1)) ... "
          rm -f "$sf"
          local out; out="$(ROUTER_SESSION_ID="$ROUTER_SESSION_ID" "${SCRIPT_DIR}/check-provider.sh" "openrouter" "$ki" 2>/dev/null || true)"
          local new_st; new_st="$(echo "$out" | json_field_from_stdin status error)"
          case "$new_st" in
            "ok")  echo "✅ Now working!" ;;
            *)     echo "⚠️  ${new_st}" ;;
          esac
        fi
      fi
    done
  fi
  echo "  Active: ${active}/${OR_KEY_COUNT} keys"
  echo ""
}

cmd_reset() {
  echo "Resetting all provider and key cooldowns..."
  rm -f "${STATE_DIR}"/*.json
  rm -f "${ROOT}/.crush/.session_id"
  echo "✅ All state files cleared (${STATE_DIR}/)"
  echo "✅ Session ID reset"
}

# ── main ─────────────────────────────────────────────────────────────
MODE="${1:-status}"

case "$MODE" in
  status|--status|-s)
    cmd_status
    ;;
  check|--check|-c)
    cmd_check
    ;;
  execute|--execute|-e)
    shift
    cmd_execute "$@"
    ;;
  omni|--omni|-o)
    shift
    cmd_omni "$@"
    ;;
  retry-auth|--retry-auth)
    cmd_retry_auth
    ;;
  rotate-keys|--rotate-keys)
    cmd_rotate_keys
    ;;
  reset|--reset|-r)
    cmd_reset
    ;;
  *)
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  status       — List provider/key status overview"
    echo "  check        — Probe all providers and keys"
    echo "  execute      — Route a prompt through best provider (sequential)"
    echo "  omni         — Route a prompt using ALL active providers in parallel (fastest wins)"
    echo "  retry-auth   — Re-probe all auth_failed providers"
    echo "  rotate-keys  — Show/rotate OpenRouter key pool status"
    echo "  reset        — Clear all cooldowns and state"
    exit 1
    ;;
esac
