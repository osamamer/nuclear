# Chromium on Linux

Nuclear (Chromium Preview) runs the production frontend in Electron. The existing Rust host handles desktop commands, plugins, stores, and profiles over private standard IO.

Run `./scripts/build-install-deb.sh --chromium` from the repository root and open **Nuclear (Chromium Preview)** from the application menu. The Debian package installs Electron at a fixed system path and grants that executable the AppArmor user namespace access needed for Chromium's sandbox.

Close the regular player before opening the preview because both use the same profile stores. Pass `--profile NAME` to `nuclear-chromium` to select a profile. The `./scripts/dev-chromium.sh` launcher runs the working tree's frontend with the installed runtime. Set `NUCLEAR_ELECTRON_BIN` or `NUCLEAR_CHROMIUM_BACKEND` to use an alternate executable.

The compatibility backend still uses a hidden Tauri webview for native IPC. Restart the preview after switching between native and custom window decorations.
