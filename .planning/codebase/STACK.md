# Stack (ZapCmd)

Last mapped: 2026-03-03

## What this repo is

ZapCmd is a cross-platform **desktop command launcher** built with **Tauri (Rust)** + **Vue 3 (TypeScript)**. UI renders in a Tauri webview and calls native Rust commands via `invoke()` (see `src/services/tauriBridge.ts` and `src-tauri/src/lib.rs`).

## Languages & Runtimes

- TypeScript + Vue SFCs: `src/**/*.ts`, `src/**/*.vue`
- Rust (Tauri backend): `src-tauri/src/**/*.rs`
- Node tooling scripts: `scripts/*.mjs`
- Toolchain pins:
  - Node version for local dev via `.nvmrc`
  - npm version pinned via `package.json` (`packageManager`)
  - Rust toolchain pinned via `rust-toolchain.toml`

## Frontend stack (Vue)

- Framework: Vue 3 (`package.json`)
- State: Pinia (`package.json`, `src/stores/settingsStore.ts`)
- i18n: `vue-i18n` (`package.json`, `src/i18n/`)
- Build/dev server: Vite (`package.json`, `vite.config.ts`)
- Styling: Tailwind + PostCSS (`tailwind.config.cjs`, `postcss.config.cjs`, `src/styles.css`)

## Desktop stack (Tauri / Rust)

- Tauri v2 app crate: `src-tauri/Cargo.toml`
- Rust entrypoint: `src-tauri/src/main.rs` → `src-tauri/src/lib.rs`
- Core plugins enabled:
  - Updater: `tauri_plugin_updater` (`src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`)
  - Shell: `tauri_plugin_shell` (`src-tauri/src/lib.rs`)
  - Autostart: `tauri_plugin_autostart` (`src-tauri/src/lib.rs`, `src-tauri/src/autostart.rs`)
  - Global shortcut: `tauri-plugin-global-shortcut` (`src-tauri/Cargo.toml`, `src-tauri/src/startup.rs`, `src-tauri/src/hotkeys.rs`)
- Capability/permission baseline: `src-tauri/capabilities/default.json`

## Key build / quality tooling

- Lint: ESLint flat config (`eslint.config.js`, `package.json`)
- Typecheck: `vue-tsc` (`package.json`, `tsconfig.json`, `tsconfig.test.json`)
- Tests: Vitest + jsdom + coverage (`vitest.config.ts`, `package.json`, `src/**/__tests__/**`)
- Git hooks: `.githooks/pre-commit` runs `npm run precommit:guard` (`scripts/precommit-guard.mjs`), installed via `scripts/setup-githooks.mjs` (`package.json` `prepare` script).
- CI:
  - PR/push gate: `.github/workflows/ci-gate.yml`
  - Tag release build: `.github/workflows/release-build.yml`

## Repository “data” model (where things live)

- Built-in command templates are generated JSON assets:
  - Sources: `docs/command_sources/_*.md`
  - Generator: `scripts/generate_builtin_commands.ps1`
  - Outputs: `assets/runtime_templates/commands/builtin/_*.json` + `assets/runtime_templates/commands/builtin/index.json`
  - Runtime loader: `src/features/commands/runtimeLoader.ts`
- User command files are read from the filesystem at runtime:
  - Backend reads: `src-tauri/src/command_catalog.rs`
  - Frontend fetches via Tauri invoke: `src/services/tauriBridge.ts`
  - Loader/validation: `src/features/commands/runtimeLoader.ts`, `src/features/commands/schemaGuard.ts`
- Settings persistence:
  - Stored in `localStorage` under `zapcmd.settings` (`src/stores/settingsStore.ts`)

## How to run (developer)

- Install: `npm install` (`package.json`)
- Web preview mode (no desktop-only features): `npm run dev` (`package.json`, `README.md`)
- Desktop dev mode: `npm run tauri:dev` (`package.json`, `src-tauri/tauri.conf.json`)
  - Runs version/key sync first: `scripts/sync-version.mjs`, `scripts/sync-keys.mjs`
- Quality gate locally: `npm run check:all` (`package.json`)
- Build bundles:
  - Windows MSI: `npm run tauri:build` (`package.json`)
  - All target bundles (CI/release): `npm run tauri:build:all` (`package.json`, `.github/workflows/release-build.yml`)

