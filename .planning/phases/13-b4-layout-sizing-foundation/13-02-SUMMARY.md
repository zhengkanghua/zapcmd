---
phase: 13-b4-layout-sizing-foundation
plan: "02"
subsystem: window-sizing
tags: [sizing, drag-strip, cap, stability]
provides:
  - content height 口径明确排除 `.shell-drag-strip`（`--ui-top-align-offset`）
  - measured/estimated 同口径且取较大值，减少时序导致的偶发裁切
affects: [phase-14]
tech-stack:
  added: []
  patterns:
    - 先在 JS 层抽象出 drag strip height，再以 content height cap（不含 drag strip）做 clamp
key-files:
  created:
    - .planning/phases/13-b4-layout-sizing-foundation/13-02-SUMMARY.md
  modified:
    - src/composables/launcher/useWindowSizing/calculation.ts
    - src/composables/launcher/useWindowSizing/model.ts
key-decisions:
  - cap clamp 以“内容高度 cap（不含 drag strip）”为基准，再加回 drag strip，避免 18px 漂移
patterns-established: []
requirements-completed: [SIZE-04]
duration: 4min
completed: 2026-03-08
---

# Phase 13 Plan 02: window sizing content height 口径 Summary

**window sizing 的“内容高度”口径统一排除顶部 drag strip，并在 cap 约束下保持稳定：cap 基于内容高度 clamp，再加回 drag strip；measured/estimated 同口径且取较大值减少偶发裁切。**

## Performance
- **Duration:** 4 min
- **Started:** 2026-03-08T00:58:40+08:00
- **Completed:** 2026-03-08T01:01:45+08:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `resolveWindowSize()` 统一引入 `dragStripHeight`：优先测量 `.shell-drag-strip`，无 DOM 时 fallback 到 `UI_TOP_ALIGN_OFFSET_PX_FALLBACK`（与 `--ui-top-align-offset` 对齐）。
- measured/estimated 两条路径统一改为先算 content height（排除 drag strip），再以 `contentHeightCap = windowHeightCap - dragStripHeight` 做 clamp，最终 height 再加回 drag strip。
- 当 measured/estimated 同时可用时取较大值，降低 “测量时序” 导致的偶发裁切风险。

## Verification Evidence
- `npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`
- `npm run check:all`

## Task Commits
1. **Task 1: 显式建模 drag strip 高度，并统一排除口径** - `c91bb93`
2. **Task 2: cap 约束下优先稳定的 sizing 取值策略（max measured/estimated）** - `1b66cab`
- Follow-up（门禁收敛，无行为变化）：`3633ca7`

## Files Created/Modified
- `src/composables/launcher/useWindowSizing/calculation.ts` - sizing/contentHeight 口径收敛与 cap clamp
- `src/composables/launcher/useWindowSizing/model.ts` - `UI_TOP_ALIGN_OFFSET_PX_FALLBACK` 常量

## Decisions & Deviations
- 为通过 `no-duplicate-imports` 门禁，将 `calculation.ts` 的 import 合并（`3633ca7`），不改变行为。

## Next Phase Readiness
- Phase 14 的 Review overlay sizing 可直接复用当前口径：drag strip 不再引入 18px 漂移。
