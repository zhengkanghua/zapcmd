# Phase 6: 安全基线回归补齐 - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

把“危险命令确认 + 参数注入拦截”的关键路径变成稳定自动化回归，防止安全基线退化。仅讨论并固化该范围内的回归口径，不新增能力。

</domain>

<decisions>
## Implementation Decisions

### 危险命令确认路径覆盖
- 回归覆盖范围固定为：单条执行 + 队列执行（Ctrl+Enter）两条路径都要覆盖。
- “取消确认”固定覆盖 Esc 与点击遮罩（overlay background）两种交互。
- 需覆盖“绕过尝试”路径：确认框出现后重复触发执行热键，不得直接执行命令。
- 用户取消确认后，保持队列与输入状态原状，不自动清空 staged queue 或参数输入。

### 参数注入拦截口径
- “允许路径”至少覆盖 2 类参数：number 与 text 各 1 条样例。
- “拦截路径”覆盖当前高风险符号集：`;`, `|`, `&`, `` ` ``, `<`, `>`, 换行, `$()`, `${}`。
- “边界输入”优先锁定前后空白值场景（按 trim 后规则处理）。
- 队列任一命令命中注入拦截时，策略固定为整队阻断（fail-fast，不执行任何项）。

### 安全失败提示回归口径
- 提示断言粒度固定为：`execution.blocked` 前缀 + 具体原因片段（而非整句硬编码）。
- Phase 06 先锁“原因可见 + 不会静默吞错”；更强“下一步操作文案”增强延后到 Phase 7。
- 中英双语（`zh-CN` / `en-US`）都要有关键提示断言，避免单语通过另一语种退化。
- 拦截场景必须同时断言：UI 错误反馈可见 + 实际执行函数未被调用。

### Claude's Discretion
- 在不改变上述口径的前提下，测试分层可由实现阶段决定（App 集成层与 composable/unit 层的分工比例）。
- 具体测试数据可调整，但必须保持“允许/拦截/边界/绕过”四类意图不变。

</decisions>

<specifics>
## Specific Ideas

- 回归应继续沿用“用户可见行为优先”的断言思路：先保证安全行为（不执行）与可见反馈，再补深层实现细节断言。
- 对拦截场景，建议保留典型样例（如 `443; whoami`）以便快速识别回归意图。

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/security/commandSafety.ts`: 安全判定主入口（单命令/队列）与注入规则（`INJECTION_PATTERN`、validation 分支）。
- `src/composables/execution/useCommandExecution/actions.ts`: 执行前安全检查、拦截反馈、确认弹层触发逻辑。
- `src/components/launcher/parts/LauncherSafetyOverlay.vue`: 安全确认弹层交互（确认/取消、Esc/Tab 交互焦点）。
- `src/__tests__/app.failure-events.test.ts`: 已有“危险命令确认”“注入拦截”端到端式 UI 回归样例。
- `src/composables/__tests__/execution/useCommandExecution.test.ts` 与 `src/features/security/__tests__/commandSafety.test.ts`: composable 与纯逻辑层可复用断言基础。

### Established Patterns
- 前端测试体系以 Vitest + Vue Test Utils 为主，已有 App 集成测试与模块单测双层结构。
- 安全失败反馈统一经 `state.setExecutionFeedback("error", t("execution.blocked", ...))` 输出。
- 安全文案由 `src/i18n/messages.ts` 统一维护，已具备 `zh-CN` / `en-US` 对应键。

### Integration Points
- 主窗口快捷键与弹层交互入口：`src/composables/app/useAppWindowKeydown.ts`、`src/features/hotkeys/windowKeydownHandlers/index.ts`。
- 实际执行边界：`runCommandInTerminal` / `runCommandsInTerminal`（测试中可直接断言是否被调用）。
- 安全判定与执行流程衔接点：`createCommandExecutionActions()` 内 `requestSingleExecution()` 与 `executeStaged()`。

</code_context>

<deferred>
## Deferred Ideas

- 在 blocked/validation 提示中增加更明确“下一步怎么做”的引导文案（计划放入 Phase 7 的错误提示增强范围）。

</deferred>

---

*Phase: 06-security-regression*
*Context gathered: 2026-03-05*
