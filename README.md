# ZapCmd

[English](./README.md) | [简体中文](./README.zh-CN.md)

[![License: MIT](https://img.shields.io/badge/license-MIT-22c55e.svg)](./LICENSE)
[![Desktop](https://img.shields.io/badge/desktop-Tauri%20%2B%20Vue-2563eb.svg)](https://tauri.app/)
[![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-475569.svg)](./README.md#support-matrix-v1)

<p align="center">
  <img src="./docs/img/logo.png?raw=1" alt="ZapCmd logo" width="160" />
</p>

ZapCmd is a desktop command launcher focused on speed, safety baseline, and repeatable workflows.

## Why ZapCmd

- Search and run commands quickly, without memorizing everything.
- Fill parameters in UI before execution.
- Stage multiple commands and run as a queue in system terminal.
- Load builtin + user command files at runtime.
- Keep behavior explicit and testable (high coverage, strict local gate).

## Feature Highlights

- Launcher flow: `search -> param -> staging -> execute`
- Settings: hotkeys, default terminal, language, updates, launch at login, about page
- Command management: enable/disable, source-file filter, sort, override markers
- i18n: `zh-CN` + `en-US` (runtime switch + persistence)
- Safety baseline: risky command confirmation + argument injection guard
- Session restore: staged queue restored after restart

## Product Preview

Logo and icon asset: `docs/img/logo.png`

## Downloads

- GitHub Releases: https://github.com/zhengkanghua/zapcmd/releases
- Build artifacts and release assets are generated when pushing `vX.Y.Z` tags (Windows x64 only).

Install notes:

1. Download the Windows x64 package.
2. Verify integrity with `SHA256SUMS` (included in each release).
3. macOS/Linux are currently source-build only and do not ship official GitHub Release assets.

## Run From Source (Dev)

Requirements (build from source):

- Node.js (npm)
- Rust toolchain
- Tauri prerequisites for your OS

Run locally:

```bash
npm install
npm run tauri:dev
```

Tip: `npm run dev` starts web preview mode (no terminal execution). Use `npm run tauri:dev` for desktop features.

On Windows, command execution always follows the terminal selected in Settings.
ZapCmd itself stays unelevated; when a command or flow requires admin rights, Windows requests UAC only for the launched terminal.
`wt` reuses ZapCmd-managed terminal windows through two fixed window ids: `zapcmd-main-terminal` for normal sessions and `zapcmd-main-terminal-admin` for elevated sessions.
`powershell`, `pwsh`, and `cmd` always open a new standalone console window.
A staged flow is still delivered once. If any node in the flow has `adminRequired=true`, the whole flow runs in the elevated terminal.
This behavior stays consistent in both `tauri:dev` and packaged desktop runs.

Note: updater keys/endpoints are centralized in `.env.keys` and synced by `npm run keys:sync` (already included in `tauri:dev` / `tauri:build`).

Quality gate:

```bash
npm run check:all
```

Frontend JS coverage gate includes `src/App.vue`, `src/components/**/*.vue`, `src/composables/**/*.ts`, `src/features/**/*.ts`, `src/services/**/*.ts`, and `src/stores/**/*.ts`.
Rust verification stays separate under `check:rust`, `cargo test`, and desktop smoke gates instead of a single repo-wide percentage.

One-command local full validation (same gate + Windows desktop smoke; Windows auto-installs missing WebDriver deps):

```bash
npm run verify:local
```

Recommended local workflow (contributors + maintainers):

```bash
# enable repo git hooks (pre-commit)
node scripts/setup-githooks.mjs

# run the same logic as pre-commit hook (reads staged files)
npm run precommit:guard
```

Builtin command sources (`docs/command_sources/_*.md`) require generating and committing outputs:

CI blocks drift in both `assets/runtime_templates/commands/builtin` and `docs/builtin_commands.generated.md`.

```bash
pwsh -File scripts/generate_builtin_commands.ps1
git add assets/runtime_templates/commands/builtin docs/builtin_commands.generated.md
```

Windows desktop E2E smoke (CI runs this too):

```bash
npm run e2e:desktop:smoke
```

To force driver install step before validation on Windows:

```bash
npm run verify:local -- --install-webdriver
```

macOS prerequisites for local desktop smoke:

```bash
cargo install tauri-driver --locked
safaridriver --enable
```

Note: macOS desktop smoke stays experimental / non-blocking and is disabled by default because Tauri WebDriver on WKWebView is not yet stable.
Use experimental mode only when you explicitly want to probe it:

```bash
npm run verify:local -- --macos-desktop-e2e-experimental
```

Current remote gate wording matches `.github/workflows/ci-gate.yml`: Windows desktop smoke is the only blocking desktop gate in CI; macOS/Linux stay in cross-platform smoke (build/test) only.
Release tags keep the same boundary: Windows x64 release quality gate includes desktop smoke and publishes the official release assets.

See `CONTRIBUTING.md` for details.

Build:

```bash
# local default build
npm run tauri:build

# official release bundle (Windows x64)
npm run tauri:build:windows:x64
```

## User Commands (`~/.zapcmd/commands`)

ZapCmd reads user JSON files recursively:

- Windows: `%USERPROFILE%\\.zapcmd\\commands`
- macOS/Linux: `~/.zapcmd/commands`

User commands merge with builtin commands. If `id` conflicts, user command overrides builtin command.

Minimal example:

```json
{
  "commands": [
    {
      "id": "custom-hello-win",
      "name": "Custom Hello",
      "tags": ["custom", "hello"],
      "category": "custom",
      "platform": "win",
      "template": "Write-Output \"hello from user commands\"",
      "adminRequired": false
    }
  ]
}
```

Schema:

- `docs/schemas/command-file.schema.json`
- `docs/schemas/README.md`

Notes:

- `shell` is currently validated by schema but ignored at runtime (no effect). ZapCmd shows a validation notice in `Settings -> Command Management`.
- On Windows, `adminRequired=true` means "launch the matching elevated terminal when executing this command"; it does not elevate the ZapCmd app process itself.

## Search Behavior (Current)

- Case-insensitive contains matching on:
  - `title`
  - `description`
  - `preview`
  - `folder`
  - `category`
- If query contains spaces, token-AND is used (all tokens must match).
- Result ranking uses relevance score.
- Highlight is token-based and order-insensitive.

## Language

- Supported locales: `zh-CN`, `en-US`
- Switch path: `Settings -> General -> Language`
- Preference stored in `zapcmd.settings`

## Updates

- Auto check updates on startup: `Settings -> General -> Auto check updates` (throttled to once per 24h after a successful check; failures can retry on next startup).
- Manual check + download/install: `Settings -> About`.
- Updater uses signed GitHub Release assets (`latest.json` + `.sig`).

## Current Implementation vs Roadmap

Current implementation:

- Main launcher + settings + command management
- Runtime loading for builtin and user commands
- Startup-time loading for user command JSON (restart required to apply changes)
- Safety baseline and queue session restore

Roadmap:

- Advanced security governance (policy/whitelist/team rules)
- More comprehensive desktop-shell E2E baseline (cross-platform, more flows)

## Support Matrix (v1)

1. Windows x64: officially released and supported
2. macOS arm64 (Apple Silicon): source build only, no official GitHub Release asset
3. Linux x64: source build only, no official GitHub Release asset
4. Other architectures: not guaranteed in current version

## Known Limitations

1. Official GitHub Release assets currently provide Windows x64 only.
2. User command JSON changes take effect after app restart.
3. Desktop-shell E2E automation currently runs as blocking smoke on Windows only.

## Report Issues And Contribute

Issue entry:

- Open: https://github.com/zhengkanghua/zapcmd/issues/new/choose
- Choose one template:
  - `Bug Report`
  - `Feature Request`
  - `Usage Question`

Pull requests:

1. Fork repository and create a branch.
2. Make a small, verifiable change and run `npm run check:all`.
3. Open PR and fill `.github/pull_request_template.md`.

Full guide:

- `CONTRIBUTING.md`

Review and merge policy:

- All external changes are merged through PR review.
- Maintainers decide acceptance and merge timing.

## Release Permission

- Community contributors submit changes through PR; they do not publish releases directly.

## Documentation

- Docs index: `docs/README.md`
- Builtin commands maintenance: `docs/command_sources/README.md`
- Runtime templates assets: `assets/runtime_templates/README.md`
- Command file schema: `docs/schemas/README.md`
- GitHub automation: `.github/workflows/ci-gate.yml`
- Only maintainers with repository write/release permission should push `v*.*.*` tags.
- Pushing a `vX.Y.Z` tag will trigger the Windows x64 build and publish a GitHub Release.

## Docs

Public docs entry:

- `docs/README.md`

Open-source governance:

- `LICENSE`
- `CHANGELOG.md`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `SUPPORT.md`
