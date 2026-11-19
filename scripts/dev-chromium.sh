#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
launcher="$repo_root/packages/player/chromium/main.mjs"

if [[ -n "${NUCLEAR_ELECTRON_BIN:-}" ]]; then
  exec "$NUCLEAR_ELECTRON_BIN" "$launcher" "$@"
fi

export npm_config_manage_package_manager_versions=false
exec pnpm dlx electron@45.3.3 "$launcher" "$@"
