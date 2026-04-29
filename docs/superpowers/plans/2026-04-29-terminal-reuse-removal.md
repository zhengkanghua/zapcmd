# Terminal Reuse Removal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 彻底移除外部终端复用能力，保留默认终端与“始终使用管理员终端”，并保持整队统一提权语义不变。

**Architecture:** 先用 TDD 锁住 schema 升级、Settings UI 收口、执行 contract 精简和 Rust Windows runtime 去复用后的行为，再做最小实现。前端删除 `terminalReusePolicy` 全链路，Rust 删除 reusable session state 与 reuse routing；队列提权与管理员开关透传 contract 必须原样保留。

**Tech Stack:** Vue 3、TypeScript、Pinia、Vitest、Rust、Tauri

---

## File Map

### Settings schema / store

- Modify: `src/stores/settings/defaults.ts`
- Modify: `src/stores/settings/normalization.ts`
- Modify: `src/stores/settings/migration.ts`
- Modify: `src/stores/settingsStore.ts`
- Test: `src/stores/__tests__/settingsStore.test.ts`

### Settings UI / composition

- Modify: `src/components/settings/types.ts`
- Modify: `src/components/settings/SettingsWindow.vue`
- Modify: `src/components/settings/parts/SettingsGeneralSection.vue`
- Modify: `src/composables/settings/useSettingsWindow/model.ts`
- Modify: `src/composables/settings/useSettingsWindow/general.ts`
- Modify: `src/composables/app/useAppCompositionRoot/settingsVm.ts`
- Modify: `src/AppSettings.vue`
- Test: `src/components/settings/parts/__tests__/SettingsGeneralSection.interactions.test.ts`
- Test: `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`
- Test: `src/components/settings/__tests__/SettingsWindow.layout.test.ts`
- Test: `src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts`
- Test: `src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts`
- Test: `src/composables/__tests__/settings/useSettingsWindowPointer.test.ts`

### Execution contract / runtime assembly

- Modify: `src/services/commandExecutor.ts`
- Modify: `src/composables/launcher/useTerminalExecution.ts`
- Modify: `src/composables/app/useAppCompositionRoot/launcherRuntimeAssembly.ts`
- Modify: `src/composables/app/useAppCompositionRoot/launcherContext.ts`
- Modify: `src/composables/app/useAppCompositionRoot/settingsScene.ts`
- Modify: `src/composables/app/useAppCompositionRoot/launcherEntry.ts`
- Modify: `src/composables/app/useAppCompositionRoot/context.ts`
- Modify: `src/composables/app/useAppCompositionRoot/settingsVm.ts`
- Test: `src/services/__tests__/commandExecutor.test.ts`
- Test: `src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- Test: `src/composables/__tests__/app/useLauncherEntry.test.ts`
- Test: `src/composables/__tests__/app/useAppCompositionViewModel.test.ts`
- Test: `src/__tests__/app.failure-events.test.ts`
- Test: `src/__tests__/app.core-path-regression.test.ts`

### i18n / docs

- Modify: `src/i18n/messages.ts`
- Modify: `docs/active_context.md`

### Rust Windows terminal runtime

- Modify: `src-tauri/src/app_state.rs`
- Modify: `src-tauri/src/startup.rs`
- Modify: `src-tauri/src/terminal.rs`
- Modify: `src-tauri/src/terminal/commands.rs`
- Modify: `src-tauri/src/terminal/windows_routing.rs`
- Modify: `src-tauri/src/terminal/windows_launch.rs`
- Test: `src-tauri/src/terminal/tests_exec.rs`

---

## Chunk 1: 先锁红灯测试

### Task 1: settings schema 升级与旧字段清理

**Files:**
- Modify: `src/stores/__tests__/settingsStore.test.ts`

- [ ] **Step 1: 写失败测试，断言默认快照不再包含 `terminalReusePolicy`**
- [ ] **Step 2: 写失败测试，断言 v2 / legacy payload 会被迁移到 v3 且删除旧字段**
- [ ] **Step 3: 运行定向测试确认 RED**

Run:
```bash
npm run test:run -- src/stores/__tests__/settingsStore.test.ts
```

### Task 2: Settings General UI 不再暴露复用设置

**Files:**
- Modify: `src/components/settings/parts/__tests__/SettingsGeneralSection.interactions.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`
- Modify: `src/components/settings/__tests__/SettingsWindow.layout.test.ts`
- Modify: `src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts`

- [ ] **Step 1: 写失败测试，断言 General 区不再渲染复用 dropdown / 文案 / emit**
- [ ] **Step 2: 写失败测试，断言 general actions 只保留自动更新、自启、始终管理员终端**
- [ ] **Step 3: 运行定向测试确认 RED**

Run:
```bash
npm run test:run -- src/components/settings/parts/__tests__/SettingsGeneralSection.interactions.test.ts src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts
```

### Task 3: 前端执行 contract 不再透传 `terminalReusePolicy`

**Files:**
- Modify: `src/services/__tests__/commandExecutor.test.ts`
- Modify: `src/composables/__tests__/launcher/useTerminalExecution.test.ts`

- [ ] **Step 1: 写失败测试，断言 invoke payload 不再带 `terminalReusePolicy`**
- [ ] **Step 2: 写失败测试，断言 `useTerminalExecution` 仍透传 `requiresElevation` / `alwaysElevated`，但不再依赖 reuse policy**
- [ ] **Step 3: 运行定向测试确认 RED**

Run:
```bash
npm run test:run -- src/services/__tests__/commandExecutor.test.ts src/composables/__tests__/launcher/useTerminalExecution.test.ts
```

### Task 4: Rust Windows runtime 删除复用语义但保留提权语义

**Files:**
- Modify: `src-tauri/src/terminal/tests_exec.rs`

- [ ] **Step 1: 删除/改写依赖 reuse state 的旧断言，新增“无复用状态也能正确构建 normal/elevated launch plan”的失败测试**
- [ ] **Step 2: 保留管理员取消、提权失败、队列 host command 等非复用测试**
- [ ] **Step 3: 运行 Rust 定向测试确认 RED**

Run:
```bash
cargo test --manifest-path src-tauri/Cargo.toml terminal::tests_exec -- --nocapture
```

---

## Chunk 2: settings schema 与 UI 收口

### Task 5: schema 升到 v3 并删除 `terminalReusePolicy`

**Files:**
- Modify: `src/stores/settings/defaults.ts`
- Modify: `src/stores/settings/normalization.ts`
- Modify: `src/stores/settings/migration.ts`
- Modify: `src/stores/settingsStore.ts`

- [ ] **Step 1: 删除 `TerminalReusePolicy` 类型、默认值和 `general.terminalReusePolicy` 字段**
- [ ] **Step 2: 把 `SETTINGS_SCHEMA_VERSION` 从 `2` 升到 `3`**
- [ ] **Step 3: 迁移层忽略旧快照 `general.terminalReusePolicy` 并回写 v3 快照**
- [ ] **Step 4: 运行 settings store 定向测试确认 PASS**

Run:
```bash
npm run test:run -- src/stores/__tests__/settingsStore.test.ts
```

### Task 6: Settings 通用页删除复用设置

**Files:**
- Modify: `src/components/settings/types.ts`
- Modify: `src/components/settings/SettingsWindow.vue`
- Modify: `src/components/settings/parts/SettingsGeneralSection.vue`
- Modify: `src/composables/settings/useSettingsWindow/model.ts`
- Modify: `src/composables/settings/useSettingsWindow/general.ts`
- Modify: `src/composables/app/useAppCompositionRoot/settingsVm.ts`
- Modify: `src/AppSettings.vue`
- Modify: `src/i18n/messages.ts`

- [ ] **Step 1: 移除 props / emits / actions / i18n 中所有 `terminalReusePolicy` 相关定义**
- [ ] **Step 2: 保留“始终使用管理员终端”仅 Windows 展示的现有逻辑**
- [ ] **Step 3: 运行 settings 相关定向测试确认 PASS**

Run:
```bash
npm run test:run -- src/components/settings/parts/__tests__/SettingsGeneralSection.interactions.test.ts src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts src/composables/__tests__/settings/useSettingsWindowPointer.test.ts
```

---

## Chunk 3: 执行链与运行时装配收口

### Task 7: 前端执行 contract 删除 `terminalReusePolicy`

**Files:**
- Modify: `src/services/commandExecutor.ts`
- Modify: `src/composables/launcher/useTerminalExecution.ts`
- Modify: `src/composables/app/useAppCompositionRoot/launcherRuntimeAssembly.ts`
- Modify: `src/composables/app/useAppCompositionRoot/launcherContext.ts`
- Modify: `src/composables/app/useAppCompositionRoot/settingsScene.ts`
- Modify: `src/composables/app/useAppCompositionRoot/launcherEntry.ts`
- Modify: `src/composables/app/useAppCompositionRoot/context.ts`

- [ ] **Step 1: 从 command executor request / invoke payload 删除 `terminalReusePolicy`**
- [ ] **Step 2: 从 runtime assembly 与 launcher context 删除对应 ref 依赖**
- [ ] **Step 3: 保持 `requiresElevation` 与 `alwaysElevated` 的透传 contract 不变**
- [ ] **Step 4: 运行执行链定向测试确认 PASS**

Run:
```bash
npm run test:run -- src/services/__tests__/commandExecutor.test.ts src/composables/__tests__/launcher/useTerminalExecution.test.ts src/composables/__tests__/app/useLauncherEntry.test.ts src/composables/__tests__/app/useAppCompositionViewModel.test.ts src/__tests__/app.failure-events.test.ts src/__tests__/app.core-path-regression.test.ts
```

### Task 8: 保留整队提权与管理员终端设置语义

**Files:**
- Modify: `src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- Modify: `src/__tests__/app.core-path-regression.test.ts`
- Modify: `src/composables/__tests__/app/useAppCompositionViewModel.test.ts`

- [ ] **Step 1: 保留或补齐单条执行 `adminRequired` -> `requiresElevation` 测试**
- [ ] **Step 2: 保留或补齐队列任一步 `adminRequired=true` 时整队提权测试**
- [ ] **Step 3: 保留或补齐 settings 恢复 `alwaysElevatedTerminal` 透传测试**

---

## Chunk 4: Rust Windows runtime 去复用

### Task 9: 删除 reusable session state 与 reuse routing

**Files:**
- Modify: `src-tauri/src/app_state.rs`
- Modify: `src-tauri/src/startup.rs`
- Modify: `src-tauri/src/terminal.rs`
- Modify: `src-tauri/src/terminal/commands.rs`
- Modify: `src-tauri/src/terminal/windows_routing.rs`
- Modify: `src-tauri/src/terminal/windows_launch.rs`

- [ ] **Step 1: 从 app state / startup 删除 `windows_reusable_session_state`**
- [ ] **Step 2: 从 Tauri command payload 删除 `terminal_reuse_policy`**
- [ ] **Step 3: 精简 Windows routing decision，删除 reuse / track / retry-without-reuse 分支**
- [ ] **Step 4: 保留 normal/elevated 车道判定与 `runas` 提权路径**
- [ ] **Step 5: 运行 Rust 定向测试确认 PASS**

Run:
```bash
cargo test --manifest-path src-tauri/Cargo.toml terminal::tests_exec -- --nocapture
```

### Task 10: 清理 Rust 复用相关测试与导出

**Files:**
- Modify: `src-tauri/src/terminal/tests_exec.rs`
- Modify: `src-tauri/src/terminal.rs`

- [ ] **Step 1: 删除只为复用策略存在的测试、导出和 helper 引用**
- [ ] **Step 2: 保留 `wt/cmd/pwsh` host command、launch error mapping、队列 marker 等测试**

---

## Chunk 5: 文档、验证与提交

### Task 11: 更新短期记忆与设计阶段产物引用

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 补一条“复用将被端到端移除，schema 升 v3”的精简记忆**

### Task 12: 全量验证
