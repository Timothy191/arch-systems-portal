#!/usr/bin/env bash
set -euo pipefail

# heal-daemon.sh: Watch for file moves and trigger LSP reconciliation
ROOT="$(git rev-parse --show-toplevel)"
WATCH_PATH="${ROOT}/apps ${ROOT}/packages"

echo "Starting self-healing daemon..."

# Simple inotifywatch to track moves
inotifywait -m -e moved_to -e moved_from --format '%w%f' $WATCH_PATH | while read -r file
do
  echo "Detected move/rename: $file"
  # Trigger reconciliation
  "${ROOT}/scripts/reconcile.sh" "$file"
done
