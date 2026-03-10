---
phase: 17-2-3-in-panel-2-3-review-drawer-overlay
plan: "02"
subsystem: ui
tags: [window-sizing, css-grid, launcher, overlay]

requires:
  - phase: 17-2-3-in-panel-2-3-review-drawer-overlay
    provides: Review overlay 已归位到 SearchPanel 内容区（17-01）
provides:
  - "停用 `.search-shell--staging-wide` 两列布局，Review 不再通过右侧列表达"
  - "窗口宽度计算不再随 Review 打开/关闭变化（metrics + calculation 去除 reviewWidth 叠加）"
affects: [launcher, sizing, regression]

tech-stack:
  added: []
  patterns:
    - "reviewWidth 仅作为 drawer 宽度变量，不参与窗口宽度计算"

key-files:
  created: []
  modified:
    - src/components/launcher/LauncherWindow.vue
    - src/composables/launcher/useLauncherLayoutMetrics.ts
    - src/composables/launcher/useWindowSizing/calculation.ts
    - src/styles.css

key-decisions:
  - "彻底切断 stagingExpanded → grid 扩展 → window width 扩展链路，避免 Review 开合触发 resize。"

patterns-established: []

requirements-completed: []

duration: 1min
completed: 2026-03-10
---

# Phase 17 Plan 02 总结：移除窗口变宽链路（staging-wide + width calculation）

**Review 打开/关闭不再改变窗口宽度：停用两列 grid 表达，并在 metrics + resolveWindowWidth 里去除 reviewWidth 叠加。**

## 性能与指标

- **耗时:** 1min
- **开始:** 2026-03-10T20:31:04+08:00
- **完成:** 2026-03-10T20:32:21+08:00
- **任务:** 2
- **修改文件数:** 4

## 完成内容

- `LauncherWindow.vue` 不再注入 `.search-shell--staging-wide`，`src/styles.css` 移除该 class 的 grid 宽度影响。
- `useLauncherLayoutMetrics` 与 `resolveWindowWidth` 不再在 `stagingExpanded=true` 时叠加 `reviewWidth`，从源头保证窗口宽度稳定。

## 任务提交

1. **Task 1: 停用 search-shell staging-wide 两列布局（避免“右侧独立列”与窗口变宽）** - `335026b` (refactor)
2. **Task 2: 移除 metrics + window sizing 的宽度扩展逻辑（stagingExpanded 不叠加 reviewWidth）** - `5599093` (fix)

**Plan 元数据:** _待补充（本计划收尾文档提交）_

## 偏离计划

无——按计划实现。

## 遇到的问题

- sandbox 内运行 vitest 时 `esbuild` spawn 报 `EPERM`；已在沙箱外重跑相关单测完成验证。

## 自检：通过

- FOUND: `.planning/phases/17-2-3-in-panel-2-3-review-drawer-overlay/17-02-SUMMARY.md`
- FOUND: `335026b`（Task 1 commit）
- FOUND: `5599093`（Task 2 commit）

