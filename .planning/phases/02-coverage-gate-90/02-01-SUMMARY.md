---
phase: 02-coverage-gate-90
plan: "01"
subsystem: [testing]
tags: [vitest, coverage, lcov, ci]

requires: []
provides:
  - "为 `npm run test:coverage` 增加覆盖率诊断输出（总览 + Top deficits + HTML 指引）"
affects: [coverage-gate, ci-gate, contributor-workflow]

tech-stack:
  added: []
  patterns: ["coverage 门禁失败仍输出诊断信息（不影响退出码）"]

key-files:
  created:
    - scripts/coverage/coverage-report.mjs
    - scripts/coverage/run-test-coverage.mjs
  modified:
    - .gitignore
    - package.json

key-decisions:
  - "优先解析 `coverage/index.html` 输出四项总览（含 Statements），用 `coverage/lcov.info` 计算 Top deficits。"
  - "`test:coverage` 入口改为 wrapper：保证 vitest 成功/失败都打印诊断，但退出码严格保持与 vitest 一致。"

patterns-established:
  - "覆盖率诊断脚本可独立运行：`node scripts/coverage/coverage-report.mjs`"

requirements-completed: [COV-02]

duration: 30min
completed: 2026-03-03
---

# Plan 02-01 Summary：覆盖率门禁失败可定位输出（COV-02）

**`npm run test:coverage` 现在在成功/失败两种情况下都会打印覆盖率总览、Top 缺失分支/缺失行，并提示 HTML 报告入口。**

## 主要改动

- `package.json`：将 `test:coverage` 改为 `node scripts/coverage/run-test-coverage.mjs`
- `.gitignore`：将 `coverage/` 改为仅忽略根目录 `/coverage/`，避免误忽略 `scripts/coverage/`（诊断脚本目录）
- `scripts/coverage/run-test-coverage.mjs`：运行 `vitest run --coverage` 后无论退出码如何都执行诊断脚本，最终退出码保持与 vitest 一致
- `scripts/coverage/coverage-report.mjs`：解析 `coverage/index.html` + `coverage/lcov.info`，输出总览与 Top deficits

## 验证方式

- 正常路径：`npm run test:coverage`（应看到诊断输出，退出码 0）
- 失败路径（本地临时把 thresholds 调高）：`npm run test:coverage`（应仍看到诊断输出，退出码非 0；随后恢复配置）

## 偏差与问题

无（按计划执行）。
