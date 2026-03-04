---
phase: 03-core-path-regression
plan: "01"
subsystem: [testing]
tags: [vitest, vue-test-utils, regression, hotkeys, session]

requires:
  - phase: 02-coverage-gate-90/02-05
    provides: "覆盖率门禁 90% 基线（check:all 全绿）"
provides:
  - "新增 App 集成级核心路径回归：搜索→填参→入队→会话恢复→Ctrl+Enter 执行→队列清空"
  - "新增终端执行失败分支回归：错误提示可见且队列不丢失（terminal-unavailable）"
affects: [launcher, terminal-execution, session, regression]

tech-stack:
  added: []
  patterns:
    - "最小稳定断言口径（不匹配完整命令/文案）"
    - "dispatchWindowKeydown 驱动热键回归"
    - "mock createCommandExecutor.run 覆盖成功/失败"

key-files:
  created:
    - src/__tests__/app.core-path-regression.test.ts
  modified: []

key-decisions:
  - "终端执行断言采用跨平台可降级策略：Windows 严格断言 terminalId='powershell'，其它平台仅断言非空。"
  - "仅断言关键片段（参数值/错误原因），避免完整命令字符串与成功文案导致脆弱回归。"

patterns-established:
  - "回归测试通过 mock @tauri-apps/... 保持 jsdom 环境稳定，并用 localStorage 校验会话快照写入/恢复。"

requirements-completed: [COV-03]

duration: 25min
completed: 2026-03-04
---

# Plan 03-01 Summary：关键用户路径回归补齐（COV-03）

**新增 1 条核心路径成功用例 + 1 条终端执行失败分支用例，覆盖会话恢复与 Ctrl+Enter 执行队列，并确保 `npm run check:all` 全绿。**

## 覆盖点

- 搜索命令：`查看容器日志`
- 成功链路：搜索 → 参数弹层填参并提交 → staged 入队 → unmount/mount 会话恢复 → Ctrl+Enter 执行队列 → 队列清空
- 失败分支：`run()` 抛错（terminal-unavailable）→ `.execution-feedback--error` 可见且包含原因片段 → staged 队列不丢失

## 验证

- `npm run test:run -- src/__tests__/app.core-path-regression.test.ts`
- `npm run test:run`
- `npm run check:all`

