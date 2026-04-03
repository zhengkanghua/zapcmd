# Launcher Pointer Actions And Action Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Launcher 搜索结果补齐鼠标 `执行 / 入队 / 复制` 路径，引入主区域动作面板，扩展参数面板到 `copy` 意图，并让设置、热键与搜索区提示实时对齐。

**Architecture:** 这轮实现分成四层：1）Settings schema 负责 `pointerActions + 新热键` 的单一事实源；2）`useCommandExecution` 负责统一的 `execute / stage / copy` 动作意图与复制出口；3）`command-action` 导航页继续保留，但新增 `panel` 变体区分动作面板与参数面板；4）搜索区提示由同一组 hotkeys + pointerActions 绑定生成，禁止 UI 文案和真实行为分叉。动作面板本身不复制执行逻辑，只做动作选择与导航编排。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Pinia, Vitest, Vue Test Utils, Web Clipboard API, Tauri shell/window bridge

**Spec:** `docs/superpowers/specs/2026-04-03-launcher-pointer-actions-and-action-panel-design.md`

---

## 文件结构

### 预期新增文件

- `src/components/launcher/parts/LauncherActionPanel.vue`
  职责：动作面板主视图；展示命令标题、预览、三个动作卡，以及局部键盘导航（Arrow / Tab / Enter / Esc）。
- `src/components/launcher/parts/__tests__/LauncherActionPanel.test.ts`
  职责：锁定动作面板的渲染、默认焦点、局部热键与选择事件。
- `src/features/launcher/searchHintBuilder.ts`
  职责：纯函数生成搜索区最多两行提示，统一消费 hotkeys 与 pointerActions。
- `src/features/launcher/__tests__/searchHintBuilder.test.ts`
  职责：锁定提示分行、空热键隐藏、左右键映射文案、次级提示裁剪规则。
- `src/services/clipboard.ts`
  职责：统一 `copy text -> success/fail` 的最小平台封装，给搜索结果、动作面板、Flow 面板复用。
- `src/services/__tests__/clipboard.test.ts`
  职责：锁定剪贴板 API 可用/不可用两类结果。
- `src/composables/settings/useSettingsWindow/pointer.ts`
  职责：处理左右键映射的即时持久化与 broadcast，不复用 hotkey 冲突链路。
- `src/composables/__tests__/settings/useSettingsWindowPointer.test.ts`
  职责：锁定左右键设置立即持久化、允许重复动作、无冲突校验。

### 预期修改文件

#### Settings schema / persistence

- `src/stores/settings/defaults.ts`
  增加 `SETTINGS_SCHEMA_VERSION = 2`、`PointerActionSettings`、`SearchResultPointerAction`、`openActionPanel / copySelected` 默认热键，以及 `general.pointerActions` 默认值。
- `src/stores/settings/normalization.ts`
  增加 `normalizePointerAction()` 与 `normalizePointerActions()`，并在 snapshot 规范化时补齐默认左右键映射。
- `src/stores/settings/migration.ts`
  从旧 payload 提取 `general.pointerActions`；缺失时直接补 `{ leftClick: "action-panel", rightClick: "stage" }`；同时为缺失的新热键补新默认。
- `src/stores/settingsStore.ts`
  扩展 state / snapshot / applySnapshot / action，新增 `setPointerAction(field, action)`。
- `src/stores/__tests__/settingsStore.test.ts`
  更新 schema version、默认值、迁移和持久化断言。

#### Settings UI / bindings

- `src/composables/app/useAppCompositionRoot/constants.ts`
  为 `HOTKEY_DEFINITIONS` 增加 `openActionPanel`、`copySelected`。
- `src/composables/settings/useHotkeyBindings.ts`
  增加两个热键的 refs / normalized refs / formatted hints，并改为输出 `searchHintLines` 而不是旧的单行 `keyboardHints`。
- `src/composables/settings/useSettingsWindow/model.ts`
  扩展 `UseSettingsWindowOptions`，接入 `pointerActions` ref。
- `src/composables/settings/useSettingsWindow/index.ts`
  装配新的 pointer action actions。
- `src/composables/settings/useSettingsWindow/viewModel.ts`
  输出 `pointerActionFields`、`pointerActionOptions`、`getPointerActionValue()`。
- `src/composables/settings/useSettingsWindow/persistence.ts`
  仅保持 keyboard hotkey / autostart 持久化职责，不把 pointerActions 混进去。
- `src/composables/app/useAppCompositionRoot/settingsScene.ts`
  把 `pointerActions` store refs 暴露给 scene，并让 `useHotkeyBindings()` 能消费它们生成实时提示。
- `src/composables/app/useAppCompositionRoot/settingsVm.ts`
  若测试或壳层 contract 需要，透传 pointer action 字段到 settings view model。
- `src/composables/app/useAppCompositionRoot/viewModel.ts`
  增加 `applyPointerActionChange` 这种即时保存 mutation handler，保持 settings saved toast 逻辑一致。
- `src/components/settings/types.ts`
  为 `SettingsHotkeysProps` 增加 pointer action fields / options / getter。
- `src/components/settings/SettingsWindow.vue`
  把左右键映射 props / emits 接到 Hotkeys 页面。
- `src/components/settings/parts/SettingsHotkeysSection.vue`
  在现有“全局 / 搜索区 / 队列”分组之外新增“鼠标操作”分组，用 `SDropdown` 呈现左右键动作。
- `src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts`
  锁定新增鼠标操作分组、两个 dropdown、且不展示冲突 banner。
- `src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts`
  保留 keyboard hotkey 冲突行为，同时新增 pointerActions 持久化场景。
- `src/__tests__/app.settings-hotkeys.test.ts`
  覆盖设置窗口真实 UI：修改左右键映射、持久化到 localStorage、不会触发热键冲突流程。
- `src/AppSettings.vue`
  接线 `pointerActionFields / options / getPointerActionValue / update-pointer-action`。
- `src/i18n/messages.ts`
  增加鼠标操作分组、左右键字段、动作面板、复制意图、新热键和新提示文案。

#### Launcher intent / action panel / param panel

- `src/features/launcher/types.ts`
  新增 `CommandSubmitIntent = "execute" | "stage" | "copy"`。
- `src/components/launcher/types.ts`
  删除重复的 `ParamSubmitMode`，改为复用 `CommandSubmitIntent`；SearchPanel props 改为 `searchHintLines + leftClickAction + rightClickAction`。
- `src/composables/execution/useCommandExecution/model.ts`
  把 `pendingSubmitMode` 升级为 `pendingSubmitIntent`，`UseCommandExecutionOptions` 增加 `copyTextToClipboard`。
- `src/composables/execution/useCommandExecution/actions.ts`
  将 `needsPanel(command)` 改成 `needsPanel(command, intent)`；新增统一 `dispatchCommandIntent(command, intent)`；`copy` 走复制出口，不触发高危确认；`stage` 不再因为 dangerous 单独开面板。
- `src/composables/execution/useCommandExecution/helpers.ts`
  抽出 `copyRenderedCommand()`，统一成功/失败 feedback；保持 preflight 和 execute 链不被 copy 污染。
- `src/composables/execution/useCommandExecution/index.ts`
  输出 `pendingSubmitIntent` 与新的 dispatch API。
- `src/composables/__tests__/execution/useCommandExecution.test.ts`
  覆盖 copy 直出、copy 需参数、dangerous execute/stage/copy 分流、新的 onNeedPanel 语义。
- `src/components/launcher/parts/LauncherCommandPanel.vue`
  `mode` 改成 `intent`；确认按钮和 badge 支持 `copy`；`isDangerous` 仅在 `intent === "execute"` 时展示危险提示。
- `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
  锁定 `copy` 场景按钮文案、dangerous execute 仍展示高危 UI、dangerous copy 不展示高危 UI。
- `src/components/launcher/parts/queueReview/useFlowPanelInlineArgs.ts`
  Flow 面板复制按钮改走统一 clipboard service，而不是自己直接访问 `navigator.clipboard`。

#### Navigation / page shell / sizing

- `src/composables/launcher/useLauncherNavStack.ts`
  保留 `command-action` page type，但在 `props` 增加 `panel: "actions" | "params"` 与 `intent?: CommandSubmitIntent`；新增 `replaceTopPage()`。
- `src/composables/__tests__/launcher/useLauncherNavStack.test.ts`
  锁定 `replaceTopPage()` 不增栈深、back 行为不变。
- `src/composables/app/useAppCompositionRoot/runtime.ts`
  `onNeedPanel` 根据当前 `panel` 决定 `pushPage` 还是 `replaceTopPage`；新增 `openActionPanel()`；把 command page 打开态注入 layout 和 keydown。
- `src/composables/app/useAppCompositionRoot/launcherVm.ts`
  Search VM 输出 `searchHintLines / leftClickAction / rightClickAction`；Actions VM 输出 `openActionPanel / dispatchCommandIntent / selectActionPanelIntent`。
- `src/components/launcher/LauncherWindow.vue`
  在同一 `command-action` 槽位内切换渲染 `LauncherActionPanel` 或 `LauncherCommandPanel`；接线动作面板的 select/cancel 事件。
- `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
  锁定 action panel / param panel 切换、select-intent 桥接、search 页与 command-action 页渲染分支。
- `src/composables/launcher/useLauncherLayoutMetrics.ts`
  把 `flowOpen` 语义改成 `commandPageOpen`，让动作面板也进入 command page 尺寸口径。
- `src/composables/launcher/useWindowSizing/model.ts`
  将 `paramOverlayMinHeight` 重命名为 `commandPageMinHeight` 或等价语义，避免动作面板继续挂在“参数 overlay”老名下。
- `src/composables/launcher/useWindowSizing/calculation.ts`
  动作面板打开时走 command page 高度 contract，而不是继续按 search page 计算。
- `src/composables/launcher/useWindowSizing/controller.ts`
  command-action settled 时无论是 action panel 还是 param panel 都能正确锁高 / 退出恢复。
- `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`
  增加 action panel 打开场景，确保高度不再依赖 `pendingCommand !== null`。
- `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`
  增加 action panel settled / 退出恢复用例。

#### Search result mapping / search hints / window hotkeys

- `src/components/launcher/parts/LauncherSearchPanel.vue`
  点击/右键行为改为读取 pointer mapping 分发；搜索区提示改成最多两行；次级提示在窄宽度下先隐藏。
- `src/components/launcher/parts/__tests__/LauncherSearchPanel.pointer-actions.test.ts`
  锁定默认左键动作面板、默认右键入队、配置改动后即时切换到 execute/copy。
- `src/features/launcher/searchHintBuilder.ts`
  纯函数生成“一级操作提示 + 二级鼠标/焦点提示”。
- `src/features/launcher/__tests__/searchHintBuilder.test.ts`
  锁定默认提示、新热键缺失时隐藏、左右键配置实时驱动。
- `src/features/hotkeys/windowKeydownHandlers/types.ts`
  主窗口 handler 新增 `openActionPanel`、`copySelected`、`commandPageOpen`、新 normalized hotkeys。
- `src/features/hotkeys/windowKeydownHandlers/main.ts`
  Search zone 新增 `Shift+Enter -> openActionPanel` 与 `CmdOrCtrl+Shift+C -> copySelected`；当动作面板或参数面板打开时，禁止搜索区热键串入。
- `src/features/hotkeys/windowKeydownHandlers/index.ts`
  用 `commandPageOpen` 代替旧的 `pendingCommand` gating。
- `src/composables/app/useAppWindowKeydown.ts`
  注入 `openActionPanel / copySelected` handlers 与新的 command page opened 计算。
- `src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`
  覆盖两个新热键，以及 command page 打开时不再让 Search Enter/Ctrl+Shift+C 漏进。
- `src/composables/__tests__/app/useAppWindowKeydown.test.ts`
  锁定 action panel 打开时全局搜索热键被屏蔽，但 Esc 仍走主窗口返回链。
- `src/__tests__/app.hotkeys.test.ts`
  走真实 App：`Shift+Enter` 打开动作面板、`Ctrl+Shift+C` 复制或进入 copy 参数面板、搜索区提示同步新默认。

#### 可能需要顺手更新的严格类型 fixture

- `src/__tests__/app.failure-events.test.ts`
  如果这里的手写 `hotkeys` / settings snapshot 受新字段影响，补齐新默认字段，避免类型回归。
- `src/composables/__tests__/app/useAppCompositionViewModel.test.ts`
  如果 settingsVm contract 新增 pointer action props / mutation handler，这里同步最小断言。

### 本轮不应额外扩散的文件

- `src/App.vue`
  主入口仍只挂 Launcher，不在本轮把设置窗口嵌回主入口。
- `src/components/launcher/parts/LauncherSafetyOverlay.vue`
  copy / stage 不应改动安全确认 overlay；本轮只保证 execute 仍走原链。
- `src/components/settings/parts/SettingsGeneralSection.vue`
  左右键映射 UI 明确落在 Hotkeys 页面，不应混入 General 页面。

---

## Chunk 1: 数据模型与设置迁移

### Task 1: 先锁定 settings schema、默认值与迁移 contract

**Files:**
- Modify: `src/stores/settings/defaults.ts`
- Modify: `src/stores/settings/normalization.ts`
- Modify: `src/stores/settings/migration.ts`
- Modify: `src/stores/settingsStore.ts`
- Modify: `src/stores/__tests__/settingsStore.test.ts`

- [ ] **Step 1: 在 `settingsStore.test.ts` 先写失败测试**

```ts
it("defaults pointerActions to left action-panel and right stage", () => {
  const snapshot = createDefaultSettingsSnapshot();

  expect(snapshot.version).toBe(2);
  expect(snapshot.general.pointerActions).toEqual({
    leftClick: "action-panel",
    rightClick: "stage"
  });
  expect(snapshot.hotkeys.openActionPanel).toBe("Shift+Enter");
  expect(snapshot.hotkeys.copySelected).toBe("CmdOrCtrl+Shift+C");
});

it("migrates legacy payload by filling pointerActions and new hotkeys with new defaults", () => {
  const migrated = migrateSettingsPayload({
    version: 1,
    hotkeys: { launcher: "alt+z" },
    general: { defaultTerminal: "pwsh" }
  });

  expect(migrated?.version).toBe(2);
  expect(migrated?.general.pointerActions.leftClick).toBe("action-panel");
  expect(migrated?.general.pointerActions.rightClick).toBe("stage");
  expect(migrated?.hotkeys.openActionPanel).toBe("Shift+Enter");
  expect(migrated?.hotkeys.copySelected).toBe("CmdOrCtrl+Shift+C");
});
```

- [ ] **Step 2: 运行 settings store 定向测试，确认失败**

Run:
- `npm run test:run -- src/stores/__tests__/settingsStore.test.ts`

Expected:
- FAIL，提示 schema version、hotkey fields 或 `general.pointerActions` 尚不存在

- [ ] **Step 3: 做最小实现，让 schema 成为唯一事实源**

实现要求：
- `HOTKEY_FIELD_IDS` 追加 `openActionPanel`、`copySelected`
- `PersistedSettingsSnapshot["general"]` 增加 `pointerActions`
- `createDefaultSettingsSnapshot()` 返回：

```ts
general: {
  ...,
  pointerActions: {
    leftClick: "action-panel",
    rightClick: "stage"
  }
}
```

- `normalizePersistedSettingsSnapshot()` 必须补齐 `pointerActions`
- `migrateSettingsPayload()` 对旧 payload 直接补新默认，不保留旧左键执行兼容分支
- store action 增加：

```ts
setPointerAction(field: "leftClick" | "rightClick", action: SearchResultPointerAction): void
```

- [ ] **Step 4: 重新运行 settings store 定向测试，确认变绿**

Run:
- `npm run test:run -- src/stores/__tests__/settingsStore.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/stores/settings/defaults.ts src/stores/settings/normalization.ts src/stores/settings/migration.ts src/stores/settingsStore.ts src/stores/__tests__/settingsStore.test.ts
git commit -m "feat(settings):补齐左右键映射与新热键 schema"
```

### Task 2: 锁定设置窗口中的鼠标操作分组与即时持久化

**Files:**
- Create: `src/composables/settings/useSettingsWindow/pointer.ts`
- Create: `src/composables/__tests__/settings/useSettingsWindowPointer.test.ts`
- Modify: `src/composables/settings/useSettingsWindow/model.ts`
- Modify: `src/composables/settings/useSettingsWindow/index.ts`
- Modify: `src/composables/settings/useSettingsWindow/viewModel.ts`
- Modify: `src/composables/settings/useHotkeyBindings.ts`
- Modify: `src/composables/app/useAppCompositionRoot/constants.ts`
- Modify: `src/composables/app/useAppCompositionRoot/settingsScene.ts`
- Modify: `src/components/settings/types.ts`
- Modify: `src/components/settings/SettingsWindow.vue`
- Modify: `src/components/settings/parts/SettingsHotkeysSection.vue`
- Modify: `src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts`
- Modify: `src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts`
- Modify: `src/__tests__/app.settings-hotkeys.test.ts`
- Modify: `src/AppSettings.vue`
- Modify: `src/i18n/messages.ts`

- [ ] **Step 1: 先写失败测试，锁定鼠标分组和即时保存行为**

```ts
// src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts
expect(wrapper.findAll(".settings-hotkeys-group__title").map((n) => n.text().trim())).toEqual([
  "全局快捷键",
  "搜索区快捷键",
  "鼠标操作",
  "队列快捷键"
]);
expect(wrapper.findAllComponents(SDropdown)).toHaveLength(2);
```

```ts
// src/composables/__tests__/settings/useSettingsWindowPointer.test.ts
await actions.applyPointerActionChange("leftClick", "copy");

expect(options.settingsStore.setPointerAction).toHaveBeenCalledWith("leftClick", "copy");
expect(options.settingsStore.persist).toHaveBeenCalledTimes(1);
expect(options.broadcastSettingsUpdated).toHaveBeenCalledTimes(1);
expect(state.settingsError.value).toBe("");
```

```ts
// src/__tests__/app.settings-hotkeys.test.ts
await selectDropdownOption(wrapper, "搜索结果左键", "复制");

const persisted = readPersistedSettings() as {
  general?: { pointerActions?: { leftClick?: string } };
};
expect(persisted.general?.pointerActions?.leftClick).toBe("copy");
```

- [ ] **Step 2: 运行 Settings UI / pointer 定向测试，确认失败**

Run:
- `npm run test:run -- src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts`
- `npm run test:run -- src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts`
- `npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts`

Expected:
- FAIL，提示 Hotkeys 页面还没有鼠标操作分组，或左右键映射缺少持久化入口

- [ ] **Step 3: 最小实现 settings 绑定与 UI**

实现要求：
- `HOTKEY_DEFINITIONS` 追加：

```ts
{ id: "openActionPanel", label: "openActionPanel", scope: "local" },
{ id: "copySelected", label: "copySelected", scope: "local" }
```

- `useHotkeyBindings()` 先补齐新字段 getter / setter / normalized refs
- `SettingsHotkeysSection.vue` 新增“鼠标操作”卡片，字段固定为：

```ts
type PointerActionFieldId = "leftClick" | "rightClick";
type SearchResultPointerAction = "action-panel" | "execute" | "stage" | "copy";
```

- dropdown 候选值固定 4 个；不做冲突校验；允许左右键相同
- `applyPointerActionChange()` 只做：
  1. 更新本地 ref
  2. `settingsStore.setPointerAction()`
  3. `persistSetting()`
  4. 失败时回滚
- `settings.hotkeys.fields` 增加 `openActionPanel` / `copySelected`
- `settings.hotkeys.mouse` 或等价 i18n 节点增加“搜索结果左键 / 右键”和 4 个动作 label

- [ ] **Step 4: 重新运行 Settings UI / pointer 定向测试，确认变绿**

Run:
- `npm run test:run -- src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts`
- `npm run test:run -- src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts`
- `npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/composables/settings/useSettingsWindow/pointer.ts src/composables/__tests__/settings/useSettingsWindowPointer.test.ts src/composables/settings/useSettingsWindow/model.ts src/composables/settings/useSettingsWindow/index.ts src/composables/settings/useSettingsWindow/viewModel.ts src/composables/settings/useHotkeyBindings.ts src/composables/app/useAppCompositionRoot/constants.ts src/composables/app/useAppCompositionRoot/settingsScene.ts src/components/settings/types.ts src/components/settings/SettingsWindow.vue src/components/settings/parts/SettingsHotkeysSection.vue src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts src/__tests__/app.settings-hotkeys.test.ts src/AppSettings.vue src/i18n/messages.ts
git commit -m "feat(settings):新增 Launcher 左右键映射与动作热键"
```

---

## Chunk 2: 统一动作意图与复制出口

### Task 3: 先锁定 execute / stage / copy 三种动作意图

**Files:**
- Create: `src/services/clipboard.ts`
- Create: `src/services/__tests__/clipboard.test.ts`
- Modify: `src/features/launcher/types.ts`
- Modify: `src/components/launcher/types.ts`
- Modify: `src/composables/execution/useCommandExecution/model.ts`
- Modify: `src/composables/execution/useCommandExecution/actions.ts`
- Modify: `src/composables/execution/useCommandExecution/helpers.ts`
- Modify: `src/composables/execution/useCommandExecution/index.ts`
- Modify: `src/composables/__tests__/execution/useCommandExecution.test.ts`
- Modify: `src/components/launcher/parts/queueReview/useFlowPanelInlineArgs.ts`

- [ ] **Step 1: 在 `useCommandExecution.test.ts` 和 `clipboard.test.ts` 先写失败测试**

```ts
it("copies no-arg command directly without opening panel or terminal", async () => {
  const command = createNoArgCommand();
  const harness = createHarness();

  await harness.execution.dispatchCommandIntent(command, "copy");

  expect(harness.copyTextToClipboard).toHaveBeenCalledWith("ls -la");
  expect(harness.runCommandInTerminal).not.toHaveBeenCalled();
  expect(harness.onNeedPanel).not.toHaveBeenCalled();
});

it("opens param panel with copy intent when command requires args", async () => {
  const command = createArgCommand();
  const harness = createHarness();

  harness.execution.dispatchCommandIntent(command, "copy");

  expect(harness.execution.pendingSubmitIntent.value).toBe("copy");
  expect(harness.onNeedPanel).toHaveBeenCalledWith(command, "copy");
});

it("does not request safety confirmation when dangerous command is copied", async () => {
  const command = createKillTaskCommand();
  const harness = createHarness();

  await harness.execution.dispatchCommandIntent(command, "copy");

  expect(harness.execution.safetyDialog.value).toBeNull();
  expect(harness.copyTextToClipboard).toHaveBeenCalledTimes(1);
});
```

```ts
// src/services/__tests__/clipboard.test.ts
await expect(copyTextToClipboard("echo hi")).resolves.toBeUndefined();
await expect(copyTextToClipboard("echo hi")).rejects.toThrow("clipboard API unavailable");
```

- [ ] **Step 2: 运行 execution / clipboard 定向测试，确认失败**

Run:
- `npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts`
- `npm run test:run -- src/services/__tests__/clipboard.test.ts`

Expected:
- FAIL，提示当前只有 `execute/stage` 两种 intent，且复制仍是分散逻辑

- [ ] **Step 3: 最小实现统一 intent 与复制出口**

实现要求：
- 把所有 `ParamSubmitMode` / `pendingSubmitMode` 改成：

```ts
export type CommandSubmitIntent = "execute" | "stage" | "copy";
```

- `dispatchCommandIntent(command, intent)` 成为唯一入口：
  1. `execute`：保留现有 execute / safety / preflight 链
  2. `stage`：dangerous 不再单独开 panel，只在有参数时开参数面板
  3. `copy`：无参数直接复制渲染命令；有参数开参数面板；永不触发 danger confirmation
- `needsPanel(command, intent)` 必须意图感知：

```ts
if (intent === "copy") return hasArgs;
if (intent === "stage") return hasArgs;
return hasArgs || (command.dangerous === true && !isDangerDismissed(command.id));
```

- `submitParamInput()` 里新增 `copy` 分支：

```ts
if (intent === "copy") {
  resetPendingCommand();
  void copyRenderedCommand(command, values);
  return true;
}
```

- Flow 面板复制按钮改调 `copyTextToClipboard()`，成功/失败文案继续用 `common.copied / common.copyFailed`

- [ ] **Step 4: 重新运行 execution / clipboard 定向测试，确认变绿**

Run:
- `npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts`
- `npm run test:run -- src/services/__tests__/clipboard.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/services/clipboard.ts src/services/__tests__/clipboard.test.ts src/features/launcher/types.ts src/components/launcher/types.ts src/composables/execution/useCommandExecution/model.ts src/composables/execution/useCommandExecution/actions.ts src/composables/execution/useCommandExecution/helpers.ts src/composables/execution/useCommandExecution/index.ts src/composables/__tests__/execution/useCommandExecution.test.ts src/components/launcher/parts/queueReview/useFlowPanelInlineArgs.ts
git commit -m "feat(launcher):统一 execute stage copy 动作意图"
```

---

## Chunk 3: 动作面板与参数面板联动

### Task 4: 在现有 `command-action` 页内引入动作面板变体

**Files:**
- Create: `src/components/launcher/parts/LauncherActionPanel.vue`
- Create: `src/components/launcher/parts/__tests__/LauncherActionPanel.test.ts`
- Modify: `src/composables/launcher/useLauncherNavStack.ts`
- Modify: `src/composables/__tests__/launcher/useLauncherNavStack.test.ts`
- Modify: `src/composables/app/useAppCompositionRoot/runtime.ts`
- Modify: `src/composables/app/useAppCompositionRoot/launcherVm.ts`
- Modify: `src/components/launcher/LauncherWindow.vue`
- Modify: `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
- Modify: `src/components/launcher/parts/LauncherCommandPanel.vue`
- Modify: `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
- Modify: `src/composables/launcher/useLauncherLayoutMetrics.ts`
- Modify: `src/composables/launcher/useWindowSizing/model.ts`
- Modify: `src/composables/launcher/useWindowSizing/calculation.ts`
- Modify: `src/composables/launcher/useWindowSizing/controller.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`

- [ ] **Step 1: 先写失败测试，锁定 page variant 与 action panel contract**

```ts
// src/composables/__tests__/launcher/useLauncherNavStack.test.ts
pushPage({ type: "command-action", props: { panel: "actions", command } });
replaceTopPage({ type: "command-action", props: { panel: "params", command, intent: "copy" } });

expect(stack.value).toHaveLength(2);
expect(currentPage.value.props?.panel).toBe("params");
expect(currentPage.value.props?.intent).toBe("copy");
```

```ts
// src/components/launcher/parts/__tests__/LauncherActionPanel.test.ts
await wrapper.trigger("keydown", { key: "ArrowDown" });
await wrapper.trigger("keydown", { key: "Enter" });

expect(wrapper.emitted("select-intent")?.[0]).toEqual(["stage"]);
expect(wrapper.emitted("cancel")).toBeUndefined();
```

```ts
// src/components/launcher/__tests__/LauncherWindow.flow.test.ts
expect(wrapper.find("launcher-action-panel-stub").exists()).toBe(true);
expect(wrapper.find("launcher-command-panel-stub").exists()).toBe(false);
```

```ts
// src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
it("command page open 时即使 pendingCommand 为空，也走 commandPageMinHeight", () => {
  const size = resolveWindowSize(
    createBaseOptions({
      commandPageOpen: ref(true),
      pendingCommand: ref(null)
    })
  );

  expect(size.height).toBeGreaterThan(WINDOW_SIZING_CONSTANTS.windowBaseHeight);
});
```

- [ ] **Step 2: 运行 action panel / nav / sizing 定向测试，确认失败**

Run:
- `npm run test:run -- src/composables/__tests__/launcher/useLauncherNavStack.test.ts`
- `npm run test:run -- src/components/launcher/parts/__tests__/LauncherActionPanel.test.ts`
- `npm run test:run -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
- `npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`
- `npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`

Expected:
- FAIL，提示当前 nav page 没有 panel variant、动作面板组件缺失、window sizing 仍只认 `pendingCommand`

- [ ] **Step 3: 实现 `command-action` 双变体，但不复制业务逻辑**

实现要求：
- `NavPage.props` 扩展为：

```ts
props?: {
  command?: CommandTemplate;
  panel?: "actions" | "params";
  intent?: CommandSubmitIntent;
  isDangerous?: boolean;
}
```

- `replaceTopPage(page)` 只替换最后一个栈元素，不新增深度
- `runtime.ts`：
  1. `openActionPanel(command)` -> push `{ panel: "actions" }`
  2. `onNeedPanel(command, intent)`：
     - 若当前就是 action panel，则 `replaceTopPage({ panel: "params", intent })`
     - 否则 `pushPage({ panel: "params", intent })`
  3. `commandPageOpen` = `navStack.currentPage.value.type === "command-action"`
- `LauncherWindow.vue`：
  - `panel === "actions"` 渲染 `LauncherActionPanel`
  - `panel === "params"` 渲染 `LauncherCommandPanel`
- `LauncherCommandPanel.vue`：
  - `mode` 改 `intent`
  - `confirmLabel` 新增 `copy`
  - `isDangerous` 只在 execute intent 为真

- [ ] **Step 4: 让动作面板也进入 command page 尺寸 contract**

实现要求：
- `useLauncherLayoutMetrics()` 传入 `commandPageOpen`，不再让动作面板继续沿用 search page 口径
- `useWindowSizing/model.ts` 里的 `paramOverlayMinHeight` 改为 `commandPageMinHeight`
- `calculation.ts / controller.ts` 中 command page 的进入、settled、退出恢复都不再依赖 `pendingCommand !== null`

- [ ] **Step 5: 重新运行 action panel / nav / sizing 定向测试，确认变绿**

Run:
- `npm run test:run -- src/composables/__tests__/launcher/useLauncherNavStack.test.ts`
- `npm run test:run -- src/components/launcher/parts/__tests__/LauncherActionPanel.test.ts`
- `npm run test:run -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
- `npm run test:run -- src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
- `npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`
- `npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`

Expected:
- PASS

- [ ] **Step 6: 提交 checkpoint**

```bash
git add src/components/launcher/parts/LauncherActionPanel.vue src/components/launcher/parts/__tests__/LauncherActionPanel.test.ts src/composables/launcher/useLauncherNavStack.ts src/composables/__tests__/launcher/useLauncherNavStack.test.ts src/composables/app/useAppCompositionRoot/runtime.ts src/composables/app/useAppCompositionRoot/launcherVm.ts src/components/launcher/LauncherWindow.vue src/components/launcher/__tests__/LauncherWindow.flow.test.ts src/components/launcher/parts/LauncherCommandPanel.vue src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts src/composables/launcher/useLauncherLayoutMetrics.ts src/composables/launcher/useWindowSizing/model.ts src/composables/launcher/useWindowSizing/calculation.ts src/composables/launcher/useWindowSizing/controller.ts src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git commit -m "feat(launcher):新增动作面板并接入 command-action 导航页"
```

---

## Chunk 4: 搜索区提示、鼠标映射与窗口热键

### Task 5: 锁定搜索结果左右键分发与两行提示

**Files:**
- Create: `src/features/launcher/searchHintBuilder.ts`
- Create: `src/features/launcher/__tests__/searchHintBuilder.test.ts`
- Create: `src/components/launcher/parts/__tests__/LauncherSearchPanel.pointer-actions.test.ts`
- Modify: `src/components/launcher/parts/LauncherSearchPanel.vue`
- Modify: `src/features/hotkeys/windowKeydownHandlers/types.ts`
- Modify: `src/features/hotkeys/windowKeydownHandlers/main.ts`
- Modify: `src/features/hotkeys/windowKeydownHandlers/index.ts`
- Modify: `src/composables/app/useAppWindowKeydown.ts`
- Modify: `src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`
- Modify: `src/composables/__tests__/app/useAppWindowKeydown.test.ts`
- Modify: `src/__tests__/app.hotkeys.test.ts`

- [ ] **Step 1: 先写失败测试，锁定默认鼠标映射与新热键**

```ts
// src/components/launcher/parts/__tests__/LauncherSearchPanel.pointer-actions.test.ts
await wrapper.get(".result-item").trigger("click");
expect(wrapper.emitted("open-action-panel")?.[0]).toEqual([command]);

await wrapper.get(".result-item").trigger("contextmenu");
expect(wrapper.emitted("enqueue-result")?.[0]).toEqual([command]);
```

```ts
// src/features/launcher/__tests__/searchHintBuilder.test.ts
const lines = buildSearchHintLines({
  hotkeys: {
    executeSelected: "Enter",
    stageSelected: "CmdOrCtrl+Enter",
    openActionPanel: "Shift+Enter",
    copySelected: "CmdOrCtrl+Shift+C",
    switchFocus: "Ctrl+Tab"
  },
  pointerActions: {
    leftClick: "action-panel",
    rightClick: "stage"
  }
});

expect(lines[0]?.map((item) => item.action)).toEqual(["选择", "执行", "入队", "动作", "复制"]);
expect(lines[1]?.map((item) => item.action)).toContain("左键 动作");
expect(lines[1]?.map((item) => item.action)).toContain("右键 入队");
```

```ts
// src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts
handler(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true }));
expect(spies.openActionPanel).toHaveBeenCalledTimes(1);

handler(new KeyboardEvent("keydown", { key: "c", ctrlKey: true, shiftKey: true }));
expect(spies.copySelected).toHaveBeenCalledTimes(1);
```

```ts
// src/composables/__tests__/app/useAppWindowKeydown.test.ts
harness.commandPageOpen.value = true;
harness.handler(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true }));

expect(harness.commandExecution.openActionPanel).not.toHaveBeenCalled();
```

- [ ] **Step 2: 运行 search panel / hint / keydown 定向测试，确认失败**

Run:
- `npm run test:run -- src/components/launcher/parts/__tests__/LauncherSearchPanel.pointer-actions.test.ts`
- `npm run test:run -- src/features/launcher/__tests__/searchHintBuilder.test.ts`
- `npm run test:run -- src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`
- `npm run test:run -- src/composables/__tests__/app/useAppWindowKeydown.test.ts`
- `npm run test:run -- src/__tests__/app.hotkeys.test.ts`

Expected:
- FAIL，提示 SearchPanel 仍是左键执行 / 右键入队，且新热键没有 handler

- [ ] **Step 3: 最小实现搜索结果动作分发与两行提示**

实现要求：
- SearchPanel props 增加：

```ts
leftClickAction: SearchResultPointerAction;
rightClickAction: SearchResultPointerAction;
searchHintLines: SearchHintLine[];
```

- SearchPanel 结果项分发逻辑改成：

```ts
function dispatchPointerAction(action: SearchResultPointerAction, command: CommandTemplate): void {
  if (action === "action-panel") emit("open-action-panel", command);
  if (action === "execute") emit("execute-result", command);
  if (action === "stage") emit("enqueue-result", command);
  if (action === "copy") emit("copy-result", command);
}
```

- `searchHintBuilder.ts` 只生成两条逻辑行：
  1. 一级：选择 / 执行 / 入队 / 动作 / 复制
  2. 二级：左键 / 右键 / 切焦点 / 队列显隐（如果配置）
- `LauncherSearchPanel.vue`：
  - 第一行始终显示
  - 第二行单独容器显示，并带 `keyboard-hint--secondary` 之类 class；窄宽度时优先隐藏第二行，不做 marquee

- [ ] **Step 4: 接上窗口级新热键与 gating**

实现要求：
- `windowKeydownHandlers.types.ts` 新增：

```ts
openActionPanel: (item: TItem) => void;
copySelected: (item: TItem) => void;
commandPageOpen: RefLike<boolean>;
normalizedOpenActionPanelHotkey: RefLike<string>;
normalizedCopySelectedHotkey: RefLike<string>;
```

- `handleSearchZoneHotkeys()` 追加：
  - `Shift+Enter` -> `openActionPanel(selected)`
  - `CmdOrCtrl+Shift+C` -> `copySelected(selected)`
- `createWindowKeydownHandler()` 用 `commandPageOpen` 代替旧 `pendingCommand` gating，保证 action panel 打开时 Search 区热键失效
- `useAppWindowKeydown.ts` 把 Launcher action handlers 与 normalized refs 接进去

- [ ] **Step 5: 重新运行 search panel / hint / keydown 定向测试，确认变绿**

Run:
- `npm run test:run -- src/components/launcher/parts/__tests__/LauncherSearchPanel.pointer-actions.test.ts`
- `npm run test:run -- src/features/launcher/__tests__/searchHintBuilder.test.ts`
- `npm run test:run -- src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`
- `npm run test:run -- src/composables/__tests__/app/useAppWindowKeydown.test.ts`
- `npm run test:run -- src/__tests__/app.hotkeys.test.ts`

Expected:
- PASS

- [ ] **Step 6: 提交 checkpoint**

```bash
git add src/features/launcher/searchHintBuilder.ts src/features/launcher/__tests__/searchHintBuilder.test.ts src/components/launcher/parts/__tests__/LauncherSearchPanel.pointer-actions.test.ts src/components/launcher/parts/LauncherSearchPanel.vue src/features/hotkeys/windowKeydownHandlers/types.ts src/features/hotkeys/windowKeydownHandlers/main.ts src/features/hotkeys/windowKeydownHandlers/index.ts src/composables/app/useAppWindowKeydown.ts src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts src/composables/__tests__/app/useAppWindowKeydown.test.ts src/__tests__/app.hotkeys.test.ts
git commit -m "feat(launcher):接入左右键映射与动作面板热键"
```

---

## Chunk 5: 集成回归与阶段收尾

### Task 6: 做 App 级回归、补短期记忆并完成交接

**Files:**
- Modify: `src/composables/app/useAppCompositionRoot/settingsVm.ts`
- Modify: `src/composables/app/useAppCompositionRoot/viewModel.ts`
- Modify: `src/composables/__tests__/app/useAppCompositionViewModel.test.ts`
- Modify: `src/__tests__/app.failure-events.test.ts`
- Modify: `docs/active_context.md`

- [ ] **Step 1: 补 App / view model 级失败测试**

```ts
expect("pointerActionFields" in viewModel.settingsVm).toBe(true);
expect("applyPointerActionChange" in viewModel.settingsVm).toBe(true);
```

如果 `app.failure-events.test.ts` 因新增 hotkey fields 或 settings schema 失败：

```ts
hotkeys: {
  ...baseSnapshot.hotkeys,
  openActionPanel: "Shift+Enter",
  copySelected: "Ctrl+Shift+C"
}
```

- [ ] **Step 2: 运行 contract / fixture 定向测试，确认失败后收口**

Run:
- `npm run test:run -- src/composables/__tests__/app/useAppCompositionViewModel.test.ts`
- `npm run test:run -- src/__tests__/app.failure-events.test.ts`

Expected:
- 若 settingsVm contract 或手写 fixture 还没补齐，应 FAIL

- [ ] **Step 3: 做最小修补并更新短期记忆**

`docs/active_context.md` 追加 1 条精简记录，控制在 200 字以内，例如：

```md
- 2026-04-03：已补充 Launcher 左右键映射/动作面板/复制入口实现计划，拆成 settings schema、统一 intent/copy、command-action 双变体、两行提示与热键回归，下一阶段按 plan 执行。
```

- [ ] **Step 4: 运行最终验证**

Run:
- `npm run test:run -- src/stores/__tests__/settingsStore.test.ts`
- `npm run test:run -- src/composables/__tests__/settings/useSettingsWindowPointer.test.ts`
- `npm run test:run -- src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts`
- `npm run test:run -- src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts`
- `npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts`
- `npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts`
- `npm run test:run -- src/services/__tests__/clipboard.test.ts`
- `npm run test:run -- src/components/launcher/parts/__tests__/LauncherActionPanel.test.ts`
- `npm run test:run -- src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
- `npm run test:run -- src/components/launcher/parts/__tests__/LauncherSearchPanel.pointer-actions.test.ts`
- `npm run test:run -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
- `npm run test:run -- src/features/launcher/__tests__/searchHintBuilder.test.ts`
- `npm run test:run -- src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`
- `npm run test:run -- src/composables/__tests__/app/useAppWindowKeydown.test.ts`
- `npm run test:run -- src/__tests__/app.hotkeys.test.ts`
- `npm run test:run -- src/composables/__tests__/launcher/useLauncherNavStack.test.ts`
- `npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`
- `npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`
- `npm run test:run -- src/composables/__tests__/app/useAppCompositionViewModel.test.ts`
- `npm run test:run -- src/__tests__/app.failure-events.test.ts`
- `npm run check:all`

Expected:
- 全绿；默认行为为“左键动作面板、右键入队”；`Shift+Enter` 和 `CmdOrCtrl+Shift+C` 可用；copy 意图对有参命令会先进参数面板；搜索区提示与设置实时一致

- [ ] **Step 5: 提交最终 docs / 收尾 checkpoint**

```bash
git add src/composables/app/useAppCompositionRoot/settingsVm.ts src/composables/app/useAppCompositionRoot/viewModel.ts src/composables/__tests__/app/useAppCompositionViewModel.test.ts src/__tests__/app.failure-events.test.ts docs/active_context.md
git commit -m "docs(plan):补充 Launcher 动作面板与鼠标映射实现计划"
```

---

## 执行提醒

- `copy` 是新 intent，不是 `execute` 的别名；绝对不要在 copy 链上复用 safety confirmation。
- `stage` 只是加入执行流，dangerous 不应再单独开参数面板或安全弹层，除非命令本身需要参数。
- `action-panel` 只是入口，不是额外 overlay；必须继续走现有主区域 `command-action` 壳。
- 搜索区提示必须只从同一组 state 生成：`settings.hotkeys + settings.general.pointerActions`；禁止手写静态文案。
- 这轮不保留旧默认兼容逻辑；迁移缺失字段时直接写新默认。
