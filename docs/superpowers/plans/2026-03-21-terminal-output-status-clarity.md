# Terminal Output Status Clarity Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把终端提示统一收敛为轻量的 `run / exit N` contract，修复 `cmd/wt` 失败后仍显示 `finished` 的误导语义，同时保留原始命令 stdout/stderr。

**Architecture:** 仅在前端 payload 生成层 `src/composables/launcher/useTerminalExecution.ts` 改造提示文案，不改 Rust 终端拉起策略，也不拦截或包装命令原始报错。PowerShell / pwsh 继续依赖 `$LASTEXITCODE`，`cmd / wt` 改为在 payload 内开启 delayed expansion，通过 `!ERRORLEVEL!` 输出真实退出码。用 `useTerminalExecution` 单测锁定完整字符串 contract，再用 App 回归测试锁定 Settings 默认终端透传链路。

**Tech Stack:** TypeScript, Vue 3 composables, Vitest

**Design Doc:** `docs/superpowers/specs/2026-03-21-terminal-output-status-clarity-design.md`

---

## File Structure

### 修改

| 文件 | 职责 |
|---|---|
| `src/composables/launcher/useTerminalExecution.ts` | 生成新的单条/批量终端提示 payload，统一为 `run / exit N` |
| `src/composables/__tests__/launcher/useTerminalExecution.test.ts` | 锁定 `powershell/pwsh/cmd/wt` 的 payload contract |
| `src/__tests__/app.failure-events.test.ts` | 锁定 Settings 恢复出的 `wt` 默认终端仍会沿执行链下发新提示结构 |
| `docs/active_context.md` | 追加实现阶段摘要，方便后续会话接力 |

### 不改

| 文件 | 原因 |
|---|---|
| `src-tauri/src/terminal.rs` | 本轮只改 payload 文案，不改终端拉起策略 |
| `src/__tests__/app.core-path-regression.test.ts` | 现有回归已覆盖终端透传，不是本轮最直接受影响的断言面 |
| `src/composables/execution/useCommandExecution/helpers.ts` | 本轮不改 UI 反馈摘要，只改终端里的原位提示 |

---

## Chunk 1: 单条命令输出 Contract

### Task 1: 锁定单条 `run / exit N` 文案 contract

**Files:**
- Modify: `src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- Modify: `src/composables/launcher/useTerminalExecution.ts`

- [ ] **Step 1: 在 `useTerminalExecution.test.ts` 先改单条命令失败测试期望**

把现有两个单条用例改成新 contract：

```ts
it("runs command with selected terminal id", async () => {
  const run = vi.fn(async () => {});
  const terminal = ref("powershell");
  const execution = useTerminalExecution({
    commandExecutor: { run },
    defaultTerminal: terminal
  });

  await execution.runCommandInTerminal("echo hello");

  expect(run).toHaveBeenCalledWith({
    terminalId: "powershell",
    command:
      "Write-Host '[zapcmd][run] echo hello'; echo hello; Write-Host ('[zapcmd][exit ' + $LASTEXITCODE + '] echo hello')"
  });
});

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
      "setlocal EnableDelayedExpansion & echo [zapcmd][run] dir & dir & echo [zapcmd][exit !ERRORLEVEL!] dir"
  });
});
```

- [ ] **Step 2: 运行单测，确认按预期先失败**

Run: `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`
Expected: FAIL，旧实现仍输出 `executing:` / `finished`

- [ ] **Step 3: 在 `useTerminalExecution.ts` 实现单条命令最小改动**

只改 `buildSingleCommandPayload` 的 `powershell/pwsh` 与 `cmd/wt` 分支：

```ts
function buildSingleCommandPayload(terminalId: string, command: string): string {
  const hint = summarizeCommand(terminalId, command);
  if (isPowerShellTerminal(terminalId)) {
    const escapedHint = escapePowerShellSingleQuotedLiteral(hint);
    return `Write-Host '[zapcmd][run] ${escapedHint}'; ${command}; Write-Host ('[zapcmd][exit ' + $LASTEXITCODE + '] ${escapedHint}')`;
  }
  if (isCmdTerminal(terminalId)) {
    return `setlocal EnableDelayedExpansion & echo [zapcmd][run] ${hint} & ${command} & echo [zapcmd][exit !ERRORLEVEL!] ${hint}`;
  }
  return `echo "[zapcmd] executing: ${hint}"; ${command}; echo "[zapcmd] finished"`;
}
```

实现说明：

1. `cmd / wt` 必须用 `setlocal EnableDelayedExpansion` + `!ERRORLEVEL!`；
2. 不要改非 Windows fallback 分支，本轮范围只收口 Windows 终端；
3. 不要包装或吞掉命令自身 stderr/stdout。

- [ ] **Step 4: 重新运行单测，确认转绿**

Run: `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`
Expected: PASS

- [ ] **Step 5: 提交单条 contract 检查点**

```bash
git add src/composables/launcher/useTerminalExecution.ts src/composables/__tests__/launcher/useTerminalExecution.test.ts
git commit -m "fix(terminal):统一单条命令运行与退出提示"
```

---

## Chunk 2: 批量命令与链路回归

### Task 2: 锁定批量命令 `run / exit N` contract

**Files:**
- Modify: `src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- Modify: `src/composables/launcher/useTerminalExecution.ts`

- [ ] **Step 1: 在 `useTerminalExecution.test.ts` 先写批量命令失败测试**

把现有批量断言改成新 contract：

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
      "Write-Host '[zapcmd][1/2][run] echo hello'; echo hello; Write-Host ('[zapcmd][1/2][exit ' + $LASTEXITCODE + '] echo hello'); Write-Host '[zapcmd][2/2][run] git status'; git status; Write-Host ('[zapcmd][2/2][exit ' + $LASTEXITCODE + '] git status'); Write-Host ('[zapcmd][queue][exit ' + $LASTEXITCODE + '] total: 2')"
  });
});

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
      "setlocal EnableDelayedExpansion & echo [zapcmd][1/1][run] git status & git status & echo [zapcmd][1/1][exit !ERRORLEVEL!] git status & echo [zapcmd][queue][exit !ERRORLEVEL!] total: 1"
  });
});
```

- [ ] **Step 2: 运行单测，确认按预期先失败**

Run: `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`
Expected: FAIL，旧批量实现仍输出 `executing:` / `queue finished`

- [ ] **Step 3: 在 `useTerminalExecution.ts` 实现批量命令最小改动**

只改 `buildBatchCommandPayload` 的 `powershell/pwsh` 与 `cmd/wt` 分支：

```ts
if (isPowerShellTerminal(terminalId)) {
  const steps = normalized.map((command, index) => {
    const step = index + 1;
    const hint = escapePowerShellSingleQuotedLiteral(summarizeCommand(terminalId, command));
    return `Write-Host '[zapcmd][${step}/${total}][run] ${hint}'; ${command}; Write-Host ('[zapcmd][${step}/${total}][exit ' + $LASTEXITCODE + '] ${hint}')`;
  });
  return `${steps.join("; ")}; Write-Host ('[zapcmd][queue][exit ' + $LASTEXITCODE + '] total: ${total}')`;
}
if (isCmdTerminal(terminalId)) {
  const steps = normalized.map((command, index) => {
    const step = index + 1;
    const hint = summarizeCommand(terminalId, command);
    return `echo [zapcmd][${step}/${total}][run] ${hint} & ${command} & echo [zapcmd][${step}/${total}][exit !ERRORLEVEL!] ${hint}`;
  });
  return `setlocal EnableDelayedExpansion & ${steps.join(" & ")} & echo [zapcmd][queue][exit !ERRORLEVEL!] total: ${total}`;
}
```

实现说明：

1. 仍然只在提示前后插入标识，不要重排命令原始输出；
2. `cmd/wt` 的 queue 尾标也要复用 `!ERRORLEVEL!`；
3. 保持每次只向终端投递一次 payload 的 contract 不变。

- [ ] **Step 4: 重新运行单测，确认转绿**

Run: `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`
Expected: PASS

- [ ] **Step 5: 提交批量 contract 检查点**

```bash
git add src/composables/launcher/useTerminalExecution.ts src/composables/__tests__/launcher/useTerminalExecution.test.ts
git commit -m "fix(terminal):统一批量命令运行与退出提示"
```

### Task 3: 锁定 App 级默认终端链路仍会下发新提示结构

**Files:**
- Modify: `src/__tests__/app.failure-events.test.ts`

- [ ] **Step 1: 在 `app.failure-events.test.ts` 先改失败测试**

把当前只检查旧 `executing:` 的断言改为新结构：

```ts
expect(hoisted.runMock).toHaveBeenLastCalledWith(
  expect.objectContaining({
    terminalId: "wt",
    command: expect.stringContaining("[zapcmd][run]"),
  }),
);
const lastRequest = hoisted.runMock.mock.calls.at(-1)?.[0];
expect(lastRequest?.command ?? "").toContain("setlocal EnableDelayedExpansion");
expect(lastRequest?.command ?? "").toContain("[zapcmd][exit !ERRORLEVEL!]");
```

- [ ] **Step 2: 运行 App 定向回归，确认按预期先失败**

Run: `npm run test:run -- src/__tests__/app.failure-events.test.ts`
Expected: FAIL，仍在断言旧 `executing:` 结构

- [ ] **Step 3: 如果 Task 2 已完成，只保留必要测试改动**

这里不再改生产代码，只清理和对齐断言，确认 App 级链路跟随新 payload contract。

- [ ] **Step 4: 重新运行 App 定向回归**

Run: `npm run test:run -- src/__tests__/app.failure-events.test.ts`
Expected: PASS

- [ ] **Step 5: 提交链路回归检查点**

```bash
git add src/__tests__/app.failure-events.test.ts
git commit -m "test(app):锁定新终端状态提示沿执行链透传"
```

---

## Chunk 3: 收口验证与短期记忆

### Task 4: 更新短期记忆并完成 focused + 全量验证

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 在 `docs/active_context.md` 追加实现摘要**

补一条 200 字内摘要，说明：

1. Windows 终端提示统一为 `run / exit N`；
2. `cmd/wt` 已改为 delayed expansion 捕获真实退出码；
3. 原始 stdout/stderr 继续原样直出。

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

- [ ] **Step 4: 运行 Windows 手工 smoke**

在本机最少验证以下场景：

1. 默认终端=`wt`，执行 `cmd /c exit 7`
   - 预期看到 `[zapcmd][run] cmd /c exit 7`
   - 预期看到 `[zapcmd][exit 7] cmd /c exit 7`
2. 默认终端=`powershell` 或 `pwsh`，执行 `cmd /c exit 9`
   - 预期看到 `[zapcmd][run] cmd /c exit 9`
   - 预期看到 `[zapcmd][exit 9] cmd /c exit 9`
3. 默认终端=`wt`，执行一个会真实报错的命令（如 `docker ps` 或 `where definitely-not-a-real-binary`）
   - 预期原始报错正文仍然完整出现在 `run` 和 `exit N` 之间
   - 不应再出现误导性的 `[zapcmd] finished`

- [ ] **Step 5: 提交收口检查点**

```bash
git add docs/active_context.md
git commit -m "docs(context):记录终端状态提示收口进展"
```

---

## 执行备注

1. 本轮只改 Windows 相关终端提示分支，不顺手统一 macOS/Linux fallback。
2. `cmd/wt` 退出码捕获不能直接写 `%ERRORLEVEL%`，否则同一条链式命令里可能取不到执行后的值；必须使用 `setlocal EnableDelayedExpansion` + `!ERRORLEVEL!`。
3. 终端提示只做轻量状态说明，命令原始 stdout/stderr 必须保持原样直出。
4. 若 `npm run check:all` 因根目录残留 `.worktrees` 再次扫到其他工作树，请先清理工作树，再重跑门禁，不要忽略重复测试噪音。

Plan complete and saved to `docs/superpowers/plans/2026-03-21-terminal-output-status-clarity.md`. Ready to execute?
