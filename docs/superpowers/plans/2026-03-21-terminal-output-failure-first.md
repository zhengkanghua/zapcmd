# Terminal Output Failure-First Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将终端提示从 `run / exit N` 收口为“失败优先、人话优先、code 可选”的 contract，成功静默、失败显式，并让批量队列按失败条数汇总结果。

**Architecture:** 仅修改前端 payload 生成层 [useTerminalExecution.ts](D:/own_projects/zapcmd/src/composables/launcher/useTerminalExecution.ts)，不改 Rust 终端拉起策略。PowerShell / pwsh 通过“先清空 `$LASTEXITCODE`、执行命令、同时捕获 `$?` 与 `$LASTEXITCODE`”区分“失败但无 code”和“失败且有 code”；`cmd/wt` 继续用 delayed expansion 读取真实 `ERRORLEVEL`，并在批量执行时独立统计失败条数生成队列尾标。

**Tech Stack:** TypeScript, Vue 3 composables, Vitest

**Design Doc:** `docs/superpowers/specs/2026-03-21-terminal-output-failure-first-design.md`

**Supersedes:** `docs/superpowers/plans/2026-03-21-terminal-output-status-clarity.md`

---

## File Structure

### 修改

| 文件 | 职责 |
|---|---|
| `src/composables/launcher/useTerminalExecution.ts` | 生成新的单条/批量 failure-first 终端 payload；PowerShell 失败判断拆成 `$?` + 可选 `$LASTEXITCODE`；`cmd/wt` 失败分支改为 `[failed]`，批量队列按失败条数汇总 |
| `src/composables/__tests__/launcher/useTerminalExecution.test.ts` | 锁定单条/批量 payload 字符串 contract，覆盖 PowerShell 条件失败提示、`cmd/wt` 条件失败提示、队列 `done/failed` 汇总 |
| `src/__tests__/app.failure-events.test.ts` | 锁定 Settings 同步出的 `wt` 默认终端仍沿执行链下发新的 failure-first payload 结构 |
| `docs/active_context.md` | 追加本阶段计划摘要，方便下一会话直接接力 |

### 不改

| 文件 | 原因 |
|---|---|
| `src-tauri/src/terminal.rs` | 本轮只调整前端 payload contract；保留上轮已修复的 `/V:ON` 启动策略 |
| `src/composables/execution/useCommandExecution/helpers.ts` | 本轮不改 UI 反馈或命令摘要规则，只改终端内注入的状态提示 |
| 其他 App / Launcher 高度与 Flow 相关文件 | 本轮只触及终端提示 contract，不顺手扩散到无关模块 |

---

## Chunk 1: 单条命令 Failure-First Contract

### Task 1: 锁定 PowerShell 单条命令的条件失败提示

**Files:**
- Modify: `src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- Modify: `src/composables/launcher/useTerminalExecution.ts`

- [ ] **Step 1: 先把 PowerShell 单条用例改成 failure-first 期望**

将现有单条 `powershell` 用例从无条件 `exit` 尾标改为“条件失败块”断言：

```ts
it("builds powershell single-command payload with conditional failed markers", async () => {
  const run = vi.fn(async () => {});
  const terminal = ref("powershell");
  const execution = useTerminalExecution({
    commandExecutor: { run },
    defaultTerminal: terminal
  });

  await execution.runCommandInTerminal("Get-Item missing");

  expect(run).toHaveBeenCalledWith({
    terminalId: "powershell",
    command:
      "Write-Host '[zapcmd][run] Get-Item missing'; $LASTEXITCODE = $null; Get-Item missing; $zapcmdSuccess = $?; $zapcmdCode = $LASTEXITCODE; if (-not $zapcmdSuccess) { if ($null -ne $zapcmdCode) { Write-Host ('[zapcmd][failed] Get-Item missing (code ' + $zapcmdCode + ')') } else { Write-Host '[zapcmd][failed] Get-Item missing' } }"
  });
});
```

目的：

1. 锁定单条 `powershell` 路径不再无条件输出 `exit N`；
2. 锁定本轮最关键的“失败但无 code”分支；
3. 明确要求先把 `$LASTEXITCODE` 重置为 `$null`，避免上一条 native command 的退出码污染当前 cmdlet 失败判断。

- [ ] **Step 2: 运行定向单测，确认按预期先失败**

Run: `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`

Expected: FAIL，当前实现仍然输出 `Write-Host ('[zapcmd][exit ' + $LASTEXITCODE + '] ...')`

- [ ] **Step 3: 在 `useTerminalExecution.ts` 为单条 PowerShell 路径实现最小条件失败块**

在 [useTerminalExecution.ts](D:/own_projects/zapcmd/src/composables/launcher/useTerminalExecution.ts) 中新增一个只负责拼接 PowerShell 条件失败提示的 helper，并让单条 PowerShell 分支先复用它：

```ts
function buildPowerShellFailureClause(label: string, hint: string): string {
  const escapedLabel = escapePowerShellSingleQuotedLiteral(label);
  const escapedHint = escapePowerShellSingleQuotedLiteral(hint);
  return [
    "$zapcmdSuccess = $?",
    "$zapcmdCode = $LASTEXITCODE",
    "if (-not $zapcmdSuccess) {",
    `if ($null -ne $zapcmdCode) { Write-Host ('${escapedLabel}${escapedHint} (code ' + $zapcmdCode + ')') }`,
    `else { Write-Host '${escapedLabel}${escapedHint}' }`,
    "}",
  ].join("; ");
}

function buildSingleCommandPayload(terminalId: string, command: string): string {
  const hint = summarizeCommand(terminalId, command);
  if (isPowerShellTerminal(terminalId)) {
    const escapedHint = escapePowerShellSingleQuotedLiteral(hint);
    return `Write-Host '[zapcmd][run] ${escapedHint}'; $LASTEXITCODE = $null; ${command}; ${buildPowerShellFailureClause("[zapcmd][failed] ", hint)}`;
  }
  // 其他分支保持原状，留给后续 Task
}
```

实现约束：

1. 不要用 `try/catch` 重新包装 PowerShell 错误文本；
2. 先清空 `$LASTEXITCODE`，再执行用户命令，再立即读取 `$?` 和 `$LASTEXITCODE`；
3. helper 只负责失败提示，不负责 `run` 头标，避免单条/批量职责混杂。

- [ ] **Step 4: 重新运行定向单测，确认转绿**

Run: `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`

Expected: PASS，且旧的 `[zapcmd][exit ...]` 断言已被 failure-first 结构替代

- [ ] **Step 5: 提交 PowerShell 单条 contract 检查点**

```bash
git add src/composables/launcher/useTerminalExecution.ts src/composables/__tests__/launcher/useTerminalExecution.test.ts
git commit -m "fix(terminal):收口单条 powershell 失败提示"
```

### Task 2: 锁定 `cmd/wt` 单条命令的条件失败提示

**Files:**
- Modify: `src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- Modify: `src/composables/launcher/useTerminalExecution.ts`
- Modify: `src/__tests__/app.failure-events.test.ts`

- [ ] **Step 1: 把单条 `cmd/wt` 用例改成“成功静默、失败显式”期望**

将现有 `reads latest terminal id on each invocation` 用例改成：

```ts
it("reads latest terminal id on each invocation", async () => {
  const run = vi.fn(async () => {});
  const terminal = ref("cmd");
  const execution = useTerminalExecution({
    commandExecutor: { run },
    defaultTerminal: terminal
  });

  terminal.value = "wt";
  await execution.runCommandInTerminal("dir");

  expect(run).toHaveBeenCalledWith({
    terminalId: "wt",
    command:
      "setlocal EnableDelayedExpansion & echo [zapcmd][run] dir & dir & set \"zapcmdCode=!ERRORLEVEL!\" & if not \"!zapcmdCode!\"==\"0\" echo [zapcmd][failed] dir (code !zapcmdCode!)"
  });
});
```

同时把 [app.failure-events.test.ts](D:/own_projects/zapcmd/src/__tests__/app.failure-events.test.ts) 中的链路断言改成 failure-first 结构：

```ts
expect(lastRequest?.command ?? "").toContain("setlocal EnableDelayedExpansion");
expect(lastRequest?.command ?? "").toContain("set \"zapcmdCode=!ERRORLEVEL!\"");
expect(lastRequest?.command ?? "").toContain("[zapcmd][failed]");
expect(lastRequest?.command ?? "").not.toContain("[zapcmd][exit");
```

- [ ] **Step 2: 运行两组定向测试，确认按预期先失败**

Run:

```bash
npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts
npm run test:run -- src/__tests__/app.failure-events.test.ts
```

Expected: FAIL，当前 payload 仍无条件输出 `[zapcmd][exit !ERRORLEVEL!]`

- [ ] **Step 3: 在 `useTerminalExecution.ts` 为单条 `cmd/wt` 路径实现条件失败块**

为 `cmd/wt` 增加单条 helper，并让单条 `isCmdTerminal` 分支改为先抓真实退出码、再按失败条件输出：

```ts
function buildCmdFailureClause(label: string, hint: string): string {
  return `set "zapcmdCode=!ERRORLEVEL!" & if not "!zapcmdCode!"=="0" echo ${label}${hint} (code !zapcmdCode!)`;
}

function buildSingleCommandPayload(terminalId: string, command: string): string {
  const hint = summarizeCommand(terminalId, command);
  if (isCmdTerminal(terminalId)) {
    return `setlocal EnableDelayedExpansion & echo [zapcmd][run] ${hint} & ${command} & ${buildCmdFailureClause("[zapcmd][failed] ", hint)}`;
  }
  // 其他分支保持原状
}
```

实现约束：

1. 必须在用户命令之后立刻 `set "zapcmdCode=!ERRORLEVEL!"`，不要直接在 `echo` 中复读 `!ERRORLEVEL!`；
2. 只在失败时打印 `[failed]`；
3. 保留上轮已存在的 `setlocal EnableDelayedExpansion`，不要回退到 `%ERRORLEVEL%`。

- [ ] **Step 4: 重新运行定向测试，确认全部转绿**

Run:

```bash
npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts
npm run test:run -- src/__tests__/app.failure-events.test.ts
```

Expected: PASS，App 级链路仍走 `wt`，但 payload 已从 `exit` 改成 `failed`

- [ ] **Step 5: 提交 `cmd/wt` 单条 contract 检查点**

```bash
git add src/composables/launcher/useTerminalExecution.ts src/composables/__tests__/launcher/useTerminalExecution.test.ts src/__tests__/app.failure-events.test.ts
git commit -m "fix(terminal):收口单条 cmd wt 失败提示"
```

---

## Chunk 2: 批量命令与队列汇总 Contract

### Task 3: 锁定 PowerShell 批量命令的失败统计与队列尾标

**Files:**
- Modify: `src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- Modify: `src/composables/launcher/useTerminalExecution.ts`

- [ ] **Step 1: 先把 PowerShell 批量用例改成“失败计数 + queue done/failed”期望**

把现有批量 `pwsh` 用例和两个 PowerShell 可读性用例统一改成新的 contract。至少保留以下一个完整精确断言：

```ts
it("runs staged commands in one batch command", async () => {
  const run = vi.fn(async () => {});
  const terminal = ref("pwsh");
  const execution = useTerminalExecution({
    commandExecutor: { run },
    defaultTerminal: terminal
  });

  await execution.runCommandsInTerminal(["echo hello", "git status"]);

  expect(run).toHaveBeenCalledWith({
    terminalId: "pwsh",
    command:
      "$zapcmdFailedCount = 0; Write-Host '[zapcmd][1/2][run] echo hello'; $LASTEXITCODE = $null; echo hello; $zapcmdSuccess = $?; $zapcmdCode = $LASTEXITCODE; if (-not $zapcmdSuccess) { $zapcmdFailedCount += 1; if ($null -ne $zapcmdCode) { Write-Host ('[zapcmd][1/2][failed] echo hello (code ' + $zapcmdCode + ')') } else { Write-Host '[zapcmd][1/2][failed] echo hello' } }; Write-Host '[zapcmd][2/2][run] git status'; $LASTEXITCODE = $null; git status; $zapcmdSuccess = $?; $zapcmdCode = $LASTEXITCODE; if (-not $zapcmdSuccess) { $zapcmdFailedCount += 1; if ($null -ne $zapcmdCode) { Write-Host ('[zapcmd][2/2][failed] git status (code ' + $zapcmdCode + ')') } else { Write-Host '[zapcmd][2/2][failed] git status' } }; if ($zapcmdFailedCount -eq 0) { Write-Host '[zapcmd][queue][done] total: 2' } else { Write-Host ('[zapcmd][queue][failed] total: 2, failed: ' + $zapcmdFailedCount) }"
  });
});
```

同步更新现有两个可读性用例：

1. `keeps pipe symbol in PowerShell queue hint for visibility`
2. `labels each queued command so output can be matched to each step`

新断言必须体现：

1. 保留 `|` 管道符在 hint 中的可读性；
2. 每一步都带 `[step/total][run]`；
3. 不再出现 `[step/total][exit ...]` 与 `[queue][exit ...]`。

- [ ] **Step 2: 运行定向单测，确认按预期先失败**

Run: `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`

Expected: FAIL，当前批量 PowerShell 仍是每步 `[exit ...]` + 队列 `[queue][exit ...]`

- [ ] **Step 3: 在 `useTerminalExecution.ts` 为批量 PowerShell 路径实现失败计数与队列汇总**

在 PowerShell 批量分支中：

1. 先初始化 `$zapcmdFailedCount = 0`
2. 每步开始前输出 `[run]`
3. 每步执行前清空 `$LASTEXITCODE`
4. 每步失败时先 `+= 1`，再走“有 code / 无 code”分支
5. 尾标改成 `[queue][done]` 或 `[queue][failed] total: N, failed: M`

建议实现形态：

```ts
function buildPowerShellFailureClause(
  label: string,
  hint: string,
  failedCountVar?: string
): string {
  const escapedLabel = escapePowerShellSingleQuotedLiteral(label);
  const escapedHint = escapePowerShellSingleQuotedLiteral(hint);
  const counter = failedCountVar ? `${failedCountVar} += 1; ` : "";
  return [
    "$zapcmdSuccess = $?",
    "$zapcmdCode = $LASTEXITCODE",
    "if (-not $zapcmdSuccess) {",
    `${counter}if ($null -ne $zapcmdCode) { Write-Host ('${escapedLabel}${escapedHint} (code ' + $zapcmdCode + ')') }`,
    `else { Write-Host '${escapedLabel}${escapedHint}' }`,
    "}",
  ].join("; ");
}
```

```ts
if (isPowerShellTerminal(terminalId)) {
  const steps = normalized.map((command, index) => {
    const step = index + 1;
    const hint = summarizeCommand(terminalId, command);
    return `Write-Host '[zapcmd][${step}/${total}][run] ${escapePowerShellSingleQuotedLiteral(hint)}'; $LASTEXITCODE = $null; ${command}; ${buildPowerShellFailureClause(`[zapcmd][${step}/${total}][failed] `, hint, "$zapcmdFailedCount")}`;
  });
  return `$zapcmdFailedCount = 0; ${steps.join("; ")}; if ($zapcmdFailedCount -eq 0) { Write-Host '[zapcmd][queue][done] total: ${total}' } else { Write-Host ('[zapcmd][queue][failed] total: ${total}, failed: ' + $zapcmdFailedCount) }`;
}
```

实现约束：

1. 失败计数必须独立于“最后一步的退出状态”；
2. 不要把队列尾标建立在 `$LASTEXITCODE` 上；
3. 保持每次批量执行只向终端投递一次 payload。

- [ ] **Step 4: 重新运行定向单测，确认转绿**

Run: `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`

Expected: PASS，且旧 `[queue][exit ...]` 结构已全部消失

- [ ] **Step 5: 提交 PowerShell 批量 contract 检查点**

```bash
git add src/composables/launcher/useTerminalExecution.ts src/composables/__tests__/launcher/useTerminalExecution.test.ts
git commit -m "fix(terminal):收口 powershell 批量失败汇总"
```

### Task 4: 锁定 `cmd/wt` 批量命令的失败统计与队列尾标

**Files:**
- Modify: `src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- Modify: `src/composables/launcher/useTerminalExecution.ts`

- [ ] **Step 1: 把批量 `wt` 用例改成 failure-first 队列期望**

将现有 `switches queue execution to the latest settings terminal before dispatch` 用例改成：

```ts
it("switches queue execution to the latest settings terminal before dispatch", async () => {
  const run = vi.fn(async () => {});
  const terminal = ref("powershell");
  const execution = useTerminalExecution({
    commandExecutor: { run },
    defaultTerminal: terminal
  });

  terminal.value = "wt";
  await execution.runCommandsInTerminal(["git status"]);

  expect(run).toHaveBeenCalledWith({
    terminalId: "wt",
    command:
      "setlocal EnableDelayedExpansion & set /a zapcmdFailedCount=0 & echo [zapcmd][1/1][run] git status & git status & set \"zapcmdCode=!ERRORLEVEL!\" & if not \"!zapcmdCode!\"==\"0\" (set /a zapcmdFailedCount+=1 & echo [zapcmd][1/1][failed] git status (code !zapcmdCode!)) & if \"!zapcmdFailedCount!\"==\"0\" (echo [zapcmd][queue][done] total: 1) else (echo [zapcmd][queue][failed] total: 1, failed: !zapcmdFailedCount!)"
  });
});
```

这个断言要锁住三个点：

1. 步骤失败时才输出 `[failed]`
2. 队列尾标基于 `zapcmdFailedCount`
3. 成功路径不再有 `[queue][exit ...]`

- [ ] **Step 2: 运行定向单测，确认按预期先失败**

Run: `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`

Expected: FAIL，当前 `wt` 批量用例仍输出 `[queue][exit !ERRORLEVEL!]`

- [ ] **Step 3: 在 `useTerminalExecution.ts` 为批量 `cmd/wt` 路径实现失败计数与队列汇总**

在 `cmd/wt` 批量分支中新增失败计数，并复用 `buildCmdFailureClause` 的计数版：

```ts
function buildCmdFailureClause(
  label: string,
  hint: string,
  failedCountExpression?: string
): string {
  const count = failedCountExpression ? `${failedCountExpression} & ` : "";
  return `set "zapcmdCode=!ERRORLEVEL!" & if not "!zapcmdCode!"=="0" (${count}echo ${label}${hint} (code !zapcmdCode!))`;
}
```

```ts
if (isCmdTerminal(terminalId)) {
  const steps = normalized.map((command, index) => {
    const step = index + 1;
    const hint = summarizeCommand(terminalId, command);
    return `echo [zapcmd][${step}/${total}][run] ${hint} & ${command} & ${buildCmdFailureClause(`[zapcmd][${step}/${total}][failed] `, hint, "set /a zapcmdFailedCount+=1")}`;
  });
  return `setlocal EnableDelayedExpansion & set /a zapcmdFailedCount=0 & ${steps.join(" & ")} & if "!zapcmdFailedCount!"=="0" (echo [zapcmd][queue][done] total: ${total}) else (echo [zapcmd][queue][failed] total: ${total}, failed: !zapcmdFailedCount!)`;
}
```

实现约束：

1. 失败计数变量必须在队列开始前初始化；
2. 先缓存 `!ERRORLEVEL!`，再决定是否累加失败计数；
3. 不要再输出任何 `[queue][exit ...]` 字样。

- [ ] **Step 4: 重新运行定向单测，确认转绿**

Run: `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`

Expected: PASS，`powershell/pwsh/cmd/wt` 的单条与批量 contract 全部对齐新设计

- [ ] **Step 5: 提交 `cmd/wt` 批量 contract 检查点**

```bash
git add src/composables/launcher/useTerminalExecution.ts src/composables/__tests__/launcher/useTerminalExecution.test.ts
git commit -m "fix(terminal):收口 cmd wt 批量失败汇总"
```

---

## Chunk 3: 收口验证与阶段交接

### Task 5: 更新短期记忆并完成 focused / 全量 / 手工验证

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 在 `docs/active_context.md` 追加实现摘要**

补一条 200 字内摘要，至少包含：

1. `useTerminalExecution` 已切换到 failure-first contract；
2. PowerShell 用 `$?` + 可选 `$LASTEXITCODE` 区分有无 code；
3. `cmd/wt` 批量队列按失败条数输出 `[queue][done]` / `[queue][failed]`。

- [ ] **Step 2: 运行 focused 回归**

Run:

```bash
npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts
npm run test:run -- src/__tests__/app.failure-events.test.ts
```

Expected: PASS

- [ ] **Step 3: 运行全量门禁**

Run: `npm run check:all`

Expected: PASS

- [ ] **Step 4: 运行 Windows 手工 smoke，验证真实运行时输出**

最少验证以下 5 组场景：

1. 默认终端=`wt`，执行 `cmd /c exit 7`
   - 预期看到 `[zapcmd][run] cmd /c exit 7`
   - 预期看到 `[zapcmd][failed] cmd /c exit 7 (code 7)`
2. 默认终端=`powershell` 或 `pwsh`，执行 `cmd /c exit 9`
   - 预期看到 `[zapcmd][run] cmd /c exit 9`
   - 预期看到 `[zapcmd][failed] cmd /c exit 9 (code 9)`
3. 默认终端=`powershell` 或 `pwsh`，执行 `Get-Item definitely-not-exists`
   - 预期看到原始 PowerShell 报错正文
   - 预期看到 `[zapcmd][failed] Get-Item definitely-not-exists`
   - 不应看到 `(code N)`
4. 批量队列包含一条失败、一条成功
   - 预期失败步骤显示 `[step/total][failed]`
   - 预期队列尾标显示 `[zapcmd][queue][failed] total: N, failed: 1`
   - 即使最后一步成功，也不应回退成 `[queue][done]`
5. 执行一条成功命令（如 `node -v` 或 `echo ok`）
   - 预期看到 `[zapcmd][run] ...`
   - 不应看到任何 `[zapcmd][failed] ...`

说明：

1. 这些运行时语义无法只靠 payload 字符串单测完全证明；
2. 特别是 PowerShell “失败但无 code” 分支与“成功静默”语义，必须用真实 smoke 覆盖。

- [ ] **Step 5: 提交收口检查点**

```bash
git add docs/active_context.md
git commit -m "docs(context):记录终端失败优先提示进展"
```

---

## 执行备注

1. 本轮只改 Windows 相关终端提示分支，不顺手统一非 Windows fallback。
2. PowerShell 路径的关键不是“拿到 code”，而是先拿到“是否失败”；`code` 只是可选附加信息。
3. `cmd/wt` 路径必须在命令后立即缓存 `!ERRORLEVEL!`，否则后续 `echo/if` 会污染真实退出码语义。
4. 批量队列尾标必须表达“整个队列的总体结果”，不能再复用最后一步命令状态。
5. 现有旧计划 [2026-03-21-terminal-output-status-clarity.md](D:/own_projects/zapcmd/docs/superpowers/plans/2026-03-21-terminal-output-status-clarity.md) 不再适用于下一轮执行，执行时应以本计划为准。

Plan complete and saved to `docs/superpowers/plans/2026-03-21-terminal-output-failure-first.md`. Ready to execute?
