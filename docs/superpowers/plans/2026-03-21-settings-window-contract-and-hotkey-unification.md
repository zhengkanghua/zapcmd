# Settings Window Contract And Hotkey Unification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 清理 `App.vue` / `viewModel.ts` / `SettingsWindow.vue` 之间已经漂移的死契约，并把热键录制收敛到当前生产 UI 的单一路径。

**Architecture:** 这轮不重新设计热键录制交互，而是承认 `SHotkeyRecorder` 就是当前真实 UI，实现上删除旧的窗口级录制状态机与相关 API；SettingsWindow 壳层只保留当前真正消费的 props / emits，`App.vue` 与 `AppSettings.vue` 不再透传无效接口。测试分成 Settings shell contract、hotkey recorder 组件 contract、应用级回归三层。

**Tech Stack:** Vue 3, Vitest, Vue Test Utils

**设计文档:** `docs/superpowers/specs/2026-03-21-execution-contract-settings-hardening-design.md`

---

## 文件结构

### 修改

| 文件 | 职责 |
|---|---|
| `src/components/settings/types.ts` | 删除未被消费的旧 props 契约 |
| `src/components/settings/SettingsWindow.vue` | 删除无效 emits，只保留当前真实输入输出 |
| `src/components/settings/__tests__/SettingsWindow.layout.test.ts` | 锁定父子 props / emits contract |
| `src/App.vue` | 停止透传死 props / dead emits |
| `src/AppSettings.vue` | 与 `App.vue` 同步清理设置壳层契约 |
| `src/composables/app/useAppCompositionRoot/viewModel.ts` | 删除 `closeConfirmOpen` / `cancelSettingsCloseConfirm` / `discardUnsavedSettingsChanges` / `isHotkeyRecording` / `getHotkeyDisplay` 等死字段 |
| `src/composables/__tests__/app/useAppCompositionViewModel.test.ts` | 锁定 view model 不再暴露死字段 |
| `src/composables/settings/useSettingsWindow/model.ts` | 删除 `recordingHotkeyField` |
| `src/composables/settings/useSettingsWindow/hotkey.ts` | 删除窗口级录制状态机，仅保留值更新相关逻辑 |
| `src/composables/settings/useSettingsWindow/index.ts` | 移除旧 hotkey recording API 透传 |
| `src/composables/__tests__/settings/useSettingsWindowHotkey.test.ts` | 改为只验证值应用与冲突处理，不再验证窗口级 recording 状态 |
| `src/composables/app/useAppWindowKeydown.ts` | 删除 settings 录制专用支路 |
| `src/composables/__tests__/app/useAppWindowKeydown.test.ts` | 锁定 Settings Escape 只做关闭，不再处理录制状态 |
| `src/features/hotkeys/windowKeydownHandlers/settings.ts` | 精简成 Settings Escape close 逻辑 |
| `src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts` | 更新 settings keydown contract |
| `src/components/settings/ui/SHotkeyRecorder.vue` | 保持本地录制为唯一状态源，补明确 emits contract |
| `src/components/settings/ui/__tests__/SHotkeyRecorder.test.ts` | 锁定录制、取消、blur 提交 contract |
| `src/components/settings/parts/SettingsHotkeysSection.vue` | 继续直接使用 `SHotkeyRecorder` 本地录制 |
| `src/__tests__/app.settings-hotkeys.test.ts` | 验证真实录制路径仍然可用，Escape 取消不关闭窗口 |
| `docs/active_context.md` | 记录本轮计划摘要 |

---

## Chunk 1: 清理 SettingsWindow 壳层死契约

### Task 1: 先用测试锁定“哪些接口必须消失”

**Files:**
- Modify: `src/components/settings/__tests__/SettingsWindow.layout.test.ts`
- Modify: `src/composables/__tests__/app/useAppCompositionViewModel.test.ts`
- Modify: `src/App.vue`
- Modify: `src/AppSettings.vue`
- Modify: `src/components/settings/types.ts`
- Modify: `src/components/settings/SettingsWindow.vue`
- Modify: `src/composables/app/useAppCompositionRoot/viewModel.ts`

- [ ] **Step 1: 在 `SettingsWindow.layout.test.ts` 先写失败断言**

加断言确认以下接口不再存在：

```ts
expect("settingsErrorRoute" in props).toBe(false);
expect("closeConfirmOpen" in props).toBe(false);
expect(wrapper.emitted("confirm")).toBeUndefined();
expect(wrapper.emitted("navigate-to-error")).toBeUndefined();
```

在 `useAppCompositionViewModel.test.ts` 增加：

```ts
expect("isHotkeyRecording" in viewModel).toBe(false);
expect("getHotkeyDisplay" in viewModel).toBe(false);
expect("cancelSettingsCloseConfirm" in viewModel).toBe(false);
```

- [ ] **Step 2: 运行 Settings shell 定向测试，确认失败**

Run:
- `npm run test:run -- src/components/settings/__tests__/SettingsWindow.layout.test.ts`
- `npm run test:run -- src/composables/__tests__/app/useAppCompositionViewModel.test.ts`

Expected:
- FAIL，提示当前 view model 和 App 壳层仍在暴露旧接口

- [ ] **Step 3: 最小实现壳层清理**

删除：
- `settingsErrorRoute`
- `closeConfirmOpen`
- `cancelSettingsCloseConfirm`
- `discardUnsavedSettingsChanges`
- `isHotkeyRecording`
- `getHotkeyDisplay`
- `@close/@apply/@confirm/@navigate-to-error/@cancel-close-confirm/@discard-close-confirm`

只保留 `SettingsWindow.vue` 当前真正声明并消费的 props / emits。

- [ ] **Step 4: 重新运行 Settings shell 定向测试，确认变绿**

Run:
- `npm run test:run -- src/components/settings/__tests__/SettingsWindow.layout.test.ts`
- `npm run test:run -- src/composables/__tests__/app/useAppCompositionViewModel.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/components/settings/__tests__/SettingsWindow.layout.test.ts src/composables/__tests__/app/useAppCompositionViewModel.test.ts src/App.vue src/AppSettings.vue src/components/settings/types.ts src/components/settings/SettingsWindow.vue src/composables/app/useAppCompositionRoot/viewModel.ts
git commit -m "refactor(settings):清理漂移的壳层契约"
```

---

## Chunk 2: 热键录制收敛到生产 UI

### Task 2: 删除窗口级录制状态机，只保留 `SHotkeyRecorder` 本地录制

**Files:**
- Modify: `src/composables/settings/useSettingsWindow/model.ts`
- Modify: `src/composables/settings/useSettingsWindow/hotkey.ts`
- Modify: `src/composables/settings/useSettingsWindow/index.ts`
- Modify: `src/composables/__tests__/settings/useSettingsWindowHotkey.test.ts`
- Modify: `src/composables/app/useAppWindowKeydown.ts`
- Modify: `src/composables/__tests__/app/useAppWindowKeydown.test.ts`
- Modify: `src/features/hotkeys/windowKeydownHandlers/settings.ts`
- Modify: `src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`

- [ ] **Step 1: 先写失败测试，锁定旧 recording API 被移除**

在 `useSettingsWindowHotkey.test.ts` 把旧断言改成：

```ts
expect("startHotkeyRecording" in actions).toBe(false);
expect("cancelHotkeyRecording" in actions).toBe(false);
expect("isHotkeyRecording" in actions).toBe(false);
expect("getHotkeyDisplay" in actions).toBe(false);
```

在 `useAppWindowKeydown.test.ts` / `windowKeydownHandlers.test.ts` 增加：

```ts
expect(closeSettingsWindow).toHaveBeenCalledTimes(1);
expect(cancelHotkeyRecording).not.toHaveBeenCalled();
```

- [ ] **Step 2: 运行 hotkey state 定向测试，确认失败**

Run:
- `npm run test:run -- src/composables/__tests__/settings/useSettingsWindowHotkey.test.ts`
- `npm run test:run -- src/composables/__tests__/app/useAppWindowKeydown.test.ts`
- `npm run test:run -- src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`

Expected:
- FAIL，提示旧的 recording state 和 handler 仍存在

- [ ] **Step 3: 最小实现录制状态清理**

删除：
- `recordingHotkeyField`
- `startHotkeyRecording()`
- `cancelHotkeyRecording()`
- `applyRecordedHotkey()`
- Settings keydown handler 中针对录制状态的分支

保留：
- `applyHotkeyChange()`
- 冲突检查
- 持久化

- [ ] **Step 4: 重新运行 hotkey state 定向测试，确认变绿**

Run:
- `npm run test:run -- src/composables/__tests__/settings/useSettingsWindowHotkey.test.ts`
- `npm run test:run -- src/composables/__tests__/app/useAppWindowKeydown.test.ts`
- `npm run test:run -- src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/composables/settings/useSettingsWindow/model.ts src/composables/settings/useSettingsWindow/hotkey.ts src/composables/settings/useSettingsWindow/index.ts src/composables/__tests__/settings/useSettingsWindowHotkey.test.ts src/composables/app/useAppWindowKeydown.ts src/composables/__tests__/app/useAppWindowKeydown.test.ts src/features/hotkeys/windowKeydownHandlers/settings.ts src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts
git commit -m "refactor(hotkeys):删除窗口级录制状态机"
```

### Task 3: 锁定 `SHotkeyRecorder` 作为唯一真实录制路径

**Files:**
- Modify: `src/components/settings/ui/SHotkeyRecorder.vue`
- Modify: `src/components/settings/ui/__tests__/SHotkeyRecorder.test.ts`
- Modify: `src/components/settings/parts/SettingsHotkeysSection.vue`
- Modify: `src/__tests__/app.settings-hotkeys.test.ts`
- Modify: `docs/active_context.md`

- [ ] **Step 1: 先写失败测试，锁定组件级录制 contract**

在 `SHotkeyRecorder.test.ts` 明确保留以下行为：

```ts
expect(wrapper.find(".s-hotkey-recorder--recording").exists()).toBe(true);
await wrapper.get("button").trigger("keydown", { key: "Escape" });
expect(wrapper.emitted("update:modelValue")).toBeUndefined();
```

在 `app.settings-hotkeys.test.ts` 保留：
- 点击录制
- `Escape` 取消
- `blur` 后提交
- 不关闭 settings window

- [ ] **Step 2: 运行录制定向测试，确认失败或暴露回归**

Run:
- `npm run test:run -- src/components/settings/ui/__tests__/SHotkeyRecorder.test.ts`
- `npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts`

Expected:
- 若当前 contract 因清理旧状态产生回归，应 FAIL

- [ ] **Step 3: 最小实现稳定组件 contract**

实现要求：
- `SHotkeyRecorder` 保持本地 `recording` / `capturedKeys`
- `SettingsHotkeysSection.vue` 继续只处理 `update:modelValue`
- 不再从父级请求“显示文本”或“是否录制中”

- [ ] **Step 4: 重新运行录制定向测试，确认变绿**

Run:
- `npm run test:run -- src/components/settings/ui/__tests__/SHotkeyRecorder.test.ts`
- `npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts`

Expected:
- PASS

- [ ] **Step 5: 记录上下文并提交 checkpoint**

```bash
git add src/components/settings/ui/SHotkeyRecorder.vue src/components/settings/ui/__tests__/SHotkeyRecorder.test.ts src/components/settings/parts/SettingsHotkeysSection.vue src/__tests__/app.settings-hotkeys.test.ts docs/active_context.md
git commit -m "refactor(settings):以 SHotkeyRecorder 收口热键录制"
```

---

## 最终验证

- [ ] `npm run test:run -- src/components/settings/__tests__/SettingsWindow.layout.test.ts`
- [ ] `npm run test:run -- src/composables/__tests__/app/useAppCompositionViewModel.test.ts`
- [ ] `npm run test:run -- src/composables/__tests__/settings/useSettingsWindowHotkey.test.ts`
- [ ] `npm run test:run -- src/composables/__tests__/app/useAppWindowKeydown.test.ts`
- [ ] `npm run test:run -- src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`
- [ ] `npm run test:run -- src/components/settings/ui/__tests__/SHotkeyRecorder.test.ts`
- [ ] `npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts`
- [ ] `npm run check:all`

Expected:
- 全绿；SettingsWindow 壳层只剩真实 contract，热键录制只剩生产 UI 路径
