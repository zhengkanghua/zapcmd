---
phase: 01-desktop-shell-e2e-baseline
plan: "02"
subsystem: infra
tags: [github-actions, ci, windows, e2e, tauri, webdriver, release]

requires:
  - phase: 01-desktop-shell-e2e-baseline
    provides: "最小桌面端 E2E 冒烟入口与产物目录（01-03）"
provides:
  - "CI Gate（Windows）内置命令生成一致性阻断检查（check:all 前）"
  - "CI Gate（Windows）独立桌面端最小 E2E 冒烟 job（失败上传产物并阻断合并）"
  - "Release Build（Windows）quality-gate 在 check:all 后追加最小 E2E，失败阻断发布并上传产物"
affects: [ci-gate, release, desktop-shell, developer-workflow]

tech-stack:
  added: []
  patterns:
    - "生成产物一致性：先生成再 git diff --exit-code 阻断"
    - "E2E 失败即产物：统一上传 .tmp/e2e/desktop-smoke"

key-files:
  created: []
  modified:
    - .github/workflows/ci-gate.yml
    - .github/workflows/release-build.yml

key-decisions:
  - "CI Gate 的桌面端 E2E 作为独立 job 运行：日志/产物与质量门禁解耦，失败可单点定位"

patterns-established:
  - "Windows 门禁统一使用 npm run e2e:desktop:smoke，产物目录固定为 .tmp/e2e/desktop-smoke"

requirements-completed: [REG-02, E2E-01]

duration: 3min
completed: 2026-03-03
---

# Phase 1 Plan 02 总结：CI Gate / Release 门禁对齐

**在 Windows 门禁中落地“内置命令生成一致性阻断 + 最小桌面端 E2E 冒烟”，并统一上传 `.tmp/e2e/desktop-smoke/` 作为失败定位材料。**

## 性能与指标

- **耗时:** 3min
- **开始:** 2026-03-03T13:14:16Z
- **完成:** 2026-03-03T13:16:42Z
- **任务:** 3
- **修改文件数:** 2

## 完成内容

- CI Gate（Windows）在 `npm run check:all` 之前新增“生成一致性检查”：执行 `scripts/generate_builtin_commands.ps1` 并对指定产物路径做 `git diff --exit-code` 阻断，失败输出可复制粘贴的修复命令。
- CI Gate 新增独立的 `desktop-e2e-smoke` job：安装 WebDriver 依赖并运行 `npm run e2e:desktop:smoke`，无论成功/失败都上传 `.tmp/e2e/desktop-smoke/`。
- Release Build 的 Windows `quality-gate` 在 `npm run check:all` 之后追加同一套最小 E2E，并上传相同产物；失败直接阻断后续 `bundle` / `publish-release`。

## 任务提交

每个任务均已原子提交：

1. **Task 1: 在 CI Gate Windows quality-gate 中加入“内置命令生成一致性”阻断检查** - `1678ce8`（feat）
2. **Task 2: 新增独立的 Windows 桌面端 E2E 冒烟 job，并上传截图/日志** - `e64f6cf`（feat）
3. **Task 3: 对齐 release-build.yml 的 Windows quality-gate（check:all 后追加最小 E2E）** - `5255f2d`（feat）

## 关键文件

- `.github/workflows/ci-gate.yml` - Windows quality-gate 增加生成一致性阻断检查；新增独立桌面端 E2E 冒烟 job + 产物上传
- `.github/workflows/release-build.yml` - Windows `quality-gate` 在 `check:all` 后追加最小桌面端 E2E + 产物上传，失败阻断发布链路

## 偏离计划

无——按计划实现。

## 遇到的问题

无（此计划主要为 CI/Release 工作流改动，建议在 GitHub Actions 实际跑一次验证行为与产物上传）。

## 用户需要的本地准备

无。

## 下一阶段准备

- Phase 1 的本地门禁（01-01）+ 最小桌面 E2E（01-03）+ CI/Release 对齐（01-02）已齐备，可进入 Phase 2 覆盖率门禁提升。

## 自检：通过

- FOUND: `.planning/phases/01-desktop-shell-e2e-baseline/01-02-SUMMARY.md`
- FOUND: `.github/workflows/ci-gate.yml`
- FOUND: `.github/workflows/release-build.yml`
- FOUND COMMIT: `1678ce8`
- FOUND COMMIT: `e64f6cf`
- FOUND COMMIT: `5255f2d`
