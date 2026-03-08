---
phase: 13-b4-layout-sizing-foundation
plan: "01"
subsystem: launcher-ui
tags: [floor-height, drawer, sizing, a11y]
provides:
  - drawer floor：仅在 Review(opening) 代理（stagingExpanded=true）下，0~3 结果补齐到 4 rows 口径
  - drawer filler：纯展示空白元素，aria-hidden 且不影响可达性/结果语义
affects: [phase-14]
tech-stack:
  added: []
  patterns:
    - layoutMetrics 输出 viewportHeight + fillerHeight，UI 仅负责渲染 filler
key-files:
  created:
    - .planning/phases/13-b4-layout-sizing-foundation/13-01-SUMMARY.md
  modified:
    - src/composables/launcher/useLauncherLayoutMetrics.ts
    - src/composables/app/useAppCompositionRoot/viewModel.ts
    - src/App.vue
    - src/components/launcher/LauncherWindow.vue
    - src/components/launcher/types.ts
    - src/components/launcher/parts/LauncherSearchPanel.vue
    - src/styles.css
key-decisions:
  - floor 仅在 `drawerOpen && stagingExpanded && filteredResults.length < 4` 时触发，搜索态不补高
  - filler 只做视觉补齐：不进 `<ul>`、`aria-hidden="true"`、无可聚焦子元素
patterns-established:
  - 用 `.result-drawer__filler` 承担空白补高，避免“假结果 DOM”
requirements-completed: [SIZE-01]
duration: 5min
completed: 2026-03-08
---

# Phase 13 Plan 01: floor height + drawer filler Summary

**在 Review(opening) 代理（`stagingExpanded=true`）下，drawer 在 0~3 结果时通过 aria-hidden filler 补齐到 4 rows floor；搜索态保持矮窗且不创建假结果 DOM。**

## Performance
- **Duration:** 5 min
- **Started:** 2026-03-08T00:59:55+08:00
- **Completed:** 2026-03-08T01:04:16+08:00
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- `useLauncherLayoutMetrics` 新增 `drawerUsesFloorHeight/drawerFloorViewportHeight/drawerFillerHeight`，并在满足 `drawerOpen && stagingExpanded && results<4` 时把 `drawerViewportHeight` 提升到 floor。
- 贯穿 `viewModel → App → LauncherWindow → LauncherSearchPanel` 透传 `drawerFillerHeight`，在 `.result-drawer` 底部渲染 `.result-drawer__filler`（`aria-hidden`、`pointer-events:none`），不进入 `<ul>`，确保 `.result-item` 数量仍严格等于结果数。

## Verification Evidence
- `npm run test:run -- src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts`
- `npm run check:all`

## Task Commits
1. **Task 1: 在 layoutMetrics 中引入 floor rows=4 与 fillerHeight 计算** - `f3cd2af`
2. **Task 2: 在 SearchPanel 渲染 filler/spacer 并贯穿 props** - `7533f93`
- Follow-up（门禁收敛，无行为变化）：`3633ca7`

## Files Created/Modified
- `src/composables/launcher/useLauncherLayoutMetrics.ts` - floor/filler 计算口径与对外指标
- `src/components/launcher/parts/LauncherSearchPanel.vue` - 渲染 filler（aria-hidden，不进 `<ul>`）
- `src/components/launcher/types.ts` - 补齐 `drawerFillerHeight` props 类型
- `src/components/launcher/LauncherWindow.vue` - 透传 `drawerFillerHeight` 到 SearchPanel
- `src/composables/app/useAppCompositionRoot/viewModel.ts` - 暴露 `drawerFillerHeight` 给 App
- `src/App.vue` - 绑定 `drawerFillerHeight` 到 LauncherWindow
- `src/styles.css` - `.result-drawer__filler` 样式（pointer-events none）

## Decisions & Deviations
- 为通过 `max-lines-per-function` 门禁，将 staging 相关 computed 抽到 `createStagingLayoutMetrics`（`3633ca7`），不改变数值口径。

## Next Phase Readiness
- Phase 14 可直接复用 floor/filler 与 sizing 口径：Review overlay 最小可视高度对齐基线已具备。
