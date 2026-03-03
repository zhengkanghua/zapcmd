---
phase: 02-coverage-gate-90
plan: "02"
subsystem: [testing]
tags: [vitest, coverage, schema-guard, branches]

requires:
  - phase: 02-coverage-gate-90/02-01
    provides: "test:coverage 可定位输出（Top deficits）"
provides:
  - "schemaGuard.ts 分支覆盖显著提升（用于拉升全局 branches）"
affects: [coverage-gate]

tech-stack:
  added: []
  patterns: ["表驱动 invalid payload 用例（单分支触发、便于定位）"]

key-files:
  created: []
  modified:
    - src/features/commands/__tests__/schemaGuard.test.ts

key-decisions:
  - "用一个“完整合法 payload”做基线，再用表驱动最小破坏触发单个校验分支，避免一次用例命中多条分支导致噪音。"

patterns-established:
  - "invalid mutations：payload/meta/command/arg/prerequisite 分层分组"

requirements-completed: [COV-01]

duration: 25min
completed: 2026-03-03
---

# Plan 02-02 Summary：schemaGuard 分支覆盖补齐（COV-01 增量）

**为 `src/features/commands/schemaGuard.ts` 增加大量表驱动 invalid payload 测试，用最小破坏覆盖主要校验分支，使该文件 branches 覆盖率提升到 ~99%。**

## 覆盖点

- top-level：payload 类型、未知 key、commands 非数组/为空
- `_meta`：类型错误、localized text 结构异常、字段空值/类型错误
- command：未知 key、id/name/tags/category/platform/template/adminRequired 等基础字段校验分支
- args：key/label/type/required/default/placeholder/validation 分支（含 select options 规则）
- prerequisites：type/required/check/installHint/fallbackCommandId 等分支

## 验证

- `npm run test:coverage` 通过
- `schemaGuard.ts`：`BRH/BRF = 150/152`（≈98.68% branches）

