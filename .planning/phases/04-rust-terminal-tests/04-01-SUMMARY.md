---
phase: 04-rust-terminal-tests
plan: "01"
subsystem: testing
tags: [rust, tauri, terminal, argv, applescript, windows, linux]

# 依赖关系图
requires: []
provides:
  - "终端执行 build/spawn 可测试化：sanitize_command + spawn_and_forget + build_command_*"
  - "终端执行单测契约：Windows wt/cmd/pwsh/powershell argv 精确断言 + trim/拒绝 + spawn 失败传播（macOS/Linux 用例以 cfg 提供）"
affects: [terminal-execution, rust-tests, ci-gate]

# 技术追踪
tech-stack:
  added: []
  patterns:
    - "命令构建（build）与执行（spawn）职责拆分"
    - "Command program/args 结构化断言（to_string_lossy）"

key-files:
  created:
    - src-tauri/src/terminal/tests_exec.rs
  modified:
    - src-tauri/src/terminal.rs

key-decisions:
  - "单测只验证命令构建结果，不触发真实终端 spawn，避免 CI/本机副作用。"
  - "拒绝路径与 spawn 失败仅断言 Err，不锁定错误文案（减少脆弱性）。"

patterns-established:
  - "对外行为契约用单测精确表达：Windows argv、macOS AppleScript、Linux bash -lc 单参数结构。"

requirements-completed: [RUST-01]

# 指标
duration: 37min
completed: 2026-03-04
---

# Phase 04 Plan 01: 终端执行 build/spawn 可测试化 + argv/转义/拒绝路径单测 总结

**为 Rust 终端执行高风险边界建立可回归的“命令构建契约”，并补齐拒绝路径与错误传播单测（不触发真实终端）。**

## 性能与指标

- **耗时:** 37min
- **开始:** 2026-03-04T07:21:45Z
- **完成:** 2026-03-04T07:58:57Z
- **任务:** 2
- **修改文件数:** 2

## 完成内容

- 拆分 `run_command_*` 为 `build_command_*` + `spawn_and_forget`，单测只验证“命令构建结果”，避免真实打开终端
- 锁定 `trim()` + 全空白拒绝路径，以及 `spawn()` 失败的错误传播（仅断言 Err）
- Windows 下精确锁定 `wt/cmd/pwsh/powershell` 四分支 program+args 行为契约（macOS/Linux 用例在对应平台启用）

## 任务提交

每个任务均已原子提交：

1. **Task 1: 将终端执行逻辑拆为 build + spawn（保持外部行为不变）** - `43179ec`（refactor）
2. **Task 2: 补齐终端执行单测（argv/转义/拒绝 + spawn 失败传播）** - `d3e6bf1`（test）

## 关键文件

- `src-tauri/src/terminal.rs` - 提供 sanitize/build/spawn 拆分，保证执行入口行为不变且可被单测锁定
- `src-tauri/src/terminal/tests_exec.rs` - 终端执行契约单测（Windows argv 精确断言；macOS/Linux 用例以 cfg 形式提供）

## 决策

- 单测不触发真实终端：只测试 build 的 program/args（以及单独覆盖 1 条 spawn 失败传播）。
- 拒绝路径与 spawn 失败不锁定错误字符串：只断言 `Err`，降低不必要的脆弱回归。

## 偏离计划

无 — 按计划执行。

## 遇到的问题

无。

## 用户需要的本地准备

无。

## 下一阶段准备

- 04-01 已将“终端执行”路径可测试化并建立回归契约
- 可继续 04-02（终端探测/解析/回退契约单测）与 04-03（Rust 单测纳入门禁并覆盖三平台 CI）

## Self-Check: PASSED（自检：通过）

- FOUND: `src-tauri/src/terminal.rs`
- FOUND: `src-tauri/src/terminal/tests_exec.rs`
- FOUND: `.planning/phases/04-rust-terminal-tests/04-01-SUMMARY.md`
- FOUND COMMIT: `43179ec`
- FOUND COMMIT: `d3e6bf1`
