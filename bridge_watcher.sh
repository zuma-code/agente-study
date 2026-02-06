#!/bin/bash
BRIDGE_DIR=".bridge"
REQUEST_FILE="$BRIDGE_DIR/request.json"

echo "🚀 NotebookLM Bridge Watcher Started..."
echo "Monitoring $REQUEST_FILE..."

# Initial check or cleanup
mkdir -p "$BRIDGE_DIR"

last_request=""
while true; do
  if [ -f "$REQUEST_FILE" ]; then
    current_request=$(cat "$REQUEST_FILE")
    if [ "$current_request" != "$last_request" ]; then
      echo "🔔 NEW REQUEST DETECTED:"
      echo "$current_request"
      last_request="$current_request"
    fi
  fi
  sleep 1
done
