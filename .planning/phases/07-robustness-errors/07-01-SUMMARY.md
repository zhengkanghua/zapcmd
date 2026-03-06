---
phase: 07-robustness-errors
plan: "01"
subsystem: commands
tags: [robustness, command-loader, settings, i18n, vitest]
requires:
  - phase: 06-security-regression
    provides: "失败提示断言口径（关键字段 + 原因片段）"
provides:
  - "命令加载问题统一为 stage/reason/sourceId/commandId 契约（含 read-failed）"
  - "设置页导入问题提示升级为阶段化 + 原因可见，不再仅依赖 console.warn"
  - "ROB-01 回归矩阵覆盖 read/parse/schema/merge 关键失败路径"
affects: [ROB-01, robustness-errors, command-management]
tech-stack:
  added: []
  patterns:
    - "加载问题统一语义字段：code + stage + sourceId + reason + optional commandId"
    - "错误提示断言优先关键字段与关键片段，降低整句文案耦合"
key-files:
  created: []
  modified:
    - src/features/commands/runtimeLoader.ts
    - src/features/commands/schemaGuard.ts
    - src/composables/launcher/useCommandCatalog.ts
    - src/composables/settings/useCommandManagement.ts
    - src/features/settings/types.ts
    - src/i18n/messages.ts
    - src/components/settings/parts/SettingsCommandsSection.vue
    - src/features/commands/__tests__/runtimeLoader.test.ts
    - src/composables/__tests__/launcher/useCommandCatalog.test.ts
    - src/composables/__tests__/settings/useCommandManagement.test.ts
key-decisions:
  - "schema 校验从 boolean 扩展到带 reason 的验证结果，用于稳定定位失败字段。"
  - "readUserCommandFiles 异常不再静默，统一落到 read-failed issue 并进入设置页可见链路。"
patterns-established:
  - "设置页导入问题文案统一走 issueWithReason 模板，固定展示 [stage] + summary + reason。"
  - "回归测试覆盖 read/parse/schema/merge 四阶段，避免只覆盖 parse/json 单一路径。"
requirements-completed: [ROB-01]
duration: 53 min
completed: 2026-03-06
---

# Phase 07 Plan 01: Robustness Errors Summary

**命令加载失败链路已具备“可见 + 可定位 + 可回归”的结构化语义层，设置页可直接查看来源与失败原因。**

## Performance

- **Duration:** 53 min
- **Started:** 2026-03-06T08:06:39+08:00
- **Completed:** 2026-03-06T08:58:57+08:00
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- 在 `runtimeLoader/schemaGuard` 中落地 read/parse/schema/merge 四阶段错误语义，并输出首个可读失败原因。
- 在 `useCommandCatalog -> useCommandManagement -> SettingsCommandsSection` 打通 read-failed 可见化链路，消除读取失败静默吞错。
- 补齐 ROB-01 回归矩阵：加载失败字段断言、设置层映射断言、读取异常可见性断言。

## Task Commits

Each task was committed atomically:

1. **Task 1: 扩展命令加载问题契约（stage/reason/read-failed）** - `e463a68` (feat)
2. **Task 2: 把读取失败接入设置页可见链路（不再吞错）** - `ae70faf` (feat)
3. **Task 3: 追加 ROB-01 回归矩阵并固定断言口径** - `6704c2a` (test)

**Plan metadata:** pending (will be recorded in this plan docs commit)

## Files Created/Modified

- `src/features/commands/runtimeLoader.ts` - 增加 `read-failed`、`stage`、`reason` 并统一 issue reason 归一化。
- `src/features/commands/schemaGuard.ts` - 新增 `validateRuntimeCommandFile` 与首个失败原因提取逻辑。
- `src/composables/launcher/useCommandCatalog.ts` - 读取失败 catch 分支产出 `read-failed` issue。
- `src/composables/settings/useCommandManagement.ts` - 导入问题文案改为阶段化 + 原因可见。
- `src/features/settings/types.ts` - `CommandLoadIssueView` 扩展 `stage/reason` 与 `read-failed` code。
- `src/i18n/messages.ts` - 新增 issue 阶段标签、`issueWithReason`、`issueReadFailed` 双语键。
- `src/components/settings/parts/SettingsCommandsSection.vue` - 导入问题列表 key 增加 stage 维度避免碰撞。
- `src/features/commands/__tests__/runtimeLoader.test.ts` - 覆盖 parse/schema/merge/read 四阶段断言。
- `src/composables/__tests__/launcher/useCommandCatalog.test.ts` - 新增读取失败可见化回归。
- `src/composables/__tests__/settings/useCommandManagement.test.ts` - 新增 stage/reason 映射与 message 片段断言。

## Decisions Made

- 统一使用 `CommandLoadIssue` 承载失败定位信息，避免在 UI 层拼接不稳定错误文本。
- `reason` 文本优先短句可读并限制长度，确保设置页展示稳定且可断言。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 沙箱内 Vitest 启动 `spawn EPERM`**
- **Found during:** Task 1 验证与本地回归
- **Issue:** 沙箱内 esbuild 子进程启动被拒，测试无法完成
- **Fix:** 按审批流程改为提权执行相同测试命令完成验证
- **Files modified:** None
- **Verification:** 目标测试全部通过（runtimeLoader / launcher / commandManagement）
- **Committed in:** N/A（验证流程修复）

---

**Total deviations:** 1 auto-fixed（blocking）
**Impact on plan:** 偏差仅用于完成必要验证，不改变功能范围。

## Issues Encountered

- `git commit` 首次执行被 lint 规则 `max-lines-per-function` 拦截，已通过最小重构（不改行为）修复后继续。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ROB-01 已完成并具备稳定回归，可进入 ROB-02 的执行失败可操作化。
- 当前无新增 blocker，可继续 Wave 2。

---
*Phase: 07-robustness-errors*
*Completed: 2026-03-06*

## Self-Check: PASSED

- FOUND: .planning/phases/07-robustness-errors/07-01-SUMMARY.md
- FOUND: e463a68
- FOUND: ae70faf
- FOUND: 6704c2a
