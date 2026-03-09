---
phase: 15-keyboard-focus-close-semantics
plan: "03"
subsystem: testing
tags: [regression, vitest, hotkeys, focus, esc, tab-trap]
provides:
  - App UI 回归：Tab 打开 Review 且 Review 内 Tab 不误关；Esc 在 query+Review 并存时优先关 Review
  - Unit 护栏：windowKeydownHandlers Tab 忽略 + useMainWindowShell Esc 顺序
  - Component 护栏：Review 打开后焦点进入 + Tab trap 不冒泡到 window
affects: [phase-16, animations, ui-refactor]
tech-stack:
  added: []
  patterns:
    - 回归断言优先使用 `panel.contains(document.activeElement)`，避免 brittle 的“第 N 个按钮”选择器
key-files:
  created:
    - .planning/phases/15-keyboard-focus-close-semantics/15-03-SUMMARY.md
  modified:
    - src/__tests__/app.hotkeys.test.ts
    - src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts
    - src/composables/__tests__/launcher/useMainWindowShell.test.ts
    - src/components/launcher/parts/__tests__/LauncherReviewOverlay.test.ts
requirements-completed: [TST-01]
duration: 1min
completed: 2026-03-09
---

# Phase 15 Plan 03: P0 自动化回归补齐 Summary

**把 Phase 15 的热键/焦点契约固化为可定位的 P0 自动化回归，防止 Tab/Esc 语义回归。**

## Performance
- **Duration:** 1 min
- **Started:** 2026-03-09T21:43:38+08:00
- **Completed:** 2026-03-09T21:44:43+08:00
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- App UI 热键回归对齐 B4：Tab 仅负责“搜索态打开 Review”，Review 内 Tab 走 focus trap；Esc 在 query+Review 同时存在时优先关闭 Review。
- Unit 护栏补齐：window handler 在 Review open + toggleQueue=Tab 时不再触发 toggleStaging；useMainWindowShell 锁定 Esc 顺序为 Review 优先。
- Review 组件级回归新增：打开后焦点进入 review-panel；plain Tab 不冒泡到 window 且焦点仍在 panel 内。

## Verification Evidence
- 受限环境说明：当前容器内 `vitest/vite` 依赖 `esbuild` 的 pipe 通信，触发 `spawn EPERM`，无法运行 `npm run test:* / check:all`。
- 本地验证：`npm run check:all`（需全绿）。

## Task Commits
1. **Task 1: 更新 App UI 热键回归（Tab 只负责打开；Review 内 Tab 为 focus trap；Esc 关闭 Review）** - `beed035`
2. **Task 2: 更新 unit 回归（windowKeydownHandlers / useMainWindowShell）** - `2faba8b`
3. **Task 3: 更新 Review 组件级回归：focus 进入 + Tab trap 不泄漏** - `e518170`

## Files Created/Modified
- `src/__tests__/app.hotkeys.test.ts` - Tab/Esc 语义回归对齐 B4
- `src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts` - Review open + Tab 不 toggleStaging 的护栏
- `src/composables/__tests__/launcher/useMainWindowShell.test.ts` - Esc 顺序护栏（Review 优先）
- `src/components/launcher/parts/__tests__/LauncherReviewOverlay.test.ts` - 焦点进入 + Tab trap 组件级护栏

## Issues Encountered
- 受限环境无法执行 `vitest`（`esbuild` pipe `spawn EPERM`），因此自动化门禁需开发者在本地复验。

## Next Phase Readiness
- Phase 15 的键盘/焦点/关闭语义已经被回归锁定；Phase 16 的动画/视觉迭代可在这些护栏之上推进。
