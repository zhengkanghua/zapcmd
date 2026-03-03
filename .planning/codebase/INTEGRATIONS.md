# Integrations (ZapCmd)

Last mapped: 2026-03-03

This project is a desktop app; “integrations” are mostly OS/runtime capabilities plus GitHub-based updates.

## External network / services

### GitHub Releases (auto-updater)

- Endpoint is configured in `src-tauri/tauri.conf.json` under `plugins.updater.endpoints`.
- Source of truth for the endpoint (and other shared values) is `.env.keys`:
  - `UPDATER_ENDPOINT` in `.env.keys`
  - Sync script: `scripts/sync-keys.mjs` writes into `src-tauri/tauri.conf.json`
  - Invoked by `npm run keys:sync` and included in `npm run tauri:dev` / `npm run tauri:build*` (`package.json`)
- Frontend update logic uses Tauri updater plugin:
  - Check: `checkForUpdate()` in `src/services/updateService.ts` (calls `@tauri-apps/plugin-updater`)
  - Download/install: `downloadAndInstall()` in `src/services/updateService.ts`
- Release workflow that builds and publishes bundles: `.github/workflows/release-build.yml`

### Opening URLs (project homepage)

- Uses `@tauri-apps/plugin-shell` in desktop runtime:
  - `open()` call in `src/composables/app/useAppCompositionRoot/context.ts`
  - Plugin enabled in Rust: `tauri_plugin_shell::init()` in `src-tauri/src/lib.rs`
- Falls back to `window.open` in web preview: `src/composables/app/useAppCompositionRoot/context.ts`

## Secrets / key material handling

- Repo intentionally keeps **public** updater config in `.env.keys` (commented as “public only”).
  - Local overrides live in `.env.keys.local` (gitignored in `.gitignore`).
- Release signing uses GitHub Actions secrets:
  - `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` in `.github/workflows/release-build.yml`
- No private key material should be committed to this repo (see `.env.keys` comments and `.gitignore`).

## OS / desktop integrations (Tauri plugin surface)

### Terminal discovery + execution (native)

- Terminal options are enumerated in Rust:
  - `get_available_terminals()` in `src-tauri/src/terminal.rs`
  - Platform-specific handling for Windows/macOS/Linux in `src-tauri/src/terminal.rs`
- Execution is delegated to the OS terminal:
  - `run_command_in_terminal()` in `src-tauri/src/terminal.rs`
  - Frontend wrapper: `src/services/commandExecutor.ts` uses `invoke("run_command_in_terminal", ...)`
- Desktop-only behavior is gated in UI using `isTauri()` (e.g. `src/services/commandExecutor.ts`, `src/services/updateService.ts`).

### Global shortcut (launcher)

- Default is `Alt+V` in Rust: `src-tauri/src/app_state.rs` / `src-tauri/src/startup.rs`
- Register/unregister logic: `src-tauri/src/hotkeys.rs`
- UI reads/writes via invoke: `readLauncherHotkey()` / `writeLauncherHotkey()` in `src/services/tauriBridge.ts`

### Tray menu

- Tray setup in `src-tauri/src/startup.rs` (toggle window, open settings, quit)

### Autostart / launch at login

- Enabled via `tauri_plugin_autostart`:
  - Rust commands: `src-tauri/src/autostart.rs`
  - UI bridge: `readAutoStartEnabled()` / `writeAutoStartEnabled()` in `src/services/tauriBridge.ts`

## Local filesystem integration

### User commands directory

- Backend ensures and reads `~/.zapcmd/commands` (platform-specific home resolution) in `src-tauri/src/command_catalog.rs`.
- Exposed via invoke:
  - `get_user_commands_dir` + `read_user_command_files` in `src-tauri/src/command_catalog.rs`
  - Frontend calls via `readUserCommandsDir()` / `readUserCommandFiles()` in `src/services/tauriBridge.ts`
- Note: backend currently returns full file contents for each JSON file (`src-tauri/src/command_catalog.rs`).

### App data (window bounds persistence)

- Main window position is stored in app data dir: `src-tauri/src/bounds.rs` (writes `main-window-bounds.json` under `app_data_dir()`).

