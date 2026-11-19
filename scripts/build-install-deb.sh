#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
with_chromium=false
if [[ "${1:-}" == --chromium ]]; then
  with_chromium=true
  shift
fi
if (( $# > 0 )); then
  printf 'Usage: %s [--chromium]\n' "$0" >&2
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
deb_file="$player_dir/src-tauri/target/release/bundle/deb/Nuclear_${version}_${architecture}.deb"
build_marker="$(mktemp)"
trap 'rm -f "$build_marker"' EXIT

export npm_config_manage_package_manager_versions=false

printf 'Building Nuclear %s for %s\n' "$version" "$architecture"
(
  cd "$player_dir"
  "$tauri_cli" build --bundles deb --no-sign --config '{"bundle":{"createUpdaterArtifacts":false},"plugins":{"updater":{"endpoints":[]}}}'
)

if [[ ! -f "$deb_file" || ! "$deb_file" -nt "$build_marker" ]]; then
  printf 'The build did not produce a fresh Debian package: %s\n' "$deb_file" >&2
  exit 1
fi

package_name="$(dpkg-deb --field "$deb_file" Package)"
package_version="$(dpkg-deb --field "$deb_file" Version)"
package_architecture="$(dpkg-deb --field "$deb_file" Architecture)"

if [[ "$package_name" != nuclear || "$package_version" != "$version" || "$package_architecture" != "$architecture" ]]; then
  printf 'Unexpected package metadata: %s %s %s\n' "$package_name" "$package_version" "$package_architecture" >&2
  exit 1
fi

packages=("$deb_file")
if $with_chromium; then
  chromium_deb="$(dirname -- "$deb_file")/Nuclear-Chromium_${version}_${architecture}.deb"
  "$repo_root/scripts/build-chromium-deb.sh" "$version" "$architecture" "$chromium_deb"
  packages+=("$chromium_deb")
fi

printf 'Installing %s\n' "${packages[@]}"
if (( EUID == 0 )); then
  dpkg -i "${packages[@]}"
elif command -v pkexec >/dev/null 2>&1; then
  pkexec dpkg -i "${packages[@]}"
elif command -v sudo >/dev/null 2>&1; then
  sudo dpkg -i "${packages[@]}"
else
  printf 'Administrator authentication requires pkexec or sudo.\n' >&2
  exit 1
fi

installed_version="$(dpkg-query -W -f='${Version}' nuclear)"
if [[ "$installed_version" != "$version" ]]; then
  printf 'Installed version %s does not match package version %s.\n' "$installed_version" "$version" >&2
  exit 1
fi

dpkg -V nuclear
printf 'Installed and verified Nuclear %s from %s\n' "$version" "$deb_file"

if $with_chromium; then
  chromium_version="$(dpkg-query -W -f='${Version}' nuclear-chromium)"
  if [[ "$chromium_version" != "$version" ]]; then
    printf 'Installed Chromium preview version %s does not match %s.\n' "$chromium_version" "$version" >&2
    exit 1
  fi
  chromium_verification="$(dpkg -V nuclear-chromium)"
  if [[ -n "$chromium_verification" ]]; then
    printf '%s\n' "$chromium_verification" >&2
    exit 1
  fi
  printf 'Installed and verified Nuclear (Chromium Preview) %s\n' "$chromium_version"
fi
