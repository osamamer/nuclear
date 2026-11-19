# Chromium on Debian

Run `./scripts/build-install-deb.sh` from the repository root and open **Nuclear** from the application menu. The Debian package launches the player in sandboxed Chromium. A private Rust backend handles desktop commands, plugins, stores, and profiles over standard IO.

Pass `--profile NAME` to `nuclear-music-player` to select a profile. The `./scripts/dev-chromium.sh` launcher runs the working tree's frontend with the installed runtime. Set `NUCLEAR_ELECTRON_BIN` or `NUCLEAR_CHROMIUM_BACKEND` to use an alternate executable.

Restart Nuclear after switching between native and custom window decorations.
