---
phase: 05-rust-catalog-bounds-tests
plan: "01"
subsystem: testing
tags: [rust, tauri, command_catalog, filesystem, windows]

# 依赖关系图
requires: []
provides:
  - "command_catalog 用户命令目录 IO 契约单测：路径/创建/递归/过滤/排序/空目录/fail-fast/modified_ms 回退"
  - "最小可测试化重构：env/metadata 注入，避免单测依赖全局 env 或不稳定权限行为"
affects: [command-catalog, tauri-commands]

# 技术追踪
tech-stack:
  added: []
  patterns:
    - "注入式可测：resolve_home_dir_with / read_single_user_command_file_with"

key-files:
  created:
    - src-tauri/src/command_catalog/tests_io.rs
  modified:
    - src-tauri/src/command_catalog.rs

key-decisions:
  - "单测通过注入 env provider 覆盖 Windows home 回退顺序，避免 set_var 并行 flake。"
  - "通过注入 metadata provider 稳定覆盖 modified_ms=0 回退分支。"

patterns-established:
  - "IO 契约用例：临时目录构造递归树 + 按 to_string_lossy 规则生成期望排序"

requirements-completed: [RUST-02]

# 指标
duration: 6min
completed: 2026-03-05
---

# Phase 05 Plan 01: command_catalog 用户命令目录 IO 契约单测 总结

**用最小重构把 env/metadata 依赖注入出来，并用 Rust 单测锁定用户命令目录的扫描与错误处理契约。**

## 性能与指标

- **耗时:** 6min
- **开始:** 2026-03-05T00:11:09+08:00
- **完成:** 2026-03-05T00:17:07+08:00
- **任务:** 2
- **修改文件数:** 2

## 完成内容

- `command_catalog` 关键 IO 依赖可注入：避免测试修改全局 env，并可稳定覆盖 `modified_ms=0` 回退
- 单测锁定 `<home>/.zapcmd/commands` 契约：自动创建、递归扫描、仅收集 `.json`（大小写不敏感）、按路径排序、空目录返回空数组
- 单测锁定 fail-fast：任意目录/文件读取失败直接返回 Err（断言关键片段，不锁死系统文案）

## 任务提交

每个任务均已原子提交：

1. **Task 1: command_catalog 最小可测试化重构（注入 env/metadata，不改对外行为）** - `7e8b102`（refactor）
2. **Task 2: 补齐 command_catalog 单测（IO 契约：路径/递归/排序/fail-fast/modifiedMs 回退）** - `b08b3a0`（test）

## 关键文件

- `src-tauri/src/command_catalog.rs` - 增加可注入的内部函数入口（env/metadata），对外行为不变
- `src-tauri/src/command_catalog/tests_io.rs` - 覆盖路径/创建/递归/过滤/排序/空目录/fail-fast/modified_ms 回退

## 决策

- 单测禁止 `std::env::set_var`：通过 `resolve_home_dir_with(...)` 注入 env provider 覆盖 Windows 回退顺序。
- `modified_ms` 回退用注入 metadata provider 稳定触发（避免依赖文件系统权限/ACL 的不确定性）。

## 偏离计划

无 — 按计划执行。

## 遇到的问题

无。

## 用户需要的本地准备

无。

## 下一阶段准备

- Phase 05 的 `command_catalog` IO 契约已可回归，可继续推进 `bounds.rs` 的可测性与单测（Plan 02）。

## Self-Check: PASSED

- FOUND: `.planning/phases/05-rust-catalog-bounds-tests/05-01-SUMMARY.md`
- FOUND: `7e8b102`（Task 1）
- FOUND: `b08b3a0`（Task 2）

## Self-Check: PASSED（自检：通过）

- FOUND: `.planning/phases/05-rust-catalog-bounds-tests/05-01-SUMMARY.md`
- FOUND: `src-tauri/src/command_catalog.rs`
- FOUND: `src-tauri/src/command_catalog/tests_io.rs`
- FOUND COMMIT: `7e8b102`
- FOUND COMMIT: `b08b3a0`
