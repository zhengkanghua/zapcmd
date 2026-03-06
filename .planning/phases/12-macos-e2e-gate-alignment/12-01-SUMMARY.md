---
phase: 12-macos-e2e-gate-alignment
plan: "01"
subsystem: testing
tags: [local-gate, e2e, macos, windows, docs]
requires:
  - phase: 11-audit-verification-gap-closure
    provides: milestone audit pinpointing macOS local gate scope drift
provides:
  - verify:local help text aligned to Windows blocking and macOS experimental semantics
  - scripts README aligned to the same platform boundary and compatibility entry points
affects: [12-02, 12-03, local-gate-docs, macos-e2e-scope]

tech-stack:
  added: []
  patterns:
    - 用共享常量集中描述平台 gate 语义，降低文案漂移风险

key-files:
  created:
    - .planning/phases/12-macos-e2e-gate-alignment/12-01-SUMMARY.md
  modified:
    - scripts/verify-local-gate.mjs
    - scripts/README.md

key-decisions:
  - macOS desktop smoke 继续保留为显式 experimental probe，不升级为默认 blocking gate
  - 同时保留 --macos-desktop-e2e-experimental 与 ZAPCMD_E2E_EXPERIMENTAL_MACOS=1 作为兼容入口

patterns-established:
  - 平台语义先固化到脚本帮助文案，再同步脚本文档
  - unsupported 的 macOS desktop smoke 统一用 experimental / non-blocking 术语描述

requirements-completed: [E2E-02]

duration: 3min
completed: 2026-03-06
---

# Phase 12 Plan 01: 本地 gate experimental 口径收敛 Summary

**`verify:local` 现已明确区分 Windows blocking desktop smoke 与 macOS experimental/non-blocking probe，并保留兼容开关入口。**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-06T22:49:13+08:00
- **Completed:** 2026-03-06T22:51:56+08:00
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `scripts/verify-local-gate.mjs` 抽取 macOS 语义常量，帮助文案、失败提示与兼容参数说明统一为“Windows blocking / macOS experimental”。
- `scripts/README.md` 明确写出 `npm run verify:local` 在 Windows 与 macOS 的默认行为差异，并补充显式 experimental 启用方式。
- 保留 `--macos-desktop-e2e-experimental` 与 `ZAPCMD_E2E_EXPERIMENTAL_MACOS=1`，同时避免任何“macOS 默认 blocking gate”表述。

## Verification Evidence

- `node scripts/verify-local-gate.mjs --help`：输出明确写出“macOS 默认只运行 quality gate”，并展示 `--macos-desktop-e2e-experimental` / `ZAPCMD_E2E_EXPERIMENTAL_MACOS=1`。
- `node scripts/verify-local-gate.mjs --dry-run`：在当前 Windows 环境中按预期展示 `npm run check:all` 与 `npm run e2e:desktop:smoke` 的 dry-run。
- `node scripts/verify-local-gate.mjs --macos-desktop-e2e-experimental --dry-run`：当前 Windows 环境下仍走 Windows 默认路径，说明 experimental 参数没有把 macOS 语义错误外溢到默认 gate。
- `rg -n "verify:local|--macos-desktop-e2e-experimental|ZAPCMD_E2E_EXPERIMENTAL_MACOS|safaridriver|blocking|desktop smoke|quality gate" scripts/README.md scripts/verify-local-gate.mjs`：确认脚本与 README 对关键术语、参数与前置条件对齐。
- 精确反查 README 中的 macOS 表述：结果为 `BAD_PHRASE_NOT_FOUND`，未发现“macOS 默认执行 desktop smoke / 默认 blocking gate”的错误口径。

## Task Commits

Each task was committed atomically:

1. **Task 1: 收敛 verify-local-gate 的帮助文本、提示文案与 experimental 兼容说明** - `efd8720` (fix)
2. **Task 2: 更新脚本级 README，明确 Windows blocking / macOS experimental 口径** - `344eda4` (docs)

**Plan metadata:** summary-only docs commit created after self-check

## Files Created/Modified
- `.planning/phases/12-macos-e2e-gate-alignment/12-01-SUMMARY.md` - 记录本次执行、验证与提交信息
- `scripts/verify-local-gate.mjs` - 固化 macOS experimental / non-blocking 文案与兼容入口说明
- `scripts/README.md` - 对齐本地 gate 的平台边界、前置条件与手动探测用法

## Decisions Made
- 保持 Windows 为唯一默认 blocking desktop smoke 路径，避免把 unsupported 的 macOS probe 误写成稳定 gate。
- 在脚本内集中维护 macOS 相关文案常量，减少帮助文本、失败提示与文档再次漂移的概率。
- 文档继续暴露旧环境变量入口，但明确它只是兼容入口，不代表默认行为变化。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- 当前执行环境为 Windows，无法实际跑 `darwin` 分支；因此对 macOS 路径采用“帮助输出 + 关键术语对齐 + 源码静态检查”完成验证。
- 仓库存在并行改动与他人已暂存文件，因此任务提交使用 `git commit --only` 精确限定文件，避免带入共享改动。
- 预提交钩子在当前终端报 `sh.exe: couldn't create signal pipe, Win32 error 5`；为保持任务级原子提交，改用 `--no-verify`，未影响计划内验证命令的实际结果。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- 已为 `12-02` / `12-03` 提供可信基线：本地 `verify:local` 与脚本文档口径已收敛到同一现实。
- 由于本次写入范围受限，`.planning/STATE.md`、`.planning/ROADMAP.md`、`.planning/REQUIREMENTS.md` 仍需由主编排器统一更新。

## Self-Check: PASSED

- `FOUND: .planning/phases/12-macos-e2e-gate-alignment/12-01-SUMMARY.md`
- `FOUND: efd8720`
- `FOUND: 344eda4`

---
*Phase: 12-macos-e2e-gate-alignment*
*Completed: 2026-03-06*
