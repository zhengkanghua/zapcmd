# Phase 6: 安全基线回归补齐 - Research

**Researched:** 2026-03-05
**Domain:** 前端安全执行链路回归（危险命令确认 + 参数注入拦截）
**Confidence:** HIGH

<user_constraints>
## User Constraints (from 06-CONTEXT.md)

### Locked Decisions
- 回归覆盖范围固定为单条执行 + 队列执行（Ctrl+Enter）两条路径。
- 取消确认必须覆盖 Esc 与点击遮罩（overlay background）。
- 需覆盖“绕过尝试”：确认框出现后重复触发执行热键，不得直接执行命令。
- 取消确认后保持队列与输入状态原状，不自动清空 staged queue 或参数输入。
- 注入“允许路径”至少覆盖 number 与 text 各 1 条样例。
- 注入“拦截路径”覆盖当前高风险符号集：`;`, `|`, `&`, `` ` ``, `<`, `>`, 换行, `$()`, `${}`。
- 注入“边界输入”优先锁定前后空白值（按 trim 后规则处理）。
- 队列任一项命中注入拦截时固定为整队阻断（fail-fast）。
- 失败提示断言粒度固定为 `execution.blocked` 前缀 + 原因片段。
- Phase 06 只锁“原因可见 + 不静默吞错”；更强下一步文案增强放到 Phase 7。
- `zh-CN` 与 `en-US` 都要有关键断言。
- 拦截场景必须同时断言：UI 错误反馈可见 + 实际执行函数未被调用。

### Claude's Discretion
- 测试分层比例（App 集成层 vs composable/unit 层）可按最小改动与稳定性平衡决定。
- 样例命令文本可调整，但需保持“允许/拦截/边界/绕过”意图稳定。

### Deferred Ideas (OUT OF SCOPE)
- blocked/validation 文案中“更强下一步操作指引”增强（放到 Phase 7）。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (from REQUIREMENTS.md) | Research Support |
|----|------------------------------------|------------------|
| SEC-01 | 危险命令确认与参数注入拦截逻辑具备回归测试覆盖（允许/拦截/确认三类路径） | 通过三层回归锁定：`commandSafety` 纯逻辑层、`useCommandExecution` 执行编排层、`App` 热键/弹层交互层；补齐绕过尝试与边界输入缺口。 |
</phase_requirements>

## 现状盘点（基于仓库真实代码）

### 安全判定核心
- `src/features/security/commandSafety.ts`
  - 注入拦截规则：`INJECTION_PATTERN = /(?:\\r|\\n|[|&`<>]|;\\s*|\\$\\(|\\$\\{)/`
  - 单命令：`checkSingleCommandSafety`
  - 队列：`checkQueueCommandSafety`（任一项失败即返回 blocked）
  - 危险确认理由：`dangerous/adminRequired + DANGEROUS_COMMAND_PATTERNS`

### 执行编排核心
- `src/composables/execution/useCommandExecution/actions.ts`
  - 单命令与队列均在执行前做安全检查
  - blocked 时统一走 `execution.blocked` 反馈并停止执行
  - 高风险命令触发 safety dialog，确认后才执行

### 热键与交互入口
- `src/features/hotkeys/windowKeydownHandlers/index.ts`
  - safety dialog 打开时：`Enter` 走确认、`Escape` 走取消、其它按键被拦截。

## 现有测试覆盖

### 已覆盖的关键点
- `src/features/security/__tests__/commandSafety.test.ts`
  - number/text 注入拦截、危险确认理由、queue blocked、pattern/options 等分支。
- `src/composables/__tests__/execution/useCommandExecution.test.ts`
  - 注入阻断不执行、单条/队列危险确认后执行。
- `src/__tests__/app.failure-events.test.ts`
  - 危险命令需要确认后执行；注入输入被拦截且显示错误反馈。
- `src/__tests__/app.hotkeys.test.ts`
  - 安全确认弹层 Esc/遮罩点击可取消。

## 缺口与风险（Phase 06 需要补齐）

1. **绕过尝试缺口**  
当前未显式回归“safety dialog 打开时再次触发执行热键（尤其 Ctrl+Enter）不能直通执行”。

2. **边界输入口径未成组锁定**  
已有注入拦截与校验测试，但“前后空白 trim 后允许/拦截”的成组用例不完整，容易在后续重构时退化。

3. **双语提示稳定性缺口**  
`execution.blocked` 与 `safety.validation.*` 已有中英文文案，但缺少明确的双语关键断言，存在单语通过、另一语种退化风险。

4. **不吞错口径需要更明确断言**  
需统一断言“错误反馈可见 + run 未调用”，防止仅有 UI 状态但执行仍发生。

## 推荐规划切片（给 planner 的可执行建议）

### 切片 A：安全判定与执行编排回归加固
- 目标：在 `commandSafety` + `useCommandExecution` 层补齐 allow/block/boundary/queue-fail-fast 的稳定样例。
- 主文件：
  - `src/features/security/__tests__/commandSafety.test.ts`
  - `src/composables/__tests__/execution/useCommandExecution.test.ts`
- 预期产出：纯逻辑与编排层回归矩阵完整，不依赖 UI 结构细节。

### 切片 B：App 热键/弹层与失败反馈口径加固
- 目标：补齐绕过尝试、取消后状态保持、双语 blocked 关键片段断言。
- 主文件：
  - `src/__tests__/app.failure-events.test.ts`
  - `src/__tests__/app.hotkeys.test.ts`
  - （必要时）`src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`
- 预期产出：用户可见行为层回归稳定，覆盖确认/取消/绕过与提示可见性。

## 计划阶段注意事项

- 优先新增测试，不在本 phase 做安全策略功能扩展（符合 Deferred Ideas）。
- 断言采用“关键片段 + 行为结果”模式，避免整句文案硬编码导致脆弱。
- 如果发现行为与锁定决策冲突，再做最小代码修正并补对应回归。

## Sources

### Primary
- `src/features/security/commandSafety.ts`
- `src/composables/execution/useCommandExecution/actions.ts`
- `src/features/hotkeys/windowKeydownHandlers/index.ts`
- `src/features/security/__tests__/commandSafety.test.ts`
- `src/composables/__tests__/execution/useCommandExecution.test.ts`
- `src/__tests__/app.failure-events.test.ts`
- `src/__tests__/app.hotkeys.test.ts`
- `.planning/phases/06-security-regression/06-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`

## RESEARCH COMPLETE
