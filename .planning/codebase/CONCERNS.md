# Concerns (ZapCmd)

Last mapped: 2026-03-03

This is a prioritized list of risks/tech-debt areas with pointers to the most relevant files.

## P0 — Security / native execution surface

1. **Native command execution is the core product**, so any UI compromise (XSS, dependency compromise, malicious command template) can become **arbitrary command execution on the host**.
   - Terminal spawning and command forwarding: `src-tauri/src/terminal.rs`
   - UI invocation boundary: `src/services/commandExecutor.ts`, `src/services/tauriBridge.ts`
2. **Cross-shell quoting/injection edge cases** are inherently brittle (PowerShell vs cmd vs bash/zsh, etc.). The code intentionally passes user-rendered commands into shell entrypoints.
   - Desktop exec: `src-tauri/src/terminal.rs`
   - Template rendering + safety checks: `src/features/security/commandSafety.ts`, `src/composables/launcher/useTerminalExecution.ts`
3. macOS execution uses `osascript` with manual escaping (common injection/escaping footgun).
   - AppleScript spawning: `src-tauri/src/terminal.rs`

## P0/P1 — Capability / permissions drift risk

- Current capability is minimal (`core:default`) in `src-tauri/capabilities/default.json`, but plugins like shell/updater/autostart/shortcuts are enabled in `src-tauri/src/lib.rs`. Future changes should be reviewed carefully to avoid accidentally expanding permission scope beyond intent.

## P1 — Performance / scalability risks

1. **User command loading returns full file contents** for every JSON file under `~/.zapcmd/commands` with no obvious size/count guard; large/invalid trees can spike memory and startup latency.
   - Backend read loop: `src-tauri/src/command_catalog.rs`
   - UI parsing loop: `src/features/commands/runtimeLoader.ts`
2. Window move persistence uses background threads + polling; behavior is correct but easy to regress and can generate extra writes on noisy move events.
   - Bounds persistence + worker thread: `src-tauri/src/bounds.rs`

## P1 — UX / contract drift

- `shell` is accepted/validated by the runtime schema but explicitly treated as “ignored” during load (reported as a `shell-ignored` issue).
  - Loader behavior: `src/features/commands/runtimeLoader.ts`
  - Runtime schema guard: `src/features/commands/schemaGuard.ts`
  - Schema docs mention this as a limitation: `README.md`

## P2 — Maintainability hotspots

1. `src/App.vue` and the composition root expose a very wide surface area (many props/handlers), which can be brittle to evolve without omissions.
   - Wiring: `src/composables/app/useAppCompositionRoot/*`, `src/App.vue`
2. Settings store contains a lot of normalization + migration logic in a single module.
   - Persistence + migrations: `src/stores/settingsStore.ts`

## P2 — Rust-side test gap

- Frontend test coverage is strong (Vitest + coverage thresholds in `vitest.config.ts`), but the Rust backend has no unit/integration tests around higher-risk behavior (terminal spawning, file IO, window bounds persistence).
  - Backend modules: `src-tauri/src/terminal.rs`, `src-tauri/src/command_catalog.rs`, `src-tauri/src/bounds.rs`

