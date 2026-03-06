---
phase: 08-architecture-testability
plan: "02"
subsystem: testing
tags: [settings-store, migration, normalization, storage-adapter, pinia, vitest]
requires:
  - phase: 08-architecture-testability
    provides: "08-RESEARCH 明确 settingsStore 拆分边界与协议兼容红线"
provides:
  - "settings 默认值/归一化/迁移纯函数模块，可脱离 localStorage 单测"
  - "storage adapter 封装读写协议，支持注入替换"
  - "settingsStore 收敛为状态与 action 编排层，外部 API 保持兼容"
affects: [ARC-02, architecture-testability, settings]
tech-stack:
  added: []
  patterns:
    - "业务纯函数（defaults/normalization/migration）+ IO adapter + Pinia 薄壳分层"
    - "通过 adapter 注入实现无浏览器环境下的存储回归验证"
key-files:
  created:
    - src/stores/settings/defaults.ts
    - src/stores/settings/normalization.ts
    - src/stores/settings/migration.ts
    - src/stores/settings/storageAdapter.ts
  modified:
    - src/stores/settingsStore.ts
    - src/stores/__tests__/settingsStore.test.ts
    - src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts
key-decisions:
  - "保留 settingsStore 现有导出入口，通过 re-export 接入新模块，避免调用方破坏式改动。"
  - "hydrate/persist 支持可选 adapter 注入，默认仍走本地存储协议，测试可替换内存实现。"
patterns-established:
  - "settings 协议改造必须锁 read->write->read 回环与 legacy/current key 共存契约。"
  - "store 层不直接执行 localStorage 解析逻辑，统一下沉到 adapter。"
requirements-completed: [ARC-02]
duration: 17 min
completed: 2026-03-06
---

# Phase 08 Plan 02: Architecture Testability Summary

**settingsStore 已拆分为纯业务模块 + 存储适配层 + 薄 Pinia 编排，并通过协议回归矩阵锁定兼容行为。**

## Performance

- **Duration:** 17 min
- **Started:** 2026-03-06T11:31:00+08:00
- **Completed:** 2026-03-06T11:47:55+08:00
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- 抽离 `defaults/normalization/migration`，业务计算不再依赖 `window/localStorage`。
- 新增 `storageAdapter`，把 `read/write` 协议与 key 兼容逻辑统一封装。
- 新增协议契约回归：legacy round-trip、current+legacy 共存优先级、持久化失败后恢复。

## Task Commits

Each task was committed atomically:

1. **Task 1: 抽离 settings 纯业务模块并建立契约测试** - `ab566d6` (feat)
2. **Task 2: 引入 storage adapter 并将 store 收敛为薄编排层** - `14fe467` (feat)
3. **Task 3: 固化设置协议兼容回归（read→write→read 回环）** - `f6bf929` (test)

**Plan metadata:** pending (will be recorded in this plan docs commit)

## Files Created/Modified

- `src/stores/settings/defaults.ts` - 集中 settings schema/default 常量与类型定义。
- `src/stores/settings/normalization.ts` - 提供 hotkeys/terminal/language/view/opacity 归一化纯函数。
- `src/stores/settings/migration.ts` - 提供 v1/v2/v3/versionless 迁移与 legacy payload 合并纯函数。
- `src/stores/settings/storageAdapter.ts` - 封装存储读写协议与 parse 错误边界，支持注入 storage。
- `src/stores/settingsStore.ts` - 改为调用纯函数与 adapter 的薄编排层，保留既有对外接口。
- `src/stores/__tests__/settingsStore.test.ts` - 增加 adapter 注入、协议回环、key 共存优先级回归断言。
- `src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts` - 增加 persist 失败后下一次保存恢复断言。

## Decisions Made

- 使用 re-export 保持 `settingsStore` 入口稳定，不引入调用方级别改名迁移。
- 通过 `SettingsStorageAdapter` 把 IO 从 store actions 解耦，保证 persistence 行为可替换可测试。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 并行代理提交与 08-02 任务文件交叉**
- **Found during:** Task 3（提交阶段）
- **Issue:** 并行执行的 08-01 代理提交 `f1b6158` 已包含 Task 3 的测试文件改动，导致当前分支无可重复提交 diff。
- **Fix:** 保留并接受并行代理提交结果，不回滚不覆盖；补充 `f6bf929` 空提交记录 08-02 Task 3 原子轨迹。
- **Files modified:** 无新增文件修改（轨迹提交）
- **Verification:** Task 3 指定测试命令通过（31/31）
- **Committed in:** `f6bf929`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 无功能影响；仅提交轨迹受并行写入影响，最终交付与验证结果完整。

## Issues Encountered

- 在并行代理协作下，`src/stores/__tests__/settingsStore.test.ts` 与 `src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts` 的变更先被 08-01 提交吸收；已通过独立任务提交轨迹补齐 08-02 审计链。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ARC-02 已完成并具备稳定自动化证明，`settingsStore` 链路可在后续 Phase 8-03 汇总验收中直接复用。
- 当前无额外 blocker，可继续执行 08-03 的跨模块收敛验证。

---
*Phase: 08-architecture-testability*
*Completed: 2026-03-06*

## Self-Check: PASSED

- FOUND: .planning/phases/08-architecture-testability/08-02-SUMMARY.md
- FOUND: ab566d6
- FOUND: 14fe467
- FOUND: f6bf929
