# ZapCmd

[English](./README.md) | [简体中文](./README.zh-CN.md)

[![License: MIT](https://img.shields.io/badge/license-MIT-22c55e.svg)](./LICENSE)
[![Desktop](https://img.shields.io/badge/desktop-Tauri%20%2B%20Vue-2563eb.svg)](https://tauri.app/)
[![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-475569.svg)](./README.md#support-matrix-v1)

<img src="./docs/img/brand.png" alt="ZapCmd brand visual" width="480" />

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

Current brand and icon assets:

- Brand visual: `docs/img/brand.png`
- App icon source: `docs/img/logo.png`

Screenshot slots are prepared. Place files under `docs/img/showcase/`:

1. `launcher-search.png` (main launcher search state)
2. `param-dialog.png` (parameter fill dialog)
3. `queue-batch-run.png` (staging queue + batch run)
4. `settings-command-management.png` (settings command management)

Guideline: `docs/img/showcase/README.md`
Promotion screenshot checklist (including paired before/after captures): `docs/img/showcase/README.md`

## Downloads

- GitHub Releases: https://github.com/zhengkanghua/zapcmd/releases
- Build artifacts and release assets are generated when pushing `vX.Y.Z` tags.

Install notes:

1. Download the package for your OS (Windows/macOS/Linux).
2. Verify integrity with `SHA256SUMS` (included in each release).
3. macOS packages are currently unsigned/not notarized (may require manual allow on first launch).

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

Note: updater keys/endpoints are centralized in `.env.keys` and synced by `npm run keys:sync` (already included in `tauri:dev` / `tauri:build`).

Quality gate:

```bash
npm run check:all
```

Build:

```bash
# local default build
npm run tauri:build

# all bundle targets (needs NSIS download access)
npm run tauri:build:all
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
      "shell": "powershell",
      "adminRequired": false
    }
  ]
}
```

Schema:

- `docs/schemas/command-file.schema.json`
- `docs/schemas/README.md`

## Search Behavior (Current)

- Case-insensitive contains matching on:
  - `title`
  - `description`
  - `preview`
- If query contains spaces, token-AND is used (all tokens must match).
- Result ranking uses relevance score.
- Highlight is token-based and order-insensitive.

## Language

- Supported locales: `zh-CN`, `en-US`
- Switch path: `Settings -> General -> Language`
- Preference stored in `zapcmd.settings`

## Updates

- Auto check updates on startup: `Settings -> General -> Auto check updates` (throttled to once per 24h).
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
- Full desktop-shell E2E baseline

## Support Matrix (v1)

1. Windows x64: supported
2. macOS arm64 (Apple Silicon): supported
3. Linux x64: supported
4. Other architectures: not guaranteed in current version

## Known Limitations

1. macOS packages are currently unsigned/not notarized.
2. User command JSON changes take effect after app restart.
3. E2E automation baseline is not fully implemented yet.

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
- Only maintainers with repository write/release permission should push `v*.*.*` tags.
- Pushing a `vX.Y.Z` tag will trigger multi-platform builds and publish a GitHub Release.

## Docs

Public docs entry:

- `docs/README.md`

Open-source governance:

- `LICENSE`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `SUPPORT.md`
