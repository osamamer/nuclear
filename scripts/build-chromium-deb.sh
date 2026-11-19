#!/usr/bin/env bash
set -euo pipefail
umask 022

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
player="$repo_root/packages/player"
chromium="$player/chromium"
linux="$chromium/linux"
backend_deb="${1:?Tauri Debian package is required}"
destination="${2:?Output file is required}"
electron_version=45.3.3
electron_bin="${NUCLEAR_ELECTRON_BIN:-}"

if [[ -z "$electron_bin" && -x /usr/lib/nuclear-chromium/electron ]]; then
  if [[ "$(ELECTRON_RUN_AS_NODE=1 /usr/lib/nuclear-chromium/electron -p 'process.versions.electron')" == "$electron_version" ]]; then
    electron_bin=/usr/lib/nuclear-chromium/electron
  fi
fi
if [[ -z "$electron_bin" ]]; then
  electron_bin="$(ELECTRON_RUN_AS_NODE=1 pnpm dlx "electron@$electron_version" -p 'process.execPath' | tail -n 1)"
fi

electron_dir="$(dirname -- "$(realpath -- "$electron_bin")")"
if [[ ! -x "$electron_dir/electron" || ! -f "$electron_dir/icudtl.dat" ||
      "$(ELECTRON_RUN_AS_NODE=1 "$electron_dir/electron" -p 'process.versions.electron')" != "$electron_version" ]]; then
  printf 'An Electron %s distribution is required.\n' "$electron_version" >&2
  exit 1
fi

stage="$(mktemp -d)"
trap 'rm -rf -- "$stage"' EXIT
chmod 755 "$stage"
dpkg-deb --raw-extract "$backend_deb" "$stage"
runtime="$stage/usr/lib/nuclear-chromium"
install -d "$stage/etc/apparmor.d" "$runtime/chromium" "$runtime/src-tauri/icons"

for file in "$electron_dir"/*; do
  case "${file##*/}" in
    chromium|dist|src-tauri|nuclear-music-player) continue ;;
  esac
  cp -R -- "$file" "$runtime/"
done
mv -- "$stage/usr/bin/nuclear-music-player" "$runtime/"
cp -R -- "$player/dist" "$runtime/dist"
find "$runtime" -type d -exec chmod 0755 {} +
find "$runtime/dist" -type f -exec chmod 0644 {} +
install -m644 "$chromium/main.mjs" "$chromium/preload.cjs" "$chromium/renderer.js" "$runtime/chromium/"
install -m644 "$player/src-tauri/icons/icon.png" "$runtime/src-tauri/icons/"
install -m755 "$linux/nuclear-music-player" "$stage/usr/bin/"
install -m644 "$linux/nuclear-chromium.apparmor" "$stage/etc/apparmor.d/nuclear-chromium"
install -m755 "$linux/postinst" "$linux/prerm" "$stage/DEBIAN/"
printf '/etc/apparmor.d/nuclear-chromium\n' >> "$stage/DEBIAN/conffiles"

installed_size="$(du -sk "$stage/usr" "$stage/etc" | awk '{ sum += $1 } END { print sum }')"
dependencies='libgtk-3-0t64 | libgtk-3-0, libasound2t64 | libasound2, libnss3, libgbm1, libxss1'
awk -v size="$installed_size" -v dependencies="$dependencies" '
  /^Installed-Size:/ { print "Installed-Size: " size; next }
  /^Depends:/ { print $0 ", " dependencies; next }
  /^Description:/ {
    print "Conflicts: nuclear-chromium"
    print "Replaces: nuclear-chromium"
    print "Recommends: apparmor"
  }
  { print }
' "$stage/DEBIAN/control" > "$stage/DEBIAN/control.new"
mv -- "$stage/DEBIAN/control.new" "$stage/DEBIAN/control"

(
  cd "$stage"
  find usr -type f -print0 | LC_ALL=C sort -z | xargs -0 md5sum > DEBIAN/md5sums
)
dpkg-deb --root-owner-group -Zzstd -z5 --build "$stage" "$destination"
