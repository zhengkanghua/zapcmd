# Architecture (ZapCmd)

Last mapped: 2026-03-03

## High-level overview

ZapCmd is a **Tauri 2 desktop app** with a **Vue 3** UI.

- Rust side (native host) initializes the app, enables plugins, and exposes a small command surface via `#[tauri::command]` (`src-tauri/src/lib.rs`).
- Vue side renders the launcher/settings UI, loads command templates, persists settings to `localStorage`, and calls into Rust via `invoke()` wrappers (`src/services/tauriBridge.ts`).

## Entry points

- UI boot: `index.html` → `src/main.ts` → `src/App.vue`
- Tauri boot: `src-tauri/src/main.rs` → `src-tauri/src/lib.rs` (`tauri::Builder`)

## Runtime boundary: “web preview” vs “desktop”

Many features are **desktop-only** (terminal execution, updater, autostart). The UI supports a web preview mode by gating behavior using `isTauri()`:

- Command execution: `src/services/commandExecutor.ts`
- Updater: `src/services/updateService.ts`
- Homepage open: `src/composables/app/useAppCompositionRoot/context.ts`

## UI architecture (Vue)

### Composition root pattern

The UI centralizes wiring in a composition root that builds a “context + runtime + view model” set:

- `src/composables/app/useAppCompositionRoot/index.ts`
- `src/composables/app/useAppCompositionRoot/context.ts`
- `src/composables/app/useAppCompositionRoot/runtime.ts`
- `src/composables/app/useAppCompositionRoot/viewModel.ts`

`src/App.vue` then destructures a large set of reactive values and handlers from `useAppCompositionRoot()` and passes them to either:

- Launcher window UI: `src/components/launcher/LauncherWindow.vue`
- Settings window UI: `src/components/settings/SettingsWindow.vue`

### Settings & persistence

- Settings are stored in `localStorage` under `zapcmd.settings` (`src/stores/settingsStore.ts`) and applied at startup in `src/main.ts`.
- Settings window and main window sync uses `BroadcastChannel` (“settings-updated”) in `src/composables/app/useAppCompositionRoot/context.ts` and lifecycle logic in `src/composables/app/useAppLifecycle.ts`.

## Backend architecture (Rust / Tauri)

### Command surface exposed to UI

Rust exposes `#[tauri::command]` functions across modules and registers them via `tauri::generate_handler![]`:

- Registration: `src-tauri/src/lib.rs`
- Window management: `src-tauri/src/windowing.rs`
- Hotkeys: `src-tauri/src/hotkeys.rs`
- Terminal integration: `src-tauri/src/terminal.rs`
- User commands FS access: `src-tauri/src/command_catalog.rs`
- Autostart: `src-tauri/src/autostart.rs`

### Desktop plugins / UX shell

- Tray + global shortcut setup: `src-tauri/src/startup.rs`
- Window bounds persistence and monitor safety: `src-tauri/src/bounds.rs`

## Core domain flows

### 1) Command template loading

1. Built-in commands are generated JSON assets:
   - Source: `docs/command_sources/_*.md`
   - Generator: `scripts/generate_builtin_commands.ps1`
   - Output: `assets/runtime_templates/commands/builtin/_*.json`
2. UI loads built-ins using a Vite eager glob in `src/features/commands/runtimeLoader.ts`.
3. User command JSON files are read by Rust (`src-tauri/src/command_catalog.rs`) and passed to UI via `src/services/tauriBridge.ts`.
4. UI validates and maps runtime JSON into renderable templates:
   - Schema/type guard: `src/features/commands/schemaGuard.ts`
   - Mapping to internal template: `src/features/commands/runtimeMapper.ts`

### 2) Launcher flow (search → param → staging → execute)

- Search behavior is implemented in composables under `src/composables/launcher/` (e.g. `useLauncherSearch`, `useCommandCatalog`).
- Staging/queue is managed via composables and the composition root wiring (`src/composables/app/useAppCompositionRoot/*`).
- Execution bridges:
  - UI chooses a terminal + renders command templates (see `src/composables/launcher/useTerminalExecution.ts`)
  - Actual execution is performed by Rust by opening the selected terminal (`src-tauri/src/terminal.rs`)

### 3) Safety baseline

Safety checks happen on the frontend before execution:

- Argument validation + injection token blocking: `src/features/security/commandSafety.ts`
- “Dangerous command” confirmation reasons via regex patterns: `src/features/security/commandSafety.ts`
- Tests cover safety behavior: `src/features/security/__tests__/commandSafety.test.ts`

### 4) Update flow

- Config: `src-tauri/tauri.conf.json` updater endpoints + public key, synced from `.env.keys` by `scripts/sync-keys.mjs`
- UI uses `@tauri-apps/plugin-updater`: `src/services/updateService.ts`

