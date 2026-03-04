---
phase: 04-rust-terminal-tests
plan: "02"
subsystem: [testing]
tags: [rust, tauri, terminal, unit-test]

requires:
  - phase: 04-01
    provides: "终端执行（build/spawn）可测试化与单测基线"
provides:
  - "终端探测（get_available_terminals）resolver 依赖注入（exists/path/path_exists）"
  - "where/which stdout 解析纯函数 parse_first_non_empty_line（取第一条非空行并 trim）"
  - "终端探测回退与解析规则的 Rust 单元测试（只锁定 terminal_id 集合与回退行为）"
affects: [rust-terminal-tests, quality-gate, precommit]

tech-stack:
  added: []
  patterns:
    - "resolver 注入：把进程/文件系统 IO 封装为闭包传入，逻辑本身可纯单测"
    - "测试断言口径：只锁定 terminal_id 集合与回退行为，不锁定排序/label/path 细节"

key-files:
  created:
    - src-tauri/src/terminal/tests_discovery.rs
  modified:
    - src-tauri/src/terminal.rs

key-decisions:
  - "stdout 解析规则统一为：取第一条非空行并 trim，作为纯函数并在生产代码复用。"
  - "终端探测单测只断言 terminal_id 集合与回退行为，避免因排序/label/path 波动造成脆弱回归。"

patterns-established:
  - "parse_first_non_empty_line(raw) -> Option<String> 作为跨平台解析契约"
  - "resolve_*_terminals(exists/path/exists_path) 作为可注入探测入口"

requirements-completed: [RUST-01]

duration: 16min
completed: 2026-03-04
---

# Phase 4 Plan 02: Rust 终端探测单测 Summary

**为 get_available_terminals 的探测/回退/路径解析补齐可注入的 Rust 单测，避免依赖本机/CI 是否安装特定终端。**

## Performance

- **Duration:** 16min
- **Started:** 2026-03-04T08:45:34Z
- **Completed:** 2026-03-04T09:00:51Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- 将终端探测逻辑抽离为可注入 resolver（Windows/Linux：exists + path；macOS：path_exists），单测不触发真实 `where/which` 或 `Path::exists`
- 提取 `parse_first_non_empty_line`，锁定 stdout 解析规则并在 production 复用
- 新增终端探测单测：覆盖解析规则、Windows 回退、以及 macOS/Linux 关键分支回归保护（按 cfg 分平台编译）

## Task Commits

每个 task 均为原子提交：

1. **Task 1: 将终端探测抽离为“可注入 resolver + 纯解析函数”（保持行为不变）** - `aa86512` (refactor)
2. **Task 2: 补齐终端探测单测（id 集合断言 + 回退 + where/which 解析）** - `c7635e0` (test)

**Plan metadata:** 本次 SUMMARY/STATE/ROADMAP/active_context 更新记录于同一笔 docs 提交

## Files Created/Modified
- `src-tauri/src/terminal.rs` - 新增 resolver 注入与 `parse_first_non_empty_line`，并让 `get_available_terminals()` 使用 resolver
- `src-tauri/src/terminal/tests_discovery.rs` - 覆盖解析规则与各平台探测回退/包含项的单测（断言口径不脆弱）

## Decisions Made
- None - followed plan as specified

## Deviations from Plan

None - plan executed exactly as written

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 已具备稳定的终端探测单测与可注入结构，可继续推进 04-03：把 `cargo test --manifest-path src-tauri/Cargo.toml` 纳入本地与 CI 门禁。

## Self-Check: PASSED

- FOUND: `.planning/phases/04-rust-terminal-tests/04-02-SUMMARY.md`
- FOUND commits: `aa86512`, `c7635e0`
