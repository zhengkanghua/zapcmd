# Phase 3: 关键用户路径回归补齐 - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

为关键用户路径（搜索 → 填参 → 入队 → 会话恢复 → 系统终端执行）补齐可回归的自动化用例：

- 至少 1 条“成功路径”覆盖上述核心链路
- 至少 1 条“关键失败分支”覆盖上述核心链路（本阶段锁定为：终端执行失败/终端不可用）

不引入新功能；不扩展为完整跨平台桌面 E2E 矩阵（后续 phase 再做）。

</domain>

<decisions>
## Implementation Decisions

### 回归用例形态（层级/框架）
- 以 **App 集成测试（Vue Test Utils + jsdom + vitest）** 为主完成 Phase 3 回归覆盖（而非扩展桌面 E2E）。
- 复用现有测试基础设施：通过 `dispatchWindowKeydown()` 驱动热键/交互；通过 mock `createCommandExecutor().run()` 断言“终端执行”被触发。

### 成功路径：验收口径与断言强度（最小稳定）
- 成功路径必须覆盖：**搜索 → 参数弹层填参并提交 → 入队（staging queue）→ 重挂载（unmount/mount）模拟重启以验证会话恢复 → 执行队列（Ctrl+Enter）**。
- 对“系统终端执行”的断言采用 **最小稳定口径**：
  - 断言 `run()` 被调用（包含 `terminalId` + `command` 关键片段匹配）
  - 断言队列在成功执行后被清空（不要求严格匹配完整命令字符串）
  - 不要求断言完整成功文案（避免 i18n/文案调整导致脆弱）

### 失败分支：终端执行失败（关键失败分支）
- 失败分支锁定为：队列执行时 `run()` 抛错（代表终端不可用/执行失败）。
- 断言口径：
  - 错误提示清晰可见（包含失败原因关键字/片段）
  - 队列不丢失（仍保留 staged commands，便于用户重试/修改）

### 跨平台策略（先 Windows 后扩展）
- 断言口径以 Windows/PowerShell 为基准（例如默认 `terminalId` 为 `powershell`）。
- CI 仍会跑多平台；非 Windows 平台优先保证“不断言过强导致误报”，必要时仅验证不崩溃与关键状态。

### Claude's Discretion
- 具体选择哪条内置命令作为成功链路载体（但必须可通过“搜索关键词”命中且包含参数弹层）。
- 成功/失败用例拆分方式（同文件新增用例 vs 新增专用回归文件），以可读性与稳定性为准。

</decisions>

<specifics>
## Specific Ideas

- 成功链路从“内置命令模板”进入：通过搜索关键词命中命令，打开参数弹层完成填参，再入队并执行。
- 命令断言不做完整字符串严格匹配：只断言关键片段（例如包含填入的参数值）+ `terminalId`。

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/__tests__/app.hotkeys.test.ts`: 已覆盖搜索、参数弹层、入队、队列热键等交互回归，可复用操作/断言方式。
- `src/__tests__/app.failure-events.test.ts`: 已 mock `../services/commandExecutor` 并对 `run()` 调用、错误提示、会话恢复快照做过回归断言，是 Phase 3 的直接落点。
- `src/composables/launcher/useLauncherSessionState.ts`: 会话恢复读写逻辑（`LAUNCHER_SESSION_STORAGE_KEY`），可用“重挂载”验证写入 + 读取路径。

### Established Patterns
- 终端执行在非 Tauri 环境默认会被 `BrowserNoopCommandExecutor` 拒绝（`src/services/commandExecutor.ts`），因此 App 级测试需要 mock `createCommandExecutor()` 以覆盖成功/失败分支。
- 队列执行成功会清空 staging（`src/composables/execution/useCommandExecution/actions.ts`）；失败则保留 staging 并设置 error feedback。

### Integration Points
- 核心交互从 `src/App.vue` → `useAppCompositionRoot()` 串起：搜索、参数提交、入队、会话恢复、执行与反馈都在同一组合根内完成，适合做“关键路径回归”。

</code_context>

<deferred>
## Deferred Ideas

- 更完整的桌面端 E2E 覆盖与跨平台差异断言（后续 phase 逐步扩展）。
- 对内置命令模板变动的更强健抗脆弱策略（例如引入更稳定的命令标识/fixture 机制）。

</deferred>

---

*Phase: 03-core-path-regression*
*Context gathered: 2026-03-04*
