#!/bin/bash
cd "$(dirname "$0")" || exit 1
if command -v pojia >/dev/null 2>&1; then
  pojia doctor
else
  echo "[X] pojia CLI not found. Run the macOS installer first."
  exit 2
fi
