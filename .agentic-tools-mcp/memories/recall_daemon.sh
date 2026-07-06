#!/usr/bin/env bash

# Recall Daemon for CLI Models
# Usage: ./recall_daemon.sh [command] [args...]
# Commands:
#   list             - List all memories
#   search <query>   - Search memories for a specific string
#   read <file>      - Read a specific memory file

MEMORIES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ $# -eq 0 ]; then
    echo "Usage: $0 [list | search <query> | read <file>]"
    exit 1
fi

COMMAND=$1
shift

case "$COMMAND" in
    list)
        echo "Listing memories in $MEMORIES_DIR:"
        ls -1 "$MEMORIES_DIR"/*.md | grep -v "README.md" | xargs -n 1 basename
        ;;
    search)
        if [ $# -eq 0 ]; then
            echo "Error: Please provide a search query."
            exit 1
        fi
        echo "Searching memories for: $1"
        grep -ri "$1" "$MEMORIES_DIR"/*.md
        ;;
    read)
        if [ $# -eq 0 ]; then
            echo "Error: Please provide a memory file to read."
            exit 1
        fi
        FILE_PATH="$MEMORIES_DIR/$1"
        if [ -f "$FILE_PATH" ]; then
            cat "$FILE_PATH"
        else
            echo "Error: Memory file '$1' not found."
            exit 1
        fi
        ;;
    *)
        echo "Unknown command: $COMMAND"
        echo "Usage: $0 [list | search <query> | read <file>]"
        exit 1
        ;;
esac
