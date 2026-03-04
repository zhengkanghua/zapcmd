# Phase 3: 关键用户路径回归补齐 - Research

**日期:** 2026-03-04  
**用途:** 为 Phase 3 的计划拆解提供“可落地的实现信息、落点建议与常见坑”，供后续 PLAN.md 直接引用与执行。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

（以下内容从 `.planning/phases/03-core-path-regression/03-CONTEXT.md` 的 `## Implementation Decisions` 原样复制）

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

### Deferred Ideas (OUT OF SCOPE)

（以下内容从 `.planning/phases/03-core-path-regression/03-CONTEXT.md` 的 `## Deferred Ideas` 原样复制）

- 更完整的桌面端 E2E 覆盖与跨平台差异断言（后续 phase 逐步扩展）。
- 对内置命令模板变动的更强健抗脆弱策略（例如引入更稳定的命令标识/fixture 机制）。

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (from REQUIREMENTS.md) | Research Support |
|----|-----------------------------------|------------------|
| COV-03 | 关键用户路径（搜索 → 填参 → 入队 → 会话恢复 → 系统终端执行）具备回归测试覆盖（至少覆盖 1 条成功路径 + 关键失败分支） | 使用 `vitest + jsdom + @vue/test-utils` 挂载 `App.vue` 做集成回归；通过 mock `createCommandExecutor().run()` 覆盖“系统终端执行”成功/失败；通过 unmount/mount 验证 `useLauncherSessionState` 的会话恢复。 |

</phase_requirements>

## 标准技术栈（Standard Stack）

（来自 `package.json` / `vitest.config.ts`）

- 测试框架：`vitest`（jsdom 环境）
- 组件测试：`@vue/test-utils`
- 状态管理：`pinia`
- 覆盖率：`@vitest/coverage-v8`（v8 provider，阈值 90/90/90/90）

**信心等级：HIGH**（仓库内已有大量同风格 App 集成测试可复用）。

## 关键代码/测试落点（你需要先熟悉这些）

### 现有测试（直接可复用）

- `src/__tests__/app.hotkeys.test.ts`
  - 已覆盖：搜索、结果选择、参数弹层、入队、热键（含 `Ctrl+Enter` 触发队列执行）等交互回归。
  - 可直接复用：`waitForUi()`、`dispatchWindowKeydown()`、`focusSearchAndType()` 的写法与稳定选择器。
- `src/__tests__/app.failure-events.test.ts`
  - 已覆盖：mock `../services/commandExecutor`，验证 `run()` 调用与失败反馈、批量执行失败队列不丢失等。
  - 已覆盖：`LAUNCHER_SESSION_STORAGE_KEY` 的会话恢复（当前是“预写 localStorage 再 mount”的恢复用例）。
  - 适合落地 Phase 3：因为它已经把“可执行终端”抽象成 `runMock`，可以自然补齐成功/失败的关键链路用例。

### 会话恢复（入队/恢复的真实落点）

- `src/composables/launcher/useLauncherSessionState.ts`
  - 存储 Key：`LAUNCHER_SESSION_STORAGE_KEY = "zapcmd.session.launcher"`
  - 写入时机：`watch([stagedCommands, stagingExpanded, enabled], ..., { deep: true })`
  - 恢复时机：`useLauncherSessionState()` 初始化时读取 localStorage 并回填 `stagedCommands`

### 终端执行（为什么必须 mock）

- `src/services/commandExecutor.ts`
  - `isTauri() === false` 时会返回 `BrowserNoopCommandExecutor`，其 `run()` 会直接抛错：`t("execution.desktopOnly")`
  - 因此在 App 集成测试里，要覆盖“系统终端执行”，必须 mock `createCommandExecutor()`（而不是指望真实终端）

### 队列执行成功/失败的状态规则（断言依据）

- `src/composables/execution/useCommandExecution/actions.ts`
  - 成功：`clearStaging()`，并设置 success feedback
  - 失败：不会清空 staging；设置 error feedback（包含 `{reason}`）

**信心等级：HIGH**（规则由代码硬编码，且已有回归测试证明这些路径可被触达）。

## 推荐的 Phase 3 用例设计（可直接转成 PLAN 任务）

> 目标：用“最少但完整”的两条用例，把 COV-03 的成功链路 + 关键失败分支都覆盖，并且通过 unmount/mount 真实验证会话恢复。

### 1) 成功路径：全链路回归（搜索→填参→入队→重挂载恢复→Ctrl+Enter 执行→队列清空）

建议用“内置命令模板”作为载体：`查看容器日志`（`docker-logs`）

原因：
- 可通过搜索稳定命中（现有测试已在用）
- 必带参数弹层（满足“填参”）
- `dangerous=false`、`adminRequired=false`（避免安全确认弹层干扰关键路径）
- command 渲染中会包含输入参数，适合做“关键片段断言”

推荐断言（最小稳定口径）：
- `runMock` 被调用（至少 1 次）
- `runMock` 首次调用参数里：
  - `command` 包含输入的参数值（例如 `my-container`）
  - `terminalId`：Windows 下可断言为 `powershell`；非 Windows 平台建议只断言“非空字符串”（避免未来做平台默认终端切换时误报）
- UI 状态：
  - 执行前：`.staging-chip__count` 为 `"1"`
  - 执行后：`.staging-chip__count` 为 `"0"`（队列被清空）

重挂载（会话恢复）验证点：
- 在第一次 mount 并入队后，确保已写入 session snapshot（可选但更稳：断言 `localStorage.getItem(LAUNCHER_SESSION_STORAGE_KEY)` 非空）
- `unmount()` 旧 wrapper，再 `mount()` 新的 App
- 新 App 启动后：`.staging-chip__count` 仍为 `"1"`，且 `.staging-card code` 仍包含参数值（证明是“恢复回来的 staged command”）

### 2) 失败分支：终端执行失败（同链路，但 Ctrl+Enter 时 run 抛错，队列不丢失 + 错误可见）

与成功路径尽量复用同一条命令与同一条链路，只把 `runMock` 改成 reject：
- `runMock.mockRejectedValueOnce(new Error("terminal-unavailable"))`

推荐断言：
- `.execution-feedback--error` 文案包含 `"terminal-unavailable"`（只断言 reason 片段，避免 i18n 结构变动）
- `.staging-chip__count` 仍为 `"1"`（队列不丢失，便于用户重试/修改）
- `runMock` 被调用（确保确实走到“系统终端执行”的集成点）

**信心等级：HIGH**（已有“batch execute fails retains queue”的先例；只需把链路补齐到“填参+重挂载恢复”即可）。

## 代码组织建议（降低维护成本）

建议把 Phase 3 两条用例放在“专用回归文件”里，避免继续膨胀现有大文件：
- 新增：`src/__tests__/app.core-path-regression.test.ts`
- 复用/复制：`waitForUi()`、`dispatchWindowKeydown()`、`focusSearchAndType()`、Tauri mock、`commandExecutor` mock 的模式

如果更偏向“少文件改动”，也可以把两条用例追加到 `src/__tests__/app.failure-events.test.ts` 的同一 describe 下（它已经具备 `runMock` 与 session key 的上下文）。

## 不要手搓（Don't Hand-Roll）

- 不要把本阶段扩展为“桌面端 E2E 矩阵”（已明确 deferred）
- 不要新增新的 E2E 框架/依赖（本阶段主战场是 `vitest + jsdom`）
- 不要用“完整命令字符串严格匹配”做断言（容易被模板/i18n/默认参数变化打碎）
- 不要断言完整 success 文案（i18n/文案调整会引发脆弱）

## 常见坑与规避

- **忘记 mock `createCommandExecutor()`**：会走 `BrowserNoopCommandExecutor`，导致你以为“执行链路走通了”，实际只是在 web-preview 分支抛错。
- **重挂载前未等待 session 写入**：`useLauncherSessionState` 用 `watch(..., { deep: true })` 写 localStorage；入队后最好 `await waitForUi()` 再做 unmount，必要时可直接断言 localStorage key 存在。
- **同一个 wrapper 被重复 unmount**：如果在用“wrappers 数组 + afterEach 自动 unmount”的模式，测试中手动 unmount 时要同步把它从数组移除，避免 afterEach 再次 unmount 引发不确定行为。
- **跨平台断言过强**：未来如果把默认终端按平台切换（例如 mac/linux 默认 `bash`），只在 Windows 上断言 `terminalId === "powershell"` 更稳。
- **选择了 dangerous/adminRequired 命令**：会触发安全确认 overlay，让“关键路径回归”变成“安全分支回归”，本 phase 不需要。

## 本阶段验证建议（Planning 时可直接写进 Verification Criteria）

- `npm run test:run`（全量单测）
- `npm run test:run -- src/__tests__/app.core-path-regression.test.ts`（仅跑 Phase 3 回归用例）
- `npm run check:all`（合并门禁全绿，保证 CI 一致）

