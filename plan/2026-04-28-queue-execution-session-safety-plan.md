# Queue Execution And Session Safety Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复队列成功语义、执行前 prerequisite 复检、session 脱敏持久化和 Windows 管理员终端复用误判。

**Architecture:** 保持现有 `useCommandExecution` / `useLauncherSessionState` / `stagedCommands` / `settingsStore` / Rust terminal routing 边界不变，优先通过 TDD 锁住行为。队列成功只由“整队无失败”驱动；preflight cache 退回展示层；session 最小快照不再包含明文参数；Windows elevated reuse 先降级为不复用。

**Tech Stack:** Vue 3 Composition API、Pinia、Vitest、Tauri 2、Rust

---

## 范围与文件映射

- 队列执行 contract 与 fresh preflight
  - Modify: `src/composables/execution/useCommandExecution/model.ts`
  - Modify: `src/composables/execution/useCommandExecution/queue.ts`
  - Modify: `src/composables/execution/useCommandExecution/helpers.ts`
  - Modify: `src/composables/execution/useCommandExecution/preflight.ts`
  - Test: `src/composables/__tests__/execution/useCommandExecution.test.ts`
- queue auto clear 设置
  - Modify: `src/stores/settings/defaults.ts`
  - Modify: `src/stores/settings/normalization.ts`
  - Modify: `src/stores/settings/migration.ts`
  - Modify: `src/stores/settingsStore.ts`
  - Modify: `src/components/settings/types.ts`
  - Modify: `src/components/settings/SettingsWindow.vue`
  - Modify: `src/components/settings/parts/SettingsGeneralSection.vue`
  - Modify: `src/composables/settings/useSettingsWindow/model.ts`
  - Modify: `src/composables/settings/useSettingsWindow/general.ts`
  - Test: `src/stores/__tests__/settingsStore.test.ts`
  - Test: `src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts`
- session 脱敏持久化
  - Modify: `src/features/launcher/stagedCommands.ts`
  - Modify: `src/composables/launcher/useLauncherSessionState.ts`
  - Modify: `src/composables/app/useAppCompositionRoot/runtime.ts`
  - Test: `src/features/launcher/__tests__/stagedCommands.test.ts`
  - Test: `src/composables/__tests__/launcher/useLauncherSessionState.test.ts`
- Windows 管理员复用降级
  - Modify: `src-tauri/src/terminal/windows_routing.rs`
  - Modify: `src-tauri/src/terminal/commands.rs`
  - Test: `src-tauri/src/terminal/tests_exec.rs`
- 文档
  - Modify: `docs/active_context.md`

---

## Chunk 1: 队列执行与 fresh preflight

### Task 1: 先补队列成功语义与 fresh preflight 红灯测试

**Files:**
- Modify: `src/composables/__tests__/execution/useCommandExecution.test.ts`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行测试确认失败**
Run: `npm run test -- src/composables/__tests__/execution/useCommandExecution.test.ts`
Expected: FAIL，旧行为仍会在 cached issue 存在时直接执行、并在 run 完成后清空队列
- [ ] **Step 3: 最小实现修复**
- [ ] **Step 4: 重跑定向测试确认通过**

## Chunk 2: queue auto clear 设置

### Task 2: 补 schema / store / settings 红灯测试

**Files:**
- Modify: `src/stores/__tests__/settingsStore.test.ts`
- Modify: `src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行测试确认失败**
Run: `npm run test -- src/stores/__tests__/settingsStore.test.ts src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts`
Expected: FAIL，现有 schema/store/UI 不包含 `queueAutoClearOnSuccess`
- [ ] **Step 3: 最小实现修复**
- [ ] **Step 4: 重跑定向测试确认通过**

## Chunk 3: session 脱敏持久化

### Task 3: 补不持久化 argValues/renderedPreview 的红灯测试

**Files:**
- Modify: `src/composables/__tests__/launcher/useLauncherSessionState.test.ts`
- Modify: `src/features/launcher/__tests__/stagedCommands.test.ts`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行测试确认失败**
Run: `npm run test -- src/composables/__tests__/launcher/useLauncherSessionState.test.ts src/features/launcher/__tests__/stagedCommands.test.ts`
Expected: FAIL，旧快照仍包含 `argValues` 和 `renderedPreview`
- [ ] **Step 3: 最小实现修复**
- [ ] **Step 4: 重跑定向测试确认通过**

## Chunk 4: Windows 管理员复用降级

### Task 4: 补 elevated lane 不再盲目复用的红灯测试

**Files:**
- Modify: `src-tauri/src/terminal/tests_exec.rs`
- Modify: `src-tauri/src/terminal/windows_routing.rs`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行 Rust 定向测试确认失败**
Run: `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests_exec -- --nocapture`
Expected: FAIL，`normal-and-elevated` 仍会把历史 elevated lane 当成当前可复用管理员会话
- [ ] **Step 3: 最小实现修复**
- [ ] **Step 4: 重跑定向测试确认通过**

## 验证

- [ ] `npm run test -- src/composables/__tests__/execution/useCommandExecution.test.ts src/stores/__tests__/settingsStore.test.ts src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts src/composables/__tests__/launcher/useLauncherSessionState.test.ts src/features/launcher/__tests__/stagedCommands.test.ts`
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests_exec -- --nocapture`
- [ ] `npm run typecheck`
- [ ] `npm run check:rust`
