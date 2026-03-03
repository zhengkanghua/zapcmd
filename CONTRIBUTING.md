# Contributing

Thanks for contributing to ZapCmd. This guide focuses on the local + CI quality gates so your PR is easy to review and merge.

## Quick Start

1) Install dependencies:

`npm install`

2) Run the desktop app in dev:

`npm run tauri:dev`

3) (Recommended) Enable repo Git hooks:

`node scripts/setup-githooks.mjs`

4) Before opening a PR, run the full quality gate:

`npm run check:all`

## Local pre-commit gate

If `git config core.hooksPath` is set to `.githooks`, every `git commit` runs:

`.githooks/pre-commit` → `npm run precommit:guard` → `scripts/precommit-guard.mjs`

You can also run it manually:

`npm run precommit:guard`

Note: `git commit --no-verify` skips hooks (CI will still enforce gates).

## Builtin command sources (must commit generated outputs)

If you change:
- `docs/command_sources/_*.md`
- `scripts/generate_builtin_commands.ps1`

You must regenerate and commit outputs:

`pwsh -File scripts/generate_builtin_commands.ps1`

`git add assets/runtime_templates/commands/builtin docs/builtin_commands.generated.md`

CI (Windows) will block PRs if generated outputs are not committed.

## Windows desktop E2E smoke (CI runs this)

CI runs:

`npm run e2e:desktop:smoke`

Artifacts are written to:

`.tmp/e2e/desktop-smoke/`

To run locally on Windows, install:

`cargo install tauri-driver --locked`

`cargo install msedgedriver-tool --locked`

`msedgedriver-tool install`

