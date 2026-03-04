---
phase: 05-rust-catalog-bounds-tests
plan: "02"
subsystem: testing
tags: [rust, tauri, bounds, window, monitor]

# 依赖关系图
requires: []
provides:
  - "bounds restore/clamp/reposition 纯逻辑提取与可测入口（不依赖真实 Tauri Window/Monitor）"
  - "bounds Rust 单元测试：display_name 优先、primary/first 回退、clamp 完全可见、随鼠标屏居中与拒绝路径"
affects: [windowing, bounds, tauri]

# 技术追踪
tech-stack:
  added: []
  patterns:
    - "MonitorInfo fixture：把 Tauri Monitor 映射为纯数据结构，便于单测覆盖关键决策"
    - "决策提取：resolve_restored_window_position_with / compute_reposition_to_cursor_monitor"

key-files:
  created:
    - src-tauri/src/bounds/tests_logic.rs
  modified:
    - src-tauri/src/bounds.rs

key-decisions:
  - "保持对外行为不变，仅提取纯函数用于单测覆盖。"
  - "window_size 缺失时沿用现状默认值 680x124。"

patterns-established:
  - "bounds 逻辑测试：MonitorInfo fixture + 纯函数断言（拒绝路径返回 None）"

requirements-completed: [RUST-03]

# 指标
duration: 4min
completed: 2026-03-05
---

# Phase 05 Plan 02: bounds 回退/夹取/随鼠标屏重定位 单测 总结

**用 MonitorInfo fixture 把 bounds 的 restore/clamp/reposition 契约锁进纯 Rust 单测，并通过最小重构提取关键决策为纯函数。**

## 性能与指标

- **耗时:** 4min
- **开始:** 2026-03-05T00:18:32+08:00
- **完成:** 2026-03-05T00:21:49+08:00
- **任务:** 2
- **修改文件数:** 2

## 完成内容

- `bounds.rs` 引入 `MonitorInfo` 并把 Tauri `Monitor` 映射为纯数据，避免测试依赖真实窗口/屏幕环境
- 提取 restore 决策为 `resolve_restored_window_position_with(...)`：锁定 display_name 优先、坐标落点选择、primary/first 回退、clamp 完全可见
- 提取 cursor 重定位决策为 `compute_reposition_to_cursor_monitor(...)`：锁定跨屏居中、同屏不动、cursor 不在任何屏/无 monitors 拒绝路径，以及默认窗口尺寸

## 任务提交

每个任务均已原子提交：

1. **Task 1: bounds 最小可测试化重构（提取纯逻辑函数，不改对外行为）** - `fd4aa92`（refactor）
2. **Task 2: 补齐 bounds 单测（restore + reposition + clamp + 拒绝路径）** - `55d5fc8`（test）

## 关键文件

- `src-tauri/src/bounds.rs` - 生产代码薄封装读取 Tauri 数据，决策逻辑提取为纯函数供单测覆盖
- `src-tauri/src/bounds/tests_logic.rs` - 纯逻辑用例覆盖：point/clamp 边界、restore 回退链、cursor 重定位与拒绝路径

## 决策

- 保持对外行为不变：`restore_main_window_bounds` / `reposition_to_cursor_monitor` 仍通过 Tauri Window/Monitor 读取数据并 `set_position`，仅提取决策逻辑为纯函数。
- `window_size` 缺失时默认值沿用现状 `680x124`，并在单测中锁定。

## 偏离计划

无 — 按计划执行。

## 遇到的问题

无。

## 用户需要的本地准备

无。

## 下一阶段准备

- Phase 05 的 `command_catalog`（Plan 01）与 `bounds`（Plan 02）关键契约已被 Rust 单测锁定，可进入 Phase 06 的安全基线回归规划与验证。

## Self-Check: PASSED（自检：通过）

- FOUND: `.planning/phases/05-rust-catalog-bounds-tests/05-02-SUMMARY.md`
- FOUND: `src-tauri/src/bounds.rs`
- FOUND: `src-tauri/src/bounds/tests_logic.rs`
- FOUND COMMIT: `fd4aa92`
- FOUND COMMIT: `55d5fc8`
