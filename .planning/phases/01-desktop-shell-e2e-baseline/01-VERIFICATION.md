---
phase: 01-desktop-shell-e2e-baseline
verified: 2026-03-03T13:42:29Z
status: passed
score: 9/9 must-haves verified
---

# Phase 1: desktop-shell-e2e-baseline Verification Report

**Phase Goal:** 建立本地与 CI 的回归门禁基线，并完成“最小桌面端 E2E 基线”的可执行方案或明确结论，为后续高频改动保驾护航。  
**Verified:** 2026-03-03T13:42:29Z  
**Status:** passed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 纯文档/说明类改动在 pre-commit 阶段直接通过且不运行任何门禁命令 | ✓ VERIFIED | `scripts/precommit-guard.mjs`：`isDocOnlyChange` 命中后直接 `process.exit(0)`（291–295） |
| 2 | 当触发条件命中时，pre-commit 会追加运行 `npm run test:coverage`；失败会阻止提交 | ✓ VERIFIED | `scripts/precommit-guard.mjs`：`coverageDecision.shouldRunCoverage` 时追加 `{ npm run test:coverage }`（348–351）；`run()` 对非 0 退出码直接 `process.exit(...)`（24–26） |
| 3 | 触发 `test:coverage` 时，控制台输出包含：触发原因、命中文件、将运行的命令清单 | ✓ VERIFIED | `scripts/precommit-guard.mjs`：`printCoveragePlan()` 输出 reasons + files + commands（246–265） |
| 4 | CI Gate（Windows）在运行 `npm run check:all` 之前检查内置命令生成产物是否同步提交：若 `git diff` 非空则失败并给出修复指令 | ✓ VERIFIED | `.github/workflows/ci-gate.yml`：`pwsh -File scripts/generate_builtin_commands.ps1` + `git diff --exit-code ...`，失败输出修复命令并 `exit 1`（35–47） |
| 5 | CI Gate（Windows）存在独立的最小桌面端 E2E job，失败会上传截图与日志并阻断合并 | ✓ VERIFIED | `.github/workflows/ci-gate.yml`：独立 job `desktop-e2e-smoke` 运行 `npm run e2e:desktop:smoke`（52–78），并 `if: always()` 上传 `.tmp/e2e/desktop-smoke/`（80–86） |
| 6 | release-build.yml 的 Windows `quality-gate` 在 `npm run check:all` 之后也会运行最小 E2E，失败阻断发布 | ✓ VERIFIED | `.github/workflows/release-build.yml`：`Run quality gate` 后运行 `npm run e2e:desktop:smoke`（32–43），且 `bundle` job `needs: quality-gate`（52–53） |
| 7 | 在 Windows 上可通过 `npm run e2e:desktop:smoke` 一键执行：启动桌面应用 -> 搜索输入 -> 抽屉出现/关闭 | ✓ VERIFIED | `package.json` 提供 `e2e:desktop:smoke`；`scripts/e2e/desktop-smoke.cjs` 的 `runSmokeCase()` 覆盖输入（By.id `zapcmd-search-input`）→ 抽屉出现（`aria-label=\"result-drawer\"`）→ ESC 关闭并清空输入（180–218） |
| 8 | E2E 失败会在 `.tmp/e2e/desktop-smoke/` 产出截图与日志，便于 CI 上传与定位 | ✓ VERIFIED | `scripts/e2e/desktop-smoke.cjs`：`OUTPUT_DIR=.tmp/e2e/desktop-smoke`（11），失败时写入 `tauri-driver.log`/`e2e.log` 并尝试保存 `screenshot.png`（288–310） |
| 9 | E2E 失败会以非 0 退出码失败，能作为 CI/Release 的阻断门禁 | ✓ VERIFIED | `scripts/e2e/desktop-smoke.cjs`：多个失败路径设置 `process.exitCode = 1` 并返回（227–232、234–250、288–310） |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/precommit-guard.mjs` | 本地 pre-commit 双通道门禁与可解释输出 | ✓ EXISTS + SUBSTANTIVE | 包含 `getStagedFiles()`、触发规则、输出与命令执行链路 |
| `.githooks/pre-commit` | 能触发 precommit:guard | ✓ WIRED | 执行 `npm run precommit:guard` |
| `.github/workflows/ci-gate.yml` | Windows 门禁 + E2E job | ✓ EXISTS + SUBSTANTIVE | 包含生成一致性阻断与 `desktop-e2e-smoke` job |
| `.github/workflows/release-build.yml` | Tag 发布 Windows 门禁（含最小 E2E） | ✓ EXISTS + SUBSTANTIVE | `quality-gate` 中 `check:all` 后追加 E2E 并上传产物 |
| `scripts/e2e/desktop-smoke.cjs` | 最小桌面端 E2E 冒烟执行器 | ✓ EXISTS + SUBSTANTIVE | 337 行；失败写日志/截图并非 0 退出码 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `.githooks/pre-commit` | `scripts/precommit-guard.mjs` | `npm run precommit:guard` | ✓ WIRED | `package.json`：`precommit:guard = node scripts/precommit-guard.mjs` |
| `.github/workflows/ci-gate.yml` | `scripts/generate_builtin_commands.ps1` | pwsh step + `git diff --exit-code` | ✓ WIRED | 生成后对产物路径做 diff 阻断 |
| `.github/workflows/ci-gate.yml` | `package.json` | `npm run e2e:desktop:smoke` | ✓ WIRED | e2e job 直接调用 npm script |
| `.github/workflows/release-build.yml` | `package.json` | `npm run e2e:desktop:smoke` | ✓ WIRED | Windows `quality-gate` 在 `check:all` 后调用 |
| `scripts/e2e/desktop-smoke.cjs` | `src/components/launcher/parts/LauncherSearchPanel.vue` | CSS selector / id / aria-label | ✓ WIRED | Vue 模板包含 `id=\"zapcmd-search-input\"` 与 `aria-label=\"result-drawer\"` |

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| REG-01: 本地 pre-commit 对“功能/行为改动”强制跑全量回归（至少 `npm run test:coverage`），并对纯文档/非行为改动避免不必要阻塞 | ✓ SATISFIED | - |
| REG-02: CI 持续执行 `npm run check:all` 作为合并门禁，失败时日志可直接定位到具体失败项 | ✓ SATISFIED | - |
| E2E-01: 建立并验证“最小 E2E 基线”（或明确记录不做的决定与原因） | ✓ SATISFIED | - |

## Anti-Patterns Found

None.

## Human Verification Required

None — all verifiable items checked via code and workflow wiring review.

## Gaps Summary

**No gaps found.** Phase goal achieved. Ready to proceed.

## Verification Metadata

**Verification approach:** Goal-backward (derived from ROADMAP.md phase goal)  
**Must-haves source:** `01-01-PLAN.md`, `01-02-PLAN.md`, `01-03-PLAN.md` frontmatter  
**Automated checks:** Existence/substantive/wiring (static)  
**Human checks required:** 0

---
*Verified: 2026-03-03T13:42:29Z*
*Verifier: Codex (orchestrator fallback — gsd-verifier agent type unavailable in this environment)*
