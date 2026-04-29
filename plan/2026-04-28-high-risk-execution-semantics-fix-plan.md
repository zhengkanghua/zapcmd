# High-Risk Execution Semantics Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复队列执行“假成功”、Rust 宿主命令非 fail-fast、以及 Windows 管理员终端历史复用三类高风险执行语义问题。

**Architecture:** 保持现有前端 `useCommandExecution` / `useTerminalExecution` 与 Rust `run_command_in_terminal` 边界不变，优先通过 TDD 锁住真实执行 contract。前端不再把“终端已拉起”误报为“整队成功”，Rust 宿主命令显式短路后续步骤，Windows 管理员终端在无探活协议前彻底降级为每次重新提权。

**Tech Stack:** Vue 3 Composition API、TypeScript、Vitest、Tauri 2、Rust

---

## 范围与文件映射

- 队列反馈与清队语义
  - Modify: `src/composables/execution/useCommandExecution/queue.ts`
  - Modify: `src/i18n/messages.ts`
  - Test: `src/composables/__tests__/execution/useCommandExecution.test.ts`
- Rust fail-fast 宿主命令
  - Modify: `src-tauri/src/terminal/execution_posix.rs`
  - Modify: `src-tauri/src/terminal/execution_windows.rs`
  - Test: `src-tauri/src/terminal/tests_exec.rs`
- Windows 管理员复用保守降级
  - Modify: `src-tauri/src/terminal/windows_routing.rs`
  - Modify: `src-tauri/src/terminal/windows_launch.rs`
  - Test: `src-tauri/src/terminal/tests_exec.rs`
- 文档
  - Modify: `docs/active_context.md`

## Chunk 1: 队列反馈与清队语义

### Task 1: 先补前端红灯测试，锁定“已发送到终端”而非“执行成功”

**Files:**
- Modify: `src/composables/__tests__/execution/useCommandExecution.test.ts`

- [ ] **Step 1: 写失败测试，锁定队列执行后只给 dispatch 级反馈**

新增/改写断言：

1. `executes staged queue and clears snapshot`
   - 改名为“dispatches staged queue to terminal and keeps queue by default”
   - 断言成功文案不再包含 `queueSuccess`
   - 断言文案改为包含 `sentToTerminal`
   - 断言默认不清空 `stagedCommands`
2. `executes staged queue in one terminal call when batch runner is provided`
   - 同样断言反馈为 `sentToTerminal`
   - 断言默认不清空队列
3. 新增一条测试：当 `queueAutoClearOnSuccess=false` 时行为与默认一致，说明该设置不再被“伪成功”路径消费

- [ ] **Step 2: 运行定向测试，确认先失败**

Run: `npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts`

Expected: FAIL，当前实现仍会显示 `queueSuccess` 并清空队列

- [ ] **Step 3: 最小实现修复队列反馈语义**

实现要求：

1. `runStagedSnapshot()` 成功返回后只显示“命令已发送到终端”级文案
2. 不再基于当前 fire-and-forget 调用清空队列
3. 保留单条执行的 `sentToTerminal` 语义不变
4. 不新增“真实成功”假状态

- [ ] **Step 4: 重跑定向测试确认通过**

Run: `npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts`

Expected: PASS

## Chunk 2: Rust 宿主命令 fail-fast

### Task 2: 先补 Rust 红灯测试，锁定任一步失败后停止后续步骤

**Files:**
- Modify: `src-tauri/src/terminal/tests_exec.rs`

- [ ] **Step 1: 写失败测试**

新增断言覆盖：

1. `build_posix_host_command()` 生成的字符串在失败分支后包含 `exit "$zapcmd_code"` 或等效短路语义
2. `build_cmd_host_command()` 生成的字符串在失败分支后包含 `exit /b !zapcmdCode!`
3. `build_powershell_host_command()` 生成的字符串在失败分支后包含 `exit $zapcmdCode` 或 `throw`

- [ ] **Step 2: 运行 Rust 定向测试确认失败**

Run: `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests_exec -- --nocapture`

Expected: FAIL，当前宿主命令只打印 failed marker，不会停止后续步骤

- [ ] **Step 3: 最小实现 fail-fast**

实现要求：

1. POSIX：每步失败后立即退出，禁止继续执行后续 step
2. `cmd/wt`：记录 `ERRORLEVEL` 后直接 `exit /b`
3. PowerShell：失败后优先按已有 code 退出；无 code 时至少返回非零退出态
4. 保留现有 run/failed marker 语义

- [ ] **Step 4: 重跑 Rust 定向测试确认通过**

Run: `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests_exec -- --nocapture`

Expected: PASS

## Chunk 3: Windows 管理员复用保守降级

### Task 3: 先补 Windows 路由红灯测试，锁定管理员每次重新提权

**Files:**
- Modify: `src-tauri/src/terminal/tests_exec.rs`

- [ ] **Step 1: 写失败测试**

新增断言覆盖：

1. 当 `requires_elevation=true`、`terminal_reuse_policy=NormalAndElevated`、`reusable_session_state.elevated=Some("wt")` 时：
   - `decision.reuse_existing_session` 必须为 `false`
2. 对应 launch mode 必须为 `ElevatedViaRunas`
3. `should_track_windows_reusable_session()` 对 elevated 路径返回 `false`

- [ ] **Step 2: 运行 Rust 定向测试确认失败**

Run: `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests_exec -- --nocapture`

Expected: FAIL，当前仍会把历史 `elevated=wt` 当作当前可复用管理员会话

- [ ] **Step 3: 最小实现保守降级**

实现要求：

1. `WindowsSessionKind::Elevated` 永远不进入 reusable lane
2. `reuse_existing_session` 在 elevated 路径恒为 `false`
3. elevated 路径不再写入 `windows_reusable_session_state.elevated`
4. 普通终端复用逻辑保持不变

- [ ] **Step 4: 重跑 Rust 定向测试确认通过**

Run: `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests_exec -- --nocapture`

Expected: PASS

## Chunk 4: 文档与验证

### Task 4: 更新短期记忆并运行最小充分验证

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 追加 200 字以内 active context**

记录：

1. 队列反馈改成 dispatch 级，不再误报整队成功
2. Rust 宿主命令已 fail-fast
3. Windows 管理员终端改为每次重新提权

- [ ] **Step 2: 运行前端定向测试**

Run: `npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts`

Expected: PASS

- [ ] **Step 3: 运行 Rust 定向测试**

Run: `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests_exec -- --nocapture`

Expected: PASS

- [ ] **Step 4: 运行类型检查**

Run: `npm run typecheck`

Expected: PASS
