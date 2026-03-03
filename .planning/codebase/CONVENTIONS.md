# Conventions (ZapCmd)

Last mapped: 2026-03-03

## TypeScript / Vue conventions

- Vue SFCs use `<script setup lang="ts">` (e.g. `src/App.vue`, `src/components/**/**/*.vue`).
- Composition-centric architecture:
  - Composables live under `src/composables/**`
  - A central composition root wires most dependencies: `src/composables/app/useAppCompositionRoot/*`
- “Feature modules” live under `src/features/*` (e.g. `src/features/commands/*`, `src/features/security/*`).
- Side-effect boundaries are explicit via “services”:
  - Tauri bridge wrappers: `src/services/tauriBridge.ts`
  - Desktop execution gating: `src/services/commandExecutor.ts`
  - Updater calls: `src/services/updateService.ts`

## i18n

- Locales: `src/i18n/` (messages and locale normalization); used via `t(...)` imports in UI/domain logic (e.g. `src/features/security/commandSafety.ts`, `src/services/commandExecutor.ts`).

## Settings / persistence

- Settings are versioned and normalized, persisted to `localStorage` using `zapcmd.settings` (`src/stores/settingsStore.ts`).
- Startup reads persisted settings and applies language before mount: `src/main.ts`.

## Runtime gating (desktop-only behavior)

- Use `isTauri()` to guard desktop-only features; provide safe fallback behavior for web preview:
  - Execution: `src/services/commandExecutor.ts`
  - Updater: `src/services/updateService.ts`
  - Opening external URLs: `src/composables/app/useAppCompositionRoot/context.ts`

## ESLint / code quality rules

Configured in `eslint.config.js` (flat config):

- Repo ignores: `dist/**`, `coverage/**`, `src-tauri/**`, `node_modules/**` (`eslint.config.js`).
- TypeScript rules (not exhaustive):
  - `@typescript-eslint/no-explicit-any`: error (`eslint.config.js`)
  - `@typescript-eslint/no-unused-vars`: error, ignore args/vars starting with `_` (`eslint.config.js`)
- Complexity/size constraints for `src/**/*.{ts,tsx}` (excluding tests):
  - `complexity`: max 30 (`eslint.config.js`)
  - `max-lines-per-function`: 120 (`eslint.config.js`)
  - `max-params`: 5 (`eslint.config.js`)
- Tests enable Vitest globals: `globals.vitest` (`eslint.config.js`)

## Formatting

- No Prettier config/dependency detected; formatting is primarily ESLint autofix via `npm run lint:fix` (`package.json`, `eslint.config.js`).

## Shared compile-time constants

Injected by Vite and typed in `src/env.d.ts`:

- `__APP_VERSION__` (from `package.json` via `vite.config.ts`)
- `__GITHUB_OWNER__`, `__GITHUB_REPO__` (from `.env.keys` via `vite.config.ts`)

