# Launcher 参数面板返回搜索页高度恢复 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Launcher 参数面板返回搜索页建立统一退出入口与锁高回落协调，消除“先缩小一下再复原”的抖动。

**Architecture:** 保留现有 `pendingCommand` 进入参数面板时的 floor 保护，不改搜索页结果高度口径；新增 `requestCommandPanelExit()` 统一承接返回意图，在 `useWindowSizing` 内引入独立退出协调器，先捕获当前参数面板高度并锁住窗口/`launcher-frame`，等待 `LauncherWindow` 发出“搜索页重新进入并稳定”的信号后，再一次性动画回落到最终搜索高度。`LauncherCommandPanel` 不再直接 `popPage()`，`Esc` 仍经 `useMainWindowShell.handleMainEscape()`，但最终也收口到同一退出动作。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vitest, Tauri window sizing bridge

**Spec:** `docs/superpowers/specs/2026-03-19-launcher-command-return-height-restore-design.md`

---

## 文件结构

### 修改文件（预期）

| 文件路径 | 职责 / 改动概述 |
|---|---|
| `src/components/launcher/LauncherWindow.vue` | 增加统一退出事件与“搜索页 after-enter + nextTick”稳定信号；搜索页返回与参数页返回都通过 emit 交给上层统一处理。 |
| `src/components/launcher/parts/LauncherCommandPanel.vue` | 只表达“取消/返回意图”，删除组件内直接 `navStack.popPage()` 的副作用。 |
| `src/App.vue` | 把 `request-command-panel-exit` / `search-page-settled` 事件接到组合根 view-model。 |
| `src/composables/app/useAppCompositionRoot/runtime.ts` | 组装 `requestCommandPanelExit()` 与 `notifySearchPageSettled()`，把业务态退出与 sizing 协调器接线。 |
| `src/composables/app/useAppCompositionRoot/viewModel.ts` | 暴露新的事件处理函数给 `App.vue`，保留现有 submit 流程，不把 submit 混进“返回”链路。 |
| `src/composables/launcher/useMainWindowShell.ts` | `Esc` 命中参数面板时改走统一退出动作，而不是直接 `navStackPopPage()`。 |
| `src/composables/launcher/useWindowSizing/controller.ts` | 接入退出协调器，负责锁高、等待搜索页稳定、单次回落、释放锁，以及 `--launcher-frame-height` 的同步。 |
| `src/composables/launcher/useWindowSizing/calculation.ts` | 支持“退出锁高”覆盖口径，并提供“忽略退出锁、采样最终搜索高度”的计算分支。 |
| `src/components/launcher/__tests__/LauncherWindow.flow.test.ts` | 锁定 UI contract：返回按钮/搜索页切回事件都走统一 emit。 |
| `src/composables/__tests__/launcher/useMainWindowShell.test.ts` | 锁定 `Esc` 命中参数面板时走 `requestCommandPanelExit()`。 |
| `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts` | 锁定退出锁高、搜索页稳定后单次回落、释放锁的 controller 行为。 |
| `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts` | 锁定退出锁存在时的高度计算，以及“忽略锁采样最终搜索高度”的行为。 |

### 新增文件（预期）

| 文件路径 | 职责 / 改动概述 |
|---|---|
| `src/composables/launcher/useWindowSizing/commandPanelExit.ts` | 抽离参数面板退出协调状态机，集中维护 `phase/lockedExitFrameHeight/restoreTargetFrameHeight` 与转移规则。 |
| `src/composables/__tests__/launcher/useWindowSizing.commandPanelExit.test.ts` | 对新状态机做纯逻辑单测，避免所有分支都压到 controller 集成测试里。 |

### 现实边界（实现时必须保留）

- 当前仓库里 **不存在** “CommandPanel 内点击搜索框返回搜索页”的现成 UI 入口；本计划只为现有的 **返回按钮** 与 **`Esc`** 接线，并提供 `requestCommandPanelExit()` 作为未来入口复用点。
- `submitParamInput()` 仍属于“完成参数流程”而非“返回”；本轮不要把 submit 语义混进退出协调器，否则会扩大回归面。

---

## Chunk 1: 统一退出入口 Contract

### Task 1: 先写失败测试，锁定统一退出动作与搜索页稳定信号

**Files:**
- Modify: `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
- Modify: `src/composables/__tests__/launcher/useMainWindowShell.test.ts`

- [ ] **Step 1: 为 `LauncherWindow` 增加统一退出 contract 测试**

```ts
// src/components/launcher/__tests__/LauncherWindow.flow.test.ts
it("command-action 页面点击返回时发出 request-command-panel-exit，而不是直接操作 navStack", async () => {
  const command = createCommandTemplate("cmd-exit");
  const commandPage: NavPage = {
    type: "command-action",
    props: { command, mode: "execute", isDangerous: false }
  };

  const wrapper = mount(LauncherWindow, {
    props: createBaseProps({
      navCurrentPage: commandPage,
      navCanGoBack: true,
      navStack: [{ type: "search" }, commandPage]
    }),
    global: {
      stubs: {
        LauncherSearchPanel: true,
        LauncherFlowPanel: true,
        LauncherSafetyOverlay: true,
        LauncherCommandPanel: {
          template: "<button class='stub-cancel' @click=\"$emit('cancel')\">cancel</button>"
        }
      }
    }
  });

  await wrapper.get(".stub-cancel").trigger("click");

  expect(wrapper.emitted("request-command-panel-exit")).toHaveLength(1);
  expect((wrapper.props("navPopPage") as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: 为“搜索页切回稳定”增加事件测试**

```ts
// src/components/launcher/__tests__/LauncherWindow.flow.test.ts
const TransitionHookStub = defineComponent({
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    onMounted(() => {
      (attrs.onAfterEnter as (() => void) | undefined)?.();
    });
    onUpdated(() => {
      (attrs.onAfterEnter as (() => void) | undefined)?.();
    });
    return () => slots.default?.();
  }
});

it("nav-slide 切回 search 并 after-enter 后发出 search-page-settled", async () => {
  const command = createCommandTemplate("cmd-settled");
  const commandPage: NavPage = {
    type: "command-action",
    props: { command, mode: "execute", isDangerous: false }
  };

  const wrapper = mount(LauncherWindow, {
    props: createBaseProps({
      navCurrentPage: commandPage,
      navCanGoBack: true,
      navStack: [{ type: "search" }, commandPage]
    }),
    global: {
      stubs: {
        transition: TransitionHookStub,
        LauncherSearchPanel: true,
        LauncherFlowPanel: true,
        LauncherSafetyOverlay: true,
        LauncherCommandPanel: true
      }
    }
  });

  await wrapper.setProps({
    navCurrentPage: { type: "search" },
    navCanGoBack: false,
    navStack: [{ type: "search" }]
  });
  await nextTick();

  expect(wrapper.emitted("search-page-settled")).toHaveLength(1);
});
```

- [ ] **Step 3: 为 `useMainWindowShell` 增加 `Esc -> requestCommandPanelExit()` 测试**

```ts
// src/composables/__tests__/launcher/useMainWindowShell.test.ts
it("参数面板打开时 Escape 优先走 requestCommandPanelExit", () => {
  const harness = createHarness();
  harness.state.commandPanelOpen.value = true;

  harness.shell.handleMainEscape();

  expect(harness.spies.requestCommandPanelExit).toHaveBeenCalledTimes(1);
  expect(harness.spies.navStackPopPage).not.toHaveBeenCalled();
  expect(harness.spies.closeStagingDrawer).not.toHaveBeenCalled();
});
```

- [ ] **Step 4: 运行定向测试并确认失败**

Run:
```bash
npm run test:run -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts
npm run test:run -- src/composables/__tests__/launcher/useMainWindowShell.test.ts
```

Expected:
- `LauncherWindow` 还没有 `request-command-panel-exit` / `search-page-settled` emit，测试失败。
- `useMainWindowShell` 还没有 `commandPanelOpen` / `requestCommandPanelExit` 分支，测试失败。

- [ ] **Step 5: Commit（仅测试）**

Run:
```bash
git add src/components/launcher/__tests__/LauncherWindow.flow.test.ts
git add src/composables/__tests__/launcher/useMainWindowShell.test.ts
git commit -m "test(launcher): 锁定参数面板统一退出与搜索页稳定信号"
```

---

### Task 2: 落地统一退出入口与搜索页稳定事件

**Files:**
- Modify: `src/components/launcher/LauncherWindow.vue`
- Modify: `src/components/launcher/parts/LauncherCommandPanel.vue`
- Modify: `src/App.vue`
- Modify: `src/composables/app/useAppCompositionRoot/runtime.ts`
- Modify: `src/composables/app/useAppCompositionRoot/viewModel.ts`
- Modify: `src/composables/launcher/useMainWindowShell.ts`
- Modify: `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
- Modify: `src/composables/__tests__/launcher/useMainWindowShell.test.ts`

- [ ] **Step 1: `LauncherCommandPanel` 只发出取消意图，不再直接 `navStack.popPage()`**

```ts
// src/components/launcher/parts/LauncherCommandPanel.vue
function onCancel(): void {
  emit("cancel");
}
```

实现要点：
- 删除 `inject(LAUNCHER_NAV_STACK_KEY)` 与 `navStack.popPage()`。
- 不改 submit 语义；submit 仍只做 `emit("submit", ...)`。

- [ ] **Step 2: `LauncherWindow` 统一把返回意图向上抛出**

```ts
// src/components/launcher/LauncherWindow.vue
const emit = defineEmits<{
  (e: "request-command-panel-exit"): void;
  (e: "search-page-settled"): void;
  // 保留既有 emits...
}>();

function onSearchCapsuleBack(): void {
  if (props.navCurrentPage.type === "command-action") {
    emit("request-command-panel-exit");
    return;
  }
  if (props.stagingExpanded) {
    emit("toggle-staging");
  }
}

function onNavAfterEnter(): void {
  if (props.navCurrentPage.type !== "search") {
    return;
  }
  void nextTick(() => emit("search-page-settled"));
}
```

模板要点：
- `<Transition name="nav-slide" mode="out-in" @after-enter="onNavAfterEnter">`
- `LauncherCommandPanel @cancel="emit('request-command-panel-exit')"`

- [ ] **Step 3: `runtime.ts` 组装统一退出动作**

```ts
// src/composables/app/useAppCompositionRoot/runtime.ts
function requestCommandPanelExit(): void {
  if (launcherRuntime.commandExecution.pendingCommand.value === null) {
    if (launcherRuntime.navStack.canGoBack.value) {
      launcherRuntime.navStack.popPage();
    }
    return;
  }

  windowSizing.requestCommandPanelExit();
  launcherRuntime.commandExecution.cancelParamInput();

  if (launcherRuntime.navStack.canGoBack.value) {
    launcherRuntime.navStack.popPage();
    return;
  }
  launcherRuntime.navStack.resetToSearch();
}

function notifySearchPageSettled(): void {
  windowSizing.notifySearchPageSettled();
}
```

实现要点：
- `requestCommandPanelExit()` 必须 **先** 通知 sizing 锁高，**后** 清 `pendingCommand` / pop nav。
- 不要让 `cancelParamInput()` 直接承担退出协调；它仍只负责清业务态与搜索框焦点。

- [ ] **Step 4: `useMainWindowShell` 的 Escape 优先级改为 staging -> commandPanelExit -> navStack -> clear query -> hide**

```ts
// src/composables/launcher/useMainWindowShell.ts
if (options.stagingExpanded.value) {
  options.closeStagingDrawer();
  return;
}
if (options.commandPanelOpen.value) {
  options.requestCommandPanelExit();
  return;
}
if (options.navStackCanGoBack.value) {
  options.navStackPopPage();
  return;
}
```

- [ ] **Step 5: `viewModel.ts` / `App.vue` 接线**

实现要点：
- `viewModel` 暴露：
  - `requestCommandPanelExit`
  - `notifySearchPageSettled`
- `App.vue` 把：
  - `@cancel-param-input="cancelParamInput"` 替换为 `@request-command-panel-exit="requestCommandPanelExit"`
  - 新增 `@search-page-settled="notifySearchPageSettled"`
- `submitParamInput()` 保持现状，不要接入统一退出动作。

- [ ] **Step 6: 运行本 Chunk 测试并修到全绿**

Run:
```bash
npm run test:run -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts
npm run test:run -- src/composables/__tests__/launcher/useMainWindowShell.test.ts
```

Expected: 全绿。

- [ ] **Step 7: Commit（退出 contract 接线）**

Run:
```bash
git add src/components/launcher/LauncherWindow.vue
git add src/components/launcher/parts/LauncherCommandPanel.vue
git add src/App.vue
git add src/composables/app/useAppCompositionRoot/runtime.ts
git add src/composables/app/useAppCompositionRoot/viewModel.ts
git add src/composables/launcher/useMainWindowShell.ts
git add src/components/launcher/__tests__/LauncherWindow.flow.test.ts
git add src/composables/__tests__/launcher/useMainWindowShell.test.ts
git commit -m "feat(launcher): 收口参数面板统一退出入口"
```

---

## Chunk 2: 退出锁高协调器与 sizing 口径

### Task 3: 先写失败测试，锁定退出锁高与单次回落 contract

**Files:**
- Create: `src/composables/__tests__/launcher/useWindowSizing.commandPanelExit.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`

- [ ] **Step 1: 为纯状态机新增单测**

```ts
// src/composables/__tests__/launcher/useWindowSizing.commandPanelExit.test.ts
it("beginExit 会记录锁高并进入 command-exiting", () => {
  const exit = createCommandPanelExitCoordinator();

  exit.beginExit(520);

  expect(exit.snapshot()).toMatchObject({
    phase: "command-exiting",
    lockedExitFrameHeight: 520,
    restoreTargetFrameHeight: null
  });
});

it("markSearchSettled 后只允许记录一次 restore target", () => {
  const exit = createCommandPanelExitCoordinator();
  exit.beginExit(520);
  exit.markSearchSettled();

  exit.captureRestoreTarget(404);
  exit.captureRestoreTarget(390);

  expect(exit.snapshot().restoreTargetFrameHeight).toBe(404);
});
```

- [ ] **Step 2: 为 calculation 增加“锁高覆盖 / 忽略锁采样”测试**

```ts
// src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
it("退出锁存在时，即使 pendingCommand 已清空也保持当前锁高", () => {
  const size = resolveWindowSize(
    createBaseOptions({ pendingCommand: ref(null) }),
    { commandPanelExitFrameHeightLock: 520 }
  );

  expect(size.height).toBe(520 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK);
});

it("ignoreCommandPanelExitLock=true 时返回最终搜索页高度，用于 restore target 采样", () => {
  const size = resolveWindowSize(
    createBaseOptions({
      pendingCommand: ref(null),
      drawerOpen: ref(false),
      drawerViewportHeight: ref(0)
    }),
    {
      commandPanelExitFrameHeightLock: 520,
      ignoreCommandPanelExitLock: true
    }
  );

  expect(size.height).toBe(
    WINDOW_SIZING_CONSTANTS.windowBaseHeight + UI_TOP_ALIGN_OFFSET_PX_FALLBACK
  );
});
```

- [ ] **Step 3: 为 controller 增加“暂时小高度不生效，稳定后只回落一次”测试**

```ts
// src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
it("requestCommandPanelExit 后，搜索页稳定前不会被临时小高度拉低；稳定后只动画回落一次", async () => {
  const harness = createExitHarness();

  harness.controller.requestCommandPanelExit();
  harness.state.pendingCommand.value = null;
  harness.state.drawerOpen.value = false;
  harness.state.drawerViewportHeight.value = 0;

  await harness.controller.syncWindowSize();
  expect(harness.spies.requestAnimateMainWindowSize).not.toHaveBeenCalledWith(
    expect.any(Number),
    WINDOW_SIZING_CONSTANTS.windowBaseHeight + UI_TOP_ALIGN_OFFSET_PX_FALLBACK
  );

  harness.controller.notifySearchPageSettled();
  await harness.controller.syncWindowSize();

  expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
    expect.any(Number),
    WINDOW_SIZING_CONSTANTS.windowBaseHeight + UI_TOP_ALIGN_OFFSET_PX_FALLBACK
  );
  expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 4: 运行定向测试并确认失败**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.commandPanelExit.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
```

Expected:
- 新测试文件缺失、`resolveWindowSize()` 还没有 override 参数、controller 还没有退出协调方法，测试失败。

- [ ] **Step 5: Commit（仅测试）**

Run:
```bash
git add src/composables/__tests__/launcher/useWindowSizing.commandPanelExit.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git commit -m "test(sizing): 锁定参数面板退出锁高与单次回落 contract"
```

---

### Task 4: 实现退出协调器、calculation override 与 controller 单次回落

**Files:**
- Create: `src/composables/launcher/useWindowSizing/commandPanelExit.ts`
- Modify: `src/composables/launcher/useWindowSizing/controller.ts`
- Modify: `src/composables/launcher/useWindowSizing/calculation.ts`
- Modify: `src/composables/app/useAppCompositionRoot/runtime.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.commandPanelExit.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`

- [ ] **Step 1: 新建 `commandPanelExit.ts`，封装退出状态机**

```ts
// src/composables/launcher/useWindowSizing/commandPanelExit.ts
export type CommandPanelExitPhase = "idle" | "command-exiting" | "search-settling";

export function createCommandPanelExitCoordinator() {
  const state = {
    phase: "idle" as CommandPanelExitPhase,
    lockedExitFrameHeight: null as number | null,
    restoreTargetFrameHeight: null as number | null
  };

  function beginExit(frameHeight: number): void {
    state.phase = "command-exiting";
    state.lockedExitFrameHeight = frameHeight;
    state.restoreTargetFrameHeight = null;
  }

  function markSearchSettled(): void {
    if (state.lockedExitFrameHeight === null) return;
    state.phase = "search-settling";
  }

  function clear(): void {
    state.phase = "idle";
    state.lockedExitFrameHeight = null;
    state.restoreTargetFrameHeight = null;
  }

  return { beginExit, markSearchSettled, clear, snapshot: () => ({ ...state }) };
}
```

实现要点：
- 保持为小而纯的模块，不把 DOM / resize bridge 逻辑塞进状态机。
- `restoreTargetFrameHeight` 只记录一次，避免“稳定后又被后续 watcher 重写”。

- [ ] **Step 2: `calculation.ts` 增加 override 参数**

```ts
// src/composables/launcher/useWindowSizing/calculation.ts
interface ResolveWindowSizeOverrides {
  commandPanelExitFrameHeightLock?: number | null;
  ignoreCommandPanelExitLock?: boolean;
}

export function resolveWindowSize(
  options: UseWindowSizingOptions,
  overrides: ResolveWindowSizeOverrides = {}
): WindowSize {
  // ...
  if (
    !overrides.ignoreCommandPanelExitLock &&
    overrides.commandPanelExitFrameHeightLock !== null &&
    overrides.commandPanelExitFrameHeightLock !== undefined
  ) {
    resolvedContentHeight = clamp(
      Math.max(resolvedContentHeight, overrides.commandPanelExitFrameHeightLock),
      options.constants.windowBaseHeight,
      frameMaxHeight
    );
  }
  // ...
}
```

实现要点：
- 不把退出锁状态塞进 `UseWindowSizingOptions`，避免 runtime 与 watchers 扩散额外 ref。
- 进入参数页 floor 与退出锁可以并存；优先级为“先算现有 floor，再用退出锁覆盖”。

- [ ] **Step 3: `controller.ts` 接入退出协调器并暴露两个新方法**

```ts
// src/composables/launcher/useWindowSizing/controller.ts
const commandPanelExit = createCommandPanelExitCoordinator();

function requestCommandPanelExit(): void {
  const dragStripHeight = resolveShellDragStripHeightFromDom(options);
  const lockedFrameHeight = state.lastWindowSize
    ? Math.max(0, state.lastWindowSize.height - dragStripHeight)
    : options.commandPanelFrameHeightFloor.value ?? options.constants.paramOverlayMinHeight;

  commandPanelExit.beginExit(lockedFrameHeight);
}

function notifySearchPageSettled(): void {
  commandPanelExit.markSearchSettled();
  scheduleWindowSync();
}
```

同步要点：
- `syncLauncherFrameHeightStyle()` 不能再只看 `pendingCommand`；只要退出锁还在，就必须保留 `--launcher-frame-height`。
- `syncWindowSizeCore()` 中：
  - `command-exiting`：用 `resolveWindowSize(options, { commandPanelExitFrameHeightLock: locked })` 保持当前高度；
  - `search-settling`：先用 `ignoreCommandPanelExitLock: true` 采样最终搜索高度；
  - 若 target < lock：调用动画桥一次回落，完成后 `commandPanelExit.clear()`；
  - 若 target >= lock：直接 `clear()`，再走一次普通 `scheduleWindowSync()`，不要制造多余 shrink-expand。

- [ ] **Step 4: `runtime.ts` 调用新的 windowSizing API**

实现要点：
- `requestCommandPanelExit()` 已在 Chunk 1 接线，这里补齐实际 controller API 调用。
- `notifySearchPageSettled()` 只负责把稳定信号递给 sizing，不要混入业务态判断。

- [ ] **Step 5: 跑通所有 sizing 测试**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.commandPanelExit.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
```

Expected: 全绿。

- [ ] **Step 6: Commit（退出协调器落地）**

Run:
```bash
git add src/composables/launcher/useWindowSizing/commandPanelExit.ts
git add src/composables/launcher/useWindowSizing/controller.ts
git add src/composables/launcher/useWindowSizing/calculation.ts
git add src/composables/app/useAppCompositionRoot/runtime.ts
git add src/composables/__tests__/launcher/useWindowSizing.commandPanelExit.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git commit -m "fix(sizing): 新增参数面板退出锁高与单次回落协调"
```

---

## Chunk 3: 回归验证与 Tauri 手验

### Task 5: 收口回归矩阵并完成最终验收

**Files:**
- Modify: `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
- Modify: `src/composables/__tests__/launcher/useMainWindowShell.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.commandPanelExit.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`

- [ ] **Step 1: 跑本功能全部定向测试**

Run:
```bash
npm run test:run -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts
npm run test:run -- src/composables/__tests__/launcher/useMainWindowShell.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.commandPanelExit.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
```

Expected: 全绿。

- [ ] **Step 2: 跑全量门禁**

Run: `npm run check:all`

Expected:
- `lint`
- `typecheck`
- `typecheck:test`
- `test:coverage`
- `build`
- `check:rust`
- `test:rust`

全部通过。

- [ ] **Step 3: 在真实 Tauri 窗口里手动验收**

Run: `npm run tauri:dev`

手验清单：
1. 搜索页结果很多时进入参数面板，再点返回按钮：窗口先保持参数面板当前高度，不出现“先缩再弹回”。
2. 同样场景按 `Esc`：表现与返回按钮一致。
3. 搜索页结果很少时进入参数面板，再返回：窗口只在搜索页稳定后做 **一次** 平滑回落。
4. 搜索页最终高度大于等于锁高时：不出现先缩后扩；若需要增高，只发生正常的一次增高。
5. 返回过程中 `launcher-frame` 圆角/边框不裁切，`--launcher-frame-height` 不会提前被清掉。
6. submit/stage 路径仍按既有行为工作，没有把“返回锁高”误应用到执行完成链路。

- [ ] **Step 4: 最终 Commit（若前面拆提交不足，这里补收口）**

Run:
```bash
git status
git add src/components/launcher/LauncherWindow.vue
git add src/components/launcher/parts/LauncherCommandPanel.vue
git add src/App.vue
git add src/composables/app/useAppCompositionRoot/runtime.ts
git add src/composables/app/useAppCompositionRoot/viewModel.ts
git add src/composables/launcher/useMainWindowShell.ts
git add src/composables/launcher/useWindowSizing/commandPanelExit.ts
git add src/composables/launcher/useWindowSizing/controller.ts
git add src/composables/launcher/useWindowSizing/calculation.ts
git add src/components/launcher/__tests__/LauncherWindow.flow.test.ts
git add src/composables/__tests__/launcher/useMainWindowShell.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.commandPanelExit.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
git commit -m "fix(launcher): 修复参数面板返回搜索页高度恢复抖动"
```

---

## 验收对照表（与 spec §8 对齐）

- 从搜索页进入参数面板时，继续保持“同高，不够才增高”的现有行为。
- 从参数面板返回搜索页时，不再出现“先缩小再复原”的抖动。
- 返回过程中窗口先保持参数面板当前高度。
- 搜索页稳定后，仅执行一次平滑动画回落到搜索页最终高度。
- 当前已有返回入口（返回按钮、`Esc`）都收口到同一退出链路；未来新增入口只调用 `requestCommandPanelExit()`。
- 退出逻辑集中在一条共用链路中，不再分散在 `LauncherCommandPanel`、`LauncherWindow`、`useMainWindowShell` 的多个分支里。
