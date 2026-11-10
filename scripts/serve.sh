#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
if command -v podctl >/dev/null 2>&1; then
    podctl http publish --title "Rugix Docs" 4322
fi
exec pnpm exec astro "${1:?Expected dev or preview}" --host 0.0.0.0 --port 4322
