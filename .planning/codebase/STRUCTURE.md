# Structure (ZapCmd)

Last mapped: 2026-03-03

## Top-level layout

- App UI (Vue/TS): `src/`
- Desktop backend (Tauri/Rust): `src-tauri/`
- Runtime assets (built-in commands, templates): `assets/`
- Human docs: `docs/`
- Build + maintenance scripts: `scripts/`
- CI workflows: `.github/workflows/`
- Repo automation / hooks: `.githooks/`

## `src/` (Vue app)

- Entry points:
  - `src/main.ts` (app bootstrap: Pinia + i18n)
  - `src/App.vue` (switches between launcher and settings windows)
- UI components:
  - Launcher: `src/components/launcher/`
  - Settings: `src/components/settings/`
- Composition + state orchestration:
  - `src/composables/app/useAppCompositionRoot/` (context/runtime/viewModel wiring)
  - Feature-oriented composables: `src/composables/launcher/`, `src/composables/settings/`, `src/composables/update/`, `src/composables/execution/`
- Domain modules:
  - Commands runtime loading/mapping/types: `src/features/commands/`
  - Safety baseline: `src/features/security/`
  - Update types: `src/features/update/`
  - Hotkey normalization: `src/shared/hotkeys.ts`
- Side-effect bridges (Tauri invokes, updater):
  - `src/services/tauriBridge.ts` (invoke wrappers)
  - `src/services/commandExecutor.ts` (desktop-only execution)
  - `src/services/updateService.ts` (desktop-only updater)
- Persistence:
  - Settings store: `src/stores/settingsStore.ts`
- Tests:
  - App-level tests: `src/__tests__/`
  - Module tests colocated: `src/**/__tests__/**`

## `src-tauri/` (Rust / Tauri host)

- Tauri config: `src-tauri/tauri.conf.json`
- Capability/permissions: `src-tauri/capabilities/default.json`
- Cargo crate: `src-tauri/Cargo.toml`
- Main Rust modules:
  - App bootstrap / plugins / invoke handler: `src-tauri/src/lib.rs`
  - Entry point: `src-tauri/src/main.rs`
  - Terminal discovery + command run: `src-tauri/src/terminal.rs`
  - User commands FS reading: `src-tauri/src/command_catalog.rs`
  - Window management + settings window: `src-tauri/src/windowing.rs`
  - Window bounds persistence + monitor handling: `src-tauri/src/bounds.rs`
  - Global hotkeys: `src-tauri/src/hotkeys.rs`
  - Autostart toggles: `src-tauri/src/autostart.rs`
  - Tray + global shortcut setup: `src-tauri/src/startup.rs`

## `assets/` (runtime templates)

- Built-in command JSON outputs live under:
  - `assets/runtime_templates/commands/builtin/`
- Loader expects built-ins at:
  - `assets/runtime_templates/commands/builtin/_*.json` (via Vite glob in `src/features/commands/runtimeLoader.ts`)
- Maintenance docs: `assets/runtime_templates/README.md`

## `docs/` (schemas + sources)

- Command schema contract: `docs/schemas/command-file.schema.json` + explanation `docs/schemas/README.md`
- Built-in command sources (SSOT): `docs/command_sources/_*.md` (generated into `assets/runtime_templates/commands/builtin/`)

## `scripts/` (repo automation)

- Sync version into Rust/Tauri config: `scripts/sync-version.mjs`
- Sync keys into Tauri config: `scripts/sync-keys.mjs` (reads `.env.keys` + `.env.keys.local`)
- Generate built-in command assets: `scripts/generate_builtin_commands.ps1`
- Pre-commit local gate: `scripts/precommit-guard.mjs`
- Configure hooks path: `scripts/setup-githooks.mjs`

