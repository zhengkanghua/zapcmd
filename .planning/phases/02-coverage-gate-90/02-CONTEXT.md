# Phase 2: 覆盖率门禁提升到 90% - Context

**Gathered:** 2026-03-03  
**Status:** Ready for planning  
**Source:** 基于 `.planning/ROADMAP.md` / `.planning/REQUIREMENTS.md` + 现有 `vitest.config.ts` 与当前 coverage 报告（`npm run test:coverage`）

<domain>
## Phase Boundary

本 Phase 聚焦“把覆盖率门禁提升到 90% 并让失败可定位、可行动”：

1) 将 `vitest.config.ts` 的 coverage thresholds 提升到 **lines/functions/statements/branches 四项 ≥90%**  
2) 通过补齐关键分支单测，让覆盖率真实达标（**禁止靠大范围 exclude/关闭统计**“刷指标”）  
3) 覆盖率门禁失败时输出必须可定位（至少能指出：最差的若干文件、分支覆盖薄弱点、下一步怎么补）

不在本 Phase 引入新产品功能；只做必要的测试补齐与少量“为了可测/可定位”的小幅结构调整。

</domain>

<decisions>
## Implementation Decisions

### 覆盖率门禁目标

- 覆盖率门禁目标：`lines/functions/statements/branches` **全部 ≥90%**（对应 COV-01）。
- 覆盖率提升必须“真实覆盖”：优先通过 **新增/补齐单测** 提升分支覆盖率（对应 COV-03 的铺垫）。
- 禁止通过以下方式“刷指标”（对应 Success Criteria #3）：
  - 大范围排除目录/文件（尤其是 `src/` 下业务逻辑）
  - 关闭 branches 统计或改成不检查
  - 用无意义的“覆盖率填充测试”覆盖无关代码

### 可定位输出（覆盖率失败信息）

- `npm run test:coverage` 失败时必须给出“可行动”的定位信息（对应 COV-02）：
  - 总览：四项覆盖率的当前值 vs 90% 门槛
  - Top deficits：按“缺失分支数 / 缺失行数”列出 10–20 个最薄弱文件
  - 指引：提示如何打开 HTML 报告（`coverage/index.html`）或定位到具体文件

（允许新增一个轻量脚本读取 `coverage/lcov.info` 来输出上述 Top deficits。）

### 性能与稳定性约束

- `npm run test:coverage` 的运行时间应保持可接受（持续集成与本地均不应长期显著变慢）。
- 单测不得依赖真实 Tauri/桌面环境（必要时通过 mock/stub 隔离 IO/平台差异）。

### Claude's Discretion

- 在不违背“禁止刷指标”的前提下，允许对“确属非运行时代码”的文件做 **非常小范围** 的 exclude 调整（例如纯类型声明的文件），但必须：
  - 有充分理由（为什么它不应该计入覆盖率）
  - 不得成为逃避测试的手段
  - 调整后需在 RESEARCH/PLAN 中明确记录

</decisions>

<specifics>
## Current Baseline (2026-03-03)

来自 `npm run test:coverage` 生成的 `coverage/index.html`：

- Statements: **89.61%** (4979/5556)
- Branches: **82.06%** (1176/1433)
- Functions: **94.89%** (353/372)
- Lines: **89.61%** (4979/5556)

按 `coverage/lcov.info` 统计的“缺失分支数”Top 10（优先级从高到低）：

1) `src/features/commands/schemaGuard.ts` — miss 53 branches（48.54% branches）
2) `src/composables/settings/useCommandManagement.ts` — miss 26 branches（74.00% branches）
3) `src/composables/launcher/useLauncherSessionState.ts` — miss 18 branches（58.14% branches）
4) `src/stores/settingsStore.ts` — miss 17 branches（86.07% branches）
5) `src/composables/launcher/useCommandCatalog.ts` — miss 15 branches（78.26% branches）
6) `src/features/security/commandSafety.ts` — miss 10 branches（77.27% branches）
7) `src/composables/execution/useCommandExecution/helpers.ts` — miss 9 branches（64.00% branches）
8) `src/composables/launcher/useWindowSizing/calculation.ts` — miss 8 branches（61.90% branches）
9) `src/services/updateService.ts` — miss 8 branches（68.00% branches）
10) `src/composables/launcher/useLauncherDomBridge.ts` — miss 7 branches（81.08% branches）

</specifics>

<code_context>
## Existing Code Insights

- `vitest.config.ts` 当前 thresholds：lines/functions/statements 85，branches 80；coverage provider 为 `v8`；reporter 为 `text/html/lcov`。
- `package.json`：`npm run test:coverage` 作为 `npm run check:all` 的一部分（Phase 1 已把 `check:all` 固化为合并门禁）。
- 覆盖率 HTML 报告默认输出在 `coverage/`（入口：`coverage/index.html`）。

</code_context>

<deferred>
## Deferred Ideas

- 更完整的端到端回归扩展（更多关键用户链路的回归用例）——在 Phase 3 之后逐步推进
- Rust 侧模块覆盖率提升 —— Phase 4/5 处理

</deferred>

---

*Phase: 02-coverage-gate-90*  
*Context gathered: 2026-03-03*

