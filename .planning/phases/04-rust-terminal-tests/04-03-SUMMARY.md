---
phase: 04-rust-terminal-tests
plan: "03"
subsystem: testing
tags: [rust, cargo, tauri, ci, precommit]

# 依赖关系图
requires:
  - phase: 04-01
    provides: "Rust 终端执行/探测单测基线（cargo test 可通过）"
provides:
  - "npm 脚本：test:rust（cargo test --manifest-path src-tauri/Cargo.toml）"
  - "check:all 串联包含 test:rust，作为合并门禁的一部分"
  - "precommit-guard：高风险 Rust 变更追加 cargo test（否则仅 cargo check）"
  - "CI Gate：macOS/Ubuntu cross-platform-smoke 追加 Rust toolchain + Linux deps + npm run test:rust"
affects: [quality-gate, precommit, ci-gate]

# 技术追踪
tech-stack:
  added: []
  patterns:
    - "门禁分层：check:rust 快路径 + test:rust 强门禁"
    - "高风险文件触发：命中关键 Rust 模块才追加 cargo test"

key-files:
  created: []
  modified:
    - package.json
    - scripts/precommit-guard.mjs
    - .github/workflows/ci-gate.yml

key-decisions:
  - "保留 check:rust 作为快速检查；test:rust 用于 check:all/CI 与高风险 precommit 回归。"
  - "CI Gate 的 Windows 复用 check:all；macOS/Ubuntu 在 smoke job 追加 npm run test:rust 并补齐 Linux 构建依赖。"

patterns-established:
  - "npm run test:rust -> cargo test --manifest-path src-tauri/Cargo.toml"
  - "precommit-guard：highRiskRustTargets 命中时追加 cargo test"

requirements-completed: [RUST-01]

# 指标
duration: 37min
completed: 2026-03-04
---

# Phase 04 Plan 03: Rust 单测纳入本地与 CI 门禁 总结

**把 Rust 单元测试纳入 check:all、本地 precommit 高风险门禁，并让 CI Gate 在 Windows/macOS/Ubuntu 三平台执行 cargo test。**

## 性能与指标

- **耗时:** 37min
- **开始:** 2026-03-04T08:34:34Z
- **完成:** 2026-03-04T09:11:28Z
- **任务:** 3
- **修改文件数:** 3

## 完成内容

- 新增 `npm run test:rust`（cargo test --manifest-path src-tauri/Cargo.toml），并纳入 `npm run check:all`（已在本地跑通）
- `precommit-guard` 对高风险 Rust 变更追加执行 `cargo test`，并输出可读提示（低风险仍保持仅 `cargo check` 的轻量路径）
- CI Gate 的 `cross-platform-smoke`（macOS/Ubuntu）补齐 Rust toolchain、Ubuntu 系统依赖，并追加执行 `npm run test:rust`

## 任务提交

每个任务均已原子提交：

1. **Task 1: 增加 `test:rust` 脚本并纳入 `check:all`** - `fe17e2b`（chore）
2. **Task 2: precommit-guard 在高风险 Rust 变更时追加运行 Rust 单测** - `8441b18`（chore）
3. **Task 3: CI Gate 三平台执行 Rust 单测（Ubuntu 安装构建依赖）** - `d6b9796`（chore）

## 关键文件

- `package.json` - 新增 `test:rust`，并把它串联进 `check:all`
- `scripts/precommit-guard.mjs` - 高风险 Rust 变更追加 `cargo test`（含提示输出）
- `.github/workflows/ci-gate.yml` - macOS/Ubuntu 的 smoke gate 追加 Rust toolchain + Linux deps + `npm run test:rust`

## 决策

- 保留 `check:rust` 快路径：本地/CI 仍可快速发现 Rust 编译问题；`test:rust` 作为更强门禁进入 `check:all` 与高风险 precommit。
- CI Gate 的 Windows 复用 `check:all`（避免重复步骤）；跨平台 smoke job 单独追加 `test:rust` 并补齐 Ubuntu 依赖。

## 偏离计划

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Windows sandbox 下读取 staged 文件列表需避开 pipe**
- **发现于:** Task 2（precommit-guard 高风险 Rust 变更追加单测）
- **问题:** 当前环境中 `spawnSync(git, { stdio: \"pipe\" })` 触发 EPERM，导致无法读取 `git diff --cached --name-only` 输出
- **修复:** 将 stdout 改为写入临时文件后再读取（仍执行相同的 git diff 命令）
- **影响文件:** `scripts/precommit-guard.mjs`
- **验证:** `npm run precommit:guard` 能正确识别 staged 文件并输出触发原因
- **提交:** `8441b18`

## 遇到的问题

无。

## 用户需要的本地准备

无。

## 下一阶段准备

- Phase 04 的 Rust 单测已纳入本地与 CI 门禁链路，可开始推进 Phase 05（`command_catalog.rs` / `bounds.rs` 单测）

## Self-Check: PASSED（自检：通过）

- FOUND: `.planning/phases/04-rust-terminal-tests/04-03-SUMMARY.md`
- FOUND: `package.json`
- FOUND: `scripts/precommit-guard.mjs`
- FOUND: `.github/workflows/ci-gate.yml`
- FOUND COMMIT: `fe17e2b`
- FOUND COMMIT: `8441b18`
- FOUND COMMIT: `d6b9796`
