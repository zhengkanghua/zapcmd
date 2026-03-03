# Phase 2: 覆盖率门禁提升到 90% - Research

**日期:** 2026-03-03  
**用途:** 为 Phase 2 的计划拆解提供“可落地的实现信息、落点建议与常见坑”，供后续 PLAN.md 直接引用与执行。

<user_constraints>
## User Constraints（from CONTEXT.md）

（以下内容从 `.planning/phases/02-coverage-gate-90/02-CONTEXT.md` 摘要提取，用于约束 PLAN 的实现方向）

- 目标：将 `vitest.config.ts` 的 coverage thresholds 提升到 **lines/functions/statements/branches 四项 ≥90%**（COV-01）
- 禁止“刷指标”：禁止大范围 exclude、关闭 branches 检查等方式达到门槛
- 覆盖率失败要“可定位可行动”（COV-02）：总览 + Top deficits（按缺失分支/缺失行排序）+ 指引打开 HTML 报告
- 稳定性：单测不得依赖真实桌面/Tauri 环境；必要时 mock/stub 隔离 IO

</user_constraints>

## 现状快照（Baseline）

### 当前 coverage 配置

`vitest.config.ts`（coverage v8）：
- reporter：`text/html/lcov`
- include：
  - `src/App.vue`
  - `src/composables/**/*.ts`
  - `src/features/**/*.ts`
  - `src/services/**/*.ts`
  - `src/stores/**/*.ts`
- thresholds（当前）：lines/functions/statements 85，branches 80

### 当前覆盖率（2026-03-03）

来自 `npm run test:coverage` 生成的 `coverage/index.html`（All files）：
- Statements: **89.61%** (4979/5556)
- Branches: **82.06%** (1176/1433)
- Functions: **94.89%** (353/372)
- Lines: **89.61%** (4979/5556)

要达到 **≥90%**：
- lines/statements：还差约 **+22** 个覆盖行/语句（很小）
- branches：需要额外覆盖约 **+114** 个分支（主要工作量）

### 主要“分支缺口”热点（按缺失分支数排序）

根据 `coverage/lcov.info`（缺失分支数 Top）：
1) `src/features/commands/schemaGuard.ts` — miss 53 branches（纯校验逻辑，适合表驱动测试快速补齐）
2) `src/composables/settings/useCommandManagement.ts` — miss 26 branches（筛选/排序/issue 格式化分支多，现有单测覆盖不足）
3) `src/composables/launcher/useLauncherSessionState.ts` — miss 18 branches（sanitize/normalize 分支多，现有测试未覆盖异常/边界）
4) `src/stores/settingsStore.ts` — miss 17 branches（状态机/边界条件未覆盖）
5) `src/composables/launcher/useCommandCatalog.ts` — miss 15 branches
…（其余热点见 CONTEXT 的 baseline 列表）

> 结论：**只要优先把前 4 个热点的大部分缺口补上，就有较大概率把 branches 拉到 90% 附近。**

## 推荐落地策略（用于 PLAN.md 拆分）

### 1) 先解决“可定位输出”（COV-02），避免边改边盲飞

现状：`vitest` 的 `text` coverage 输出虽然包含 per-file 表，但在阈值提升后，失败时往往需要人工翻 HTML 报告找“哪几个文件/哪些分支”导致不过。

建议：新增一个轻量 Node 脚本（读取 `coverage/lcov.info` 或 `coverage/index.html`），在 `test:coverage` 结束后输出：
- 当前四项覆盖率
- 缺失分支 Top N（按缺失分支数降序）
- 缺失行 Top N（按缺失行数降序，可选）
- HTML 报告入口路径

关键点：
- **必须在 coverage 不达标时也能输出**（不要用简单的 `vitest ... && node ...` 造成失败时不输出）。
- 脚本保持跨平台（Node 实现），便于本地与 CI 一致。

### 2) 用“表驱动”策略集中补齐 branch coverage（核心工作量）

#### a) `schemaGuard.ts`（最高优先级）

特征：大量 `if (...) return false` 的校验分支，输入/输出都是纯数据（boolean），无需 mock。

建议测试策略：
- 以“1 个完全合法的 payload”为基线（现有已覆盖）
- 用表驱动生成一组 invalid payload，分别触发：
  - top-level keys 校验（多余 key / 缺少 commands / commands 为空）
  - `_meta` 各字段类型/空字符串/本地化文本对象异常
  - command 对象：id pattern、tags 去重/空、category/platform/shell 枚举、adminRequired 类型等
  - args：key pattern、label（localized/object）、type 枚举、select 必须有 options 且去重
  - prerequisites：type 枚举、fallbackCommandId pattern 等
- 注意：用“最小变更”触发分支，避免一个用例同时命中多个分支导致定位困难。

#### b) `useLauncherSessionState.ts`

特征：包含 sanitize/normalize 逻辑与 storage 读写，单测可通过注入 `storage` mock 完整覆盖。

建议补齐分支：
- `resolveStorage()`：传入 `storage: null` / `storage: undefined` 且无 window 的情况
- `readLauncherSession()`：version 不匹配、stagedCommands 不是数组、单条 stagedCommand 字段缺失、argValues 非对象、args 含非法项等
- `sanitizeArg()`：逐个字段缺失/空、options 过滤（含空串/非 string）
- `sanitizeStagedCommand()`：adminRequired/dangerous 分支

#### c) `useCommandManagement.ts`

特征：排序/筛选/格式化 issue 分支多；现有测试只有 1 条 happy path。

建议覆盖：
- `formatIssue()`：覆盖所有 code 分支（invalid-json / invalid-schema / duplicate-id / 默认分支）
- `compareRows()`：覆盖 sortBy=title/category/source/status/default 的比较路径
- 过滤器组合：source/status/override/issue/file/query 的组合（用小数据集逐个验证）
- `setFilteredCommandsEnabled()`：空列表提前返回、enabled true/false 两条路径

#### d) `settingsStore.ts`（按缺口优先补齐）

先用 coverage deficits（缺失分支/缺失行）定位到具体未覆盖区域，再补测试。通常优先补：
- 输入校验/边界条件（空值、重复值）
- hotkeys/command disabled ids/persistence 等分支

### 3) 最后再把 thresholds 提升到 90 并锁定

建议顺序：
1) 增强输出（COV-02）
2) 补齐热点分支单测直到整体接近 90%
3) 将 `vitest.config.ts` thresholds 一次性提升到 90/90/90/90，并让 `npm run test:coverage`、`npm run check:all` 在本地与 CI 通过

## 常见坑与规避

- **只盯 lines，branches 仍会卡住**：本 phase 的决定性指标是 branches（当前 82%，差距大）。
- **单测依赖真实环境**：涉及 window/localStorage 的逻辑必须通过依赖注入或条件分支覆盖；不要依赖真实浏览器/桌面壳。
- **排除文件的“合理性”**：如果必须 exclude（例如纯类型文件导致报告异常），必须在 PLAN 中记录理由与范围，且范围要最小。

## Phase Requirements 覆盖建议

| ID | 要求 | 建议在 Phase 2 的落点 |
|---|---|---|
| COV-01 | 覆盖率四项 ≥90% | `vitest.config.ts` thresholds + 针对热点文件补齐单测 |
| COV-02 | 覆盖率失败可定位可行动 | `test:coverage` 输出增强（Top deficits + 指引） |

