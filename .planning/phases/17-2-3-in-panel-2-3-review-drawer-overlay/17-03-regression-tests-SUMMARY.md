---
phase: 17-2-3-in-panel-2-3-review-drawer-overlay
plan: "03"
subsystem: testing
tags: [vitest, vue-test-utils, regression, window-sizing, launcher]

requires:
  - phase: 17-2-3-in-panel-2-3-review-drawer-overlay
    provides: Review in-panel overlay 结构与宽度链路已完成（17-01/17-02）
provides:
  - "回归测试锁死 Phase 17 不变量：Review 不扩展窗口宽度 + in-panel overlay 范围 + 关闭回焦/退出契约"
affects: [launcher, sizing, regression]

tech-stack:
  added: []
  patterns:
    - "避免 snapshot：用可定位断言锁定关键不变量"

key-files:
  created: []
  modified:
    - src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
    - src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
    - src/components/launcher/parts/__tests__/LauncherReviewOverlay.test.ts
    - src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts

key-decisions:
  - "覆盖范围用 DOM 归属断言（.review-overlay 在 .search-main 子树且不在 .search-capsule 内），避免依赖 JSDOM 的 layout/computedStyle。"

patterns-established: []

requirements-completed: []

duration: 6min
completed: 2026-03-10
---

# Phase 17 Plan 03 总结：回归测试护栏（宽度不扩展 + in-panel overlay 契约）

**补齐并锁死 Phase 17 的关键不变量：Review 打开不改变窗口宽度；scrim 只覆盖内容区；关闭与退出契约可自动化验证。**

## 性能与指标

- **耗时:** 6min
- **开始:** 2026-03-10T20:41:46+08:00
- **完成:** 2026-03-10T20:47:48+08:00
- **任务:** 2
- **修改文件数:** 4

## 完成内容

- 新增/更新 composable 单测：`stagingExpanded=true` 时 `minShellWidth/resolveWindowWidth` 不再叠加 `reviewWidth`（窗口宽度稳定）。
- 新增/更新组件单测：用 DOM 归属断言锁定 in-panel overlay 范围，并覆盖 inert/aria-hidden、点击 search capsule 退出、scrim 关闭回焦的契约。
- 最终门禁：`npm run check:all` 全绿。

## 任务提交

1. **Task 1: 为“Review 打开不改变窗口宽度”新增回归断言（metrics + calculation）** - `167dd3e` (test)
2. **Task 2: 为“in-panel overlay 范围 + 关闭回焦”补齐组件级回归断言** - `4a2de21` (test)

**Plan 元数据:** _待补充（本计划收尾文档提交）_

## 偏离计划

无——按计划实现。

## 遇到的问题

- sandbox 内运行 vitest 时 `esbuild` spawn 报 `EPERM`；已在沙箱外跑通 `npm run check:all` 完成最终门禁。

## 自检：通过

- FOUND: `.planning/phases/17-2-3-in-panel-2-3-review-drawer-overlay/17-03-regression-tests-SUMMARY.md`
- FOUND: `167dd3e`（Task 1 commit）
- FOUND: `4a2de21`（Task 2 commit）
