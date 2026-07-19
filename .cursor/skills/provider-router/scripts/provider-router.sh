#!/usr/bin/env bash
# Provider Router — cycle free-tier auto when one is maxed out
# Features:
#   - Key pool rotation (OpenRouter: 50+ keys, rotates on 429)
#   - Multi-provider priority failover
#   - Per-key exhaustion tracking with cooldown
#
# Usage:
#   provider-router.sh                    # List provider/key status
#   provider-router.sh --check           # Probe all providers + keys
#   provider-router.sh --execute <prompt> # Route prompt to best available
#   provider-router.sh --reset           # Reset all cooldowns
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "$(cd "$(dirname "$0")/../../../.." && pwd)")"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STATE_DIR="${ROOT}/.crush/provider-state"
mkdir -p "$STATE_DIR"

# Source env
if [[ -f "${ROOT}/.env" ]]; then
  set -a; source "${ROOT}/.env"; set +a
fi

# Priority order — openrouter first (key pool with many keys)
PROVIDERS=("openrouter" "opencode" "gemini" "aihubmix" "venice")

# Cooldown in seconds before retrying an exhausted key/provider
COOLDOWN="${PROVIDER_COOLDOWN_SEC:-300}"  # 5 min default

# Parse key pool from env
IFS=',' read -ra OPENROUTER_KEYS <<< "${OPENROUTER_KEY_POOL:-}"
OR_KEY_COUNT="${#OPENROUTER_KEYS[@]}"

# ── helpers ──────────────────────────────────────────────────────────
provider_state_file() {
  local p="$1"
  local idx="${2:-}"
  if [[ -n "$idx" ]]; then
    echo "${STATE_DIR}/${p}_key${idx}.json"
  else
    echo "${STATE_DIR}/${p}.json"
  fi
}

key_status() {
  local p="$1" idx="$2"
  local f; f="$(provider_state_file "$p" "$idx")"
  if [[ ! -f "$f" ]]; then echo "untested"; return; fi
  local s; s="$(grep -o '"status":"[^"]*"' "$f" 2>/dev/null | head -1 | cut -d: -f2 | tr -d '"')"
  local ts; ts="$(grep -o '"checked_at":[0-9]*' "$f" 2>/dev/null | cut -d: -f2)"
  local now; now=$(date +%s)
  local age=$((now - ${ts:-0}))
  if [[ "$s" == "rate_limited" ]] && [[ $age -lt $COOLDOWN ]]; then
    echo "exhausted"
  elif [[ "$s" == "rate_limited" ]]; then
    echo "available"
  elif [[ "$s" == "auth_failed" ]] || [[ "$s" == "no-key" ]]; then
    echo "bad_key"
  elif [[ "$s" == "ok" ]]; then
    echo "available"
  elif [[ "$s" == "server_error_"* ]] || [[ "$s" == "http_"* ]]; then
    echo "degraded"
  elif [[ -n "$s" ]]; then
    echo "degraded"
  else
    echo "unknown"
  fi
}

provider_status() {
  local p="$1"
  # For openrouter, check key pool
  if [[ "$p" == "openrouter" ]] && [[ "$OR_KEY_COUNT" -gt 0 ]]; then
    local avail=0 exhausted=0 bad=0 degraded=0 untested=0
    for ((i=0; i<OR_KEY_COUNT; i++)); do
      local s; s="$(key_status "$p" "$i")"
      case "$s" in
        available)  avail=$((avail + 1)) ;;
        exhausted)  exhausted=$((exhausted + 1)) ;;
        bad_key)    bad=$((bad + 1)) ;;
        degraded)   degraded=$((degraded + 1)) ;;
        *)          untested=$((untested + 1)) ;;
      esac
    done
    if [[ "$avail" -gt 0 ]]; then
      echo "available (${avail}/${OR_KEY_COUNT} keys)"
    elif [[ "$exhausted" -eq "$OR_KEY_COUNT" ]]; then
      echo "all_keys_exhausted"
    elif [[ "$untested" -gt 0 ]]; then
      echo "partially_tested (${avail}ok/${exhausted}ex/${bad}bad/${untested}?)"
    else
      echo "degraded (${avail}ok/${exhausted}ex/${bad}bad)"
    fi
    return
  fi

  # Non-pool providers
  local f; f="$(provider_state_file "$p")"
  if [[ ! -f "$f" ]]; then echo "untested"; return; fi
  local s; s="$(grep -o '"status":"[^"]*"' "$f" 2>/dev/null | head -1 | cut -d: -f2 | tr -d '"')"
  local ts; ts="$(grep -o '"checked_at":[0-9]*' "$f" 2>/dev/null | cut -d: -f2)"
  local now; now=$(date +%s)
  local age=$((now - ${ts:-0}))
  if [[ "$s" == "rate_limited" ]] && [[ $age -lt $COOLDOWN ]]; then
    echo "exhausted (${age}s/${COOLDOWN}s cooldown)"
  elif [[ "$s" == "rate_limited" ]]; then
    echo "available (cooldown expired)"
  elif [[ "$s" == "auth_failed" ]] || [[ "$s" == "no-key" ]]; then
    echo "unavailable"
  elif [[ "$s" == "ok" ]]; then
    echo "available"
  elif [[ -n "$s" ]]; then
    echo "degraded (${s})"
  else
    echo "unknown"
  fi
}

model_for() {
  local f; f="$(provider_state_file "$1" "${2:-}")"
  if [[ -f "$f" ]]; then
    grep -o '"model":"[^"]*"' "$f" 2>/dev/null | head -1 | cut -d: -f2 | tr -d '"'
  fi
}

total_keys_for() {
  local p="$1"
  case "$p" in
    openrouter) echo "$OR_KEY_COUNT" ;;
    *) echo 1 ;;
  esac
}

# ── commands ─────────────────────────────────────────────────────────
cmd_status() {
  echo "=== Provider Router Status ==="
  echo ""

  for p in "${PROVIDERS[@]}"; do
    local s; s="$(provider_status "$p")"
    local icon=""
    case "$s" in
      available*)                   icon="✅" ;;
      all_keys_exhausted*)          icon="⏳" ;;
      exhausted*)                   icon="⏳" ;;
      unavailable*)                 icon="🔴" ;;
      degraded*)                    icon="⚠️ " ;;
      partially_tested*)            icon="🔶" ;;
      untested|unknown*)            icon="❓" ;;
    esac

    local key_count; key_count="$(total_keys_for "$p")"
    printf "%s %-14s %-40s\n" "$icon" "$p:" "$s"

    # Show key breakdown for OpenRouter
    if [[ "$p" == "openrouter" ]] && [[ "$OR_KEY_COUNT" -gt 0 ]]; then
      local avail=0 exhausted=0 bad=0 untested=0
      for ((i=0; i<OR_KEY_COUNT; i++)); do
        local ks; ks="$(key_status "$p" "$i")"
        case "$ks" in
          available)  avail=$((avail + 1)) ;;
          exhausted)  exhausted=$((exhausted + 1)) ;;
          bad_key)    bad=$((bad + 1)) ;;
          *)          untested=$((untested + 1)) ;;
        esac
      done
      echo "           ├─ Keys: ${OR_KEY_COUNT} total"
      echo "           ├─ ✅ Available: ${avail}"
      [[ "$exhausted" -gt 0 ]] && echo "           ├─ ⏳ Exhausted: ${exhausted}"
      [[ "$bad" -gt 0 ]] && echo "           ├─ 🔴 Bad: ${bad}"
      [[ "$untested" -gt 0 ]] && echo "           └─ ❓ Untested: ${untested}"
    fi
  done

  echo ""
  echo "Model: ${OPENROUTER_FREE_MODEL:-cohere/north-mini-code:free}"
  echo "Cooldown: ${COOLDOWN}s"
  echo ""
  echo "Commands:"
  echo "  --check           Probe all providers and keys"
  echo "  --execute <text>  Route through best available key/provider"
  echo "  --reset           Clear all cooldowns"
}

cmd_check() {
  echo "=== Probing Providers ==="
  local any_ok=0

  for p in "${PROVIDERS[@]}"; do
    local key_count; key_count="$(total_keys_for "$p")"

    if [[ "$key_count" -gt 1 ]]; then
      echo ""
      echo "  ┌─ $p (${key_count} keys)"

      local pool_ok=0 pool_total=0
      for ((i=0; i<key_count; i++)); do
        printf "  │  key %-3d ... " "$i"
        local out; out="$("${SCRIPT_DIR}/check-provider.sh" "$p" "$i" 2>&1 || true)"
        local s; s="$(echo "$out" | grep -o '"status":"[^"]*"' | cut -d: -f2 | tr -d '"' | head -1)"
        case "${s}" in
          ok)           echo "✅ OK";           pool_ok=$((pool_ok + 1)) ;;
          no-key)       echo "⏭️  No key";     ;;
          rate_limited) echo "⏳ Rate limited"; ;;
          auth_failed)  echo "🔴 Auth failed"; ;;
          *)            echo "⚠️  ${s:-unknown}"; ;;
        esac
        pool_total=$((pool_total + 1))
      done

      if [[ "$pool_ok" -gt 0 ]]; then
        echo "  └─ ✅ ${pool_ok}/${pool_total} keys working for $p"
        any_ok=1
      else
        echo "  └─ ❌ 0/${pool_total} keys working for $p"
      fi
    else
      printf "  %-14s ... " "$p"
      local out; out="$("${SCRIPT_DIR}/check-provider.sh" "$p" 2>&1 || true)"
      local s; s="$(echo "$out" | grep -o '"status":"[^"]*"' | cut -d: -f2 | tr -d '"' | head -1)"
      case "${s}" in
        ok)           echo "✅ OK";         any_ok=1 ;;
        no-key)       echo "⏭️  No key configured"; ;;
        rate_limited) echo "⏳ Rate limited";         ;;
        auth_failed)  echo "🔴 Auth failed";         ;;
        *)            echo "⚠️  ${s:-unknown}";       ;;
      esac
    fi
  done

  echo ""
  if [[ $any_ok -eq 1 ]]; then
    echo "Result: at least one provider/key available"
  else
    echo "Result: ALL providers/keys unavailable — check .env or wait for cooldown"
  fi
}

get_working_key() {
  local p="$1"
  local key_count; key_count="$(total_keys_for "$p")"
  for ((i=0; i<key_count; i++)); do
    local s; s="$(key_status "$p" "$i")"
    if [[ "$s" == "available" ]]; then
      echo "$i"
      return 0
    fi
  done
  return 1
}

cmd_execute() {
  local prompt="${1:-}"
  if [[ -z "$prompt" ]]; then
    echo '{"error":"no prompt provided","provider":"none"}'
    exit 1
  fi

  local tried=()
  for p in "${PROVIDERS[@]}"; do
    local s; s="$(provider_status "$p")"

    # Skip unless available
    case "$s" in
      available*) ;;
      *) tried+=("${p}:skip(${s})"); continue ;;
    esac

    printf "  Trying %s ... " "$p" >&2

    # Determine model and key
    local model="${OPENROUTER_FREE_MODEL:-cohere/north-mini-code:free}"
    local key=""
    local key_index=0
    local base_url=""

    case "$p" in
      openrouter)
        base_url="${OPENROUTER_BASE_URL:-https://openrouter.ai/api/v1}"
        # Get first working key
        key_index="$(get_working_key "$p" || echo "-1")"
        [[ "$key_index" -lt 0 ]] && { echo "no keys available" >&2; tried+=("${p}:no_keys"); continue; }
        IFS=',' read -ra KPOOL <<< "${OPENROUTER_KEY_POOL:-}"
        key="${KPOOL[$key_index]:-}"
        model="${OPENROUTER_FREE_MODEL:-cohere/north-mini-code:free}"
        ;;
      opencode)
        base_url="${OPENCODE_BASE_URL:-https://opencode.ai/zen/go/v1}"
        key="${OPENCODE_API_KEY:-}"
        model="${OPENCODE_MODEL:-deepseek-v4-flash}"
        ;;
      gemini)
        # Gemini handled differently below
        key="${GEMINI_API_KEY:-}"
        model="${GEMINI_FREE_MODEL:-gemini-2.0-flash-exp}"
        ;;
      aihubmix)
        base_url="${AIHUBMIX_BASE_URL:-https://api.aihubmix.com/v1}"
        key="${AIHUBMIX_API_KEY:-}"
        model="${AIHUBMIX_MODEL:-coding-glm-4.6-free}"
        ;;
      venice)
        base_url="${VENICE_BASE_URL:-https://api.venice.ai/api/v1}"
        key="${VENICE_API_KEY:-}"
        model="${VENICE_MODEL:-kimi-k3}"
        ;;
    esac

    if [[ -z "$key" ]]; then
      echo "no key" >&2
      tried+=("${p}:no-key")
      continue
    fi

    # Execute the API call
    local result="" http_code="" body=""
    if [[ "$p" == "gemini" ]]; then
      local gurl="https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${key}"
      local gpayload='{"contents":[{"role":"user","parts":[{"text":"'"${prompt//\"/\\\"}"'"}]}]}'
      result="$(curl -s -w "\n%{http_code}" --connect-timeout 15 --max-time 60 \
        -H "Content-Type: application/json" \
        -d "$gpayload" \
        "$gurl" 2>/dev/null || true)"
      http_code="$(echo "$result" | tail -1)"
      body="$(echo "$result" | head -n -1)"
    else
      local safeprompt; safeprompt="$(printf '%s' "$prompt" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo "\"${prompt}\"")"
      local payload; payload="$(printf '{"model":"%s","messages":[{"role":"user","content":%s}],"max_tokens":2048}' "$model" "$safeprompt")"
      result="$(curl -s -w "\n%{http_code}" --connect-timeout 15 --max-time 120 \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${key}" \
        -d "$payload" \
        "${base_url}/chat/completions" 2>/dev/null || true)"
      http_code="$(echo "$result" | tail -1)"
      body="$(echo "$result" | head -n -1)"
    fi

    # Handle response
    if [[ "$http_code" == "200" ]]; then
      echo "✅ OK (${p}, key ${key_index})" >&2
      local content
      content="$(echo "$body" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    if 'choices' in d:
        print(d['choices'][0]['message']['content'])
    elif 'candidates' in d:
        print(d['candidates'][0]['content']['parts'][0]['text'])
    else:
        print(json.dumps(d)[:500])
except: print('')" 2>/dev/null || echo "$body" | head -c 500)"
      echo "{\"provider\":\"${p}\",\"model\":\"${model}\",\"key_index\":${key_index},\"content\":$(printf '%s' "$content" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo "\"${content}\"")}"
      # Reset key state to available
      local sf; sf="$(provider_state_file "$p" "$key_index")"
      echo "{\"provider\":\"${p}\",\"model\":\"${model}\",\"status\":\"ok\",\"code\":0,\"http_code\":200,\"key_index\":${key_index},\"checked_at\":$(date +%s)}" > "$sf"
      # Also update provider summary
      echo "{\"provider\":\"${p}\",\"model\":\"${model}\",\"status\":\"ok\",\"code\":0,\"http_code\":200,\"key_index\":-1,\"checked_at\":$(date +%s)}" > "$(provider_state_file "$p")"
      exit 0

    elif [[ "$http_code" == "429" ]]; then
      echo "⏳ rate limited (key ${key_index})" >&2
      # Mark this key exhausted
      local sf; sf="$(provider_state_file "$p" "$key_index")"
      echo "{\"provider\":\"${p}\",\"model\":\"${model}\",\"status\":\"rate_limited\",\"code\":29,\"http_code\":429,\"key_index\":${key_index},\"checked_at\":$(date +%s)}" > "$sf"
      tried+=("${p}:key${key_index}_rate_limited")

      # If openrouter has more keys, try next one immediately
      if [[ "$p" == "openrouter" ]] && [[ "$OR_KEY_COUNT" -gt 1 ]]; then
        local next_key=$((key_index + 1))
        if [[ "$next_key" -lt "$OR_KEY_COUNT" ]]; then
          local ns; ns="$(key_status "$p" "$next_key")"
          if [[ "$ns" == "available" ]] || [[ "$ns" == "untested" ]]; then
            echo "  → rotating to key ${next_key}..." >&2
            # Re-run the execute loop — will pick up the next key
            continue
          fi
        fi
      fi
      # No more keys — move to next provider
      continue

    elif [[ "$http_code" == "401" ]] || [[ "$http_code" == "403" ]]; then
      echo "🔴 auth failed (key ${key_index})" >&2
      local sf; sf="$(provider_state_file "$p" "$key_index")"
      echo "{\"provider\":\"${p}\",\"model\":\"${model}\",\"status\":\"auth_failed\",\"code\":1,\"http_code\":${http_code},\"key_index\":${key_index},\"checked_at\":$(date +%s)}" > "$sf"
      tried+=("${p}:key${key_index}_auth_failed")
      continue
    else
      echo "⚠️  http ${http_code:-timeout}" >&2
      tried+=("${p}:http_${http_code:-timeout}")
      # Don't mark key exhausted on transient errors — just try next provider
      continue
    fi
  done

  # All exhausted
  echo >&2 ""
  echo >&2 "  ALL PROVIDERS EXHAUSTED"
  echo >&2 "  Run: pnpm provider:route --reset"
  echo "{\"provider\":\"none\",\"error\":\"all providers exhausted\",\"tried\":\"${tried[*]}\"}"
  exit 1
}

cmd_reset() {
  echo "=== Reset Provider Cooldowns ==="
  # Reset per-provider state
  for p in "${PROVIDERS[@]}"; do
    rm -f "$(provider_state_file "$p")"
    echo "  ✅ $p — reset"
  done
  # Reset per-key state for openrouter
  if [[ "$OR_KEY_COUNT" -gt 0 ]]; then
    for ((i=0; i<OR_KEY_COUNT; i++)); do
      rm -f "$(provider_state_file "openrouter" "$i")"
    done
    echo "  ✅ openrouter keys (${OR_KEY_COUNT}) — reset"
  fi
  echo ""
  echo "All cooldowns cleared. Run: pnpm provider:route --check"
}

# ── main ─────────────────────────────────────────────────────────────
MODE="${1:-status}"

case "$MODE" in
  status|--status|-s)
    cmd_status
    ;;
  --check|-c)
    cmd_check
    ;;
  --execute|-e)
    shift
    cmd_execute "$*"
    ;;
  --reset|-r)
    cmd_reset
    ;;
  *)
    echo "Usage: provider-router.sh [--check|--execute <prompt>|--reset]"
    exit 1
    ;;
esac
