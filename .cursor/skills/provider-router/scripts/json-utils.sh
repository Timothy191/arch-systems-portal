#!/usr/bin/env bash
# JSON helpers — prefer jq when installed, fall back to python3.

json_field_from_file() {
  local file="$1"
  local key="$2"
  local default="${3:-}"

  if command -v jq >/dev/null 2>&1; then
    jq -r ".${key} // \"${default}\"" "$file" 2>/dev/null || echo "$default"
    return
  fi

  python3 -c '
import json, sys
path, key, default = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    value = json.load(open(path)).get(key)
    print(value if value is not None else default)
except Exception:
    print(default)
' "$file" "$key" "$default" 2>/dev/null || echo "$default"
}

json_field_from_stdin() {
  local key="$1"
  local default="${2:-}"

  if command -v jq >/dev/null 2>&1; then
    jq -r ".${key} // \"${default}\"" 2>/dev/null || echo "$default"
    return
  fi

  python3 -c '
import json, sys
key, default = sys.argv[1], sys.argv[2]
try:
    value = json.load(sys.stdin).get(key)
    print(value if value is not None else default)
except Exception:
    print(default)
' "$key" "$default" 2>/dev/null || echo "$default"
}

json_pick_chat_text() {
  local provider="$1"
  local body="$2"

  if command -v jq >/dev/null 2>&1; then
    case "$provider" in
      gemini)
        echo "$body" | jq -r '.candidates[0].content.parts[0].text // empty' 2>/dev/null
        ;;
      anthropic)
        echo "$body" | jq -r '.content[0].text // empty' 2>/dev/null
        ;;
      cohere)
        echo "$body" | jq -r '.text // .generation // empty' 2>/dev/null
        ;;
      ollama)
        echo "$body" | jq -r '.message.content // empty' 2>/dev/null
        ;;
      *)
        echo "$body" | jq -r '.choices[0].message.content // empty' 2>/dev/null
        ;;
    esac
    return
  fi

  PROVIDER="$provider" BODY="$body" python3 -c '
import json, os, sys
provider = os.environ["PROVIDER"]
try:
    data = json.loads(os.environ["BODY"])
except Exception:
    sys.exit(1)

text = None
if provider == "gemini":
    text = (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text")
    )
elif provider == "anthropic":
    text = data.get("content", [{}])[0].get("text")
elif provider == "cohere":
    text = data.get("text") or data.get("generation")
elif provider == "ollama":
    text = data.get("message", {}).get("content")
else:
    text = (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content")
    )

if text:
    print(text)
else:
    sys.exit(1)
' 2>/dev/null
}
