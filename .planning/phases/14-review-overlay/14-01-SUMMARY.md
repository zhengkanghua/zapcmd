---
phase: 14-review-overlay
plan: "01"
subsystem: launcher-ui
tags: [review-overlay, queue, pill, sizing, layout]
provides:
  - 单焦点搜索态：默认不再出现常驻并列的右侧 staging 工作区
  - queue summary pill：仅队列非空渲染，作为进入 Review 的主要入口之一（沿用 toggle-staging 事件链路）
  - Review 宽度口径单一真相：`2/3 + clamp(420~480)` 通过 `--review-width` CSS 变量贯穿
affects: [phase-14-02, phase-15]
tech-stack:
  added: []
  patterns:
    - Review 宽度通过 CSS 变量 `--review-width` 传入样式层，避免散落魔法值
key-files:
  created:
    - .planning/phases/14-review-overlay/14-01-SUMMARY.md
    - src/components/launcher/parts/LauncherQueueSummaryPill.vue
  modified:
    - src/components/launcher/LauncherWindow.vue
    - src/components/launcher/parts/LauncherSearchPanel.vue
    - src/components/launcher/types.ts
    - src/composables/execution/useCommandExecution/helpers.ts
    - src/composables/launcher/useLauncherLayoutMetrics.ts
    - src/composables/launcher/useLauncherSessionState.ts
    - src/composables/launcher/useWindowSizing/calculation.ts
    - src/styles.css
key-decisions:
  - Phase 14 先沿用 `toggle-staging` 事件名与 `stagingExpanded` 状态字段，避免事件/状态重命名引发大范围改动；结构收口留到后续阶段
  - 会话恢复只恢复队列数据，不再默认恢复 Review 打开态（保持“打开主窗口即搜索态”的单焦点基线）
patterns-established:
  - `useLauncherLayoutMetrics` 负责输出 Review 宽度常量与 CSS 变量，组件/CSS 不重复定义 `0.67/420/480`
requirements-completed: [SHELL-01, REV-01, VIS-03]
duration: 13min
completed: 2026-03-09
---

# Phase 14 Plan 01: 单焦点搜索态 + pill 入口 + Review 宽度口径 Summary

**主窗口默认回到“单焦点搜索态”，用 queue summary pill 提供 Review 入口，并把 Review 宽度统一到 `2/3 + clamp(420~480)` 的可读区间。**

## Performance
- **Duration:** 13 min
- **Started:** 2026-03-09T12:07:06+08:00
- **Completed:** 2026-03-09T12:20:16+08:00
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- SearchPanel 新增 queue summary pill：仅 `stagedCommands.length > 0` 渲染，不占位，点击沿用 `toggle-staging` 打开 Review。
- 禁止“首次入队自动打开 Review”，并且会话恢复不再默认打开 Review：只恢复队列数据，保持单焦点搜索态基线。
- 建立 Review 宽度口径单一真相：`reviewWidth = clamp(searchMainWidth * 2/3, 420, 480)`，通过 `--review-width` 传入样式层，并把右侧 collapsed 宽度归零避免常驻窄列观感。

## Verification Evidence
- 手动：空队列打开主窗口 pill 不出现；入队后 pill 出现；点击 pill 可打开 Review（Phase 14-02 会把旧 staging 面板迁移为 overlay）。
- 自动化：回归同步在 Plan 14-03 统一迁移后执行 `npm run check:all`。

## Task Commits
1. **Task 1: 搜索区新增队列摘要 pill 入口** - `66e162e`
2. **Task 2: 禁止入队与会话恢复自动打开 Review** - `648bb1d`
3. **Task 3: 统一 Review 宽度口径并单列化 Search 壳层** - `5bc49ed`

## Files Created/Modified
- `src/components/launcher/parts/LauncherQueueSummaryPill.vue` - queue summary pill（aria label + click → toggle-staging）
- `src/components/launcher/parts/LauncherSearchPanel.vue` - 在搜索区挂载 pill（仅队列非空渲染）
- `src/composables/execution/useCommandExecution/helpers.ts` - `appendToStaging` 不再自动打开 Review
- `src/composables/launcher/useLauncherSessionState.ts` - restore 只恢复队列数据，不再默认打开 Review
- `src/composables/launcher/useLauncherLayoutMetrics.ts` - Review 宽度口径（2/3 + clamp 420~480）+ CSS 变量注入
- `src/composables/launcher/useWindowSizing/calculation.ts` - 读取 `--review-width` 参与宽度计算
- `src/styles.css` - pill 与单列壳层样式基线

## Decisions & Deviations
- 本计划未做结构性重命名（`toggle-staging` / `stagingExpanded`），以降低 Phase 14-02 overlay 接入的迁移摩擦。

## Next Phase Readiness
- 已具备 overlay 接入的入口与尺寸底座：Phase 14-02 可在 `--review-width` 与单焦点壳层基线上落地背景锁定、scrim 关闭语义与内部滚动结构。

