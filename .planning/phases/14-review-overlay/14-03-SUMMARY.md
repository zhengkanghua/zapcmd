---
phase: 14-review-overlay
plan: "03"
subsystem: testing
tags: [review-overlay, regression, vitest, vue-test-utils, pill]
provides:
  - App 级回归迁移：不再依赖旧 staging panel/chip，统一通过 queue summary pill + Review overlay 验证关键路径
  - 新增 Review overlay 组件级单测：锁定 hit-zones、dialog 语义、摘要/title、复制按钮与空态不自动关闭
  - 门禁收口：layout/session/test 口径与 B4 契约对齐，`npm run check:all` 全绿
affects: [phase-15, hotkeys, focus, regression]
tech-stack:
  added: []
  patterns:
    - 回归测试显式通过 `.queue-summary-pill` 打开 Review（禁止“入队自动打开 Review”）
    - 背景锁定以 `inert + aria-hidden` 作为可定位契约（测试层断言属性存在）
key-files:
  created:
    - .planning/phases/14-review-overlay/14-03-SUMMARY.md
    - src/components/launcher/parts/__tests__/LauncherReviewOverlay.test.ts
  modified:
    - src/__tests__/app.hotkeys.test.ts
    - src/__tests__/app.core-path-regression.test.ts
    - src/__tests__/app.failure-events.test.ts
    - src/components/launcher/parts/LauncherSearchPanel.vue
    - src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
    - src/composables/__tests__/execution/useCommandExecution.test.ts
    - src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
    - src/composables/__tests__/launcher/useLauncherSessionState.test.ts
key-decisions:
  - 回归以“pill 打开 Review”为唯一入口之一，避免测试把旧 staging 的自动打开行为写死为新契约
  - `inert` 绑定改为布尔值（避免 vue-tsc Booleanish 类型错误），同时保留 `aria-hidden` 作为可达性与锁定信号
patterns-established:
  - App 回归统一抽象 `read/expectQueueCount + openReviewByPill`，减少选择器与交互路径分散
requirements-completed: [SHELL-01, SHELL-02, SHELL-03, SIZE-02, REV-01, REV-02, REV-03, VIS-03]
duration: 16min
completed: 2026-03-09
---

# Phase 14 Plan 03: 回归测试迁移 Summary

**补齐并迁移自动化回归到 B4 Review overlay：App 级关键路径对齐 pill+overlay，新增组件语义回归，且 `npm run check:all` 全绿。**

## Performance
- **Duration:** 16 min
- **Started:** 2026-03-09T14:09:19+08:00
- **Completed:** 2026-03-09T14:25:03+08:00
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- App 级回归迁移：hotkeys/core-path/failure-events 不再依赖旧 staging chip/panel 选择器；入队后显式通过 pill 打开 Review，并断言摘要呈现、执行/失败不丢失、执行后队列清空等关键路径。
- 新增 `LauncherReviewOverlay` 组件级单测：锁定 overlay hit-zone、`role="dialog" aria-modal="true"`、内部滚动容器、长命令摘要+title、复制按钮 handler、空态不自动关闭等语义护栏。
- 门禁收口：同步 session/layout 与 B4 契约（恢复队列不自动打开 Review、collapsed width 不再占位、SearchPanel inert 绑定类型修正），并确保 `npm run check:all` 全绿。

## Verification Evidence
- `npm run test:run -- src/__tests__/app.hotkeys.test.ts`
- `npm run test:run -- src/__tests__/app.core-path-regression.test.ts`
- `npm run test:run -- src/__tests__/app.failure-events.test.ts`
- `npm run test:run -- src/components/launcher/parts/__tests__/LauncherReviewOverlay.test.ts`
- `npm run check:all`

## Task Commits
1. **Task 1: 迁移 App UI 回归测试：从 staging panel/chip 改为 pill + Review overlay** - `a48aa30`
2. **Task 2: 新增 Review overlay 组件级测试，锁定 hit-zones/空态/摘要策略等关键语义** - `7bb67a8`
3. **Task 3: 收口门禁：确保 check:all 全绿，并补齐 layout/session 相关单测的必要调整** - `a513af5`

## Files Created/Modified
- `src/__tests__/app.hotkeys.test.ts` - 热键回归对齐 Review overlay，并增加背景锁定（inert/aria-hidden）可定位断言
- `src/__tests__/app.core-path-regression.test.ts` - 核心链路改为 pill 打开 Review，并断言命令摘要/title
- `src/__tests__/app.failure-events.test.ts` - failure 回归迁移到 pill+Review，覆盖失败不丢失与拖拽排序
- `src/components/launcher/parts/__tests__/LauncherReviewOverlay.test.ts` - Review overlay 组件级语义回归（hit-zone/摘要/复制/空态）
- `src/composables/__tests__/launcher/useLauncherSessionState.test.ts` - 会话恢复只恢复队列，不自动打开 Review
- `src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts` - collapsed width=0 与 CSS 变量口径同步
- `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts` - 补齐 `reviewOpen` props，保持 Phase 13 floor-height 契约

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 修复 SearchPanel `inert` 的 vue-tsc 类型报错并同步断言**
- **Issue:** `:inert="props.reviewOpen ? '' : undefined"` 与 Vue `Booleanish` 类型不兼容，导致 `npm run check:all` 在 typecheck 阶段失败
- **Fix:** 改为布尔绑定并调整回归断言为“属性存在”
- **Committed in:** `a513af5`

**2. [Rule 3 - Blocking] 修正 useCommandExecution 回归期望：入队不再自动打开 Review**
- **Issue:** 旧单测期望 `openStagingDrawer()` 在入队时触发，违背 Phase 14 “禁止入队自动打开 Review” 契约
- **Fix:** 更新断言为不自动打开，并继续验证入队副作用（清理查询、触发反馈）
- **Committed in:** `a513af5`

## Next Phase Readiness
- Phase 14 的结构改动已拥有可定位的自动化回归护栏；Phase 15 键盘/焦点/关闭语义收口可以在稳定基线上推进。

## Self-Check: PASSED
- FOUND: `.planning/phases/14-review-overlay/14-03-SUMMARY.md`
- FOUND: `a48aa30` / `7bb67a8` / `a513af5`
