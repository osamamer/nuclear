# Chromium on Linux

The Chromium launcher runs Nuclear's production frontend in Electron while the original Rust host handles desktop commands, plugins, stores, and profiles over private standard IO. The same frontend, theme assets, and player logic run in both desktop shells.

Build the player and install the backend with `./scripts/build-install-deb.sh` from the repository root. Close the regular app before trying `./scripts/dev-chromium.sh` because both hosts use the same profile stores. A light or independent profile can be selected with `--profile NAME`. The script uses Electron 45.3.3 unless `NUCLEAR_ELECTRON_BIN` points to a different Electron executable. Set `NUCLEAR_CHROMIUM_BACKEND` to use a locally built backend in place of the installed binary.

This launcher is experimental. The full Debian release still uses the standard window, and the compatibility backend still uses a hidden Tauri webview for native IPC. Restart the Chromium launcher after switching between native and custom window decorations.
