# Runtime Boundary Remediation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按已确认的方案 2 落地运行时边界收口：终端启动预热与显式重扫、执行链拆职责、Settings 生命周期并轨、命令管理死链收口，以及窗口尺寸动画改单实例追最新目标。

**Architecture:** 本轮不做推倒重写，而是在现有 split 基础上继续收边。终端侧维持 `get_available_terminals` 作为缓存读，新增共享 `refresh_available_terminals` 强制重扫路径，并把启动预热、tray 入口与正常退出清缓存接到同一后端语义；前端继续保留 `useCommandExecution()`、`SettingsWindow` 等外部 contract，但把内部职责拆到 `panel / single / queue / preflight / settingsEntry` 等更小边界，确保后续修改能按面板、单条、队列、生命周期、动画分别回归。

**Tech Stack:** Vue 3, TypeScript, Pinia, Vitest, Vue Test Utils, Tauri 2.x, Rust

**Spec:** `docs/superpowers/specs/2026-04-09-runtime-boundary-remediation-design.md`

---

## 文件结构

### 预期新增文件

- `src/composables/__tests__/settings/useSettingsWindowTerminal.test.ts`
  职责：锁定 `loadAvailableTerminals()` 与 `refreshAvailableTerminals()` 的分工、默认终端纠偏与 fallback 行为。
- `src/composables/app/useAppCompositionRoot/settingsEntry.ts`
  职责：Settings 独立窗口入口装配层，复用 `settingsScene + useAppLifecycleBridge`，接管 `show_settings_window_when_ready`。
- `src/composables/__tests__/app/settingsEntry.test.ts`
  职责：锁定 settings entry 会通过共享 lifecycle 触发 `loadSettings / loadAvailableTerminals / readLauncherHotkey / show_settings_window_when_ready`。
- `src/composables/execution/useCommandExecution/panel.ts`
  职责：参数面板判定、pending intent 状态、提交/取消/更新参数的纯编排。
- `src/composables/execution/useCommandExecution/single.ts`
  职责：单条执行、复制、危险确认、单条 prerequisite/preflight 聚合。
- `src/composables/execution/useCommandExecution/queue.ts`
  职责：入队、整队执行、队列 refresh preflight、队列安全确认。
- `src/composables/execution/useCommandExecution/preflight.ts`
  职责：prerequisite 结果收集、blocking/warning 分流、队列缓存转换。
- `src/components/launcher/parts/useLauncherCommandPanelState.ts`
  职责：把 `LauncherCommandPanel.vue` 里的 badge、按钮文案、参数错误和危险提示等纯状态逻辑抽离。

### 预期修改文件

#### 终端发现 / tray / 启动退出

- `src-tauri/src/terminal/discovery_cache.rs`
  TTL 从 24 小时改为 1 小时，并补充“正常退出删除磁盘缓存、异常退出短时兜底”的辅助语义。
- `src-tauri/src/terminal.rs`
  保留 `get_available_terminals` 的缓存读 contract，新增共享 `refresh_available_terminals` 强制重扫路径，并抽出 preload/clear helper 给 startup/lib 复用。
- `src-tauri/src/startup.rs`
  启动时 best-effort 预热终端扫描，并在 tray 里新增 `rescan_terminals` 入口。
- `src-tauri/src/lib.rs`
  注册新的 refresh command，并把正常退出清磁盘缓存接到 `RunEvent::Exit` 或等价路径。
- `src-tauri/src/terminal/tests_cache.rs`
  锁定 1h TTL、cache 选择与路径失效刷新判定。

#### 终端前端桥接 / Settings General

- `src/services/tauriBridge.ts`
  新增 `refreshAvailableTerminals()` invoke bridge。
- `src/services/__tests__/tauriBridge.test.ts`
  锁定 `refresh_available_terminals` 调用名与参数。
- `src/composables/app/useAppCompositionRoot/ports.ts`
  暴露 refresh terminals 端口给 settings scene/entry。
- `src/composables/app/useAppCompositionRoot/settingsScene.ts`
  把新 refresh port 传给 `useSettingsWindow`。
- `src/composables/settings/useSettingsWindow/model.ts`
  为 settings window options 增加 refresh terminals 依赖。
- `src/composables/settings/useSettingsWindow/index.ts`
  输出新的 `refreshAvailableTerminals()` 动作。
- `src/composables/settings/useSettingsWindow/terminal.ts`
  拆成普通读取 `loadAvailableTerminals()` 与强制重扫 `refreshAvailableTerminals()` 两类动作，共享默认终端纠偏。
- `src/composables/app/useAppCompositionRoot/settingsVm.ts`
  透传 refresh terminals 动作与 terminal loading 状态。
- `src/components/settings/types.ts`
  `SettingsGeneralProps` 增加 refresh 入口。
- `src/components/settings/SettingsWindow.vue`
  把 General section 的 refresh 事件继续向上转发。
- `src/components/settings/parts/SettingsGeneralSection.vue`
  在终端分组新增显式“重新扫描终端”按钮，不改整体布局结构。
- `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`
  锁定新增按钮中英文本与 loading 态。
- `src/components/settings/parts/__tests__/SettingsGeneralSection.interactions.test.ts`
  锁定 refresh emit 与 loading/disabled 行为。

#### 命令管理死链收口

- `src/features/settings/types.ts`
  删除未消费的 `CommandDisplayMode` / `CommandManagementGroup` 暴露，移除 `displayMode` 视图字段。
- `src/stores/settings/defaults.ts`
  删除 command view 默认 `displayMode`，保持其他 filter 默认值不变。
- `src/stores/settings/normalization.ts`
  兼容旧快照里的 `displayMode`，但规范化后不再写回该字段。
- `src/stores/settingsStore.ts`
  store snapshot / applySnapshot / 类型同步删除 display mode 存储。
- `src/stores/__tests__/settingsStore.test.ts`
  从“回退到 list display mode”改为“忽略 legacy displayMode”。
- `src/composables/settings/useCommandManagement/options.ts`
  删除 `commandDisplayModeOptions` 计算。
- `src/composables/settings/useCommandManagement/rows.ts`
  删除仅供未消费链路使用的 `createCommandGroups()`。
- `src/composables/settings/useCommandManagement/index.ts`
  停止返回 `commandDisplayModeOptions` / `commandGroups`。
- `src/composables/__tests__/settings/useCommandManagement.test.ts`
  改成只验证真实消费者会用到的 rows/source file options/filter 行为。
- `src/composables/app/useAppCompositionRoot/settingsVm.ts`
  停止透传死链字段。
- `src/AppSettings.vue`
  停止解构/透传 `commandDisplayModeOptions` / `commandGroups`。
- `src/components/settings/types.ts`
  删除对应 props/type。
- `src/components/settings/SettingsWindow.vue`
  删除无消费 props 透传。
- `src/components/settings/__tests__/SettingsWindow.layout.test.ts`
  调整 props fixture，确认壳层 contract 收口后仍可渲染。
- `src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts`
  删除死 props fixture，仅保留真实使用 props。
- `src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts`
  同步移除死 props，锁定 toolbar/summary/table contract 不变。
- `src/i18n/messages.ts`
  删除 display mode 相关文案，仅清死链，不动 theme / motion 文案。

#### Settings 生命周期并轨

- `src/composables/app/useAppCompositionRoot/viewModel.ts`
  若需要，导出/提取 settings mutation handlers，避免 settings entry 再手写一份保存与 toast 生命周期。
- `src/composables/app/useAppCompositionRoot/settingsEntry.ts`
  新的 Settings 独立窗口入口装配；负责 scene、vm、window keydown、lifecycle bridge、onSettingsReady。
- `src/AppSettings.vue`
  收敛成薄壳：创建 settings entry，透传 vm 给 `SettingsWindow.vue`，删除手写 `onMounted/onBeforeUnmount` 生命周期。
- `src/composables/__tests__/app/useAppLifecycle.test.ts`
  锁定 settings lifecycle 仍会在 settings window 首挂时加载 terminals。
- `src/composables/__tests__/app/useAppLifecycleBridge.test.ts`
  锁定桥仍然接 `loadAvailableTerminals` / `readLauncherHotkey` / `onSettingsReady`。
- `src/composables/__tests__/app/settingsScene.test.ts`
  锁定 scene 继续提供 settingsWindow / commandManagement / updateManager。
- `src/composables/__tests__/app/settingsEntry.test.ts`
  新增 entry 级测试，锁定 `show_settings_window_when_ready` 触发时机与 Escape 关闭。
- `src/__tests__/app.settings-hotkeys.test.ts`
  继续走真实 Settings 入口，锁定 hash/storage/broadcast、launcher hotkey 读取和窗口 ready 行为不回归。

#### 执行链职责拆分

- `src/composables/execution/useCommandExecution/model.ts`
  明确保留 `pendingSubmitIntent` 与兼容 alias `pendingSubmitMode`。
- `src/composables/execution/useCommandExecution/state.ts`
  仅保留共享 state，不新增业务判断。
- `src/composables/execution/useCommandExecution/index.ts`
  继续维持现有对外 return shape。
- `src/composables/execution/useCommandExecution/actions.ts`
  缩成编排层，只负责组装 panel/single/queue/preflight 子模块。
- `src/composables/execution/useCommandExecution/preflight.ts`
  收敛 prerequisite 结果收集与 cache 构建。
- `src/composables/execution/useCommandExecution/queue.ts`
  收敛 stage / execute queue / refresh preflight。
- `src/composables/execution/useCommandExecution/single.ts`
  收敛 execute/copy 单条路径与危险确认。
- `src/composables/execution/useCommandExecution/panel.ts`
  收敛 `needsPanel`、pending command、submit/cancel/update arg。
- `src/composables/__tests__/execution/useCommandExecution.test.ts`
  锁定 `execute / stage / copy / queued refresh / pendingSubmitMode alias` 外部 contract 不变。
- `src/composables/app/useAppCompositionRoot/runtime.ts`
  内部改为消费 `pendingSubmitIntent`，并继续对 `onNeedPanel` / action panel / command page 做编排。
- `src/composables/app/useAppCompositionRoot/launcherVm.ts`
  继续向外提供 `submitIntent` 与兼容 alias `submitMode`。
- `src/composables/__tests__/app/useAppCompositionViewModel.test.ts`
  锁定 segmented vm 仍透传 alias。
- `src/components/launcher/parts/useLauncherCommandPanelState.ts`
  抽出参数面板纯状态逻辑。
- `src/components/launcher/parts/LauncherCommandPanel.vue`
  收窄为 UI glue code，不改按钮/危险提示行为。
- `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
  锁定 execute/copy/stage 文案、danger UI 与参数校验提示。
- `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
  锁定 command-action 页在 action/params 两种 panel 之间的切换 contract。

#### 动画最新目标调度

- `src-tauri/src/animation/mod.rs`
  改为“单实例动画 + 单实例 shrink timer + latest target”调度模型。
- `src-tauri/src/animation/tests_logic.rs`
  增加纯调度语义测试：reveal blocking、不重复堆 shrink timer、快速更新时永远以最新目标为准。
- `src/__tests__/app.failure-events.test.ts`
  继续锁定 flow panel / command page 打开关闭、高度恢复、重复 resize 去重和 fallback 路径。

---

## Chunk 1: 终端预热、1h 缓存与显式重扫

### Task 1: 收紧 Rust 终端缓存语义并暴露 refresh command

**Files:**
- Modify: `src-tauri/src/terminal/discovery_cache.rs`
- Modify: `src-tauri/src/terminal.rs`
- Modify: `src-tauri/src/terminal/tests_cache.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 先写失败测试，锁定 1h TTL 与 cached/refresh 双入口**

在 `src-tauri/src/terminal/tests_cache.rs` 增加至少两条断言：

```rust
#[test]
fn terminal_discovery_cache_ttl_is_one_hour() {
    assert_eq!(TERMINAL_DISCOVERY_CACHE_TTL_MS, 60 * 60 * 1000);
}

#[test]
fn pick_cached_terminal_snapshot_expires_after_one_hour() {
    let persisted = create_snapshot(1_000, &["wt"]);
    let picked = pick_cached_terminal_snapshot(
        None,
        Some(&persisted),
        1_000 + TERMINAL_DISCOVERY_CACHE_TTL_MS + 1,
    );
    assert_eq!(picked, None);
}
```

- [ ] **Step 2: 运行 Rust 定向测试，确认当前基线会失败**

Run:
- `cd src-tauri && cargo test terminal::tests_cache -- --nocapture`

Expected:
- FAIL，TTL 仍是 `24 * 60 * 60 * 1000`

- [ ] **Step 3: 最小实现 cached read / force refresh / clear helper**

实现要求：
- `TERMINAL_DISCOVERY_CACHE_TTL_MS` 改为 `60 * 60 * 1000`
- 保留：

```rust
#[tauri::command]
pub(crate) fn get_available_terminals(...) -> Result<Vec<TerminalOption>, String>
```

  语义不变，继续走缓存读
- 新增共享强制重扫入口，例如：

```rust
pub(crate) fn refresh_available_terminals_impl(
    app: &tauri::AppHandle,
    state: &AppState,
) -> Vec<TerminalOption> {
    clear_terminal_discovery_cache(app, state);
    let options = detect_available_terminals();
    persist_terminal_discovery_snapshot(app, state, options.as_slice());
    options
}
```

- 再暴露：

```rust
#[tauri::command]
pub(crate) fn refresh_available_terminals(...) -> Result<Vec<TerminalOption>, String>
```

- `clear_terminal_discovery_cache()` 继续作为共享 helper，供 refresh 和正常退出复用
- 不改变 Windows terminal reuse / routing 语义

- [ ] **Step 4: 重新运行 Rust 定向测试并确认命令注册编译通过**

Run:
- `cd src-tauri && cargo test terminal::tests_cache -- --nocapture`
- `cd src-tauri && cargo check`

Expected:
- `terminal::tests_cache` PASS
- `cargo check` PASS，且 `lib.rs` 已注册新的 `refresh_available_terminals`

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src-tauri/src/terminal/discovery_cache.rs src-tauri/src/terminal.rs src-tauri/src/terminal/tests_cache.rs src-tauri/src/lib.rs
git commit -m "refactor(terminal):收紧终端发现缓存并新增强制重扫入口"
```

### Task 2: 接上启动预热、tray 重扫与 Settings 的 refresh 路径

**Files:**
- Modify: `src-tauri/src/startup.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/services/tauriBridge.ts`
- Modify: `src/services/__tests__/tauriBridge.test.ts`
- Modify: `src/composables/app/useAppCompositionRoot/ports.ts`
- Modify: `src/composables/app/useAppCompositionRoot/settingsScene.ts`
- Modify: `src/composables/settings/useSettingsWindow/model.ts`
- Modify: `src/composables/settings/useSettingsWindow/index.ts`
- Modify: `src/composables/settings/useSettingsWindow/terminal.ts`
- Create: `src/composables/__tests__/settings/useSettingsWindowTerminal.test.ts`
- Modify: `src/composables/app/useAppCompositionRoot/settingsVm.ts`
- Modify: `src/components/settings/types.ts`
- Modify: `src/components/settings/SettingsWindow.vue`
- Modify: `src/components/settings/parts/SettingsGeneralSection.vue`
- Modify: `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsGeneralSection.interactions.test.ts`
- Modify: `src/AppSettings.vue`

- [ ] **Step 1: 先补失败测试，锁定 refresh bridge、settings action 和 general UI**

新增或补充以下断言：

```ts
// src/services/__tests__/tauriBridge.test.ts
it("refreshes available terminals through dedicated invoke bridge", async () => {
  await refreshAvailableTerminals();
  expect(invokeMock).toHaveBeenCalledWith("refresh_available_terminals");
});

// src/composables/__tests__/settings/useSettingsWindowTerminal.test.ts
it("refreshAvailableTerminals bypasses cached read and re-runs ensureDefaultTerminal", async () => {
  // refresh 调用 refresh bridge，不走 read bridge；默认终端失效时立即纠偏并 persist
});

// src/components/settings/parts/__tests__/SettingsGeneralSection.interactions.test.ts
it("emits refresh-terminals when the rescan button is clicked", async () => {
  await wrapper.get(".settings-general__refresh-terminals").trigger("click");
  expect(wrapper.emitted("refresh-terminals")).toHaveLength(1);
});
```

- [ ] **Step 2: 运行前端定向测试，确认新断言先失败**

Run:
- `npm run test:run -- src/services/__tests__/tauriBridge.test.ts src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts src/components/settings/parts/__tests__/SettingsGeneralSection.interactions.test.ts`

Expected:
- FAIL，当前没有 dedicated refresh bridge，也没有 Settings General refresh 按钮

- [ ] **Step 3: 实现同一条 refresh 路径的三处接线**

实现要求：
- `startup.rs`
  - 在启动阶段增加 best-effort 终端预热；失败只记日志，不阻断窗口显示
  - tray 菜单新增 `rescan_terminals`
  - `rescan_terminals` 和 Settings refresh 都调用同一条 Rust refresh helper，不做两套实现
- `lib.rs`
  - 在正常退出时删除磁盘缓存；优先使用 `RunEvent::Exit` 或等价正常退出钩子，不要靠窗口销毁猜测退出
- `tauriBridge.ts` / `ports.ts`
  - 新增 `refreshAvailableTerminals(): Promise<TerminalOption[]>`
- `useSettingsWindow/terminal.ts`
  - 继续保留：

```ts
loadAvailableTerminals(): Promise<void>
```

    作为普通读取
  - 新增：

```ts
refreshAvailableTerminals(): Promise<void>
```

    作为强制重扫
  - refresh 成功后必须重新执行 `ensureDefaultTerminal()`，若默认终端纠偏则立即 `persistSetting()`
- `SettingsGeneralSection.vue`
  - 在默认终端分组加显式按钮，类名固定为 `.settings-general__refresh-terminals`
  - loading 时按钮 disabled，避免重复点击
- `SettingsWindow.vue` / `types.ts` / `settingsVm.ts` / `AppSettings.vue`
  - 只做 props / emits / vm 透传，不新增第二套逻辑

- [ ] **Step 4: 跑完定向测试，并补一次 settings fallback 回归**

Run:
- `npm run test:run -- src/services/__tests__/tauriBridge.test.ts src/composables/__tests__/settings/useSettingsWindowTerminal.test.ts src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts src/components/settings/parts/__tests__/SettingsGeneralSection.interactions.test.ts`
- `npm run test:run -- src/__tests__/app.failure-events.test.ts`

Expected:
- 新增 bridge / settings terminal / general section 测试 PASS
- `app.failure-events.test.ts` PASS，`loadAvailableTerminals failed; using fallback` 旧回退行为不回归

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src-tauri/src/startup.rs src-tauri/src/lib.rs src/services/tauriBridge.ts src/services/__tests__/tauriBridge.test.ts src/composables/app/useAppCompositionRoot/ports.ts src/composables/app/useAppCompositionRoot/settingsScene.ts src/composables/settings/useSettingsWindow/model.ts src/composables/settings/useSettingsWindow/index.ts src/composables/settings/useSettingsWindow/terminal.ts src/composables/__tests__/settings/useSettingsWindowTerminal.test.ts src/composables/app/useAppCompositionRoot/settingsVm.ts src/components/settings/types.ts src/components/settings/SettingsWindow.vue src/components/settings/parts/SettingsGeneralSection.vue src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts src/components/settings/parts/__tests__/SettingsGeneralSection.interactions.test.ts src/AppSettings.vue
git commit -m "feat(settings):接入终端重扫与启动预热路径"
```

---

## Chunk 2: 命令管理死链收口

### Task 3: 删除未消费的 display mode / groups 链路并兼容旧 settings 快照

**Files:**
- Modify: `src/features/settings/types.ts`
- Modify: `src/stores/settings/defaults.ts`
- Modify: `src/stores/settings/normalization.ts`
- Modify: `src/stores/settingsStore.ts`
- Modify: `src/stores/__tests__/settingsStore.test.ts`
- Modify: `src/composables/settings/useCommandManagement/options.ts`
- Modify: `src/composables/settings/useCommandManagement/rows.ts`
- Modify: `src/composables/settings/useCommandManagement/index.ts`
- Modify: `src/composables/__tests__/settings/useCommandManagement.test.ts`
- Modify: `src/composables/app/useAppCompositionRoot/settingsVm.ts`
- Modify: `src/AppSettings.vue`
- Modify: `src/components/settings/types.ts`
- Modify: `src/components/settings/SettingsWindow.vue`
- Modify: `src/components/settings/__tests__/SettingsWindow.layout.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts`
- Modify: `src/i18n/messages.ts`

- [ ] **Step 1: 先把测试改成“忽略 legacy 字段，而不是继续消费它们”**

需要先调整或新增以下断言：

```ts
// settingsStore.test.ts
it("drops legacy command view displayMode during normalization", () => {
  const normalized = normalizeCommandViewState({ displayMode: "groupedByFile" } as never);
  expect("displayMode" in normalized).toBe(false);
});

// useCommandManagement.test.ts
it("does not expose dead command display/group outputs", () => {
  expect("commandDisplayModeOptions" in model).toBe(false);
  expect("commandGroups" in model).toBe(false);
});
```

并把 `SettingsWindow.layout.test.ts` / `SettingsCommandsSection.*.test.ts` 的 fixture 改成不再传 `commandDisplayModeOptions` / `commandGroups`。

- [ ] **Step 2: 运行命令管理相关测试，确认新 contract 先失败**

Run:
- `npm run test:run -- src/stores/__tests__/settingsStore.test.ts src/composables/__tests__/settings/useCommandManagement.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts`

Expected:
- FAIL，当前 store/composable/window 仍暴露死链字段

- [ ] **Step 3: 最小实现死链收口，但保留旧快照兼容**

实现要求：
- `CommandManagementViewState` 删除 `displayMode`
- `createDefaultCommandViewState()` 不再写 `displayMode`
- `normalizeCommandViewState()` 对旧 payload 里的 `displayMode` 静默忽略，不要因为历史 localStorage 报错
- 删除：
  - `CommandDisplayMode`
  - `CommandManagementGroup`
  - `commandDisplayModeOptions`
  - `commandGroups`
  - 对应 props / vm / layout fixtures / i18n 文案
- `SettingsCommandsSection.vue` / `SettingsCommandsToolbar.vue` 只保留实际消费的 filter、sort、file、summary、rows
- 明确不要触碰 theme / motion / appearance 相关字段

- [ ] **Step 4: 重新运行命令管理定向测试**

Run:
- `npm run test:run -- src/stores/__tests__/settingsStore.test.ts src/composables/__tests__/settings/useCommandManagement.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts`

Expected:
- PASS，且 `SettingsCommandsSection` 真实渲染/交互 contract 不变

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/features/settings/types.ts src/stores/settings/defaults.ts src/stores/settings/normalization.ts src/stores/settingsStore.ts src/stores/__tests__/settingsStore.test.ts src/composables/settings/useCommandManagement/options.ts src/composables/settings/useCommandManagement/rows.ts src/composables/settings/useCommandManagement/index.ts src/composables/__tests__/settings/useCommandManagement.test.ts src/composables/app/useAppCompositionRoot/settingsVm.ts src/AppSettings.vue src/components/settings/types.ts src/components/settings/SettingsWindow.vue src/components/settings/__tests__/SettingsWindow.layout.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts src/i18n/messages.ts
git commit -m "refactor(commands):收口未消费的显示模式与分组链路"
```

---

## Chunk 3: Settings 独立窗口生命周期并轨

### Task 4: 引入 `settingsEntry.ts`，把 AppSettings 收敛成共享 lifecycle 的薄壳

**Files:**
- Create: `src/composables/app/useAppCompositionRoot/settingsEntry.ts`
- Create: `src/composables/__tests__/app/settingsEntry.test.ts`
- Modify: `src/composables/app/useAppCompositionRoot/viewModel.ts`
- Modify: `src/AppSettings.vue`
- Modify: `src/composables/__tests__/app/useAppLifecycle.test.ts`
- Modify: `src/composables/__tests__/app/useAppLifecycleBridge.test.ts`
- Modify: `src/composables/__tests__/app/settingsScene.test.ts`
- Modify: `src/__tests__/app.settings-hotkeys.test.ts`

- [ ] **Step 1: 先写 entry 级失败测试，锁定共享 lifecycle 行为**

新增 `src/composables/__tests__/app/settingsEntry.test.ts`，至少覆盖：

```ts
it("loads settings, available terminals and launcher hotkey through lifecycle bridge", async () => {
  // mount settingsEntry
  // expect(loadSettings).toHaveBeenCalled()
  // expect(loadAvailableTerminals).toHaveBeenCalled()
  // expect(readLauncherHotkey).toHaveBeenCalled()
});

it("invokes show_settings_window_when_ready only after nextTick + rAF", async () => {
  // expect(invokeMock).toHaveBeenCalledWith("show_settings_window_when_ready")
});
```

并保留 `app.settings-hotkeys.test.ts` 里的真实入口断言：
- `show_settings_window_when_ready`
- hotkey 录制与持久化
- Escape 只关闭 Settings，不误伤输入态

- [ ] **Step 2: 跑 Settings 生命周期相关测试，确认 entry 尚不存在时先失败**

Run:
- `npm run test:run -- src/composables/__tests__/app/useAppLifecycle.test.ts src/composables/__tests__/app/useAppLifecycleBridge.test.ts src/composables/__tests__/app/settingsScene.test.ts src/composables/__tests__/app/settingsEntry.test.ts src/__tests__/app.settings-hotkeys.test.ts`

Expected:
- FAIL，`settingsEntry.ts` 与新的入口测试尚未落地

- [ ] **Step 3: 用 shared scene + lifecycle bridge 实现 settings entry**

实现要求：
- `settingsEntry.ts` 负责：
  - 创建 ports / `settingsSyncChannel`
  - 创建 `settingsScene`
  - 复用 `useAppLifecycleBridge()`
  - 封装 Settings 独立窗口的 `onWindowKeydown`
  - 在 `onSettingsReady` 里执行：

```ts
await nextTick();
await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
await ports.invoke("show_settings_window_when_ready");
```

- `viewModel.ts`
  - 如果 `createSettingsMutationHandlers()` 能复用，就提取/导出给 entry 使用
  - 不要让 AppSettings 再手写保存 toast / persist 生命周期
- `AppSettings.vue`
  - 只创建 entry 并把 `settingsVm` 透传给 `SettingsWindow`
  - 删除 `onMounted/onBeforeUnmount` 里手写的 `hashchange/storage/BroadcastChannel/loadLauncherHotkey/loadAvailableTerminals/show_settings_window_when_ready`
- `settingsEntry.ts` 可以给 `useAppLifecycleBridge()` 传 no-op `windowSizing / queue / stagedFeedback / execution` 模块，但接口必须复用共享桥，而不是再手写第二套监听

- [ ] **Step 4: 重新运行 Settings 生命周期回归**

Run:
- `npm run test:run -- src/composables/__tests__/app/useAppLifecycle.test.ts src/composables/__tests__/app/useAppLifecycleBridge.test.ts src/composables/__tests__/app/settingsScene.test.ts src/composables/__tests__/app/settingsEntry.test.ts src/__tests__/app.settings-hotkeys.test.ts`

Expected:
- PASS，且真实入口仍会在 settings shell ready 后调用 `show_settings_window_when_ready`

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/composables/app/useAppCompositionRoot/settingsEntry.ts src/composables/__tests__/app/settingsEntry.test.ts src/composables/app/useAppCompositionRoot/viewModel.ts src/AppSettings.vue src/composables/__tests__/app/useAppLifecycle.test.ts src/composables/__tests__/app/useAppLifecycleBridge.test.ts src/composables/__tests__/app/settingsScene.test.ts src/__tests__/app.settings-hotkeys.test.ts
git commit -m "refactor(settings):将独立窗口并轨到共享 lifecycle 入口"
```

---

## Chunk 4: `useCommandExecution` 内部职责拆分

### Task 5: 先提取 `preflight.ts` 与 `queue.ts`，让 `actions.ts` 只保留装配

**Files:**
- Create: `src/composables/execution/useCommandExecution/preflight.ts`
- Create: `src/composables/execution/useCommandExecution/queue.ts`
- Modify: `src/composables/execution/useCommandExecution/actions.ts`
- Modify: `src/composables/execution/useCommandExecution/index.ts`
- Modify: `src/composables/__tests__/execution/useCommandExecution.test.ts`

- [ ] **Step 1: 先补 contract 测试，锁定 queue/preflight 外部行为不变**

在 `useCommandExecution.test.ts` 增加或强化以下断言：

```ts
it("keeps pendingSubmitMode as an alias of pendingSubmitIntent", () => {
  expect(harness.execution.pendingSubmitMode).toBe(harness.execution.pendingSubmitIntent);
});

it("keeps queue refresh APIs after internal extraction", () => {
  expect(typeof harness.execution.refreshQueuedCommandPreflight).toBe("function");
  expect(typeof harness.execution.refreshAllQueuedPreflight).toBe("function");
});
```

并继续保留已有用例：
- stage with cached preflight issues
- refresh single queued command cache
- refresh all queued preflight
- queue execute safety confirm

- [ ] **Step 2: 运行执行链定向测试，确认当前基线**

Run:
- `npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts`

Expected:
- PASS，作为提取前基线

- [ ] **Step 3: 提取 preflight/queue，不改 `useCommandExecution()` 对外 contract**

实现要求：
- `preflight.ts` 至少承接：
  - prerequisite presence 判断
  - failed issue 收集
  - queue cache 构造辅助
- `queue.ts` 至少承接：
  - `stageCommandWithPreflight`
  - `executeStaged`
  - `refreshQueuedCommandPreflight`
  - `refreshAllQueuedPreflight`
- `actions.ts` 只保留模块拼装与 `removeStagedCommand / updateStagedArg / clearStaging` 级别 glue code
- `index.ts` 保持：

```ts
{
  pendingSubmitIntent,
  pendingSubmitMode: pendingSubmitIntent,
  ...
}
```

  不变

- [ ] **Step 4: 重新运行执行链定向测试**

Run:
- `npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts`

Expected:
- PASS，现有 execute/stage/copy/queue refresh 行为不回归

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/composables/execution/useCommandExecution/preflight.ts src/composables/execution/useCommandExecution/queue.ts src/composables/execution/useCommandExecution/actions.ts src/composables/execution/useCommandExecution/index.ts src/composables/__tests__/execution/useCommandExecution.test.ts
git commit -m "refactor(execution):拆分 preflight 与 queue 职责"
```

### Task 6: 再提取 `panel.ts`、`single.ts` 与 `LauncherCommandPanel` 纯状态逻辑

**Files:**
- Create: `src/composables/execution/useCommandExecution/panel.ts`
- Create: `src/composables/execution/useCommandExecution/single.ts`
- Create: `src/components/launcher/parts/useLauncherCommandPanelState.ts`
- Modify: `src/composables/execution/useCommandExecution/actions.ts`
- Modify: `src/composables/app/useAppCompositionRoot/runtime.ts`
- Modify: `src/composables/app/useAppCompositionRoot/launcherVm.ts`
- Modify: `src/composables/__tests__/app/useAppCompositionViewModel.test.ts`
- Modify: `src/components/launcher/parts/LauncherCommandPanel.vue`
- Modify: `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
- Modify: `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`

- [ ] **Step 1: 先补失败测试，锁定 panel/single 行为与 vm alias**

新增或加强以下断言：

```ts
// useAppCompositionViewModel.test.ts
expect(viewModel.launcherVm.command.submitIntent).toBe("stage");
expect(viewModel.launcherVm.command.submitMode).toBe("stage");

// LauncherCommandPanel.test.ts
it("copy intent never renders danger confirm UI", () => {
  // isDangerous=false 时 copy 只显示复制语义
});

// LauncherWindow.flow.test.ts
it("keeps action panel -> params panel navigation contract", () => {
  // action page 选择 execute/stage/copy 时仍走既有 command-action page
});
```

- [ ] **Step 2: 运行执行链 + launcher 面板相关测试，确认提取前基线**

Run:
- `npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts src/composables/__tests__/app/useAppCompositionViewModel.test.ts src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts src/components/launcher/__tests__/LauncherWindow.flow.test.ts`

Expected:
- PASS，作为 panel/single 提取基线

- [ ] **Step 3: 提取 panel/single，并让 LauncherCommandPanel 只保留 UI glue**

实现要求：
- `panel.ts`
  - `needsPanel()`
  - `openParamInput()`
  - `submitPendingIntent()`
  - `cancelParamInput()`
  - `updatePendingArgValue()`
- `single.ts`
  - 单条 execute/copy
  - danger confirm
  - single prerequisite/preflight
- `runtime.ts`
  - 内部改用 `pendingSubmitIntent` 生成 `pendingSubmitHint`
  - `onNeedPanel` 的 action/params page 切换逻辑保持不变
- `launcherVm.ts`
  - 继续同时透传 `submitIntent` 和兼容 alias `submitMode`
- `useLauncherCommandPanelState.ts`
  - 接管 badge、confirmLabel、arg validation、danger desc id 等纯状态计算
  - `LauncherCommandPanel.vue` 只做 props + emits + template glue，不改视觉和交互文案

- [ ] **Step 4: 重新运行执行链与 launcher 相关测试**

Run:
- `npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts src/composables/__tests__/app/useAppCompositionViewModel.test.ts src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts src/components/launcher/__tests__/LauncherWindow.flow.test.ts`

Expected:
- PASS，`useCommandExecution()` 对外 contract 与 `command-action` 页面流转不变

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/composables/execution/useCommandExecution/panel.ts src/composables/execution/useCommandExecution/single.ts src/components/launcher/parts/useLauncherCommandPanelState.ts src/composables/execution/useCommandExecution/actions.ts src/composables/app/useAppCompositionRoot/runtime.ts src/composables/app/useAppCompositionRoot/launcherVm.ts src/composables/__tests__/app/useAppCompositionViewModel.test.ts src/components/launcher/parts/LauncherCommandPanel.vue src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts src/components/launcher/__tests__/LauncherWindow.flow.test.ts
git commit -m "refactor(execution):拆分 panel 与 single 并收窄命令面板状态"
```

---

## Chunk 5: 动画改单实例追最新目标

### Task 7: 把 Rust resize 调度改成 latest-target 模型，并保留 reveal blocking contract

**Files:**
- Modify: `src-tauri/src/animation/mod.rs`
- Modify: `src-tauri/src/animation/tests_logic.rs`
- Modify: `src/__tests__/app.failure-events.test.ts`

- [ ] **Step 1: 先写失败测试，锁定 latest target 与单实例 timer 语义**

优先把难测试的异步调度先压成可测的纯语义断言，例如：

```rust
#[test]
fn animated_resize_keeps_latest_target_when_multiple_updates_arrive() {
    // 连续 expand -> shrink -> expand 时，最终 latest target 是最后一次尺寸
}

#[test]
fn shrink_timer_is_replaced_instead_of_accumulated() {
    // 第二次 shrink 请求会覆盖第一次 timer token，而不是并存
}
```

如果直接测 tokio task 太脆弱，先在 `mod.rs` 内抽一个小型纯调度 helper/state machine，再让异步层消费它。

- [ ] **Step 2: 运行 Rust 动画测试，确认新调度断言先失败**

Run:
- `cd src-tauri && cargo test animation::tests_logic -- --nocapture`

Expected:
- FAIL，当前实现仍会为每次变化 `tokio::spawn` 新动画/新 shrink timer

- [ ] **Step 3: 实现“单实例动画 + 单实例 shrink timer + latest target”**

实现要求：
- 同时最多一个活动动画执行器
- 同时最多一个 pending shrink timer
- 新请求先写 `latest_target`
- expand / reveal：
  - 取消旧 shrink timer
  - 若已有活动动画，只更新目标，不再额外 spawn 第二个动画
- shrink：
  - 覆盖旧 shrink timer
  - timer 到期后仍以当前 `latest_target` 收缩
- `ResizeCommandMode::Reveal` 继续保持 blocking 语义
- 不改 easing、duration、最小尺寸和前端 bridge command 名称

- [ ] **Step 4: 跑 Rust + 前端 sizing 回归**

Run:
- `cd src-tauri && cargo test animation::tests_logic -- --nocapture`
- `npm run test:run -- src/__tests__/app.failure-events.test.ts`

Expected:
- Rust 调度测试 PASS
- `app.failure-events.test.ts` PASS，尤其是：
  - FlowPanel 打开关闭高度恢复
  - 不会先 overshoot 再回缩
  - 相同尺寸不会重复发 resize
  - animate/reveal fallback 仍可工作

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src-tauri/src/animation/mod.rs src-tauri/src/animation/tests_logic.rs src/__tests__/app.failure-events.test.ts
git commit -m "refactor(animation):改单实例最新目标调度"
```

---

## 全量验证

- [ ] **Step 1: 跑前端定向回归串，确认 chunk 间集成正确**

Run:
- `npm run test:run -- src/services/__tests__/tauriBridge.test.ts src/composables/__tests__/settings/useSettingsWindowTerminal.test.ts src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts src/components/settings/parts/__tests__/SettingsGeneralSection.interactions.test.ts src/stores/__tests__/settingsStore.test.ts src/composables/__tests__/settings/useCommandManagement.test.ts src/composables/__tests__/app/useAppLifecycle.test.ts src/composables/__tests__/app/useAppLifecycleBridge.test.ts src/composables/__tests__/app/settingsEntry.test.ts src/__tests__/app.settings-hotkeys.test.ts src/composables/__tests__/execution/useCommandExecution.test.ts src/composables/__tests__/app/useAppCompositionViewModel.test.ts src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts src/components/launcher/__tests__/LauncherWindow.flow.test.ts src/__tests__/app.failure-events.test.ts`

Expected:
- PASS

- [ ] **Step 2: 跑 Rust 定向回归串**

Run:
- `cd src-tauri && cargo test terminal::tests_cache -- --nocapture`
- `cd src-tauri && cargo test animation::tests_logic -- --nocapture`

Expected:
- PASS

- [ ] **Step 3: 跑工程门禁**

Run:
- `npm run lint`
- `npm run typecheck`
- `npm run test:coverage`
- `npm run build`
- `npm run check:rust`
- `npm run check:all`

Expected:
- 全绿

- [ ] **Step 4: 更新短期记忆并准备下一阶段 prompt**

要求：
- 在 `docs/active_context.md` 追加一条不超过 200 字的 planning 摘要
- 摘要必须包含 plan 文件路径和五个 chunk 的顺序
- 输出下一阶段 prompt，明确读取：
  - `CLAUDE.md`
  - `.ai/AGENTS.md`
  - `.ai/TOOL.md`
  - `docs/superpowers/specs/2026-04-09-runtime-boundary-remediation-design.md`
  - `docs/superpowers/plans/2026-04-09-runtime-boundary-remediation.md`

- [ ] **Step 5: 最终提交**

```bash
git add docs/active_context.md docs/superpowers/plans/2026-04-09-runtime-boundary-remediation.md
git commit -m "docs(plan):补充运行边界收口实现计划"
```
