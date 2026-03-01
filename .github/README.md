# GitHub Automation & Templates

[English](./README.md) | [简体中文](./README.zh-CN.md)

This folder contains GitHub-specific community health files and automation (Actions, issue/PR templates, Dependabot).

## Contents

- `ISSUE_TEMPLATE/`: issue forms (bug/feature/question)
- `pull_request_template.md`: PR checklist template
- `workflows/`: GitHub Actions workflows
- `dependabot.yml`: Dependabot update rules

## Workflows

### CI Gate (`workflows/ci-gate.yml`)

Triggers: `push(main)` + `pull_request(main)`.

What it does:

- Windows job runs `npm run check:all` (lint → typecheck → tests → build → rust check)
- macOS/Linux jobs run a cross-platform smoke gate (`typecheck`, tests, build)

### CodeQL (`workflows/codeql.yml`)

Triggers: `push(main)` + weekly `schedule`.

Notes:

- Runs only when the repository is public.
- This repo uses **Advanced** CodeQL workflow. If you enable Code scanning **Default setup** in GitHub settings,
  CodeQL uploads from this workflow will fail (they are mutually exclusive).

Results:

- GitHub → `Security` → `Code scanning` (alerts / status)

### Release Build Matrix (`workflows/release-build.yml`)

Trigger: push a version tag `vX.Y.Z`.

What it does:

- Validates: `tag version == package.json version`
- Builds bundles on Windows/macOS/Linux
- Publishes a GitHub Release with built assets + `SHA256SUMS`
- Uses the matching `CHANGELOG.md` section as the release body

Required secrets (for bundle signing):

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

### Release Dry Run Build (`workflows/release-dry-run.yml`)

Trigger: manual (`workflow_dispatch`).

What it does:

- Builds selected platform bundles and uploads artifacts (no GitHub Release publish)
