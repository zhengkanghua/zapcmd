---
phase: 08-architecture-testability
plan: "01"
subsystem: testing
tags: [app-composition-root, ports, policies, runtime, tauri-decoupling, vitest]
requires:
  - phase: 08-architecture-testability
    provides: "08-RESEARCH 明确组合根解耦边界与 ARC-01 验收要求"
provides:
  - "组合根 ports/policies 边界，业务决策可脱离 Tauri 单测"
  - "runtime/context 改为依赖注入编排，减少副作用耦合"
  - "App 失败事件补齐非 Tauri settings 窗口行为回归"
affects: [ARC-01, architecture-testability, app-runtime]
tech-stack:
  added: []
  patterns:
    - "ports（IO）+ policies（纯决策）+ runtime（编排）三层分离"
    - "useAppCompositionRoot 通过可选注入支持无 Tauri 环境测试"
key-files:
  created:
    - src/composables/app/useAppCompositionRoot/ports.ts
    - src/composables/app/useAppCompositionRoot/policies.ts
  modified:
    - src/composables/app/useAppCompositionRoot/context.ts
    - src/composables/app/useAppCompositionRoot/runtime.ts
    - src/composables/app/useAppCompositionRoot/index.ts
    - src/composables/__tests__/app/useAppLifecycle.test.ts
    - src/composables/__tests__/app/useAppLifecycleBridge.test.ts
    - src/composables/__tests__/app/useAppWindowKeydown.test.ts
    - src/__tests__/app.failure-events.test.ts
key-decisions:
  - "保留 useAppCompositionRoot 对外返回契约，避免 App.vue 调用面破坏。"
  - "启动更新检查与设置窗口打开规则从 runtime 内联逻辑拆为 policy 评估。"
  - "openHomepage 统一走 ports.openExternalUrl，屏蔽 tauri/web 差异。"
patterns-established:
  - "组合根新增逻辑优先落到 policies；runtime 只做编排，不做策略分支堆叠。"
  - "外部能力（invoke/localStorage/window）统一经 ports 注入，测试可替换。"
requirements-completed: [ARC-01]
duration: 11 min
completed: 2026-03-06
---

# Phase 08 Plan 01: Architecture Testability Summary

**组合根已完成 IO/决策解耦：通过 ports/policies 把核心行为变成可单测入口，并保持 App 层接口兼容。**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-06T11:45:02+08:00
- **Completed:** 2026-03-06T11:56:11+08:00
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- 新增 `ports.ts` / `policies.ts`，把组合根副作用与策略判定拆开。
- `context/runtime/index` 改为可注入端口的编排模式，降低 Tauri 运行时硬耦合。
- 增加非 Tauri settings 窗口下不触发 `open_settings_window` 的失败事件回归断言。

## Task Commits

Each task was committed atomically:

1. **Task 1: 定义组合根 ports/policies 契约并先补单测** - `f1b6158` (feat)
2. **Task 2: runtime/context 改为依赖注入编排并保持对外契约稳定** - `49f81a3` (feat)
3. **Task 3: 追加 App 级关键路径回归兜底（最小集成断言）** - `89ca6dc` (test)

**Plan metadata:** pending (will be recorded in phase docs commit)

## Files Created/Modified

- `src/composables/app/useAppCompositionRoot/ports.ts` - 组合根外部依赖端口契约与默认实现工厂。
- `src/composables/app/useAppCompositionRoot/policies.ts` - 启动更新/设置窗口打开等纯策略函数。
- `src/composables/app/useAppCompositionRoot/context.ts` - 通过 ports 注入 tauri/window/storage 依赖。
- `src/composables/app/useAppCompositionRoot/runtime.ts` - runtime 只消费 policy 并调用 ports 落副作用。
- `src/composables/app/useAppCompositionRoot/index.ts` - 暴露可选 `ports` 注入入口，维持默认行为。
- `src/composables/__tests__/app/useAppLifecycleBridge.test.ts` - 增加 `readLauncherHotkey` 调用链断言。
- `src/composables/__tests__/app/useAppLifecycle.test.ts` - 验证组合根策略在无 Tauri 场景可断言。
- `src/composables/__tests__/app/useAppWindowKeydown.test.ts` - 验证快捷键拦截策略边界。
- `src/__tests__/app.failure-events.test.ts` - 增加 non-tauri settings window 行为回归。

## Decisions Made

- 选择“先抽边界再迁移调用点”的渐进重构，避免 runtime 一次性重写导致回归。
- 保持 App 调用面稳定，优先在内部分层，避免把重构成本外溢到 UI 层。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 并行执行导致 08-01 Task 1 提交吸收了 08-02 测试文件变更**
- **Found during:** Task 1（并行代理提交阶段）
- **Issue:** `settingsStore` 相关测试文件在并行执行中被 08-01 首个提交一并纳入。
- **Fix:** 不回滚并行提交结果，后续在 08-02 中补齐独立任务轨迹提交与说明，保持代码与审计链一致。
- **Files modified:** `src/stores/__tests__/settingsStore.test.ts`, `src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts`
- **Verification:** 08-01 与 08-02 计划内定向测试均通过
- **Committed in:** `f1b6158`（并在 08-02 `f6bf929` 记录轨迹补偿）

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** 无功能偏差；仅并行提交边界发生交叉，已通过总结与后续提交轨迹校正。

## Issues Encountered

- 子代理执行结束阶段出现长时间无回执，已由主流程接管剩余提交与总结，不影响结果完整性。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ARC-01 已具备组合根可测试边界，可直接支撑 08-03 的跨模块收敛验证。
- 当前无阻塞，可进入 Wave 2 执行 08-03。

## Self-Check: PASSED

---
*Phase: 08-architecture-testability*
*Completed: 2026-03-06*
