# Launcher Runtime Assembly 去重实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除 Launcher 运行时装配在 `createAppCompositionContext` 与 `useLauncherEntry` 之间的重复实现，并补齐真实测试覆盖，保证行为不变。

**Architecture:** 抽出一个共享的 Launcher runtime assembly 工厂，统一创建 `search / domBridge / stagedFeedback / searchFocus / terminal execution / settings bridge`。`createAppCompositionContext` 继续承载完整 settings scene，`useLauncherEntry` 继续承载“主窗口最小装配”，但两者复用同一条 Launcher 运行时构建链。

**Tech Stack:** Vue 3 Composition API、Vitest、TypeScript、Pinia、现有 Tauri ports 抽象

---

### Task 1: 为共享装配建立失败测试

**Files:**
- Create: 无
- Modify: `src/composables/__tests__/app/useAppCompositionRoot.index.test.ts`
- Modify: `src/composables/__tests__/app/useLauncherEntry.test.ts`
- Create/Modify: `src/composables/__tests__/app/useAppCompositionContext.test.ts`（若不存在则新建）

- [ ] **Step 1: 写失败测试**

覆盖点：
1. `createAppCompositionContext` 会通过共享装配路径得到 `search/domBridge/stagedFeedback/scheduleSearchInputFocus/runCommandInTerminal`。
2. `useLauncherEntry` 会复用同一共享装配路径，而不是各自手写一套。
3. 保证 `launcherEntry` 继续使用最小 settings bridge，不意外实例化完整 settings scene。

- [ ] **Step 2: 运行测试确认失败**

Run:
`npm run test:run -- src/composables/__tests__/app/useAppCompositionRoot.index.test.ts src/composables/__tests__/app/useLauncherEntry.test.ts src/composables/__tests__/app/useAppCompositionContext.test.ts`

Expected:
至少一条测试因共享装配尚不存在而失败。

### Task 2: 抽出共享 Launcher runtime assembly

**Files:**
- Create: `src/composables/app/useAppCompositionRoot/launcherRuntimeAssembly.ts`
- Modify: `src/composables/app/useAppCompositionRoot/context.ts`
- Modify: `src/composables/app/useAppCompositionRoot/launcherEntry.ts`

- [ ] **Step 1: 写最小实现**

职责：
1. 接收 `ports / currentWindowLabel / settingsSyncChannel / terminal source / settings facts / command catalog locale source`。
2. 返回统一的 Launcher runtime 依赖：`search`、`domBridge`、`stagedCommands`、`stagedFeedback`、`stagingGripReorderActive`、`shouldBlockSearchInputFocusRef`、`scheduleSearchInputFocus`、`ensureActiveStagingVisibleRef`、`runCommandInTerminal`、`runCommandsInTerminal`、`resolveAppWindow`。
3. 不把 settings scene 与 launcher settings bridge 混成一个抽象，避免职责反向耦合。

- [ ] **Step 2: 保持调用方边界不变**

要求：
1. `createAppCompositionContext` 仍返回完整 app context 形状。
2. `useLauncherEntry` 仍只暴露 `launcherVm / launcherCompatVm / appShellVm`。
3. 任何现有测试 mock 接口若可保持兼容，就不要额外扩大变更面。

### Task 3: 绿灯验证与回归收口

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 跑定向测试**

Run:
`npm run test:run -- src/composables/__tests__/app/useAppCompositionRoot.index.test.ts src/composables/__tests__/app/useLauncherEntry.test.ts src/composables/__tests__/app/useAppCompositionContext.test.ts src/composables/__tests__/app/useAppCompositionViewModel.test.ts`

Expected:
全部通过。

- [ ] **Step 2: 跑全量门禁**

Run:
`npm run check:all`

Expected:
全绿。

- [ ] **Step 3: 更新短期记忆**

在 `docs/active_context.md` 追加一句：
记录 Launcher runtime assembly 去重已完成、context 覆盖补齐、全量门禁通过。
