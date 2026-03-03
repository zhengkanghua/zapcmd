---
phase: 01-desktop-shell-e2e-baseline
plan: "03"
subsystem: testing
tags: [e2e, tauri, webdriver, selenium-webdriver, windows]

# 依赖关系图
requires: []
provides:
  - Windows 桌面端最小 E2E 冒烟入口：`npm run e2e:desktop:smoke`
  - 失败诊断产物：`.tmp/e2e/desktop-smoke/`（截图 + 日志）
affects: [ci-gate, release, desktop-shell]

# 技术追踪
tech-stack:
  added: [selenium-webdriver]
  patterns:
    - 失败即产物（截图/日志）+ 非 0 退出码 + 强制清理子进程

key-files:
  created:
    - scripts/e2e/desktop-smoke.cjs
  modified:
    - package.json
    - package-lock.json
    - .gitignore
    - src/components/launcher/parts/LauncherSearchPanel.vue

key-decisions:
  - "tauri:build:debug 使用 --no-bundle 加速并稳定产物路径（src-tauri/target/debug/zapcmd.exe）"
  - "非 Windows 直接失败退出（避免误把 skip 当 pass）"

patterns-established:
  - "E2E 产物统一写入 `.tmp/e2e/desktop-smoke/`，便于 CI 上传与定位"

requirements-completed: [E2E-01]

# 指标
duration: 9min
completed: 2026-03-03
---

# Phase 01 Plan 03: 最小桌面端 E2E 冒烟基线 总结

**新增 Windows 桌面端最小 E2E 冒烟：启动应用 → 搜索 → 结果抽屉开合；失败产出截图/日志并以非 0 退出码阻断**

## 性能与指标

- **耗时:** 9min
- **开始:** 2026-03-03T12:29:39Z
- **完成:** 2026-03-03T12:38:17Z
- **任务:** 2
- **修改文件数:** 5

## 完成内容

- 新增 `npm run e2e:desktop:smoke` 一键入口（含 debug 构建 + WebDriver 冒烟）
- 失败时产出 `.tmp/e2e/desktop-smoke/`（`screenshot.png` / `e2e.log` / `tauri-driver.log`），便于 CI 上传与定位
- 固化 UI 关键锚点（`data-testid`），降低选择器因文案/结构微调而抖动的风险

## 任务提交

每个任务均已原子提交：

1. **Task 1: 增加桌面端 E2E 冒烟脚本与 npm scripts（Windows）** - `b572e1a`（feat）
2. **Task 2: 固化选择器与稳定性约定（避免 E2E 易碎）** - `4cc25dc`（feat）

## 关键文件

- `scripts/e2e/desktop-smoke.cjs` - Windows 桌面端 E2E 冒烟执行器（启动/断言/截图日志/退出码/清理）
- `package.json` - 增加 `tauri:build:debug` / `e2e:desktop:smoke` scripts，并引入 `selenium-webdriver`
- `package-lock.json` - 锁定新增依赖
- `.gitignore` - 忽略 `.tmp/` 目录（E2E 产物）
- `src/components/launcher/parts/LauncherSearchPanel.vue` - 补充 `data-testid`（不影响样式与交互）

## 决策

- `tauri:build:debug` 使用 `--no-bundle`：加速 CI/本地构建，并保持可执行文件路径稳定。
- 非 Windows 直接失败：避免在非目标平台把“跳过”误当成“通过”。

## 偏离计划

- 将 `tauri:build:debug` 固化为 `tauri build --debug --no-bundle`（计划中描述为 debug build，但未强调 no-bundle；此处按 Tauri WebDriver 官方示例加速并减少无关产物）。

## 遇到的问题

- 受当前执行沙箱限制（Node `child_process.spawn*` 返回 `EPERM`），无法在此环境内运行 `npm run test:run`（Vite/Vitest 依赖 esbuild 子进程）以及真正启动 `tauri-driver` 的端到端链路验证。
  - **建议在开发者本机/CI Windows 环境复验：**
    1) `npm ci`
    2) 安装 WebDriver 依赖：`cargo install tauri-driver --locked`、`cargo install msedgedriver-tool --locked`、`msedgedriver-tool install`
    3) `npm run e2e:desktop:smoke`
    4) `npm run test:run`

## 用户需要的本地准备

- Windows 本地运行需安装 WebDriver 依赖：`cargo install tauri-driver --locked`
- Windows 本地运行需安装并配置 Edge WebDriver：`cargo install msedgedriver-tool --locked` + `msedgedriver-tool install`

## 下一阶段准备

- 已具备最小桌面端 E2E 冒烟可执行实现与产物约定，下一步可在 CI Gate / Release 中接入并作为阻断门禁（对应 Phase 1 的 `01-02-PLAN.md`）。

## 自检：通过

- FOUND: `scripts/e2e/desktop-smoke.cjs`
- FOUND: `.planning/phases/01-desktop-shell-e2e-baseline/01-03-SUMMARY.md`
- FOUND COMMIT: `b572e1a`
- FOUND COMMIT: `4cc25dc`
