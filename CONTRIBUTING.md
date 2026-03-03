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

## Command Cheat Sheet

| What you want | Command |
|---|---|
| Install dependencies | `npm install` |
| Enable repo Git hooks (recommended once) | `node scripts/setup-githooks.mjs` |
| Check if hooks are enabled | `git config core.hooksPath` |
| Run the same logic as pre-commit (reads staged files) | `npm run precommit:guard` |
| Run the full merge gate (same bar as CI) | `npm run check:all` |
| Run desktop dev | `npm run tauri:dev` |
| Run tests (no coverage) | `npm run test:run` |
| Run tests with coverage (gate) | `npm run test:coverage` |
| Regenerate builtin commands (PowerShell) | `pwsh -File scripts/generate_builtin_commands.ps1` |
| Windows desktop E2E smoke (same as CI) | `npm run e2e:desktop:smoke` |

Note: `npm install` runs `package.json#prepare` which attempts to enable hooks automatically. If you use `--ignore-scripts`, run `node scripts/setup-githooks.mjs` manually.

## Local pre-commit gate

If `git config core.hooksPath` is set to `.githooks`, every `git commit` runs:

`.githooks/pre-commit` → `npm run precommit:guard` → `scripts/precommit-guard.mjs`

You can also run it manually:

`npm run precommit:guard`

Note: `git commit --no-verify` skips hooks (CI will still enforce gates).

If you want to disable hooks locally (not recommended):

`git config --unset core.hooksPath`

Verify (expect no output):

`git config --get core.hooksPath`

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

## Working with a protected `main` branch

Branch protection only affects pushes/merges to `origin/main`. It does not prevent local commits on `main`, but it’s strongly recommended to keep local `main` clean and do all work on feature branches.

Recommended workflow:

1) Sync local `main`:

`git fetch origin`

`git switch main`

`git pull --rebase origin main`

2) Create a feature branch:

`git switch -c feat/<topic>`

3) Commit as usual, then push and open a PR:

`git push -u origin feat/<topic>`
