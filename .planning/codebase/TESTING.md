# Testing (ZapCmd)

Last mapped: 2026-03-03

## Test frameworks

- Unit/integration tests: Vitest (`package.json`)
- Vue component testing: `@vue/test-utils` (`package.json`)
- DOM environment: jsdom (`vitest.config.ts`)
- Coverage: v8 provider + thresholds (`vitest.config.ts`)

## Where tests live

- Global/app tests: `src/__tests__/`
- Colocated module tests: `src/**/__tests__/**/*.ts`
- Naming patterns in use: `*.test.ts` (e.g. `src/services/__tests__/tauriBridge.test.ts`)

## Running tests locally

Scripts are defined in `package.json`:

- `npm test` (Vitest watch)
- `npm run test:run` (CI-style run)
- `npm run test:coverage` (coverage + thresholds)
- `npm run test:related -- <files...>` (used by pre-commit guard in `scripts/precommit-guard.mjs`)

## Coverage configuration

Configured in `vitest.config.ts`:

- Coverage includes:
  - `src/App.vue`
  - `src/composables/**/*.ts`
  - `src/features/**/*.ts`
  - `src/services/**/*.ts`
  - `src/stores/**/*.ts`
- Thresholds:
  - lines/functions/statements: 85%
  - branches: 80%

## Typechecking (tests vs app)

- App typecheck: `npm run typecheck` (`package.json`) uses `tsconfig.json` (excludes tests).
- Test typecheck: `npm run typecheck:test` (`package.json`) uses `tsconfig.test.json` (includes Vitest globals + `vitest.config.ts`).

## Mocking patterns

Common patterns in tests:

- `vi.mock(...)` / `vi.mocked(...)` for module mocking (e.g. `src/services/__tests__/updateService.test.ts`)
- `vi.spyOn(...)` for spying (e.g. `src/stores/__tests__/settingsStore.test.ts`)
- `vi.useFakeTimers()` for time-based logic (e.g. `src/composables/__tests__/execution/useCommandExecution.test.ts`)

## CI checks / gates

- PR + main branch quality gate: `.github/workflows/ci-gate.yml`
  - Windows job runs `npm ci` + `npm run check:all`
  - macOS/Ubuntu smoke runs typecheck(s) + tests + build
- Release build tags also run the full gate before bundling: `.github/workflows/release-build.yml`

## Pre-commit guard

- Hook: `.githooks/pre-commit` runs `npm run precommit:guard`
- Guard script: `scripts/precommit-guard.mjs` runs:
  - `npm run lint`
  - `npm run typecheck`
  - `vitest related --run` for staged `src/**/*.ts|.vue`
  - `npm run typecheck:test` when test-related files are staged
  - `cargo check` when Rust files are staged (via `cargo check --manifest-path src-tauri/Cargo.toml`)

