#!/usr/bin/env bash
set -euo pipefail
umask 022

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
player="$repo_root/packages/player"
chromium="$player/chromium"
linux="$chromium/linux"
version="${1:?Version is required}"
architecture="${2:?Debian architecture is required}"
destination="${3:?Output file is required}"
electron_bin="${NUCLEAR_ELECTRON_BIN:-}"

if [[ -z "$electron_bin" ]]; then
  export npm_config_manage_package_manager_versions=false
  pnpm dlx electron@45.3.3 --version >&2
  electron_bin="$(ELECTRON_RUN_AS_NODE=1 pnpm dlx electron@45.3.3 -p 'process.execPath')"
fi

electron_dir="$(dirname -- "$(realpath -- "$electron_bin")")"
if [[ ! -x "$electron_dir/electron" || ! -f "$electron_dir/icudtl.dat" ]]; then
  printf 'An Electron 45.3.3 distribution is required.\n' >&2
  exit 1
fi

stage="$(mktemp -d)"
trap 'rm -rf -- "$stage"' EXIT
runtime="$stage/usr/lib/nuclear-chromium"
install -d "$stage/DEBIAN" "$stage/etc/apparmor.d" "$stage/usr/bin" \
  "$stage/usr/share/applications" "$runtime/chromium" "$runtime/src-tauri/icons"

cp -R -- "$electron_dir/." "$runtime/"
chmod 755 "$stage" "$runtime"
cp -R -- "$player/dist" "$runtime/dist"
find "$runtime" -type d -exec chmod 0755 {} +
find "$runtime/dist" -type f -exec chmod 0644 {} +
install -m644 "$chromium/main.mjs" "$chromium/preload.cjs" "$chromium/renderer.js" "$runtime/chromium/"
install -m644 "$player/src-tauri/icons/icon.png" "$runtime/src-tauri/icons/"
install -m755 "$linux/nuclear-chromium" "$stage/usr/bin/"
install -m644 "$linux/com.nuclearplayer.ChromiumPreview.desktop" "$stage/usr/share/applications/"
install -m644 "$linux/nuclear-chromium.apparmor" "$stage/etc/apparmor.d/nuclear-chromium"
install -m755 "$linux/postinst" "$linux/prerm" "$stage/DEBIAN/"
printf '/etc/apparmor.d/nuclear-chromium\n' > "$stage/DEBIAN/conffiles"

cat > "$stage/DEBIAN/control" <<EOF
Package: nuclear-chromium
Version: $version
Architecture: $architecture
Section: sound
Priority: optional
Maintainer: Nuclear contributors
Homepage: https://nuclearplayer.com
Depends: nuclear (= $version), libgtk-3-0t64 | libgtk-3-0, libasound2t64 | libasound2, libnss3, libgbm1, libxss1
Recommends: apparmor
Description: Chromium preview for Nuclear Music Player
 Runs the existing Nuclear interface and player features in Chromium.
EOF

(
  cd "$stage"
  find usr -type f -print0 | LC_ALL=C sort -z | xargs -0 md5sum > DEBIAN/md5sums
)
dpkg-deb --root-owner-group -Zzstd -z5 --build "$stage" "$destination"
