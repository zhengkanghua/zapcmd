# Launcher Search / Flow Height Reveal Contract Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收紧 Launcher 搜索抽屉“10 条前不滚动”的高度 contract，改掉 FlowPanel 首帧静态猜高与错误回缩，并把 Flow 打开顺序重构为“预挂载测量 -> Rust 扩窗完成 -> reveal opening”。

**Architecture:** SearchPanel 继续采用固定 token 驱动的规则化高度模型，只把结果项以外的抽屉 chrome 高度收口成严格 contract；FlowPanel 改为只测空态 / 前 1 条 / 前 2 条真实卡片，并通过新的 `preparing -> resizing -> opening -> open` 状态机把“测量、扩窗、可见性”三件事解耦。普通窗口 resize 继续复用现有异步动画路径，而 reveal 专用扩窗新增阻塞式 Rust 命令作为完成门闩，避免前端靠 timeout 猜测动画结束。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vitest, Tauri 2.x, Rust, tokio

**Spec:** `docs/superpowers/specs/2026-03-29-launcher-search-flow-height-reveal-contract-design.md`

---

## 文件结构

### 预期修改文件

| 文件路径 | 职责 / 改动概述 |
|---|---|
| `src/composables/launcher/useLauncherLayoutMetrics.ts` | 保留 `44px x 10` 结果 token，收紧 Search 抽屉固定 chrome 高度 contract，并让 `drawerViewportHeight` / `sharedPanelMaxHeight` 共用同一口径。 |
| `src/components/launcher/parts/LauncherSearchPanel.vue` | 将 keyboard hint 区改成单行固定高度，不再允许换行破坏 10 条结果的高度预算。 |
| `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts` | 覆盖 Search `1..10` 条无滚动、hint 单行 contract、`11` 条开始内部滚动。 |
| `src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts` | 锁定 Search 抽屉与 shared cap 的统一公式。 |
| `src/composables/launcher/useWindowSizing/panelMeasurement.ts` | 将 Flow 最低可见高度定义为“空态 / 前 1 条 / 前 2 条真实卡片”，不再以静态估高作为主规则。 |
| `src/composables/launcher/useWindowSizing/sessionCoordinator.ts` | 取消纯搜索胶囊入口的静态 fallback 预抬高，改由真实测量门槛决定 Flow reveal 高度。 |
| `src/composables/launcher/useWindowSizing/model.ts` | 新增 reveal 专用 bridge / controller hooks 输入，补齐 Flow reveal 过程所需状态。 |
| `src/composables/launcher/useWindowSizing/controller.ts` | 新增 `prepareFlowPanelReveal()` / `notifyFlowPanelPrepared()` 之类的 reveal 协调能力，在可见前完成测量与扩窗。 |
| `src/composables/launcher/useWindowSizing/windowSync.ts` | 区分普通 resize 和 reveal resize 的桥接路径，确保 reveal 过程可等待完成。 |
| `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts` | 覆盖空态/1条/2条/3+ 的最小门槛、继承更高底层高度、去除静态猜高回缩，以及 reveal 等待门槛。 |
| `src/__tests__/app.failure-events.test.ts` | 锁定“从纯搜索胶囊打开 Flow 时不再先接近 3 条再回缩到 2 条”的回归场景。 |
| `src/composables/launcher/useStagingQueue/model.ts` | 扩展 `StagingDrawerState` 为 `closed | preparing | resizing | opening | open | closing`。 |
| `src/composables/launcher/useStagingQueue/drawer.ts` | 将打开流程改成 generation-safe 的异步 reveal 管线：`preparing -> resizing -> opening -> open`。 |
| `src/composables/launcher/useStagingQueue/index.ts` | 透传 reveal prepare callback，保持公开 API 仍为 `toggleStaging(): void`。 |
| `src/components/launcher/types.ts` | 同步扩展 `StagingDrawerState`，给 Flow 新增 `flow-panel-prepared` 事件桥接所需类型。 |
| `src/components/launcher/LauncherWindow.vue` | 透传 `flow-panel-prepared` 事件；让 Flow 在 `preparing/resizing` 已挂载但不可见。 |
| `src/components/launcher/parts/LauncherFlowPanel.vue` | 按新状态机控制 panel/scrim 可见性；新增 `flow-panel-prepared` 事件；仅在 `opening/open/closing` 显示。 |
| `src/components/launcher/parts/flowPanel/useFlowPanelHeightObservation.ts` | 在 `preparing` 阶段发出“可测量”信号，在 `open` 阶段继续发出 `flow-panel-settled` / 高度观察。 |
| `src/components/launcher/__tests__/LauncherWindow.flow.test.ts` | 覆盖 Flow 在 `preparing/resizing` 已挂载但不可见、`opening/open` 才 reveal 的窗口层契约。 |
| `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts` | 覆盖 `flow-panel-prepared` 首次发出、`preparing/resizing` 不可见、`opening/open` 可见的组件契约。 |
| `src/services/tauriBridge.ts` | 新增 reveal 专用 `requestResizeMainWindowForReveal()` bridge。 |
| `src/services/__tests__/tauriBridge.test.ts` | 锁定 reveal bridge 的 invoke 命令名和参数。 |
| `src/composables/app/useAppCompositionRoot/ports.ts` | 暴露 reveal 专用 bridge。 |
| `src/composables/app/useAppCompositionRoot/runtime.ts` | 把 reveal 专用 bridge 注入 window sizing，并把 `prepareDrawerReveal` 回调闭包传给 staging queue。 |
| `src-tauri/src/animation/mod.rs` | 新增阻塞式 reveal resize 命令，复用现有动画引擎但只在动画完成后返回。 |
| `src-tauri/src/animation/tests_logic.rs` | 覆盖 reveal resize 与普通 animate 的行为边界。 |
| `src-tauri/src/lib.rs` | 注册 reveal 专用命令。 |

### 不应修改的文件

| 文件路径 | 原因 |
|---|---|
| `src/components/launcher/parts/LauncherCommandPanel.vue` | 本轮只要求它继续提供可继承的上级高度，不重做其业务布局。 |
| `src/composables/launcher/useMainWindowShell.ts` | Escape / 隐藏窗口语义不变，本轮只重构高度 contract 与 reveal 时序。 |
| `src/features/hotkeys/windowKeydownHandlers/*` | 快捷键语义不变；只要 `toggleStaging()` 仍保持无参 `void` API，就不应向快捷键层扩散。 |

### 关键边界

- Search 仍是 token 化规则列表，不改成逐条实测高度。
- Flow 的最小门槛只认真实内容，不再让静态 `stagingCardEstHeight` 决定首帧外框高度。
- Reveal 过程必须以 Rust 完成门闩为准，不允许前端用 timeout 猜测扩窗结束。
- `preparing/resizing` 阶段虽然允许挂载 FlowPanel，但用户不能看到任何面板或 scrim。
- 旧的 `animate_main_window_size` 仍服务于普通响应式 resize，不要把所有 resize 都强行改成阻塞式。

---

## Chunk 1: Search 结果高度 Contract 收口

### Task 1: 先写 Search 高度 contract 的失败测试

**Files:**
- Modify: `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`
- Modify: `src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts`

- [ ] **Step 1: 在 SearchPanel 组件测试中补 10 条 contract 用例**

```ts
it("10 条结果时 drawer 高度等于 10 行 token + 固定 chrome，不提前滚动", () => {
  const filteredResults = Array.from({ length: 10 }, (_, idx) => createCommandTemplate(String(idx)));
  const wrapper = mount(LauncherSearchPanel, {
    props: createProps({ filteredResults, drawerViewportHeight: EXPECTED_10_ROWS_HEIGHT })
  });

  const drawer = wrapper.get('[data-testid="result-drawer"]');
  expect(drawer.attributes("style")).toContain(`max-height: ${EXPECTED_10_ROWS_HEIGHT}px;`);
  expect(wrapper.findAll(".result-item")).toHaveLength(10);
});

it("keyboard hint 区保持单行固定高度，不因 wrap 抬高 drawer viewport", () => {
  const wrapper = mount(LauncherSearchPanel, {
    props: createProps({
      keyboardHints: [
        { keys: ["Ctrl", "J"], action: "动作一" },
        { keys: ["Ctrl", "K"], action: "动作二" },
        { keys: ["Ctrl", "L"], action: "动作三" }
      ]
    })
  });

  expect(wrapper.get(".keyboard-hint").classes()).toContain("flex-nowrap");
});
```

- [ ] **Step 2: 在 layout metrics 测试中锁定统一公式**

```ts
it("sharedPanelMaxHeight 与 drawerViewportHeight 共用同一 search drawer chrome 口径", () => {
  const metrics = mountMetrics({ resultCount: 10, query: "docker" });

  expect(metrics.drawerViewportHeight.value).toBe(
    10 * LAUNCHER_DRAWER_ROW_HEIGHT_PX + LAUNCHER_DRAWER_VIEWPORT_CHROME_HEIGHT_PX
  );
  expect(metrics.sharedPanelMaxHeight.value).toBe(
    SEARCH_CAPSULE_HEIGHT_PX + 10 * LAUNCHER_DRAWER_ROW_HEIGHT_PX + LAUNCHER_DRAWER_VIEWPORT_CHROME_HEIGHT_PX
  );
});
```

- [ ] **Step 3: 运行测试并确认先失败**

Run:
```bash
npm run test:run -- src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
```

Expected:
- 现有 SearchPanel hint 区仍是 `flex-wrap`，新断言先失败。
- 若 Search 高度 contract 有漂移，统一公式用例先失败。

- [ ] **Step 4: Commit（仅测试）**

```bash
git add src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
git add src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
git commit -m "test(launcher):补充 Search 抽屉 10 条高度 contract 用例"
```

### Task 2: 实现 Search 的固定 chrome contract

**Files:**
- Modify: `src/composables/launcher/useLauncherLayoutMetrics.ts`
- Modify: `src/components/launcher/parts/LauncherSearchPanel.vue`

- [ ] **Step 1: 在 `useLauncherLayoutMetrics.ts` 明确 Search drawer 统一公式**

实现要点：
- 保留 `LAUNCHER_DRAWER_ROW_HEIGHT_PX = 44`
- 保留 `LAUNCHER_DRAWER_MAX_ROWS = 10`
- 将 `drawerViewportHeight` 与 `sharedPanelMaxHeight` 明确建立在同一组 chrome 常量上
- 不再在其他地方额外拼接 Search 抽屉 chrome 高度

关键代码骨架：

```ts
const drawerVisibleRows = computed(() => {
  if (!drawerOpen.value) return 0;
  return Math.min(options.filteredResults.value.length || 1, LAUNCHER_DRAWER_MAX_ROWS, drawerMaxRowsByHeight.value);
});

const drawerViewportHeight = computed(() => {
  if (!drawerOpen.value) return 0;
  return drawerVisibleRows.value * LAUNCHER_DRAWER_ROW_HEIGHT_PX + LAUNCHER_DRAWER_VIEWPORT_CHROME_HEIGHT_PX;
});

const sharedPanelMaxHeight = computed(() =>
  SEARCH_CAPSULE_HEIGHT_PX +
  LAUNCHER_DRAWER_MAX_ROWS * LAUNCHER_DRAWER_ROW_HEIGHT_PX +
  LAUNCHER_DRAWER_VIEWPORT_CHROME_HEIGHT_PX
);
```

- [ ] **Step 2: 在 `LauncherSearchPanel.vue` 固定 keyboard hint 为单行**

实现要点：
- `.keyboard-hint` 改为 `flex-nowrap`
- hint 容器给出固定高度或最小高度 contract
- 不允许换行参与抽屉增高

关键改动骨架：

```vue
<p
  v-if="props.keyboardHints?.length"
  class="keyboard-hint m-0 min-h-[22px] h-[22px] flex flex-nowrap items-center gap-[6px] overflow-hidden ..."
>
```

- [ ] **Step 3: 运行 Search 相关测试**

Run:
```bash
npm run test:run -- src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/composables/launcher/useLauncherLayoutMetrics.ts
git add src/components/launcher/parts/LauncherSearchPanel.vue
git add src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
git add src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
git commit -m "fix(launcher):收紧 Search 抽屉 10 条高度 contract"
```

---

## Chunk 2: Flow 最低可见门槛改成真实测量

### Task 3: 先写 Flow 最低门槛的失败测试

**Files:**
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`
- Modify: `src/__tests__/app.failure-events.test.ts`

- [ ] **Step 1: 在 controller 测试里补 `0/1/2/3+` 门槛用例**

```ts
it("空态 Flow 只按 empty-state 高度，不强行抬到两条静态卡片高度", async () => {
  const harness = createFlowHarness({ lastFrameHeight: SEARCH_CAPSULE_HEIGHT_PX });
  harness.state.stagingExpanded.value = true;
  mockFlowPanelShell(harness, { emptyHeight: 96 });

  await harness.controller.prepareFlowPanelReveal();

  expect(harness.state.flowPanelLockedHeight.value).toBe(52 + 24 + 96 + 60);
});

it("只有 1 条命令时按 1 条真实卡片高度锁高", async () => {
  const harness = createFlowHarness({ lastFrameHeight: SEARCH_CAPSULE_HEIGHT_PX });
  mockFlowPanelShell(harness, { cardHeights: [188] });

  await harness.controller.prepareFlowPanelReveal();

  expect(harness.state.flowPanelLockedHeight.value).toBe(52 + 24 + 188 + 60);
});

it("上级面板高度高于两条门槛时，Flow 继承更高高度而不是回落", async () => {
  const harness = createFlowHarness({ lastFrameHeight: 620 });
  mockFlowPanelShell(harness, { cardHeights: [168, 220] });

  await harness.controller.prepareFlowPanelReveal();

  expect(harness.state.flowPanelLockedHeight.value).toBe(620);
});
```

- [ ] **Step 2: 在 app 级回归里锁定“不再先接近 3 条再回缩”**

```ts
it("纯搜索胶囊打开 Flow 时不再先用静态 fallback 扩到接近 3 条再回缩", async () => {
  const wrapper = await mountApp();
  await waitForUi();

  dispatchWindowKeydown("Tab", { ctrlKey: true });
  await waitForUi();

  const openCalls = getInvokeCommandCalls("resize_main_window_for_reveal");
  expect(openCalls).toHaveLength(1);
  expect(openCalls[0]?.[1]?.height).toBe(EXPECTED_TWO_REAL_ROWS_HEIGHT_WITH_CHROME);

  const animateCalls = getInvokeCommandCalls("animate_main_window_size");
  expect(animateCalls.some(([, payload]) => Number(payload?.height) > EXPECTED_TWO_REAL_ROWS_HEIGHT_WITH_CHROME)).toBe(false);
});
```

- [ ] **Step 3: 运行测试并确认先失败**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts src/__tests__/app.failure-events.test.ts
```

Expected:
- 旧逻辑仍会走静态 fallback 预抬高，新用例先失败。

- [ ] **Step 4: Commit（仅测试）**

```bash
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git add src/__tests__/app.failure-events.test.ts
git commit -m "test(launcher):补充 Flow 真实门槛与错误回缩回归用例"
```

### Task 4: 实现 Flow 真实门槛并去掉静态猜高

**Files:**
- Modify: `src/composables/launcher/useWindowSizing/panelMeasurement.ts`
- Modify: `src/composables/launcher/useWindowSizing/sessionCoordinator.ts`
- Modify: `src/composables/launcher/useWindowSizing/controller.ts`

- [ ] **Step 1: 在 `panelMeasurement.ts` 保持“空态 / 前1条 / 前2条”唯一真实测量口径**

实现要点：
- 空态：`header + bodyPadding + empty + footer`
- 1 条：`header + bodyPadding + firstCard + footer`
- 2 条及以上：`header + bodyPadding + firstTwoCards + interCardGap + footer`
- 不再让静态 `stagingCardEstHeight` 主导首帧外框高度

- [ ] **Step 2: 在 `sessionCoordinator.ts` 删除纯搜索胶囊入口的静态 fallback 预抬高**

需要删除或改写的旧语义：

```ts
const primedFlowPanelEntryHeight = shouldPrimeFlowPanelHeightOnSearchCapsuleEntry(options)
  ? Math.max(flowPanelEntryHeight, resolveFlowPanelFallbackMinHeight(options))
  : flowPanelEntryHeight;
```

替换为：
- 先保留真实 `inheritedPanelHeight`
- reveal 前再按真实测量结果决定 `flowPanelLockedHeight`

- [ ] **Step 3: 在 controller 内新增 reveal 前锁高逻辑**

目标接口：

```ts
async function prepareFlowPanelReveal(): Promise<void> {
  // 1. 等待 flow-panel-prepared
  // 2. 读取真实 min height
  // 3. 计算 resolvedFlowHeight
  // 4. 预写入 flowPanelLockedHeight（或等价 reveal 目标高度）
  // 5. 调用 reveal resize bridge 并 await 完成
}
```

要求：
- 若上级面板更高，`flowPanelLockedHeight = inheritedPanelHeight`
- 若真实门槛更高，仅补到门槛
- reveal 前不允许把窗口抬到静态两条卡片估高

- [ ] **Step 4: 运行 Flow contract 测试**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts src/__tests__/app.failure-events.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/composables/launcher/useWindowSizing/panelMeasurement.ts
git add src/composables/launcher/useWindowSizing/sessionCoordinator.ts
git add src/composables/launcher/useWindowSizing/controller.ts
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git add src/__tests__/app.failure-events.test.ts
git commit -m "fix(launcher):改用 Flow 真实内容门槛并移除静态猜高"
```

---

## Chunk 3: Flow reveal 状态机与不可见预挂载

### Task 5: 先写 reveal 状态机的失败测试

**Files:**
- Modify: `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts`

- [ ] **Step 1: 在 FlowPanel 组件测试中补 `preparing/resizing` 不可见用例**

```ts
it("stagingDrawerState=preparing 时面板已挂载但完全不可见", () => {
  const wrapper = mount(LauncherFlowPanel, {
    props: createProps({ stagingDrawerState: "preparing", stagingExpanded: true })
  });

  expect(wrapper.find(".flow-panel").exists()).toBe(true);
  expect(wrapper.get(".flow-panel").classes()).toContain("invisible");
  expect(wrapper.get(".flow-panel-overlay__scrim").classes()).toContain("invisible");
});

it("stagingDrawerState 从 preparing 进入 open 前先发出 flow-panel-prepared", async () => {
  const wrapper = mount(LauncherFlowPanel, {
    props: createProps({ stagingDrawerState: "preparing", stagingExpanded: true })
  });

  await nextTick();
  expect(wrapper.emitted("flow-panel-prepared")).toHaveLength(1);
});
```

- [ ] **Step 2: 在 LauncherWindow 层补“挂载和可见性分离”用例**

```ts
it("stagingDrawerState=preparing 时 FlowPanel 仍由 LauncherWindow 挂载，但用户不可见", () => {
  const wrapper = mount(LauncherWindow, {
    props: createBaseProps({
      stagingExpanded: true,
      stagingDrawerState: "preparing"
    })
  });

  expect(wrapper.findComponent({ name: "LauncherFlowPanel" }).exists()).toBe(true);
  expect(wrapper.get(".flow-panel").classes()).toContain("invisible");
});
```

- [ ] **Step 3: 运行测试并确认先失败**

Run:
```bash
npm run test:run -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
```

Expected:
- 旧状态机还没有 `preparing/resizing`，新用例先失败。

- [ ] **Step 4: Commit（仅测试）**

```bash
git add src/components/launcher/__tests__/LauncherWindow.flow.test.ts
git add src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
git commit -m "test(launcher):补充 Flow reveal 状态机与不可见预挂载用例"
```

### Task 6: 实现 `preparing -> resizing -> opening -> open` 状态机

**Files:**
- Modify: `src/composables/launcher/useStagingQueue/model.ts`
- Modify: `src/composables/launcher/useStagingQueue/drawer.ts`
- Modify: `src/composables/launcher/useStagingQueue/index.ts`
- Modify: `src/components/launcher/types.ts`
- Modify: `src/components/launcher/LauncherWindow.vue`
- Modify: `src/components/launcher/parts/LauncherFlowPanel.vue`
- Modify: `src/components/launcher/parts/flowPanel/useFlowPanelHeightObservation.ts`
- Modify: `src/composables/app/useAppCompositionRoot/runtime.ts`

- [ ] **Step 1: 扩展 `StagingDrawerState` 与 `UseStagingQueueOptions`**

新增状态：

```ts
export type StagingDrawerState =
  | "closed"
  | "preparing"
  | "resizing"
  | "opening"
  | "open"
  | "closing";
```

新增 reveal 回调：

```ts
prepareDrawerReveal?: () => Promise<void>;
```

- [ ] **Step 2: 在 `drawer.ts` 把打开流程改成异步 reveal 管线**

关键骨架：

```ts
let openGeneration = 0;

async function openStagingDrawer(): Promise<void> {
  const currentGen = ++openGeneration;
  setStagingDrawerState("preparing");

  await options.prepareDrawerReveal?.();
  if (openGeneration !== currentGen || stagingDrawerState.value !== "preparing" && stagingDrawerState.value !== "resizing") {
    return;
  }

  setStagingDrawerState("opening");
  stagingStateTimer = setTimeout(() => {
    if (openGeneration === currentGen && stagingDrawerState.value === "opening") {
      setStagingDrawerState("open");
    }
  }, options.transitionMs);
}
```

要求：
- `toggleStaging()` 公开签名仍保持 `void`
- 若用户在 `preparing/resizing` 阶段立即关闭，旧 Promise resolve 后不得把面板重新打开

- [ ] **Step 3: 在 `LauncherFlowPanel.vue` 与观察 composable 中新增 `flow-panel-prepared`**

要求：
- `preparing/resizing` 时：
  - panel 已挂载
  - `visibility: hidden`
  - scrim 不可见
  - 不触发 opening 动画
- `preparing` 首次挂载后发出 `flow-panel-prepared`
- `open` 阶段仍保留 `flow-panel-settled` / `flow-panel-height-change`

示意：

```ts
watch(
  () => deps.props.stagingDrawerState,
  async (state) => {
    if (state === "preparing") {
      await nextTick();
      deps.emitFlowPanelPrepared();
    }
  },
  { immediate: true }
);
```

- [ ] **Step 4: 在 `LauncherWindow.vue` / `runtime.ts` 透传 `flow-panel-prepared`**

需要：
- `LauncherWindow` 增加同名 emit
- runtime 将其交给 `windowSizing.notifyFlowPanelPrepared()`
- stagingQueue 通过闭包调用 `windowSizing.prepareFlowPanelReveal()`

- [ ] **Step 5: 运行 reveal 状态机测试**

Run:
```bash
npm run test:run -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/composables/launcher/useStagingQueue/model.ts
git add src/composables/launcher/useStagingQueue/drawer.ts
git add src/composables/launcher/useStagingQueue/index.ts
git add src/components/launcher/types.ts
git add src/components/launcher/LauncherWindow.vue
git add src/components/launcher/parts/LauncherFlowPanel.vue
git add src/components/launcher/parts/flowPanel/useFlowPanelHeightObservation.ts
git add src/composables/app/useAppCompositionRoot/runtime.ts
git add src/components/launcher/__tests__/LauncherWindow.flow.test.ts
git add src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
git commit -m "feat(launcher):引入 Flow reveal 预挂载与状态机"
```

---

## Chunk 4: Rust reveal 扩窗门闩与总验证

### Task 7: 先写 Rust / bridge 的失败测试

**Files:**
- Modify: `src/services/__tests__/tauriBridge.test.ts`
- Modify: `src-tauri/src/animation/tests_logic.rs`

- [ ] **Step 1: 为 reveal bridge 补前端测试**

```ts
it("calls resize_main_window_for_reveal through invoke bridge", async () => {
  await requestResizeMainWindowForReveal(920, 540);

  expect(invokeMock).toHaveBeenCalledWith("resize_main_window_for_reveal", {
    width: 920,
    height: 540
  });
});
```

- [ ] **Step 2: 为 Rust 动画模块补 reveal 命令逻辑测试**

建议抽一个可测 helper，例如：

```rust
fn should_block_until_animation_complete(mode: ResizeCommandMode) -> bool {
    matches!(mode, ResizeCommandMode::Reveal)
}
```

测试：

```rust
#[test]
fn reveal_resize_uses_blocking_mode() {
    assert!(should_block_until_animation_complete(ResizeCommandMode::Reveal));
}

#[test]
fn normal_animate_resize_keeps_non_blocking_mode() {
    assert!(!should_block_until_animation_complete(ResizeCommandMode::Animated));
}
```

- [ ] **Step 3: 运行测试并确认先失败**

Run:
```bash
npm run test:run -- src/services/__tests__/tauriBridge.test.ts
cargo test --manifest-path src-tauri/Cargo.toml animation::tests_logic -- --nocapture
```

Expected:
- reveal bridge 函数尚不存在，前端测试先失败。
- Rust reveal mode helper / 命令尚不存在，Rust 测试先失败。

- [ ] **Step 4: Commit（仅测试）**

```bash
git add src/services/__tests__/tauriBridge.test.ts
git add src-tauri/src/animation/tests_logic.rs
git commit -m "test(launcher):补充 reveal 扩窗桥接与 Rust 门闩用例"
```

### Task 8: 实现 reveal 专用 Rust 命令并接到 window sizing

**Files:**
- Modify: `src/services/tauriBridge.ts`
- Modify: `src/composables/app/useAppCompositionRoot/ports.ts`
- Modify: `src/composables/launcher/useWindowSizing/model.ts`
- Modify: `src/composables/launcher/useWindowSizing/controller.ts`
- Modify: `src/composables/launcher/useWindowSizing/windowSync.ts`
- Modify: `src-tauri/src/animation/mod.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 在前端桥接层新增 reveal 命令**

```ts
export async function requestResizeMainWindowForReveal(width: number, height: number): Promise<void> {
  await invoke("resize_main_window_for_reveal", { width, height });
}
```

并在 `ports.ts` / `UseWindowSizingOptions` 中透传。

- [ ] **Step 2: 在 Rust 侧新增阻塞式 reveal 命令**

目标接口：

```rust
#[tauri::command]
pub(crate) async fn resize_main_window_for_reveal(
    window: WebviewWindow,
    state: State<'_, AnimationController>,
    width: f64,
    height: f64,
) -> Result<(), String>
```

要求：
- 可以复用现有动画插值逻辑
- 但此命令必须在动画结束并写入最终目标尺寸后才返回
- 普通 `animate_main_window_size` 仍保持当前异步 spawn 模式

推荐实现：
- 抽出共享的阻塞式 helper，例如 `run_animation_blocking(...)`
- `animate_main_window_size` 内部继续 `tokio::spawn(run_animation_blocking(...))`
- `resize_main_window_for_reveal` 直接 `await run_animation_blocking(...)`

- [ ] **Step 3: 在 controller 中使用 reveal 专用 bridge**

`prepareFlowPanelReveal()` 的最后一步改为：

```ts
await options.requestResizeMainWindowForReveal(width, resolvedFlowWindowHeight);
```

而普通 watcher-driven resize 仍走：

```ts
await options.requestAnimateMainWindowSize(width, height);
```

- [ ] **Step 4: 跑前后端相关测试**

Run:
```bash
npm run test:run -- src/services/__tests__/tauriBridge.test.ts src/composables/__tests__/launcher/useWindowSizing.controller.test.ts src/__tests__/app.failure-events.test.ts
cargo test --manifest-path src-tauri/Cargo.toml animation::tests_logic -- --nocapture
```

Expected: PASS

- [ ] **Step 5: 运行本特性 focused 回归集合**

Run:
```bash
npm run test:run -- src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts src/components/launcher/__tests__/LauncherWindow.flow.test.ts src/composables/__tests__/launcher/useWindowSizing.controller.test.ts src/__tests__/app.failure-events.test.ts src/services/__tests__/tauriBridge.test.ts
cargo test --manifest-path src-tauri/Cargo.toml animation::tests_logic -- --nocapture
```

Expected: 全绿。

- [ ] **Step 6: Commit**

```bash
git add src/services/tauriBridge.ts
git add src/services/__tests__/tauriBridge.test.ts
git add src/composables/app/useAppCompositionRoot/ports.ts
git add src/composables/app/useAppCompositionRoot/runtime.ts
git add src/composables/launcher/useWindowSizing/model.ts
git add src/composables/launcher/useWindowSizing/controller.ts
git add src/composables/launcher/useWindowSizing/windowSync.ts
git add src-tauri/src/animation/mod.rs
git add src-tauri/src/animation/tests_logic.rs
git add src-tauri/src/lib.rs
git commit -m "feat(launcher):新增 Flow reveal 阻塞式扩窗门闩"
```

### Task 9: 最终验证与文档同步

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 更新短期记忆**

补充一条不超过 200 字的摘要，说明：
- Search 保留 `44px x 10` token 并收紧 chrome
- Flow 改按空态/前1条/前2条真实卡片测量
- reveal 改为 `preparing -> resizing -> opening`

- [ ] **Step 2: 运行最终门禁**

Run:
```bash
npm run check:all
```

Expected:
- `lint`
- `typecheck`
- `test:coverage`
- `build`
- `check:rust`
全部通过。

- [ ] **Step 3: 总提交**

```bash
git add docs/active_context.md
git commit -m "fix(launcher):收口 Search 与 Flow 高度 reveal contract"
```

---

## 执行提示

- 实施时优先使用 `@superpowers:test-driven-development`：每个 Task 先写失败测试，再补最小实现。
- 完成所有代码后，必须走 `@superpowers:verification-before-completion`，不允许在未跑门禁的情况下宣称完成。
- 若当前 harness 不允许子代理，则按 chunk 顺序在当前会话执行；每完成一个 chunk 先跑对应 focused tests，再继续下一个 chunk。
