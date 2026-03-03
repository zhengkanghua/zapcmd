---
phase: 02-coverage-gate-90
plan: "04"
subsystem: [testing]
tags: [vitest, coverage, filtering, sorting, i18n]

requires:
  - phase: 02-coverage-gate-90/02-01
    provides: "test:coverage 可定位输出（Top deficits）"
provides:
  - "useCommandManagement.ts 的 formatIssue/compareRows/过滤器组合 分支覆盖补齐（branches ≥90%）"
affects: [coverage-gate]

tech-stack:
  added: []
  patterns: ["用小数据集覆盖排序/过滤组合", "issue code 分支全覆盖（含 commandId 兜底）"]

key-files:
  created: []
  modified:
    - src/composables/__tests__/settings/useCommandManagement.test.ts

key-decisions:
  - "按功能面分组测试：issues 格式化 / sortBy 分支 / filter 分支 / 分组与 file options / bulk enable/disable。"
  - "断言尽量只验证一个维度（例如仅验证某个 filter 生效），避免用例过大。"

patterns-established:
  - "fixture + refs 驱动 computed（通过修改 ref.value 覆盖分支）"

requirements-completed: [COV-01]

duration: 25min
completed: 2026-03-03
---

# Plan 02-04 Summary：useCommandManagement 分支覆盖补齐（COV-01 增量）

**扩展 `src/composables/settings/useCommandManagement.ts` 的单测覆盖 formatIssue/compareRows/多维过滤器与 bulk 操作分支，使该文件 branches 覆盖率提升到 ≥90%。**

## 覆盖点

- `formatIssue()`：invalid-json / invalid-schema / duplicate-id（含 commandId undefined 兜底）/ 默认分支（shell-ignored）
- `compareRows()`：sortBy=title/category/source/status/default
- `createFilteredRows()`：query/source/status/override/issue/fileFilter 分支组合
- `createSourceFileOptions()`：无 sourcePath 跳过、同路径 count 累加、排序
- `createCommandGroups()`：unknown source 分组 key/title 兜底、同组聚合
- `setFilteredCommandsEnabled()`：空结果提前 return、enabled=true/false 两条路径

## 验证

- `npm run test:coverage` 通过
- `useCommandManagement.ts`：`BRH/BRF = 112/118`（≈94.92% branches）

