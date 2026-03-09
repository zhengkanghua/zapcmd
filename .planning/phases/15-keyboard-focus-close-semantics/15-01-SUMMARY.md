---
phase: 15-keyboard-focus-close-semantics
plan: "01"
subsystem: hotkeys
tags: [hotkeys, esc, focus, review-overlay, b4]
provides:
  - toggleQueue/switchFocus 热键语义迁移到 Review overlay，并规避 Review 态 `Tab` 误触发关闭
  - Esc 分层后退顺序收口：Safety > Param > Review > clear query > hide
  - Review 打开态默认 focusZone=staging（按键分发进入 Review 交互层）
affects: [phase-15, focus-trap, regression]
tech-stack:
  added: []
  patterns:
    - Review open + toggleQueue=Tab 时，handler 层忽略 Tab（Tab 归还遍历）
    - Esc 优先级：Safety > Param > Review > Search/Hide
key-files:
  created:
    - .planning/phases/15-keyboard-focus-close-semantics/15-01-SUMMARY.md
  modified:
    - src/features/hotkeys/windowKeydownHandlers/main.ts
    - src/composables/launcher/useMainWindowShell.ts
    - src/composables/launcher/useStagingQueue/guards.ts
key-decisions:
  - "遵循 B4 文档：Review 打开时 Tab 必须作为遍历键，toggleQueue=Tab 不再关闭 Review"
patterns-established:
  - "Review 打开态一律以 focusZone=staging 作为按键分发基线"
requirements-completed: [KEY-01, KEY-04, KEY-05]
duration: 25min
completed: 2026-03-09
---

# Phase 15 Plan 01: 热键语义与 Esc 分层后退 Summary

**将 `toggleQueue/switchFocus/Esc` 的 B4 第一阶段契约落到代码层：搜索态进入 Review，Review 态 Tab 不误关，Esc 优先关闭 Review。**

## Performance
- **Duration:** 25 min
- **Started:** 2026-03-09T21:03:21+08:00
- **Completed:** 2026-03-09T21:28:35+08:00
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `toggleQueue` / `switchFocus` 的热键语义按 B4 Stage 1 收口：把“打开 Review”作为主语义，并在 Review open + toggleQueue=Tab 时显式忽略 Tab。
- `Esc` 分层后退顺序修正为 Review 优先（即使 query 非空也先关 Review），对齐 `Safety > Param > Review > Search/Hide`。
- Review 打开态默认进入 staging focusZone，保证 Review 内 ↑/↓/Delete 等队列热键可用，避免 Search zone 误处理。

## Verification Evidence
- 受限环境说明：当前容器内 `vitest/vite` 依赖 `esbuild` 的 pipe 通信，触发 `spawn EPERM`，无法运行 `npm run test:* / check:all`。
- 本地验证：`npm run check:all`（需全绿）。

## Task Commits
1. **Task 1: B4 热键迁移收口（toggleQueue/switchFocus → Review 打开语义；Review 态忽略 Tab 误触发）** - `e0ac2eb`
2. **Task 2: Esc 分层后退顺序修正（Review 优先于 query 清空）** - `4e91567`
3. **Task 3: Review 打开态 focusZone 基线对齐（opening/open → staging；closed → search）** - `fdf6626`

## Files Created/Modified
- `src/features/hotkeys/windowKeydownHandlers/main.ts` - 收口 toggleQueue/switchFocus 热键映射，并避免 Review 态把 Tab 误当成 toggleQueue
- `src/composables/launcher/useMainWindowShell.ts` - Esc 分层后退顺序调整为 Review 优先
- `src/composables/launcher/useStagingQueue/guards.ts` - Review opening/open 时默认 focusZone=staging

## Decisions Made
None - followed plan as specified.

## Deviations from Plan
None - plan executed as written.

## Issues Encountered
- 受限环境无法执行 `vitest`（`esbuild` pipe `spawn EPERM`），因此自动化门禁需开发者在本地复验。

## Next Phase Readiness
- Hotkey/Esc 的优先级底座已收口；Review 的“焦点进入 + Tab trap”与 P0 回归补齐由 Plan 15-02/15-03 覆盖。
