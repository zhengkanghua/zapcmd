---
phase: 16-animation-visual-system
plan: "02"
subsystem: ui
tags: [animation, css, review-overlay, window-sizing, timing]
provides:
  - Review overlay 克制开合动效：opening dim 先出现→面板滑入；closing 面板先滑出→dim 消失（约 200ms）
  - state 计时常量与 CSS 动效同频（STAGING_TRANSITION_MS=200ms），降低 opening/closing 期间重复 resize 风险
affects: [phase-16, launcher, review-overlay, window-sizing, animation]
tech-stack:
  added: []
  patterns:
    - 以 `stagingDrawerState` 状态类驱动 overlay 动效；仅使用 `opacity/transform`，并在 opening 阶段给 panel 预留小延迟以让 resize 先手完成
key-files:
  created:
    - .planning/phases/16-animation-visual-system/16-02-SUMMARY.md
  modified:
    - src/styles.css
    - src/composables/launcher/useLauncherLayoutMetrics.ts
key-decisions:
  - Review overlay 使用 keyframes 内置 delay 表达“dim 先出现/后消失”，并保证总时长约 200ms（克制、无弹跳）
  - 将 `STAGING_TRANSITION_MS` 提升至 200ms，并同步 staging panel 进入/退出动画时长，避免 state 机与 CSS 脱频
patterns-established:
  - opening/closing 动效只做视觉层（opacity/transform）；窗口尺寸同步由 watcher 控制为“一次性 resize + 内部动画”
requirements-completed: [SIZE-03]
duration: 9min
completed: 2026-03-10
---

# Phase 16 Plan 02: Review 开合动效（~200ms） Summary

**Review overlay 增加克制开合动效（dim→滑入 / 滑出→dim），并将 state 计时与 CSS 动画统一到 200ms，以提升 Windows 下开合 resize 稳定性。**

## Performance
- **Duration:** 9 min
- **Started:** 2026-03-10T08:59:17+08:00
- **Completed:** 2026-03-10T09:08:34+08:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Review overlay：opening dim 先出现，panel 轻位移滑入；closing 先滑出 panel，再淡出 dim；全程仅动画 `opacity/transform`。
- Review 面板层级提升（更实的边框/表面层），贴近“专业桌面工具面板”基线。
- `STAGING_TRANSITION_MS` 与 CSS 动效同频到 `200ms`，避免 opening/closing 提前卸载或过早触发二次 resize。

## Verification Evidence
- `npm run test:run -- src/composables/__tests__/launcher/useLauncherWatchers.test.ts`（passed）

## Task Commits
1. **Task 1: Review overlay 开合动效落地（dim→panel / panel→dim），并遵循“先稳定尺寸再动画”** - `8df5e28`
2. **Task 2: 对齐计时常量到 ~200ms（state 机与 CSS 动效同频），避免 closing 提前卸载或 open 过早二次 resize** - `816c5e5`

## Files Created/Modified
- `src/styles.css` - 新增 review overlay opening/closing 动效（含 panel delay）并对齐 staging-panel 动画时长到 200ms
- `src/composables/launcher/useLauncherLayoutMetrics.ts` - `STAGING_TRANSITION_MS` 调整为 200ms

## Issues Encountered
- 沙箱内运行 Vitest 触发 Node 子进程 `spawn EPERM`，已通过“沙箱外同一测试命令”完成验证。

## Decisions & Deviations
None - plan executed exactly as written

## Next Phase Readiness
- `16-03-PLAN.md`（默认透明度 0.96 + 回归断言同步 + check:all 门禁）可继续执行；本计划已为其提供稳定的 Review 开合动效与计时基线。

## Self-Check: PASSED
- SUMMARY 文件存在：`.planning/phases/16-animation-visual-system/16-02-SUMMARY.md`
- 关键修改文件存在：`src/styles.css`、`src/composables/launcher/useLauncherLayoutMetrics.ts`
- Task commits 存在：`8df5e28`、`816c5e5`

