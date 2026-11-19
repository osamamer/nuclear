#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
if (( $# > 0 )); then
  printf 'Usage: %s\n' "$0" >&2
  exit 2
fi
player_dir="$repo_root/packages/player"
config_file="$player_dir/src-tauri/tauri.conf.json"
tauri_cli="$player_dir/node_modules/.bin/tauri"

for command_name in node pnpm dpkg dpkg-deb dpkg-query; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$command_name" >&2
    exit 1
  fi
done

if [[ ! -x "$tauri_cli" ]]; then
  printf 'Tauri CLI is missing: %s\n' "$tauri_cli" >&2
  exit 1
fi

version="$(node -e 'const fs = require("node:fs"); process.stdout.write(JSON.parse(fs.readFileSync(process.argv[1], "utf8")).version)' "$config_file")"
architecture="$(dpkg --print-architecture)"
bundle_dir="$player_dir/src-tauri/target/release/bundle/deb"
backend_deb="$bundle_dir/Nuclear_${version}_${architecture}.deb"
deb_file="$bundle_dir/Nuclear-Chromium_${version}_${architecture}.deb"
build_marker="$(mktemp)"
trap 'rm -f "$build_marker"' EXIT

export npm_config_manage_package_manager_versions=false

printf 'Building Nuclear %s for %s\n' "$version" "$architecture"
(
  cd "$player_dir"
  "$tauri_cli" build --bundles deb --no-sign --config '{"bundle":{"createUpdaterArtifacts":false},"plugins":{"updater":{"endpoints":[]}}}'
)

if [[ ! -f "$backend_deb" || ! "$backend_deb" -nt "$build_marker" ]]; then
  printf 'The build did not produce a fresh backend package: %s\n' "$backend_deb" >&2
  exit 1
fi

"$repo_root/scripts/build-chromium-deb.sh" "$backend_deb" "$deb_file"
package_name="$(dpkg-deb --field "$deb_file" Package)"
package_version="$(dpkg-deb --field "$deb_file" Version)"
package_architecture="$(dpkg-deb --field "$deb_file" Architecture)"

if [[ "$package_name" != nuclear || "$package_version" != "$version" || "$package_architecture" != "$architecture" ]]; then
  printf 'Unexpected package metadata: %s %s %s\n' "$package_name" "$package_version" "$package_architecture" >&2
  exit 1
fi

printf 'Installing %s\n' "$deb_file"
if (( EUID == 0 )); then
  dpkg -i "$deb_file"
elif command -v pkexec >/dev/null 2>&1; then
  pkexec dpkg -i "$deb_file"
elif command -v sudo >/dev/null 2>&1; then
  sudo dpkg -i "$deb_file"
else
  printf 'Administrator authentication requires pkexec or sudo.\n' >&2
  exit 1
fi

installed_package="$(dpkg-query -W -f='${Status} ${Version}' nuclear)"
if [[ "$installed_package" != "install ok installed $version" ]]; then
  printf 'Unexpected installed package status: %s\n' "$installed_package" >&2
  exit 1
fi

verification="$(dpkg -V nuclear)"
if [[ -n "$verification" ]]; then
  printf '%s\n' "$verification" >&2
  exit 1
fi
printf 'Installed and verified Nuclear %s from %s\n' "$version" "$deb_file"
