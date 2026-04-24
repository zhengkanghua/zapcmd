# Launcher WindowSizing / Settings Dropdown Split Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变外部 contract 的前提下，拆分 `useWindowSizing/controller.ts` 与 `SDropdown.vue` 的内部职责，降低状态机复杂度、测量链路回归风险和后续维护成本。

**Architecture:** 本计划把两个独立热点拆成两个 chunk，并共享同一个最终验收门禁。`useWindowSizing` 继续暴露原有 controller API，但把“状态创建 / 同步编排 / Flow reveal / 通知状态迁移”下沉到同目录 helper；`SDropdown` 继续保留现有 props、emits、Teleport DOM/ARIA contract，但把“定位 / 键盘 / 全局监听”抽成可单测 helper 或 composable。

**Tech Stack:** Vue 3 Composition API、TypeScript、Vitest、现有 Launcher / Settings contract tests、`npm run check:all`

---

## 0. 执行约束

- [ ] 只在 `src/composables/launcher/useWindowSizing/**`、`src/components/settings/ui/**` 及直接相关测试中落地，禁止顺手扩散到无关模块。
- [ ] 所有行为变更一律先写 failing tests，再写最小实现。
- [ ] `useWindowSizing` 的对外返回字段、`SDropdown` 的 props/emits 与现有 DOM/ARIA contract 都保持不变。
- [ ] 每个 chunk 结束至少跑该 chunk 的 focused tests；所有 chunk 完成后必须执行 `npm run check:all`。
- [ ] `docs/active_context.md` 只追加，不覆盖；记录计划落地或执行结果时保持一句话收口。

## File Structure

### `useWindowSizing` 拆分后的目标边界

| 文件 | 责任 |
| --- | --- |
| `src/composables/launcher/useWindowSizing/controller.ts` | 只保留组装壳层：创建 state / helper，暴露现有 public API。 |
| `src/composables/launcher/useWindowSizing/controllerState.ts` | 定义 `WindowSizingState`、Flow prepared gate 与初始化逻辑，避免 state shape 散落在 controller 壳层。 |
| `src/composables/launcher/useWindowSizing/controllerSync.ts` | 封装 queued sync、bridge 选择、session 同步、search-settling 分支与正常 resize 分支。 |
| `src/composables/launcher/useWindowSizing/controllerEvents.ts` | 封装 `notify*` 与 `clearResizeTimer` 相关状态迁移，避免 controller 同时承担状态机转移与 API 暴露。 |
| `src/composables/launcher/useWindowSizing/flowRevealCoordinator.ts` | 封装 Flow reveal 的 prepared 等待、最小高度重试测量与 reveal resize。 |
| `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts` | 缩成 public factory / glue contract 测试，只保留跨 helper 的整链路断言。 |
| `src/composables/__tests__/launcher/useWindowSizing.controllerSync.test.ts` | 新增 queued sync / settings short-circuit / search-settling 优先级的纯 helper 测试。 |
| `src/composables/__tests__/launcher/useWindowSizing.controllerEvents.test.ts` | 新增 `notify*`、Flow observation timer、`clearResizeTimer` 的状态迁移测试。 |
| `src/composables/__tests__/launcher/useWindowSizing.flowRevealCoordinator.test.ts` | 新增 Flow prepared gate、测量重试与 reveal resize contract 测试。 |

### `SDropdown` 拆分后的目标边界

| 文件 | 责任 |
| --- | --- |
| `src/components/settings/ui/SDropdown.vue` | 只保留 props/emits、attrs 转发、模板与少量组装逻辑。 |
| `src/components/settings/ui/dropdownTypes.ts` | 承载 `DropdownVariant`、`DropdownOption` 等共享类型，避免 helper 与 `.vue` 双向耦合。 |
| `src/components/settings/ui/dropdownPositioning.ts` | 纯函数化 panel 定位与 min-width 计算。 |
| `src/components/settings/ui/dropdownKeyboard.ts` | 纯函数化 keydown -> action/focusIndex 转移逻辑。 |
| `src/components/settings/ui/useDropdownGlobalInteractions.ts` | 统一 outside pointerdown、window resize/scroll 监听注册与销毁。 |
| `src/components/settings/ui/__tests__/SDropdown.test.ts` | 保留组件级 DOM/ARIA/Teleport contract 测试。 |
| `src/components/settings/ui/__tests__/dropdownPositioning.test.ts` | 新增定位 contract 测试。 |
| `src/components/settings/ui/__tests__/dropdownKeyboard.test.ts` | 新增键盘转移 contract 测试。 |
| `src/components/settings/ui/__tests__/useDropdownGlobalInteractions.test.ts` | 新增全局监听生命周期测试。 |

## Chunk 1: `useWindowSizing/controller.ts` 拆分

### Task 1: 先把 controller 的隐式状态机锁成可拆分 contract

**Files:**
- Create: `src/composables/__tests__/launcher/useWindowSizing.controllerSync.test.ts`
- Create: `src/composables/__tests__/launcher/useWindowSizing.controllerEvents.test.ts`
- Create: `src/composables/__tests__/launcher/useWindowSizing.flowRevealCoordinator.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`
- Modify: `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
- Modify: `src/composables/__tests__/app/launcherRuntimeBindings.test.ts`
- Modify: `src/composables/__tests__/app/useAppCompositionViewModel.test.ts`

- [ ] **Step 1: 新增 helper 级 failing tests，先锁细粒度 contract**

```ts
// src/composables/__tests__/launcher/useWindowSizing.controllerSync.test.ts
it("settings window 下直接 short-circuit，不触发 resize bridge", async () => {
  const sync = createWindowSizingSync(...);
  await sync.run(requestAnimateMainWindowSize);
  expect(requestAnimateMainWindowSize).not.toHaveBeenCalled();
});

it("sync 中途再次触发时只置 queued 标记，finally 后补跑一次", async () => {
  const sync = createWindowSizingSync(...);
  await Promise.all([sync.run(bridge), sync.run(bridge)]);
  expect(bridge).toHaveBeenCalledTimes(2);
});
```

```ts
// src/composables/__tests__/launcher/useWindowSizing.controllerEvents.test.ts
it("notifyFlowPanelSettled 会开启 observation 并触发一次 schedule", () => {
  const events = createWindowSizingEvents(...);
  events.notifyFlowPanelSettled();
  expect(state.flowPanelSettled).toBe(true);
  expect(scheduleWindowSync).toHaveBeenCalledTimes(1);
});

it("clearResizeTimer 只清 Flow observation timer，不改 public API", () => {
  const events = createWindowSizingEvents(...);
  events.clearResizeTimer();
  expect(state.flowPanelObservationIdleTimer).toBeNull();
});
```

```ts
// src/composables/__tests__/launcher/useWindowSizing.flowRevealCoordinator.test.ts
it("prepareFlowPanelReveal 会等待 prepared gate，再按实测高度执行 reveal resize", async () => {
  const reveal = createFlowRevealCoordinator(...);
  const task = reveal.prepare();
  reveal.notifyPrepared();
  await task;
  expect(requestResizeMainWindowForReveal).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: 收口现有 controller 集成测试，只保留 public glue contract**

重点保留：
- `requestCommandPanelExit` 整链路
- Search/Command/Flow 三态切换的最终外显行为
- `createWindowSizingController()` 返回字段稳定
- `LauncherWindow.flow.test.ts`、`launcherRuntimeBindings.test.ts`、`useAppCompositionViewModel.test.ts` 中对外 wiring 不变

- [ ] **Step 3: 运行 focused tests，确认当前因为 helper 尚不存在而失败**

Run:
`npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controllerSync.test.ts src/composables/__tests__/launcher/useWindowSizing.controllerEvents.test.ts src/composables/__tests__/launcher/useWindowSizing.flowRevealCoordinator.test.ts src/composables/__tests__/launcher/useWindowSizing.controller.test.ts src/components/launcher/__tests__/LauncherWindow.flow.test.ts src/composables/__tests__/app/launcherRuntimeBindings.test.ts src/composables/__tests__/app/useAppCompositionViewModel.test.ts`

Expected:
- 新增的 helper tests 因缺少模块或导出而失败
- 现有 wiring tests 至少能继续描述“外部 contract 不变”的目标

- [ ] **Step 4: 提交测试基线**

```bash
git add src/composables/__tests__/launcher/useWindowSizing.controllerSync.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.controllerEvents.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.flowRevealCoordinator.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git add src/components/launcher/__tests__/LauncherWindow.flow.test.ts
git add src/composables/__tests__/app/launcherRuntimeBindings.test.ts
git add src/composables/__tests__/app/useAppCompositionViewModel.test.ts
git commit -m "test(launcher): 为窗口尺寸拆分补契约测试"
```

### Task 2: 抽出 state 与 sync runner，让 controller 退回组装壳层

**Files:**
- Create: `src/composables/launcher/useWindowSizing/controllerState.ts`
- Create: `src/composables/launcher/useWindowSizing/controllerSync.ts`
- Modify: `src/composables/launcher/useWindowSizing/controller.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controllerSync.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`

- [ ] **Step 1: 写最小实现，先抽 `controllerState.ts`**

```ts
// controllerState.ts
export interface WindowSizingState extends SearchSettlingState, WindowSizingSessionState {
  syncingWindowSize: boolean;
}

export interface FlowPanelPreparedGate {
  prepared: boolean;
  promise: Promise<void> | null;
  resolve: (() => void) | null;
}

export function createWindowSizingState(options: UseWindowSizingOptions): WindowSizingState {
  // 只保留初始化逻辑，不做副作用
}
```

- [ ] **Step 2: 再抽 `controllerSync.ts`，把 queued sync / resize bridge 编排整体下沉**

```ts
// controllerSync.ts
export function createWindowSizingSync(input: {
  options: UseWindowSizingOptions;
  state: WindowSizingState;
  commandPanelExit: ReturnType<typeof createCommandPanelExitCoordinator>;
  flowPanelPreparedGate: FlowPanelPreparedGate;
  scheduleWindowSync: () => void;
}) {
  return {
    run: async (bridge: ResizeBridge) => { /* 原 createSyncWindowSizeCore 主体 */ },
    runAnimated: async () => { /* options.requestAnimateMainWindowSize */ },
    runImmediate: () => { /* options.requestSetMainWindowSize */ }
  };
}
```

- [ ] **Step 3: 把 `controller.ts` 改成“创建 state + 调 helper + 暴露 API”的薄壳**

要求：
- 不改 `createWindowSizingController()` 返回字段名
- 不改 `useWindowSizing/index.ts` 的对外入口
- 不把 `windowSync.ts`、`sessionCoordinator.ts` 的既有职责再搬回 controller

- [ ] **Step 4: 运行 focused tests，确认 state/sync 抽取后仍然保持对外 contract**

Run:
`npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controllerSync.test.ts src/composables/__tests__/launcher/useWindowSizing.controller.test.ts src/components/launcher/__tests__/LauncherWindow.flow.test.ts src/composables/__tests__/app/launcherRuntimeBindings.test.ts src/composables/__tests__/app/useAppCompositionViewModel.test.ts`

Expected:
- focused tests 全绿
- controller 行数明显下降，主要只剩 wiring

- [ ] **Step 5: 提交 state/sync 拆分**

```bash
git add src/composables/launcher/useWindowSizing/controllerState.ts
git add src/composables/launcher/useWindowSizing/controllerSync.ts
git add src/composables/launcher/useWindowSizing/controller.ts
git add src/composables/__tests__/launcher/useWindowSizing.controllerSync.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git commit -m "refactor(launcher): 拆分窗口尺寸同步编排"
```

### Task 3: 抽出 Flow reveal 与通知状态迁移，完成 controller 壳层收口

**Files:**
- Create: `src/composables/launcher/useWindowSizing/flowRevealCoordinator.ts`
- Create: `src/composables/launcher/useWindowSizing/controllerEvents.ts`
- Modify: `src/composables/launcher/useWindowSizing/controller.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.flowRevealCoordinator.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controllerEvents.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`

- [ ] **Step 1: 先抽 `flowRevealCoordinator.ts`，把 prepared gate / 测量重试 / reveal resize 独立**

```ts
// flowRevealCoordinator.ts
export function createFlowRevealCoordinator(input: {
  options: UseWindowSizingOptions;
  state: WindowSizingState;
  flowPanelPreparedGate: FlowPanelPreparedGate;
  commandPanelExit: ReturnType<typeof createCommandPanelExitCoordinator>;
}) {
  return {
    prepare: async () => { /* 原 prepareFlowPanelReveal */ },
    notifyPrepared: () => { /* prepared gate resolve */ }
  };
}
```

- [ ] **Step 2: 再抽 `controllerEvents.ts`，把 `notify*` / `clearResizeTimer` 的状态转移单点化**

```ts
// controllerEvents.ts
export function createWindowSizingEvents(input: {
  state: WindowSizingState;
  commandPanelExit: ReturnType<typeof createCommandPanelExitCoordinator>;
  flowPanelPreparedGate: FlowPanelPreparedGate;
  scheduleWindowSync: () => void;
}) {
  return {
    notifySearchPageSettled() { ... },
    notifyCommandPageSettled() { ... },
    notifyFlowPanelSettled() { ... },
    notifyFlowPanelPrepared() { ... },
    notifyFlowPanelHeightChange() { ... },
    clearResizeTimer() { ... }
  };
}
```

- [ ] **Step 3: 把 `controller.ts` 收口成最终壳层**

预期形态：
- `controller.ts` 只保留 `createOnAppFocused()`、`createRequestCommandPanelExit()` 这类薄封装
- Flow observation / prepared gate / queued sync 不再散落在文件顶层和返回对象附近

- [ ] **Step 4: 运行 focused tests，确认 Flow reveal 与通知链路无回归**

Run:
`npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.flowRevealCoordinator.test.ts src/composables/__tests__/launcher/useWindowSizing.controllerEvents.test.ts src/composables/__tests__/launcher/useWindowSizing.controller.test.ts src/components/launcher/__tests__/LauncherWindow.flow.test.ts src/composables/__tests__/app/launcherRuntimeBindings.test.ts src/composables/__tests__/app/useAppCompositionViewModel.test.ts`

Expected:
- helper tests 全绿
- controller 仍通过集成测试
- 外层 Launcher wiring 不变

- [ ] **Step 5: 提交 controller 收口**

```bash
git add src/composables/launcher/useWindowSizing/flowRevealCoordinator.ts
git add src/composables/launcher/useWindowSizing/controllerEvents.ts
git add src/composables/launcher/useWindowSizing/controller.ts
git add src/composables/__tests__/launcher/useWindowSizing.flowRevealCoordinator.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.controllerEvents.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git commit -m "refactor(launcher): 收窄窗口尺寸控制器壳层"
```

## Chunk 2: `SDropdown.vue` 拆分

### Task 4: 先把 Dropdown 的定位 / 键盘 / 全局监听拆成 helper contract tests

**Files:**
- Create: `src/components/settings/ui/__tests__/dropdownPositioning.test.ts`
- Create: `src/components/settings/ui/__tests__/dropdownKeyboard.test.ts`
- Create: `src/components/settings/ui/__tests__/useDropdownGlobalInteractions.test.ts`
- Modify: `src/components/settings/ui/__tests__/SDropdown.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsGeneralSection.interactions.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts`
- Modify: `src/styles/__tests__/tailwind-governance-contract.test.ts`

- [ ] **Step 1: 新增定位 / 键盘 / 全局监听的 failing tests**

```ts
// dropdownPositioning.test.ts
it("ghost variant 的 panel minWidth 至少 160px，default 跟随 trigger 宽度", () => {
  expect(resolveDropdownPanelStyle(...)).toMatchObject({ minWidth: "160px" });
});
```

```ts
// dropdownKeyboard.test.ts
it("ArrowDown / ArrowUp / Home / End / Enter / Space / Tab / Escape 产生稳定 action", () => {
  const result = resolveDropdownKeyAction({ open: true, key: "End", ... });
  expect(result.nextFocusedIndex).toBe(2);
});
```

```ts
// useDropdownGlobalInteractions.test.ts
it("打开时注册 pointerdown/resize/scroll，关闭和卸载时完整清理", () => {
  const interactions = useDropdownGlobalInteractions(...);
  interactions.setOpen(true);
  expect(addEventListener).toHaveBeenCalled();
  interactions.dispose();
  expect(removeEventListener).toHaveBeenCalled();
});
```

- [ ] **Step 2: 收口 `SDropdown.test.ts` 为组件级 contract**

保留断言：
- trigger variant / hit target
- selected check icon
- Teleport popup 显示与关闭
- `aria-expanded` / `aria-controls` / `aria-activedescendant`

新增断言：
- helper 抽出后 `.vue` 仍保留同样的 trigger class、`data-local-escape-scope` 与 listbox DOM 结构

- [ ] **Step 3: 运行 focused tests，确认 helper 尚不存在而失败**

Run:
`npm run test:run -- src/components/settings/ui/__tests__/dropdownPositioning.test.ts src/components/settings/ui/__tests__/dropdownKeyboard.test.ts src/components/settings/ui/__tests__/useDropdownGlobalInteractions.test.ts src/components/settings/ui/__tests__/SDropdown.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts src/components/settings/parts/__tests__/SettingsGeneralSection.interactions.test.ts src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts src/styles/__tests__/tailwind-governance-contract.test.ts`

Expected:
- 新增 helper tests 因缺少模块而失败
- 现有 Settings 交互测试继续作为对外行为护栏

- [ ] **Step 4: 提交 Dropdown 测试基线**

```bash
git add src/components/settings/ui/__tests__/dropdownPositioning.test.ts
git add src/components/settings/ui/__tests__/dropdownKeyboard.test.ts
git add src/components/settings/ui/__tests__/useDropdownGlobalInteractions.test.ts
git add src/components/settings/ui/__tests__/SDropdown.test.ts
git add src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts
git add src/components/settings/parts/__tests__/SettingsGeneralSection.interactions.test.ts
git add src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts
git add src/styles/__tests__/tailwind-governance-contract.test.ts
git commit -m "test(settings): 为下拉拆分补契约测试"
```

### Task 5: 抽出定位逻辑与共享类型，先把 popup 计算变成纯函数

**Files:**
- Create: `src/components/settings/ui/dropdownTypes.ts`
- Create: `src/components/settings/ui/dropdownPositioning.ts`
- Modify: `src/components/settings/ui/SDropdown.vue`
- Modify: `src/components/settings/ui/__tests__/dropdownPositioning.test.ts`
- Modify: `src/components/settings/ui/__tests__/SDropdown.test.ts`

- [ ] **Step 1: 写最小 helper**

```ts
// dropdownTypes.ts
export type DropdownVariant = "default" | "ghost";

export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  meta?: string;
}
```

```ts
// dropdownPositioning.ts
export function resolveDropdownPanelStyle(input: {
  triggerRect: DOMRect;
  variant: DropdownVariant;
}): Record<string, string> {
  // 只做 position/top/left/minWidth/zIndex 计算
}
```

- [ ] **Step 2: 修改 `SDropdown.vue`，让 `syncPanelPosition()` 只调用 pure helper**

要求：
- `panelStyle` shape 不变
- 不引入新的视觉 class
- `ghost` / `default` 的 minWidth 语义保持现状

- [ ] **Step 3: 跑 focused tests，确认定位 helper 与组件 contract 同时通过**

Run:
`npm run test:run -- src/components/settings/ui/__tests__/dropdownPositioning.test.ts src/components/settings/ui/__tests__/SDropdown.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts src/styles/__tests__/tailwind-governance-contract.test.ts`

Expected:
- focused tests 全绿
- Settings Commands 的 dialog 内嵌 dropdown 行为不回归

- [ ] **Step 4: 提交定位拆分**

```bash
git add src/components/settings/ui/dropdownTypes.ts
git add src/components/settings/ui/dropdownPositioning.ts
git add src/components/settings/ui/SDropdown.vue
git add src/components/settings/ui/__tests__/dropdownPositioning.test.ts
git add src/components/settings/ui/__tests__/SDropdown.test.ts
git commit -m "refactor(settings): 抽离下拉定位逻辑"
```

### Task 6: 抽出键盘与全局监听生命周期，完成 Dropdown 壳层收口

**Files:**
- Create: `src/components/settings/ui/dropdownKeyboard.ts`
- Create: `src/components/settings/ui/useDropdownGlobalInteractions.ts`
- Modify: `src/components/settings/ui/SDropdown.vue`
- Modify: `src/components/settings/ui/__tests__/dropdownKeyboard.test.ts`
- Modify: `src/components/settings/ui/__tests__/useDropdownGlobalInteractions.test.ts`
- Modify: `src/components/settings/ui/__tests__/SDropdown.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsGeneralSection.interactions.test.ts`

- [ ] **Step 1: 把键盘转移改成 pure action resolver**

```ts
// dropdownKeyboard.ts
export type DropdownKeyAction =
  | { type: "open"; initialIndex: number }
  | { type: "close" }
  | { type: "focus"; nextIndex: number }
  | { type: "select" }
  | { type: "noop" };

export function resolveDropdownKeyAction(input: {
  key: string;
  open: boolean;
  selectedIndex: number;
  focusIndex: number;
  optionCount: number;
}): DropdownKeyAction {
  // 不直接访问 DOM / refs
}
```

- [ ] **Step 2: 把 outside pointerdown + window resize/scroll 注册收口到 composable**

```ts
// useDropdownGlobalInteractions.ts
export function useDropdownGlobalInteractions(input: {
  isOpen: Ref<boolean>;
  triggerRef: Ref<HTMLElement | null>;
  panelRef: Ref<HTMLElement | null>;
  closeDropdown: () => void;
  syncPanelPosition: () => void;
}) {
  // watch open -> add/remove listeners
  // onBeforeUnmount -> cleanup
}
```

- [ ] **Step 3: 让 `SDropdown.vue` 回到“状态 + helper 组装 + 模板”**

要求：
- `onTriggerKeydown()` 不再手写一整段 key switch
- `.vue` 内不再直接写三组 `addEventListener/removeEventListener`
- props/emits/template/class 名称保持不变

- [ ] **Step 4: 运行 focused tests，确认 Settings 全链路行为不变**

Run:
`npm run test:run -- src/components/settings/ui/__tests__/dropdownKeyboard.test.ts src/components/settings/ui/__tests__/useDropdownGlobalInteractions.test.ts src/components/settings/ui/__tests__/SDropdown.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts src/components/settings/parts/__tests__/SettingsGeneralSection.interactions.test.ts src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts src/styles/__tests__/tailwind-governance-contract.test.ts`

Expected:
- focused tests 全绿
- `SettingsCommandsMoreFiltersDialog` 中嵌套 dropdown 的 outside close / focus 流不回归

- [ ] **Step 5: 提交 Dropdown 收口**

```bash
git add src/components/settings/ui/dropdownKeyboard.ts
git add src/components/settings/ui/useDropdownGlobalInteractions.ts
git add src/components/settings/ui/SDropdown.vue
git add src/components/settings/ui/__tests__/dropdownKeyboard.test.ts
git add src/components/settings/ui/__tests__/useDropdownGlobalInteractions.test.ts
git add src/components/settings/ui/__tests__/SDropdown.test.ts
git add src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts
git add src/components/settings/parts/__tests__/SettingsGeneralSection.interactions.test.ts
git commit -m "refactor(settings): 收窄下拉组件壳层"
```

## Chunk 3: 最终验证与交接

### Task 7: 跑最终门禁并补短期记忆

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 跑两条拆分路径的 focused tests**

Run:
`npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controllerSync.test.ts src/composables/__tests__/launcher/useWindowSizing.controllerEvents.test.ts src/composables/__tests__/launcher/useWindowSizing.flowRevealCoordinator.test.ts src/composables/__tests__/launcher/useWindowSizing.controller.test.ts src/components/launcher/__tests__/LauncherWindow.flow.test.ts src/composables/__tests__/app/launcherRuntimeBindings.test.ts src/composables/__tests__/app/useAppCompositionViewModel.test.ts src/components/settings/ui/__tests__/dropdownPositioning.test.ts src/components/settings/ui/__tests__/dropdownKeyboard.test.ts src/components/settings/ui/__tests__/useDropdownGlobalInteractions.test.ts src/components/settings/ui/__tests__/SDropdown.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts src/components/settings/parts/__tests__/SettingsGeneralSection.interactions.test.ts src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts src/styles/__tests__/tailwind-governance-contract.test.ts`

Expected:
- focused tests 全绿

- [ ] **Step 2: 跑全量门禁**

Run:
`npm run check:all`

Expected:
- 全绿

- [ ] **Step 3: 更新短期记忆**

在 `docs/active_context.md` 追加一句：

```md
- 2026-04-24：`useWindowSizing/controller.ts` 与 `SDropdown.vue` 拆分已完成；helper contract tests 与外层 wiring 回归通过，`npm run check:all` 全绿。
```

- [ ] **Step 4: 提交最终收口**

```bash
git add docs/active_context.md
git commit -m "docs(context): 更新窗口尺寸与下拉拆分进度"
```

## Execution Notes

- `useWindowSizing.controller.test.ts` 当前体积已经过大；执行时优先把“helper contract”搬到新测试文件，再回头削减原大文件，不要在单个提交里同时改太多行为断言。
- `SDropdown.vue` 的关键风险不在样式，而在 Teleport popup 与 Settings dialog 的事件边界；执行时优先守住 `pointerdown` outside close、`Escape`、`Tab`、`aria-*` 这几个 contract。
- 两个 chunk 可以顺序执行，也可以在有明确文件边界的前提下并行，但最终必须在同一工作树上统一跑 `npm run check:all`。
