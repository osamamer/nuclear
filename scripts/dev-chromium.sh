#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
launcher="$repo_root/packages/player/chromium/main.mjs"

if [[ -n "${NUCLEAR_ELECTRON_BIN:-}" ]]; then
  exec "$NUCLEAR_ELECTRON_BIN" "$launcher" "$@"
fi

if [[ -x /usr/lib/nuclear-chromium/electron ]]; then
  exec /usr/lib/nuclear-chromium/electron "$launcher" "$@"
fi

namespace_restriction=/proc/sys/kernel/apparmor_restrict_unprivileged_userns
if [[ -r "$namespace_restriction" && -r /proc/self/attr/current &&
      "$(< "$namespace_restriction")" == 1 && "$(< /proc/self/attr/current)" == unconfined ]]; then
  printf 'The packaged Chromium runtime is required by AppArmor on this desktop.\n' >&2
  exit 1
fi

export npm_config_manage_package_manager_versions=false
exec pnpm dlx electron@45.3.3 "$launcher" "$@"
