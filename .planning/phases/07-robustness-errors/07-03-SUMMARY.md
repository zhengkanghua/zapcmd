---
phase: 07-robustness-errors
plan: "03"
subsystem: update
tags: [robustness, update, staged-errors, retry, vitest]
requires:
  - phase: 07-robustness-errors
    provides: "07-01/07-02 已建立失败反馈 reason + next-step 口径"
provides:
  - "更新失败按 check/download/install 阶段分类，不再混用单一错误语义"
  - "下载/安装失败后状态可恢复，可直接重试更新"
  - "About 区域可见分阶段失败原因与下一步动作"
affects: [ROB-03, robustness-errors, app-failure-events]
tech-stack:
  added: []
  patterns:
    - "StagedUpdateError：updateService 透传阶段，useUpdateManager 统一消费"
    - "错误文案按 stage 渲染：reason + next-step"
key-files:
  created: []
  modified:
    - src/features/update/types.ts
    - src/composables/update/useUpdateManager.ts
    - src/services/updateService.ts
    - src/components/settings/parts/SettingsAboutSection.vue
    - src/i18n/messages.ts
    - src/composables/__tests__/update/useUpdateManager.test.ts
    - src/services/__tests__/updateService.test.ts
    - src/__tests__/app.failure-events.test.ts
key-decisions:
  - "updateService 抛出带 stage 的错误对象，manager 仅做消费与状态机切换，避免重复判定逻辑。"
  - "downloadUpdate 允许从 download/install 错误态重试，但阻止 check 阶段错误直接进入下载。"
patterns-established:
  - "更新错误反馈必须包含 stage，避免 UI 层丢失上下文。"
  - "更新失败提示必须给出下一步动作，禁止仅展示技术错误。"
requirements-completed: [ROB-03]
duration: 30 min
completed: 2026-03-06
---

# Phase 07 Plan 03: Robustness Errors Summary

**更新链路已具备“分阶段可见 + 失败可恢复 + 启动非阻断”的稳定回归基线。**

## Performance

- **Duration:** 30 min
- **Started:** 2026-03-06T10:18:00+08:00
- **Completed:** 2026-03-06T10:35:55+08:00
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- 更新错误语义升级为 `check/download/install` 三阶段，并在 service→manager 链路完整透传。
- 下载/安装失败后可直接重试，不会把应用留在不可恢复状态。
- 设置页 About 区域按阶段展示失败原因与 next-step，用户可直接执行恢复动作。

## Task Commits

Each task was committed atomically:

1. **Task 1: 更新状态机分阶段错误化并保证失败后可重试** - `4762577` (feat)
2. **Task 2: About 区域展示阶段化失败提示与下一步动作** - `6f4f4dc` (feat)

**Plan metadata:** pending (will be recorded in this plan docs commit)

## Files Created/Modified

- `src/features/update/types.ts` - 增加 `UpdateFailureStage` 与 error `stage/version` 契约。
- `src/composables/update/useUpdateManager.ts` - 引入 staged error 消费、重试守卫与错误恢复路径。
- `src/services/updateService.ts` - 在 check/download/install 失败时抛出带阶段信息的错误。
- `src/composables/__tests__/update/useUpdateManager.test.ts` - 补齐阶段断言、check 阶段阻断与 reset 回归。
- `src/services/__tests__/updateService.test.ts` - 补齐 staged error、异常进度与 body/version 归一化分支覆盖。
- `src/components/settings/parts/SettingsAboutSection.vue` - 按 stage 渲染失败标题与下一步提示，并支持错误态重试下载。
- `src/i18n/messages.ts` - 增加 check/download/install 分阶段失败文案与 next-step。
- `src/__tests__/app.failure-events.test.ts` - 增加 About 区域 staged check 失败可见性断言。

## Decisions Made

- 失败阶段判定集中在 `updateService`，避免 UI/composable 层复制事件状态机。
- 错误态重试策略仅开放下载/安装场景，check 错误需先重新检查更新。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- 提交钩子首次因全局分支覆盖率 `89.98%` 失败；通过补齐 `updateService/useUpdateManager` 最小分支测试后恢复到 `90.44%`，门禁通过。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ROB-03 已闭合，Phase 07 三个计划的实现与回归已齐备，可进入 phase-level verification。

---
*Phase: 07-robustness-errors*
*Completed: 2026-03-06*

## Self-Check: PASSED

- FOUND: .planning/phases/07-robustness-errors/07-03-SUMMARY.md
- FOUND: 4762577
- FOUND: 6f4f4dc
