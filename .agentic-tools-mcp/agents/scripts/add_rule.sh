#!/usr/bin/env bash

# Agent Rule Generator
# Usage: ./add_rule.sh "rule_file.md"

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 \"rule_file.md\""
    exit 1
fi

RULE_FILE=$1

if [ ! -f "$RULE_FILE" ]; then
    echo "Error: Rule file '$RULE_FILE' not found."
    exit 1
fi

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

AGENTS_ROOT="$WORKSPACE_ROOT/AGENTS.md"
AGENTS_LOCAL="$WORKSPACE_ROOT/.agents/AGENTS.md"

append_rule() {
    local target=$1
    if [ -f "$target" ]; then
        echo "" >> "$target"
        cat "$RULE_FILE" >> "$target"
        echo "Appended rule to $target"
    else
        echo "Warning: Target '$target' does not exist."
    fi
}

append_rule "$AGENTS_ROOT"
append_rule "$AGENTS_LOCAL"

echo "Success: New rules injected successfully."
