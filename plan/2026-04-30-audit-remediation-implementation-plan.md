# Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:test-driven-development and superpowers:verification-before-completion. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复审计中暴露的高风险执行语义、安全兜底、预检性能与 macOS 启动边界问题。

**Architecture:** 保持现有 Vue composable + Tauri Rust 分层。前端继续负责交互确认与反馈，Rust 执行入口补充最低安全兜底；队列会话持久化从最小 DTO 扩展为可恢复用户参数的 DTO。

**Tech Stack:** Vue 3、TypeScript、Vitest、Tauri 2、Rust cargo test。

---

## Chunk 1: Queue Session Args

**Files:**
- Modify: `src/features/launcher/stagedCommands.ts`
- Modify: `src/composables/launcher/useLauncherSessionState.ts`
- Test: `src/features/launcher/__tests__/stagedCommands.test.ts`
- Test: `src/composables/__tests__/launcher/useLauncherSessionState.test.ts`

- [ ] 写失败测试：持久化队列项保存 `argValues`。
- [ ] 写失败测试：恢复队列项时用原始 `argValues` 重建执行快照。
- [ ] 实现 DTO 扩展与兼容读取。
- [ ] 运行相关 Vitest。

## Chunk 2: Backend Execution Safety

**Files:**
- Modify: `src/services/commandExecutor.ts`
- Modify: `src/composables/launcher/useTerminalExecution.ts`
- Modify: `src-tauri/src/terminal.rs`
- Modify: `src-tauri/src/terminal/commands.rs`
- Modify: `src-tauri/src/terminal/execution_common.rs`
- Test: `src-tauri/src/terminal/tests_exec.rs`
- Test: `src/services/__tests__/commandExecutor.test.ts`

- [ ] 写失败测试：Rust 执行入口遇到高风险命令且无确认时拒绝。
- [ ] 写失败测试：前端正常执行 payload 带确认标记。
- [ ] 实现 `safetyConfirmed` 参数与 Rust 兜底校验。
- [ ] 运行相关 TS/Rust 测试。

## Chunk 3: Queue Preflight Concurrency

**Files:**
- Modify: `src/composables/execution/useCommandExecution/queue.ts`
- Test: `src/composables/__tests__/execution/useCommandExecution.test.ts`

- [ ] 写失败测试：队列执行前 preflight 不再严格串行。
- [ ] 用既有并发限制 helper 处理队列执行前刷新。
- [ ] 运行相关 Vitest。

## Chunk 4: macOS Launch Boundary

**Files:**
- Modify: `src-tauri/src/terminal/launch_posix.rs`
- Test: `src-tauri/src/terminal/tests_exec.rs`

- [ ] 写失败测试：macOS AppleScript 通过 argv 接收命令，复杂字符串不直接内嵌。
- [ ] 改造 `osascript` 参数传递。
- [ ] 运行 Rust 测试。

## Verification

- [ ] `npm run test:run -- src/features/launcher/__tests__/stagedCommands.test.ts src/composables/__tests__/launcher/useLauncherSessionState.test.ts src/composables/__tests__/execution/useCommandExecution.test.ts src/services/__tests__/commandExecutor.test.ts`
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests_exec`
- [ ] `npm run typecheck`
- [ ] `npm run check:rust`
