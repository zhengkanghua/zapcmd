---
phase: 02-coverage-gate-90
plan: "05"
subsystem: [testing]
tags: [vitest, coverage, thresholds, eslint, update]

requires:
  - phase: 02-coverage-gate-90/02-01
    provides: "test:coverage 可定位输出（Top deficits）"
  - phase: 02-coverage-gate-90/02-02
    provides: "schemaGuard 分支覆盖提升（COV-01 增量）"
  - phase: 02-coverage-gate-90/02-03
    provides: "useLauncherSessionState 分支覆盖提升（COV-01 增量）"
  - phase: 02-coverage-gate-90/02-04
    provides: "useCommandManagement 分支覆盖提升（COV-01 增量）"
provides:
  - "vitest coverage thresholds 提升到 90/90/90/90（COV-01）"
  - "补齐 settingsStore/commandSafety/useUpdateManager 等剩余薄弱点分支覆盖，并保持 check:all 全绿"
affects: [coverage-gate]

tech-stack:
  added: []
  patterns: ["Top deficits 驱动补齐缺口", "用 UnknownRecord/类型标注避免显式 any"]

key-files:
  created:
    - src/composables/__tests__/update/useUpdateManager.test.ts
  modified:
    - vitest.config.ts
    - src/stores/__tests__/settingsStore.test.ts
    - src/features/security/__tests__/commandSafety.test.ts
    - src/features/commands/__tests__/schemaGuard.test.ts
    - src/composables/__tests__/settings/useCommandManagement.test.ts

key-decisions:
  - "先让实际覆盖率达到 ≥90%，再一次性提升 thresholds，避免反复调阈值导致回归难定位。"
  - "不通过大范围 exclude“刷指标”，只补测试与必要的类型/校验修正。"

patterns-established:
  - "composable 通过 vi.mock 隔离外部依赖覆盖分支（例如 update manager）"

requirements-completed: [COV-01]

duration: 40min
completed: 2026-03-03
---

# Plan 02-05 Summary：收尾补齐缺口 + 覆盖率门禁提升到 90%（COV-01）

**补齐剩余薄弱点并将 `vitest` coverage thresholds 提升到 90/90/90/90，确保 `npm run check:all` 本地与 CI 均可通过。**

## 覆盖点

- `src/stores/settingsStore.ts`：迁移/归一化/边界分支（boolean/opacity/空 id/legacy 回退等）
- `src/features/security/commandSafety.ts`：options/pattern/queue blocked/sanitize summary 等分支用例补齐
- `src/composables/update/useUpdateManager.ts`：load/check/download/error/guard 分支补齐（通过 `vi.mock` 隔离外部依赖）
- 清理测试中的显式 `any`（满足 `eslint @typescript-eslint/no-explicit-any`，不改变测试语义）

## 门禁提升

- `vitest.config.ts`：thresholds 提升到 `lines/functions/statements/branches = 90`

## 验证

- `npm run test:coverage` 通过（All files：Branches ≈ 90.43%）
- `npm run check:all` 通过（lint/typecheck/test/build/cargo check 全绿）

