---
phase: 02-coverage-gate-90
plan: "03"
subsystem: [testing]
tags: [vitest, coverage, launcher, storage, sanitize]

requires:
  - phase: 02-coverage-gate-90/02-01
    provides: "test:coverage 可定位输出（Top deficits）"
provides:
  - "useLauncherSessionState.ts sanitize/restore/persist 分支覆盖补齐（branches ≥90%）"
affects: [coverage-gate]

tech-stack:
  added: []
  patterns: ["通过注入 storage/localStorage 覆盖 restore/write 分支", "构造异常 snapshot payload 覆盖 sanitize 分支"]

key-files:
  created: []
  modified:
    - src/composables/__tests__/launcher/useLauncherSessionState.test.ts

key-decisions:
  - "优先用“异常/边界 snapshot payload”驱动覆盖 sanitizeArg/sanitizeStagedCommand/normalizeSessionPayload 的分支。"
  - "通过覆盖 storage omitted/null/disabled/enabled toggle，补齐 resolveStorage/read/write 的分支。"

patterns-established:
  - "restore 用例按“版本/结构/过滤/净化”分组"

requirements-completed: [COV-01]

duration: 25min
completed: 2026-03-03
---

# Plan 02-03 Summary：useLauncherSessionState 分支覆盖补齐（COV-01 增量）

**补齐 `src/composables/launcher/useLauncherSessionState.ts` 的 restore/sanitize/persist 分支单测，使该文件 branches 覆盖率提升到 ≥90%。**

## 覆盖点（示例）

- restore：
  - version 不匹配/parsed payload 为 null/JSON 不合法 → 清理 storage
  - stagedCommands 非数组/混入非法项 → 安全过滤
  - stagingExpanded true/false 分支（drawer 打开与否）
- sanitize：
  - args 非数组、arg 非对象、key/label/token 非 string → 安全过滤
  - argValues 非对象、非 string 值 → 安全过滤
- persist：
  - enabled=false 初始不读
  - enabled 从 true→false 后停止写入
  - storage omitted 使用 `window.localStorage`；storage=null 不写入

## 验证

- `npm run test:coverage` 通过
- `useLauncherSessionState.ts`：`BRH/BRF = 78/82`（≈95.12% branches）

