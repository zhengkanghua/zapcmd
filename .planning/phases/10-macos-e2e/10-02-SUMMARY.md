---
phase: 10-macos-e2e
plan: "02"
subsystem: testing
tags: [verify-local, desktop-e2e, safaridriver, msedgedriver]
requires:
  - phase: 10-macos-e2e
    provides: 10-01 跨平台 desktop-smoke 脚本入口
provides:
  - verify:local 在 Windows/macOS 默认执行 desktop smoke
  - macOS 依赖预检与失败指引
  - scripts/README 本地验证文档补齐 macOS 路径
affects: [10-03, contributing-docs, local-gate]
tech-stack:
  added: []
  patterns:
    - 本地 gate 先预检依赖，再执行质量门禁与桌面 smoke
    - 旧参数兼容保留（require-windows-e2e -> require-desktop-e2e）
key-files:
  created:
    - .planning/phases/10-macos-e2e/10-02-SUMMARY.md
  modified:
    - scripts/verify-local-gate.mjs
    - scripts/README.md
key-decisions:
  - "macOS 不做 driver 自动安装，采用预检 + 明确失败指引"
  - "保留 Windows 自动安装链路，避免回归现有贡献者流程"
  - "新增 --require-desktop-e2e，并兼容旧参数 --require-windows-e2e"
patterns-established:
  - "supportsDesktopE2E 平台门禁（win32/darwin）统一处理"
  - "dry-run 场景仅输出执行计划，不做真实环境探测失败"
requirements-completed: ["E2E-02 (partial: macOS gate only)"]
phase12-correction: "Superseded by Phase 12: audit later found the macOS default/blocking gate conclusion in this artifact was scope drift. Current repo reality is Windows blocking desktop smoke; macOS remains experimental/non-blocking."
duration: 20min
completed: 2026-03-05
---

# Phase 10: 补齐 macOS 桌面端 E2E 冒烟 Summary

**verify:local 已支持 macOS 默认桌面冒烟，并在依赖缺失时提供可执行修复路径。**

## Phase 12 Correction Note (superseded / scope drift)

- 上方加粗结论保留 2026-03-05 的历史执行记录，但其“macOS 默认执行 desktop smoke”的结论已被 Phase 12 superseded。
- 后续审计见 `.planning/v1.0-MILESTONE-AUDIT.md` 与 `.planning/phases/12-macos-e2e-gate-alignment/12-01-SUMMARY.md`：该结论属于 scope drift；当前仓库现实为 Windows blocking desktop smoke，macOS 仅保留 experimental / non-blocking probe。

## Performance

- **Duration:** 20 min
- **Started:** 2026-03-05T07:36:00Z
- **Completed:** 2026-03-05T07:56:00Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- `verify-local-gate.mjs` 新增 `darwin` 支持，Windows/macOS 默认执行 `npm run e2e:desktop:smoke`。
- 新增 macOS 预检（`tauri-driver` + `safaridriver`）与明确失败指引。
- `scripts/README.md` 补充 macOS 前置命令与 `--dry-run` 使用说明。

## Task Commits

本次执行未创建 git commit（按当前会话约束直接在工作区落地变更）。

## Files Created/Modified
- `.planning/phases/10-macos-e2e/10-02-SUMMARY.md` - 记录 Plan 10-02 执行结果。
- `scripts/verify-local-gate.mjs` - 平台策略、依赖预检、参数兼容处理更新。
- `scripts/README.md` - macOS 本地验证说明补齐。

## Decisions Made
- 将 `--require-desktop-e2e` 设为新参数名，并保留旧参数兼容。
- 在非支持平台继续允许默认跳过，但可通过严格参数强制失败。
- macOS 路线保持轻量，不引入新安装脚本。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `10-03` 可直接在文档与 CI 说明中引用 `npm run verify:local` 的新平台行为。
- 本地验证链路已具备与远端门禁对齐的入口语义。

---
*Phase: 10-macos-e2e*
*Completed: 2026-03-05*
