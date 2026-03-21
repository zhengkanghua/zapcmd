# Windows 终端会话策略 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Windows 下命令执行严格跟随 Settings 默认终端，并实现 `wt` 固定窗口复用、`powershell/pwsh/cmd` 强制新开独立控制台，确保 `tauri:dev` 不再复用 VSCode 宿主控制台。

**Architecture:** 前端继续只传 `terminalId + command`，不承担任何终端会话判断；Rust 端在 `src-tauri/src/terminal.rs` 新增 Windows 终端策略层，用纯数据的 launch plan 锁定 `wt` 固定窗口 ID 和传统控制台的新控制台创建标志，再由现有 `run_command_in_terminal` 统一调度。测试分成 Rust Windows contract、TypeScript 默认终端 contract 和 Windows 手工验收三层。

**Tech Stack:** Rust (Tauri 2.x, std::process::Command, Windows CommandExt), TypeScript (Vue 3 composables), Vitest

**设计文档:** `docs/superpowers/specs/2026-03-21-windows-terminal-session-strategy-design.md`

---

## 文件结构

### 修改

| 文件 | 职责 |
|---|---|
| `src-tauri/src/terminal.rs` | 引入 Windows 终端 launch plan、固定 `wt` 窗口 ID、传统控制台新控制台创建标志 |
| `src-tauri/src/terminal/tests_exec.rs` | Rust Windows contract 测试，锁定 `wt` 参数和传统控制台策略 |
| `src/composables/__tests__/launcher/useTerminalExecution.test.ts` | 锁定前端仍然每次读取最新 `defaultTerminal`，不写死终端类型 |
| `src/__tests__/app.core-path-regression.test.ts` | 锁定从 Settings 恢复出的默认终端会沿执行链传到 `commandExecutor.run` |
| `README.md` | 补充 Windows 终端新开/复用行为说明 |
| `README.zh-CN.md` | 补充 Windows 终端新开/复用行为说明（中文） |
| `docs/active_context.md` | 补充本轮计划摘要，便于后续会话接力 |

### 不改

| 文件 | 原因 |
|---|---|
| `src/services/commandExecutor.ts` | 继续只透传 `terminalId + command`，不增加策略逻辑 |
| `src/composables/launcher/useTerminalExecution.ts` | 现有“读取默认终端并拼装 payload”的职责已经正确，只需用测试锁定 contract |
| `src/features/security/commandSafety.ts` | 本轮明确不处理 `adminRequired` 真提权 |

---

## Chunk 1: Rust Windows 终端策略

### Task 1: 先写 Rust 失败测试，锁定新的 Windows launch plan contract

**Files:**
- Modify: `src-tauri/src/terminal/tests_exec.rs`
- Modify: `src-tauri/src/terminal.rs`

- [ ] **Step 1: 在 `terminal.rs` 预留 Windows launch plan 的公开测试入口**

在 Windows 分支新增以下占位定义，先保证测试可以引用：

```rust
#[cfg(target_os = "windows")]
pub(crate) const ZAPCMD_WT_WINDOW_ID: &str = "zapcmd-main-terminal";

#[cfg(target_os = "windows")]
pub(crate) struct WindowsLaunchPlan {
    pub program: String,
    pub args: Vec<String>,
    pub creation_flags: u32,
}

#[cfg(target_os = "windows")]
fn build_windows_launch_plan(_terminal_id: &str, _command: &str) -> WindowsLaunchPlan {
    todo!("implemented in Task 2")
}
```

- [ ] **Step 2: 在 `tests_exec.rs` 先写失败测试**

新增 Windows 测试，锁定以下 contract：

```rust
#[test]
fn build_windows_wt_launch_plan_reuses_managed_window() {
    let plan = build_windows_launch_plan("wt", "echo 1");
    assert_eq!(plan.program, "wt");
    assert_eq!(
        plan.args,
        vec![
            "-w".to_string(),
            ZAPCMD_WT_WINDOW_ID.to_string(),
            "new-tab".to_string(),
            "cmd".to_string(),
            "/K".to_string(),
            "echo 1".to_string(),
        ]
    );
    assert_eq!(plan.creation_flags, 0);
}

#[test]
fn build_windows_cmd_launch_plan_forces_new_console() {
    let plan = build_windows_launch_plan("cmd", "echo 1");
    assert_eq!(plan.program, "cmd");
    assert_eq!(plan.args, vec!["/K".to_string(), "echo 1".to_string()]);
    assert_eq!(plan.creation_flags, CREATE_NEW_CONSOLE);
}

#[test]
fn build_windows_pwsh_launch_plan_forces_new_console() {
    let plan = build_windows_launch_plan("pwsh", "echo 1");
    assert_eq!(plan.program, "pwsh");
    assert_eq!(plan.args, vec!["-NoExit".to_string(), "-Command".to_string(), "echo 1".to_string()]);
    assert_eq!(plan.creation_flags, CREATE_NEW_CONSOLE);
}

#[test]
fn build_windows_default_launch_plan_falls_back_to_powershell_new_console() {
    let plan = build_windows_launch_plan("something-else", "echo 1");
    assert_eq!(plan.program, "powershell");
    assert_eq!(plan.args, vec!["-NoExit".to_string(), "-Command".to_string(), "echo 1".to_string()]);
    assert_eq!(plan.creation_flags, CREATE_NEW_CONSOLE);
}
```

- [ ] **Step 3: 运行 Rust 定向测试，确认失败**

Run: `cargo test --manifest-path src-tauri/Cargo.toml tests_exec -- --nocapture`
Expected: FAIL，提示 `todo!` 或 launch plan contract 不满足

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/terminal.rs src-tauri/src/terminal/tests_exec.rs
git commit -m "test(terminal):锁定 Windows 终端会话策略 contract"
```

---

### Task 2: 实现 Windows launch plan，并把 `run_command_windows` 改为按策略启动

**Files:**
- Modify: `src-tauri/src/terminal.rs`
- Modify: `src-tauri/src/terminal/tests_exec.rs`

- [ ] **Step 1: 在 `terminal.rs` 实现纯数据 launch plan**

在 Windows 分支补充常量并实现：

```rust
#[cfg(target_os = "windows")]
const CREATE_NEW_CONSOLE: u32 = 0x0000_0010;

#[cfg(target_os = "windows")]
fn build_windows_launch_plan(terminal_id: &str, command: &str) -> WindowsLaunchPlan {
    match terminal_id {
        "wt" => WindowsLaunchPlan {
            program: "wt".to_string(),
            args: vec![
                "-w".to_string(),
                ZAPCMD_WT_WINDOW_ID.to_string(),
                "new-tab".to_string(),
                "cmd".to_string(),
                "/K".to_string(),
                command.to_string(),
            ],
            creation_flags: 0,
        },
        "cmd" => WindowsLaunchPlan {
            program: "cmd".to_string(),
            args: vec!["/K".to_string(), command.to_string()],
            creation_flags: CREATE_NEW_CONSOLE,
        },
        "pwsh" => WindowsLaunchPlan {
            program: "pwsh".to_string(),
            args: vec!["-NoExit".to_string(), "-Command".to_string(), command.to_string()],
            creation_flags: CREATE_NEW_CONSOLE,
        },
        _ => WindowsLaunchPlan {
            program: "powershell".to_string(),
            args: vec!["-NoExit".to_string(), "-Command".to_string(), command.to_string()],
            creation_flags: CREATE_NEW_CONSOLE,
        },
    }
}
```

- [ ] **Step 2: 新增 `build_process_from_windows_launch_plan` 辅助函数**

避免继续把测试绑死在 `ProcessCommand` 上，新增：

```rust
#[cfg(target_os = "windows")]
fn build_process_from_windows_launch_plan(plan: &WindowsLaunchPlan) -> ProcessCommand {
    let mut process = ProcessCommand::new(plan.program.as_str());
    process.args(plan.args.iter().map(|arg| arg.as_str()));
    if plan.creation_flags != 0 {
        process.creation_flags(plan.creation_flags);
    }
    process
}
```

- [ ] **Step 3: 用 launch plan 重写 `build_command_windows` / `run_command_windows`**

将现有 Windows 分支改为：

```rust
#[cfg(target_os = "windows")]
fn build_command_windows(terminal_id: &str, command: &str) -> ProcessCommand {
    let plan = build_windows_launch_plan(terminal_id, command);
    build_process_from_windows_launch_plan(&plan)
}
```

`run_command_windows` 保持统一出口：

```rust
#[cfg(target_os = "windows")]
fn run_command_windows(terminal_id: &str, command: &str) -> Result<(), String> {
    let mut cmd = build_command_windows(terminal_id, command);
    spawn_and_forget(&mut cmd)
}
```

- [ ] **Step 4: 运行 Rust 定向测试，确认通过**

Run: `cargo test --manifest-path src-tauri/Cargo.toml tests_exec -- --nocapture`
Expected: PASS，Windows contract 全绿

- [ ] **Step 5: 提交**

```bash
git add src-tauri/src/terminal.rs src-tauri/src/terminal/tests_exec.rs
git commit -m "feat(terminal):新增 Windows 终端会话策略"
```

---

### Task 3: 补一个 Rust 回归，锁定旧接口 `run_command_in_terminal` 仍然不变

**Files:**
- Modify: `src-tauri/src/terminal/tests_exec.rs`

- [ ] **Step 1: 新增接口稳定性测试**

补一条测试，确认空白命令仍被 `sanitize_command` 拦截、`run_command_in_terminal` 签名与返回语义不变：

```rust
#[test]
fn run_command_in_terminal_keeps_rejecting_blank_input_after_strategy_refactor() {
    assert!(run_command_in_terminal("wt".to_string(), "   ".to_string()).is_err());
}
```

- [ ] **Step 2: 运行 Rust 定向测试**

Run: `cargo test --manifest-path src-tauri/Cargo.toml tests_exec -- --nocapture`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src-tauri/src/terminal/tests_exec.rs
git commit -m "test(terminal):补充终端策略重构接口回归"
```

---

## Chunk 2: 前端 contract 回归

### Task 4: 锁定 `useTerminalExecution` 仍然每次读取最新 Settings 默认终端

**Files:**
- Modify: `src/composables/__tests__/launcher/useTerminalExecution.test.ts`

- [ ] **Step 1: 先补一条 `wt` 切换后的回归测试**

新增测试：

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
    command: "echo [zapcmd] [1/1] executing: git status & git status & echo [zapcmd] [1/1] finished & echo [zapcmd] queue finished, total: 1"
  });
});
```

- [ ] **Step 2: 运行定向 Vitest**

Run: `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`
Expected: PASS；若失败则说明前端 contract 被破坏

- [ ] **Step 3: 提交**

```bash
git add src/composables/__tests__/launcher/useTerminalExecution.test.ts
git commit -m "test(launcher):锁定默认终端切换后的执行 contract"
```

---

### Task 5: 锁定 App 级执行链会把 Settings 恢复出来的默认终端透传给执行器

**Files:**
- Modify: `src/__tests__/app.core-path-regression.test.ts`

- [ ] **Step 1: 先补一条 `wt` 恢复态执行测试**

新增用例，模拟 localStorage 里保存 `defaultTerminal: "wt"`，然后完成“搜索 -> 入队 -> 执行”，断言：

```ts
expect(request?.terminalId).toBe("wt");
```

建议复用现有 `buildSnapshot` / `mountApp` / `openReviewByPill` 辅助函数，不额外造新 harness。

- [ ] **Step 2: 运行定向 Vitest**

Run: `npm run test:run -- src/__tests__/app.core-path-regression.test.ts`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/__tests__/app.core-path-regression.test.ts
git commit -m "test(app):锁定默认终端设置沿执行链透传"
```

---

## Chunk 3: 文档、短期记忆与验证收口

### Task 6: 更新 README / README.zh-CN，写清新的 Windows 终端行为

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`

- [ ] **Step 1: 在桌面能力说明附近补充行为说明**

在 `tauri:dev` 说明附近新增简短段落：

```md
On Windows, command execution follows the terminal selected in Settings.
`wt` reuses a ZapCmd-managed terminal window via a fixed window id.
`powershell`, `pwsh`, and `cmd` always open a new standalone console window.
This behavior applies in both `tauri:dev` and packaged desktop runs.
```

中文版同步：

```md
在 Windows 上，命令执行始终跟随 Settings 中选择的默认终端。
`wt` 会复用 ZapCmd 管理的固定终端窗口；
`powershell`、`pwsh`、`cmd` 会始终新开独立控制台。
该行为在 `tauri:dev` 与打包后的桌面运行中保持一致。
```

- [ ] **Step 2: 运行最小文档检查**

Run: `git diff -- README.md README.zh-CN.md`
Expected: 只有本轮终端行为说明，无无关改动

- [ ] **Step 3: 提交**

```bash
git add README.md README.zh-CN.md
git commit -m "docs(readme):补充 Windows 终端新开与复用说明"
```

---

### Task 7: 补充短期记忆并跑 focused + 全量验证

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 在 `docs/active_context.md` 追加执行阶段摘要**

补一条 200 字内摘要，说明：

1. Windows 终端策略已进入实现；
2. `wt` 固定窗口复用；
3. `powershell/pwsh/cmd` 新开独立控制台；
4. 本轮不做 UAC 提权。

- [ ] **Step 2: 运行 focused 回归**

Run:

```bash
npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts
npm run test:run -- src/__tests__/app.core-path-regression.test.ts
cargo test --manifest-path src-tauri/Cargo.toml tests_exec -- --nocapture
```

Expected: 全部 PASS

- [ ] **Step 3: 运行全量门禁**

Run: `npm run check:all`
Expected: PASS

- [ ] **Step 4: Windows 手工验收**

在本机执行以下手工 smoke：

1. `npm run tauri:dev` 从 VSCode 启动；
2. 默认终端=`powershell`，执行命令，应弹独立 PowerShell，不得跑进 VSCode 控制台；
3. 默认终端=`cmd`，执行命令，应弹独立 CMD；
4. 默认终端=`wt`，首次执行应创建 ZapCmd 管理窗口；
5. 默认终端=`wt`，再次执行应进入同一 `wt` 窗口，而不是再起一组无关窗口；
6. 切回 `pwsh` 再执行，应重新走独立 PowerShell 7 窗口；
7. 执行流批量命令在以上终端下都只触发一次终端投递。

- [ ] **Step 5: 提交**

```bash
git add docs/active_context.md
git commit -m "docs(context):记录 Windows 终端策略实现进展"
```

---

## 执行备注

1. **不要**顺手实现 `adminRequired` 的真实提权；那是下一轮独立专题。
2. 如果 Windows `ProcessCommand` 无法直接观测 creation flags，优先把“策略 contract”锁在 `WindowsLaunchPlan` 纯数据结构上，再由一条薄转换函数负责 `ProcessCommand`。
3. 如果 `wt -w <window-id>` 在个别环境上需要调整参数顺序，先以 Microsoft Learn 文档为准，再更新 Rust contract 测试与 README。
4. 若 focused 测试通过但 `npm run check:all` 失败，先修回归，不要跳过全量门禁。

Plan complete and saved to `docs/superpowers/plans/2026-03-21-windows-terminal-session-strategy.md`. Ready to execute?
