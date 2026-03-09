---
phase: 14-review-overlay
plan: "02"
subsystem: launcher-ui
tags: [review-overlay, scrim, background-lock, clipboard, scroll]
provides:
  - Review overlay（scrim + panel + 关闭语义），且不覆盖顶部 drag strip
  - Review 内部队列列表：内部滚动、长命令摘要（tooltip/title 提供完整）、复制入口
  - 背景锁定：Search 区 inert/aria-hidden + shouldBlockSearchInputFocusRef，滚轮在背景区域转发到 Review 列表
affects: [phase-14-03, phase-15]
tech-stack:
  added: []
  patterns:
    - 背景锁定优先靠“scrim 覆盖 + inert + 聚焦阻断”三件套，不在业务层散落临时 guard
key-files:
  created:
    - .planning/phases/14-review-overlay/14-02-SUMMARY.md
    - src/components/launcher/parts/LauncherReviewOverlay.vue
  modified:
    - src/components/launcher/LauncherWindow.vue
    - src/components/launcher/parts/LauncherSearchPanel.vue
    - src/composables/app/useAppCompositionRoot/runtime.ts
    - src/composables/launcher/useStagingQueue/guards.ts
    - src/styles.css
key-decisions:
  - 继续复用 `stagingExpanded/stagingDrawerState` 作为 Review 打开态，避免 Phase 14 引入“状态字段重命名”的大迁移；Phase 15 再做键盘/焦点语义收口
patterns-established:
  - Review 内默认只展示命令摘要（`summarizeCommandForFeedback`），完整命令通过 `title` 与复制入口获取
requirements-completed: [SHELL-02, SHELL-03, SIZE-02, REV-02, REV-03]
duration: 9min
completed: 2026-03-09
---

# Phase 14 Plan 02: Review overlay + 背景锁定 + 队列审阅 Summary

**把旧 staging 右栏迁移为 B4 Review overlay：scrim 锁背景、拖拽区不被吞、队列列表内部滚动，并提供长命令摘要与复制入口。**

## Performance
- **Duration:** 9 min
- **Started:** 2026-03-09T12:58:30+08:00
- **Completed:** 2026-03-09T13:07:24+08:00
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- 新增 `LauncherReviewOverlay.vue`：scrim 点击关闭 Review（不触发 blank click hide 主窗），panel 使用 `role="dialog" aria-modal="true"`，并复用 `setStagingPanelRef` 作为 sizing 测量锚点。
- Review 内部队列 UI：列表内部滚动（maxHeight 来自 layoutMetrics），长命令默认摘要展示（title 提供完整），每条命令提供复制按钮，删除/排序/清空/执行全部等动作链路保持不变。
- 背景锁定收口：SearchPanel 在 Review 打开时 `inert + aria-hidden`，运行时聚焦阻断包含 Review 打开态；并在 scrim 上把滚轮转发到 Review 列表容器，保证背景滚轮行为自然可用。

## Verification Evidence
- 手动：打开 Review 后点击背景不应触发交互；滚轮在背景区域可滚动 Review 列表；点击 scrim 只关闭 Review（主窗不隐藏）；drag strip 仍可拖动窗口。
- 自动化：回归迁移与 `npm run check:all` 在 Plan 14-03 统一执行。

## Task Commits
1. **Task 1: 引入 Review overlay 壳层（scrim + panel + 关闭语义）** - `83473f2`
2. **Task 2: Review 内实现队列列表（摘要 + 复制 + 内部滚动 + 队列动作）** - `95f7aa2`
3. **Task 3: 背景锁定与滚轮转发（点击/滚动/聚焦）** - `1b61fef`

## Files Created/Modified
- `src/components/launcher/parts/LauncherReviewOverlay.vue` - Review overlay 主交互层（scrim + panel + 列表 + footer）
- `src/components/launcher/parts/LauncherSearchPanel.vue` - Review 打开时背景 inert/aria-hidden
- `src/composables/app/useAppCompositionRoot/runtime.ts` - shouldBlockSearchInputFocusRef 纳入 Review 打开态
- `src/composables/launcher/useStagingQueue/guards.ts` - 空队列时不强制把焦点送回搜索（Review 仍可保持打开）
- `src/styles.css` - Review overlay/panel 基础样式与 dim 变量

## Next Phase Readiness
- Review overlay 结构与背景锁定已具备；Plan 14-03 需要把回归测试从旧 staging 迁移到 overlay（并确保 `npm run check:all` 全绿）。

