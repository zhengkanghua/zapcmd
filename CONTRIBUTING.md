# Contributing to ZapCmd

Thanks for contributing.

## 0. Prerequisites

ZapCmd is a Tauri app (Rust + Web).

For most code contributions, you need:

1. Node.js (npm)
2. Rust toolchain (see `rust-toolchain.toml`)
3. Tauri prerequisites for your OS (system packages / build tools)

Docs-only contributions can be done without Rust/Tauri.

## 1. Quick Start

1. Install deps: `npm install`
2. Run dev app: `npm run tauri:dev`
3. Run gate: `npm run check:all`

Notes:

1. `npm run check:all` runs `cargo check` via `npm run check:rust`, so Rust is required.
2. If you are iterating on frontend-only changes locally, you can run a subset:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:run`
   - `npm run build`
   CI still runs the full gate, so please ensure `npm run check:all` passes before opening a PR.

## 2. Rules

1. Keep changes small and verifiable.
2. Do not use `any`.
3. Keep code, tests, and docs in sync.
4. If user-facing behavior changes, update both:
   - `README.md`
   - `README.zh-CN.md`

## 3. Testing

1. Minimum:
   - `npm run test:run`
   - `npm run test:coverage`
2. Required before PR:
   - `npm run check:all`
3. If terminal/window/hotkey behavior changes:
   - describe the expected behavior change clearly in the PR
   - include manual verification notes (what you tried + result)

## 4. Pull Request

0. Target branch:
   - Open PRs against `main`.
   - Releases are cut by pushing `vX.Y.Z` tags; `main` may be ahead of the latest release.

1. Use issue/PR templates in `.github/`.
2. Explain what changed and why.
3. Include test evidence (commands + results).
4. Keep the PR small and easy to review.

## 5. Commit Message (recommended)

1. `feat: ...`
2. `fix: ...`
3. `docs: ...`
4. `refactor: ...`
5. `test: ...`
6. `chore: ...`
