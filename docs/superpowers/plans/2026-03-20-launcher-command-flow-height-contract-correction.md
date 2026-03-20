# Launcher Command / Flow Height Contract Correction Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 更正 Launcher Search / Command / Flow 三类面板的高度 contract：全局只共享 `panelMaxHeight`，Search 最低高度回到搜索框本身，Command / Flow 各自独立测量最小高度并在首次 settled 后锁高，后续只允许中间内容区滚动。

**Architecture:** 现有实现把 Search floor、Command floor、Flow 列表估算和窗口 sizing 混在同一条链上，导致 `nav-slide` 时序、旧高度污染、异高卡片和 footer 漏算互相打架。本轮实现应拆成四层：`panelHeightContract` 负责纯规则、`panelMeasurement` 负责 DOM 测量、`panelHeightSession` 负责进入继承与锁高状态、组件层只负责三段式结构和 settled 信号；`useWindowSizing` 只消费这些明确的 contract，不再让 CSS 或列表估算反向主导总高度。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vitest, Tauri window sizing bridge, CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-20-launcher-command-flow-height-contract-correction-design.md`

---

## 文件结构

### 预期新增文件

| 文件路径 | 职责 |
|---|---|
| `src/composables/launcher/useWindowSizing/panelHeightContract.ts` | 纯规则层：统一公式 `min(panelMaxHeight, max(inheritedPanelHeight, panelMinHeight))`，以及 Search 特殊规则，禁止直接访问 DOM。 |
| `src/composables/launcher/useWindowSizing/panelMeasurement.ts` | 纯测量层：测量 `CommandPanel` 完整盒子自然高度、`FlowPanel` 空态 / 前 2 张真实卡片最小高度，并在目标 DOM 缺席时显式返回 `null`。 |
| `src/composables/launcher/useWindowSizing/panelHeightSession.ts` | 会话层：维护 `commandPanelInheritedHeight`、`commandPanelLockedHeight`、`flowPanelInheritedHeight`、`flowPanelLockedHeight` 的读写和清理边界。 |
| `src/composables/__tests__/launcher/panelHeightContract.test.ts` | 规则测试：锁定统一公式、cap 硬上限、Search 不走锁高公式。 |
| `src/composables/__tests__/launcher/panelMeasurement.test.ts` | 测量测试：锁定 Command 完整盒子、Flow 空态 / 异高卡片、DOM 缺席不读取旧面板。 |
| `src/composables/__tests__/launcher/panelHeightSession.test.ts` | 会话测试：锁定 Command / Flow 进入继承、首次锁高、切换边界清理、互不污染。 |

### 预期修改文件

| 文件路径 | 职责 / 改动概述 |
|---|---|
| `src/composables/launcher/useWindowSizing/model.ts` | 把旧的 `commandPanelFrameHeightFloor`、`stagingVisibleRows` 等含混输入改成明确的 session refs / fallback 常量输入。 |
| `src/composables/launcher/useWindowSizing/calculation.ts` | 改成消费 `panelHeightContract + panelHeightSession`，Search 走自然高度 clamp，Command / Flow 走继承或锁高高度，不再用 `stagingListMaxHeight` 估总高。 |
| `src/composables/launcher/useWindowSizing/controller.ts` | 管理进入 Command / Flow 时的 inherited height 捕获、首次 settled 锁高、退出清理、`nav-slide out-in` 时序保护。 |
| `src/composables/launcher/useWindowSizing/commandPanelExit.ts` | 只在必要时补充注释或极小接口调整；继续复用现有 `requestCommandPanelExit() -> search-page-settled -> 单次回落` 链路。 |
| `src/composables/app/useAppCompositionRoot/runtime.ts` | 注入新的 session refs / settled 通知器，移除旧 floor 语义。 |
| `src/composables/app/useAppCompositionRoot/viewModel.ts` | 透传新的 `notifyFlowPanelSettled`，移除 Search floor / Flow 列表高度 props。 |
| `src/composables/launcher/useLauncherLayoutMetrics.ts` | 保留 `panelMaxHeight` 来源，但移除 Search floor filler 和 Flow 列表 `maxHeight` 这类重复职责。 |
| `src/composables/launcher/useLauncherWatchers.ts` | watcher 只在真正影响外框 contract 的状态变化时触发 sizing sync，去掉 `stagingVisibleRows` 一类旧链路。 |
| `src/composables/launcher/useLauncherWatcherBindings.ts` | 适配 watcher 入参变化。 |
| `src/components/launcher/LauncherWindow.vue` | 新增 `flow-panel-settled` 事件桥接，更新 FlowPanel props，保持 Search / Command / Flow 的 settled 信号语义清晰。 |
| `src/components/launcher/types.ts` | 同步收口 `LauncherSearchPanelProps` / `LauncherFlowPanelProps`，删掉 floor filler / 列表 max-height 旧 props。 |
| `src/components/launcher/parts/LauncherSearchPanel.vue` | Search 只消费自然结果高度，不再渲染 overlay 打开时的 floor placeholder / filler。 |
| `src/components/launcher/parts/LauncherCommandPanel.vue` | 明确 `header + divider + body + divider + footer` 完整盒子 contract，保留 footer 在统一盒子内部。 |
| `src/components/launcher/parts/LauncherFlowPanel.vue` | 改成 `header + body + footer` 三段式；空态与列表态统一挂在 body 内；新增 settled emit；不再用 `stagingListMaxHeight` 决定总高度。 |
| `src/styles/launcher.css` | Search / Command / Flow 的外框 contract、三段式 grid、唯一滚动宿主和 `height: 100%` 约束全部写实。 |
| `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts` | 从旧 floor 语义迁移到 Search 自然高度 / Command 锁高 / Flow 锁高 contract。 |
| `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts` | 锁定 Command / Flow 进入继承、首次锁高、返回恢复、旧高度隔离。 |
| `src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts` | 删除 Search floor height 旧断言，改成 Search 最低高度自然 / panel max-height 变量仍稳定。 |
| `src/composables/__tests__/launcher/useLauncherWatchers.test.ts` | 去掉 `stagingVisibleRows` 触发 resize 的旧测试，改测 `stagingExpanded` / settled 通知。 |
| `src/composables/__tests__/launcher/useLauncherWatcherBindings.test.ts` | 适配 watcher 入参变化。 |
| `src/composables/__tests__/app/useAppCompositionViewModel.test.ts` | 适配 ViewModel props 和 `notifyFlowPanelSettled`。 |
| `src/components/launcher/__tests__/LauncherWindow.flow.test.ts` | 锁定 `command-page-settled` / `search-page-settled` / `flow-panel-settled` 桥接。 |
| `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts` | 从“floor-height 占位”改成“Search 不额外补高”的新 contract。 |
| `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts` | 锁定 CommandPanel 完整盒子 DOM 结构和 footer 属于统一盒子。 |
| `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts` | 锁定 FlowPanel 三段式 body、空态 / 列表态、settled emit、异高卡片最小测量 DOM contract。 |
| `src/styles/__tests__/launcher-style-contract.test.ts` | 锁定 `.command-panel` / `.flow-panel` 的 `height: 100%`、`grid-template-rows: auto minmax(0, 1fr) auto`、body/list 滚动 contract。 |

### 不应修改的文件

| 文件路径 | 原因 |
|---|---|
| `src/App.vue` | 当前 settled 事件和退出链路都已在组合层接好；本轮不重接顶层事件流。 |
| `src/composables/launcher/useMainWindowShell.ts` | Escape LIFO 与隐藏窗口语义不变，本轮只更正高度 contract。 |
| `src/components/launcher/parts/LauncherStagingPanel.vue` | 当前未被实际挂载；除非执行阶段顺手清理，否则不在本轮主路径内扩散改动。 |

### 关键边界

- `panelMaxHeight` 继续由“搜索框 + 最大搜索结果展示高度”口径提供，不能在 Flow / Command 侧另起一套 cap。
- Search 不再因为 Review / Flow 打开而引入 floor placeholder、filler 或其它额外最低高度。
- `CommandPanel` 与 `FlowPanel` 的“进入继承高度”和“生命周期锁定高度”必须分离，不能再复用单一 floor 变量。
- `FlowPanel` 的最小高度只允许由空态或前 2 张真实卡片测量主导；静态估算只做 fallback，且不能在锁高后再次改写外框。
- 任何 toast / 编辑态 / 滚动条变化都不能再次驱动外框高度。

---

## Chunk 1: 规则层与会话层收口

### Task 1: 先写失败测试，锁定统一公式与 Command / Flow 状态隔离

**Files:**
- Create: `src/composables/__tests__/launcher/panelHeightContract.test.ts`
- Create: `src/composables/__tests__/launcher/panelHeightSession.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`

- [ ] **Step 1: 新增纯规则测试，锁定统一公式与 Search 特殊规则**

```ts
// src/composables/__tests__/launcher/panelHeightContract.test.ts
import { describe, expect, it } from "vitest";
import {
  clampSearchPanelHeight,
  resolvePanelHeight
} from "../../launcher/useWindowSizing/panelHeightContract";

describe("panelHeightContract", () => {
  it("Command / Flow 统一走 min(cap, max(inherited, minHeight))", () => {
    expect(
      resolvePanelHeight({
        panelMaxHeight: 640,
        inheritedPanelHeight: 420,
        panelMinHeight: 560
      })
    ).toBe(560);
  });

  it("cap 始终是硬上限", () => {
    expect(
      resolvePanelHeight({
        panelMaxHeight: 640,
        inheritedPanelHeight: 720,
        panelMinHeight: 680
      })
    ).toBe(640);
  });

  it("Search 只按自然高度 clamp，不参与锁高公式", () => {
    expect(
      clampSearchPanelHeight({
        panelMaxHeight: 640,
        naturalPanelHeight: 124
      })
    ).toBe(124);
  });
});
```

- [ ] **Step 2: 新增会话测试，锁定 Command / Flow 的 inherited / locked 状态互不污染**

```ts
// src/composables/__tests__/launcher/panelHeightSession.test.ts
import { describe, expect, it } from "vitest";
import {
  createPanelHeightSession,
  beginCommandPanelSession,
  beginFlowPanelSession,
  lockCommandPanelHeight,
  lockFlowPanelHeight,
  clearFlowPanelSession
} from "../../launcher/useWindowSizing/panelHeightSession";

describe("panelHeightSession", () => {
  it("Flow 打开后不会覆盖已存在的 commandPanelLockedHeight", () => {
    const session = createPanelHeightSession();
    beginCommandPanelSession(session, 420);
    lockCommandPanelHeight(session, 560);

    beginFlowPanelSession(session, 560);
    lockFlowPanelHeight(session, 620);

    expect(session.commandPanelLockedHeight.value).toBe(560);
    expect(session.flowPanelLockedHeight.value).toBe(620);
  });

  it("首次 lock 后再次 lock 不会覆写已锁高度", () => {
    const session = createPanelHeightSession();
    beginCommandPanelSession(session, 420);
    lockCommandPanelHeight(session, 560);
    lockCommandPanelHeight(session, 600);

    beginFlowPanelSession(session, 560);
    lockFlowPanelHeight(session, 620);
    lockFlowPanelHeight(session, 680);

    expect(session.commandPanelLockedHeight.value).toBe(560);
    expect(session.flowPanelLockedHeight.value).toBe(620);
  });

  it("关闭 Flow 时只清 Flow 状态，不污染底层 Command 锁高", () => {
    const session = createPanelHeightSession();
    beginCommandPanelSession(session, 420);
    lockCommandPanelHeight(session, 560);
    beginFlowPanelSession(session, 560);
    lockFlowPanelHeight(session, 620);

    clearFlowPanelSession(session);

    expect(session.commandPanelLockedHeight.value).toBe(560);
    expect(session.flowPanelLockedHeight.value).toBeNull();
  });
});
```

- [ ] **Step 3: 把旧 calculation / controller 测试改成新的 contract**

```ts
// src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
it("pendingCommand 未锁高前直接沿用 commandPanelInheritedHeight", () => {
  const size = resolveWindowSize(
    createBaseOptions({
      pendingCommand: ref({ id: "pending" }),
      commandPanelInheritedHeight: ref(520),
      commandPanelLockedHeight: ref<number | null>(null)
    })
  );

  expect(size.height).toBe(520 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK);
});

it("stagingExpanded 且 Flow 已锁高时使用 flowPanelLockedHeight，而不是 stagingListMaxHeight", () => {
  const size = resolveWindowSize(
    createBaseOptions({
      stagingExpanded: ref(true),
      flowPanelInheritedHeight: ref(420),
      flowPanelLockedHeight: ref<number | null>(608)
    })
  );

  expect(size.height).toBe(608 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK);
});
```

```ts
// src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
it("Flow 打开时先继承当前 frame height（当前面板实际总高度去掉 drag strip 后的 sizing 口径），未 settled 前不读旧列表估算", async () => {
  const harness = createFlowHarness({
    lastFrameHeight: 420
  });

  harness.state.stagingExpanded.value = true;
  await harness.controller.syncWindowSize();

  expect(harness.state.flowPanelInheritedHeight.value).toBe(420);
  expect(harness.state.flowPanelLockedHeight.value).toBeNull();
});
```

- [ ] **Step 4: 在 controller 测试里补上 Flow 关闭清理与统一返回恢复链路的失败用例**

```ts
// src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
it("Flow 关闭时只清 flowPanelInheritedHeight / flowPanelLockedHeight，不污染 commandPanelLockedHeight", async () => {
  const harness = createCommandAndFlowHarness();

  harness.state.stagingExpanded.value = false;
  await harness.controller.syncWindowSize();

  expect(harness.state.commandPanelLockedHeight.value).toBe(560);
  expect(harness.state.flowPanelInheritedHeight.value).toBeNull();
  expect(harness.state.flowPanelLockedHeight.value).toBeNull();
});

it("requestCommandPanelExit 继续复用 search-page-settled 单次回落链路", async () => {
  const harness = createExitHarness();
  await harness.controller.syncWindowSize();
  harness.controller.requestCommandPanelExit();
  harness.state.pendingCommand.value = null;

  await harness.controller.syncWindowSize();
  expect(harness.spies.requestAnimateMainWindowSize).not.toHaveBeenCalledWith(
    expect.any(Number),
    WINDOW_SIZING_CONSTANTS.windowBaseHeight + UI_TOP_ALIGN_OFFSET_PX_FALLBACK
  );

  harness.controller.notifySearchPageSettled();
  await harness.controller.syncWindowSize();
  expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenCalledWith(
    expect.any(Number),
    WINDOW_SIZING_CONSTANTS.windowBaseHeight + UI_TOP_ALIGN_OFFSET_PX_FALLBACK
  );
});
```

- [ ] **Step 5: 运行定向测试并确认失败**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/panelHeightContract.test.ts
npm run test:run -- src/composables/__tests__/launcher/panelHeightSession.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
```

Expected:
- `panelHeightContract.ts` / `panelHeightSession.ts` 尚不存在，新增测试失败。
- `useWindowSizing` 仍在依赖旧 `commandPanelFrameHeightFloor` / `stagingVisibleRows` 语义，相关断言失败。

- [ ] **Step 6: Commit（仅测试）**

```bash
git add src/composables/__tests__/launcher/panelHeightContract.test.ts
git add src/composables/__tests__/launcher/panelHeightSession.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git commit -m "test(launcher): 锁定面板高度规则与会话隔离 contract"
```

---

### Task 2: 实现规则层 / 会话层，并让 sizing 只消费明确状态

**Files:**
- Create: `src/composables/launcher/useWindowSizing/panelHeightContract.ts`
- Create: `src/composables/launcher/useWindowSizing/panelHeightSession.ts`
- Modify: `src/composables/launcher/useWindowSizing/model.ts`
- Modify: `src/composables/launcher/useWindowSizing/calculation.ts`
- Modify: `src/composables/launcher/useWindowSizing/controller.ts`
- Modify: `src/composables/app/useAppCompositionRoot/runtime.ts`
- Modify: `src/composables/__tests__/launcher/panelHeightContract.test.ts`
- Modify: `src/composables/__tests__/launcher/panelHeightSession.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`

- [ ] **Step 1: 新建 `panelHeightContract.ts`，收口纯公式与 Search 特殊规则**

```ts
// src/composables/launcher/useWindowSizing/panelHeightContract.ts
interface ResolvePanelHeightOptions {
  panelMaxHeight: number;
  inheritedPanelHeight: number;
  panelMinHeight: number;
}

interface ClampSearchPanelHeightOptions {
  panelMaxHeight: number;
  naturalPanelHeight: number;
}

export function resolvePanelHeight(options: ResolvePanelHeightOptions): number {
  return Math.min(
    options.panelMaxHeight,
    Math.max(options.inheritedPanelHeight, options.panelMinHeight)
  );
}

export function clampSearchPanelHeight(
  options: ClampSearchPanelHeightOptions
): number {
  return Math.min(options.panelMaxHeight, options.naturalPanelHeight);
}
```

- [ ] **Step 2: 先在 `panelHeightSession.ts` 定义 session API 的最小签名与边界**

```ts
// src/composables/launcher/useWindowSizing/panelHeightSession.ts
export interface PanelHeightSession {
  commandPanelInheritedHeight: Ref<number | null>;
  commandPanelLockedHeight: Ref<number | null>;
  flowPanelInheritedHeight: Ref<number | null>;
  flowPanelLockedHeight: Ref<number | null>;
}

export function beginCommandPanelSession(session: PanelHeightSession, inheritedHeight: number): void;
export function lockCommandPanelHeight(session: PanelHeightSession, lockedHeight: number): void;
export function clearCommandPanelSession(session: PanelHeightSession): void;
export function beginFlowPanelSession(session: PanelHeightSession, inheritedHeight: number): void;
export function lockFlowPanelHeight(session: PanelHeightSession, lockedHeight: number): void;
export function clearFlowPanelSession(session: PanelHeightSession): void;
```

- [ ] **Step 3: 实现 `createPanelHeightSession()` 与上述 helpers，显式拆分 Command / Flow 的 inherited 与 locked 状态**

```ts
// src/composables/launcher/useWindowSizing/panelHeightSession.ts
import { ref, type Ref } from "vue";

export interface PanelHeightSession {
  commandPanelInheritedHeight: Ref<number | null>;
  commandPanelLockedHeight: Ref<number | null>;
  flowPanelInheritedHeight: Ref<number | null>;
  flowPanelLockedHeight: Ref<number | null>;
}

export function createPanelHeightSession(): PanelHeightSession {
  return {
    commandPanelInheritedHeight: ref<number | null>(null),
    commandPanelLockedHeight: ref<number | null>(null),
    flowPanelInheritedHeight: ref<number | null>(null),
    flowPanelLockedHeight: ref<number | null>(null)
  };
}

export function beginCommandPanelSession(session: PanelHeightSession, inheritedHeight: number): void {
  session.commandPanelInheritedHeight.value = inheritedHeight;
  session.commandPanelLockedHeight.value = null;
}

export function lockCommandPanelHeight(session: PanelHeightSession, lockedHeight: number): void {
  if (session.commandPanelLockedHeight.value !== null) {
    return;
  }
  session.commandPanelLockedHeight.value = lockedHeight;
}

export function clearCommandPanelSession(session: PanelHeightSession): void {
  session.commandPanelInheritedHeight.value = null;
  session.commandPanelLockedHeight.value = null;
}

export function beginFlowPanelSession(session: PanelHeightSession, inheritedHeight: number): void {
  session.flowPanelInheritedHeight.value = inheritedHeight;
  session.flowPanelLockedHeight.value = null;
}

export function lockFlowPanelHeight(session: PanelHeightSession, lockedHeight: number): void {
  if (session.flowPanelLockedHeight.value !== null) {
    return;
  }
  session.flowPanelLockedHeight.value = lockedHeight;
}

export function clearFlowPanelSession(session: PanelHeightSession): void {
  session.flowPanelInheritedHeight.value = null;
  session.flowPanelLockedHeight.value = null;
}
```

- [ ] **Step 4: 调整 `model.ts` / `runtime.ts` 注入新状态，删除旧 floor / staging rows 依赖**

```ts
// src/composables/launcher/useWindowSizing/model.ts
export interface UseWindowSizingOptions {
  // ...
  commandPanelInheritedHeight: Ref<number | null>;
  commandPanelLockedHeight: Ref<number | null>;
  flowPanelInheritedHeight: Ref<number | null>;
  flowPanelLockedHeight: Ref<number | null>;
  // 删除 commandPanelFrameHeightFloor
  // 删除 stagingVisibleRows
}
```

```ts
// src/composables/app/useAppCompositionRoot/runtime.ts
const panelHeightSession = createPanelHeightSession();

const windowSizing = useWindowSizing({
  // ...
  commandPanelInheritedHeight: panelHeightSession.commandPanelInheritedHeight,
  commandPanelLockedHeight: panelHeightSession.commandPanelLockedHeight,
  flowPanelInheritedHeight: panelHeightSession.flowPanelInheritedHeight,
  flowPanelLockedHeight: panelHeightSession.flowPanelLockedHeight
});
```

- [ ] **Step 5: 改写 `calculation.ts`，Search 走自然高度，Command / Flow 只读 inherited / locked**

```ts
// src/composables/launcher/useWindowSizing/calculation.ts
function resolveCommandPanelFrameHeight(
  options: UseWindowSizingOptions
): number | null {
  if (!options.pendingCommand.value) {
    return null;
  }
  return (
    options.commandPanelLockedHeight.value ??
    options.commandPanelInheritedHeight.value
  );
}

function resolveFlowPanelFrameHeight(
  options: UseWindowSizingOptions
): number | null {
  if (!options.stagingExpanded.value) {
    return null;
  }
  return (
    options.flowPanelLockedHeight.value ??
    options.flowPanelInheritedHeight.value
  );
}
```

这一改写必须同时满足三条硬约束：Search 不再因为 `stagingExpanded` 或 `flowOpen` 自动抬到 drawer floor；Command 与 Flow 同开时窗口高度取 `max(leftFrameHeight, rightFrameHeight)`，且左右两侧都来自 session height；`measureWindowContentHeightFromLayout()` 在目标面板 DOM 缺席时返回 `null`，不回退读取旧 shell 高度。

- [ ] **Step 6: 改写 `controller.ts` 的进入 / 退出捕获逻辑，并统一 inherited height 口径**

```ts
// src/composables/launcher/useWindowSizing/controller.ts
interface WindowSizingState {
  lastWindowSize: WindowSize | null;
  syncingWindowSize: boolean;
  queuedWindowSync: boolean;
  pendingCommandActive: boolean;
  flowPanelActive: boolean;
  pendingCommandSettled: boolean;
  flowPanelSettled: boolean;
}
```

这里统一使用 `frame height` 作为 spec 中 `inheritedPanelHeight` 的前端实现口径：spec 所说的“当前面板实际总高度”在窗口 sizing 层会先扣除 drag strip，得到真正参与 `resolveWindowSize()` 计算的面板外框高度，因此 `inheritedPanelHeight = lastWindowSize.height - dragStripHeight`。测试里的 `lastFrameHeight`、session 中的 inherited 值和 `resolveWindowSize()` 的输入必须始终共用这一口径；`pendingCommand: null -> non-null` 与 `stagingExpanded: false -> true` 都要按这个口径捕获 inherited；`notifyCommandPageSettled()` / `notifyFlowPanelSettled()` 只设置 settled 标记并调度 sync，不直接写死高度。

- [ ] **Step 7: 在 controller 中把“首次锁高一次”写成硬约束，并保护旧退出恢复链路**

```ts
// src/composables/launcher/useWindowSizing/controller.ts
if (state.pendingCommandSettled && options.commandPanelLockedHeight.value === null) {
  lockCommandPanelHeight(session, resolvedCommandHeight);
}

if (state.flowPanelSettled && options.flowPanelLockedHeight.value === null) {
  lockFlowPanelHeight(session, resolvedFlowHeight);
}
```

这一段必须同时覆盖四个边界：`lock*` 只在对应 `lockedHeight === null` 时写入；Flow 关闭时只清 Flow session，不污染底层 Command 锁高；`requestCommandPanelExit()` 继续复用既有 `search-page-settled -> 单次回落` 协调器；命令页退出后才清 Command session，避免在 Flow 覆盖期间提前丢失底层高度。

- [ ] **Step 8: 运行本 Chunk focused tests 并修到全绿**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/panelHeightContract.test.ts
npm run test:run -- src/composables/__tests__/launcher/panelHeightSession.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
```

Expected: 全绿。

- [ ] **Step 9: Commit（规则层 / 会话层落地）**

```bash
git add src/composables/launcher/useWindowSizing/panelHeightContract.ts
git add src/composables/launcher/useWindowSizing/panelHeightSession.ts
git add src/composables/launcher/useWindowSizing/model.ts
git add src/composables/launcher/useWindowSizing/calculation.ts
git add src/composables/launcher/useWindowSizing/controller.ts
git add src/composables/app/useAppCompositionRoot/runtime.ts
git add src/composables/__tests__/launcher/panelHeightContract.test.ts
git add src/composables/__tests__/launcher/panelHeightSession.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git commit -m "fix(launcher): 收口面板高度规则与会话状态"
```

---

## Chunk 2: 测量层与组件三段式 contract

### Task 3: 先写失败测试，锁定 Command 完整盒子、Flow 异高卡片和三段式 DOM

**Files:**
- Create: `src/composables/__tests__/launcher/panelMeasurement.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts`
- Modify: `src/styles/__tests__/launcher-style-contract.test.ts`
- Modify: `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`

- [ ] **Step 1: 新增测量测试，锁定 Command 完整盒子和 Flow 空态 / 异高卡片**

```ts
// src/composables/__tests__/launcher/panelMeasurement.test.ts
import { describe, expect, it } from "vitest";
import {
  measureCommandPanelFullNaturalHeight,
  measureFlowPanelMinHeight
} from "../../launcher/useWindowSizing/panelMeasurement";

describe("panelMeasurement", () => {
  it("CommandPanel 完整盒子高度包含 header + content + footer + divider", () => {
    const shell = buildCommandShell({
      headerHeight: 52,
      contentScrollHeight: 240,
      footerHeight: 60,
      dividerHeights: [1, 1]
    });

    expect(measureCommandPanelFullNaturalHeight(shell)).toBe(354);
  });

  it("CommandPanel 缺少关键节点时返回 null，不读取残缺 DOM", () => {
    const shell = buildCommandShellMissingFooter();
    expect(measureCommandPanelFullNaturalHeight(shell)).toBeNull();
  });

  it("FlowPanel 空态按 header + empty-state + footer 计算最小高度，且空态与列表同时存在时仍优先空态", () => {
    const shell = buildFlowShellWithEmptyAndList({
      headerHeight: 52,
      emptyStateHeight: 96,
      footerHeight: 60,
      firstCardHeight: 110,
      secondCardHeight: 148
    });

    expect(measureFlowPanelMinHeight(shell)).toBe(208);
  });

  it("FlowPanel 非空态按前 2 张真实异高卡片求和", () => {
    const shell = buildFlowShell({
      headerHeight: 52,
      footerHeight: 60,
      firstCardHeight: 110,
      secondCardHeight: 148
    });

    expect(measureFlowPanelMinHeight(shell)).toBe(370);
  });

  it("目标面板 DOM 缺席时返回 null，不允许回退读取旧面板高度", () => {
    const shell = document.createElement("div");
    shell.innerHTML = "<section class='search-panel'></section>";
    expect(measureFlowPanelMinHeight(shell)).toBeNull();
  });
});
```

- [ ] **Step 2: 锁定 Command / Flow 组件结构和 settled 事件**

```ts
// src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
it("保留 header + divider + body + divider + footer 完整盒子结构", () => {
  const wrapper = mountPanel();
  expect(wrapper.find(".command-panel__header").exists()).toBe(true);
  expect(wrapper.findAll(".command-panel__divider")).toHaveLength(2);
  expect(wrapper.find(".command-panel__content").exists()).toBe(true);
  expect(wrapper.find(".command-panel__footer").exists()).toBe(true);
});
```

```ts
// src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
it("FlowPanel 采用 header + body + footer 三段式，空态和列表态都挂在 body 内", () => {
  const wrapper = mount(LauncherFlowPanel, { props: createProps() });
  expect(wrapper.find(".flow-panel__header").exists()).toBe(true);
  expect(wrapper.find(".flow-panel__body").exists()).toBe(true);
  expect(wrapper.find(".flow-panel__footer").exists()).toBe(true);
});

it("stagingDrawerState 进入 open 后发出 flow-panel-settled", async () => {
  const wrapper = mount(LauncherFlowPanel, {
    props: createProps({ stagingDrawerState: "opening" })
  });
  await wrapper.setProps({ stagingDrawerState: "open" });
  await nextTick();
  expect(wrapper.emitted("flow-panel-settled")).toHaveLength(1);
});

it("组件首帧即为 open 时，mounted 后也会补发一次 flow-panel-settled", async () => {
  const wrapper = mount(LauncherFlowPanel, {
    props: createProps({ stagingDrawerState: "open" })
  });
  await nextTick();
  expect(wrapper.emitted("flow-panel-settled")).toHaveLength(1);
});

it("同一轮 open 生命周期不会重复发出 flow-panel-settled", async () => {
  const wrapper = mount(LauncherFlowPanel, {
    props: createProps({ stagingDrawerState: "opening" })
  });
  await wrapper.setProps({ stagingDrawerState: "open" });
  await wrapper.setProps({ stagingDrawerState: "open" });
  await nextTick();
  expect(wrapper.emitted("flow-panel-settled")).toHaveLength(1);
});

it("列表态挂载 flow-panel--has-list，空态不挂载该 modifier", () => {
  const listWrapper = mount(LauncherFlowPanel, {
    props: createProps({ stagedCommands: [createStagedCommand()] })
  });
  expect(listWrapper.get(".flow-panel").classes()).toContain("flow-panel--has-list");

  const emptyWrapper = mount(LauncherFlowPanel, {
    props: createProps({ stagedCommands: [] })
  });
  expect(emptyWrapper.get(".flow-panel").classes()).not.toContain("flow-panel--has-list");
});
```

- [ ] **Step 3: 锁定样式 contract：只有 body / list 滚动，面板自身填满 frame**

```ts
// src/styles/__tests__/launcher-style-contract.test.ts
it("CommandPanel / FlowPanel 都是三段式且填满 launcher-frame", () => {
  expect(launcherCss).toMatch(/\.command-panel[\s\S]*height:\s*100%;/);
  expect(launcherCss).toMatch(/\.command-panel[\s\S]*grid-template-rows:\s*auto minmax\(0,\s*1fr\) auto;/);
  expect(launcherCss).toMatch(/\.flow-panel[\s\S]*height:\s*100%;/);
  expect(launcherCss).toMatch(/\.flow-panel[\s\S]*grid-template-rows:\s*auto minmax\(0,\s*1fr\) auto;/);
  expect(launcherCss).toMatch(/\.flow-panel__body[\s\S]*min-height:\s*0;/);
  expect(launcherCss).toMatch(/\.flow-panel__body[\s\S]*overflow-y:\s*auto;/);
  expect(launcherCss).toMatch(/\.flow-panel--has-list[\s\S]*\.flow-panel__body[\s\S]*overflow:\s*hidden;/);
  expect(launcherCss).toMatch(/\.flow-panel__list[\s\S]*overflow-y:\s*auto;/);
});
```

- [ ] **Step 4: 在 `LauncherWindow.flow.test.ts` 锁定 settled 事件桥接**

```ts
// src/components/launcher/__tests__/LauncherWindow.flow.test.ts
it("FlowPanel 发出 flow-panel-settled 时，LauncherWindow 向上透传同名事件", async () => {
  const wrapper = mount(LauncherWindow, {
    props: createBaseProps({ stagingExpanded: true, stagingDrawerState: "open" }),
    global: {
      stubs: {
        LauncherSearchPanel: true,
        LauncherCommandPanel: true,
        LauncherSafetyOverlay: true,
        LauncherFlowPanel: {
          template: "<button class='flow-settled' @click=\"$emit('flow-panel-settled')\">ok</button>"
        }
      }
    }
  });

  await wrapper.get(".flow-settled").trigger("click");
  expect(wrapper.emitted("flow-panel-settled")).toHaveLength(1);
});
```

- [ ] **Step 5: 运行定向测试并确认失败**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/panelMeasurement.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
npm run test:run -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts
npm run test:run -- src/styles/__tests__/launcher-style-contract.test.ts
```

Expected:
- `panelMeasurement.ts` 尚不存在。
- `FlowPanel` 当前缺少 `.flow-panel__body` 和完整 settled 时序 contract，测试失败。
- 样式尚未把 `.command-panel` / `.flow-panel` 明确写成 `height: 100%` 的三段式 contract，测试失败。

- [ ] **Step 6: Commit（仅测试）**

```bash
git add src/composables/__tests__/launcher/panelMeasurement.test.ts
git add src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
git add src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
git add src/components/launcher/__tests__/LauncherWindow.flow.test.ts
git add src/styles/__tests__/launcher-style-contract.test.ts
git commit -m "test(launcher): 锁定面板测量与三段式结构 contract"
```

---

### Task 4: 实现测量层和组件三段式，让 settled 后只锁一次

**Files:**
- Create: `src/composables/launcher/useWindowSizing/panelMeasurement.ts`
- Modify: `src/composables/launcher/useWindowSizing/controller.ts`
- Modify: `src/components/launcher/LauncherWindow.vue`
- Modify: `src/components/launcher/types.ts`
- Modify: `src/components/launcher/parts/LauncherCommandPanel.vue`
- Modify: `src/components/launcher/parts/LauncherFlowPanel.vue`
- Modify: `src/styles/launcher.css`
- Modify: `src/composables/__tests__/launcher/panelMeasurement.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts`
- Modify: `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
- Modify: `src/styles/__tests__/launcher-style-contract.test.ts`

- [ ] **Step 1: 创建 `panelMeasurement.ts`，收口 Command / Flow 的真实最小高度测量**

```ts
// src/composables/launcher/useWindowSizing/panelMeasurement.ts
interface ResolveCommandPanelMinHeightOptions {
  fallbackMinHeight: number;
  fullNaturalHeight: number | null;
}

interface ResolveFlowPanelMinHeightOptions {
  fallbackMinHeight: number;
  measuredMinHeight: number | null;
}

export function resolveCommandPanelMinHeight(
  options: ResolveCommandPanelMinHeightOptions
): number {
  return Math.max(options.fallbackMinHeight, options.fullNaturalHeight ?? 0);
}

export function resolveFlowPanelMinHeight(
  options: ResolveFlowPanelMinHeightOptions
): number {
  return Math.max(options.fallbackMinHeight, options.measuredMinHeight ?? 0);
}
```

- [ ] **Step 2: 在 `panelMeasurement.ts` 写明测量优先级与失败路径**

这一层必须显式实现四条规则：`measureCommandPanelFullNaturalHeight()` 只读取当前 `.command-panel` DOM，缺 header/content/footer/divider 任一关键节点时返回 `null`；`measureFlowPanelMinHeight()` 先读 `.flow-panel__empty`，只有空态缺席时才读取 `.flow-panel__list-item` 前 2 张真实卡片；Flow 测量忽略 toast / 编辑态 / 滚动条；目标面板 DOM 缺席时绝不回退读取旧面板。

- [ ] **Step 3: 改造 `LauncherCommandPanel.vue` / `LauncherFlowPanel.vue` 成明确三段式结构**

```vue
<!-- src/components/launcher/parts/LauncherFlowPanel.vue -->
<section
  class="flow-panel"
  :class="{ 'flow-panel--has-list': props.stagedCommands.length > 0 }"
>
  <header class="flow-panel__header">...</header>
  <section class="flow-panel__body">
    <p v-if="props.executionFeedbackMessage" class="flow-panel__feedback">...</p>
    <div v-if="props.stagedCommands.length === 0" class="flow-panel__empty">...</div>
    <ul v-else class="flow-panel__list">...</ul>
  </section>
  <footer class="flow-panel__footer">...</footer>
</section>
```

这一改造必须同时落地三条结构约束：`FlowPanel` 不再接收 `stagingListShouldScroll` / `stagingListMaxHeight` / `drawerFloorViewportHeight` 作为总高度控制输入；`CommandPanel` 保持 2 条 divider 以稳定完整盒子测量；空态与列表态都只存在于 `flow-panel__body` 这一中间区，不再把 header/footer 之外的空白分散到模板外层。

- [ ] **Step 4: 为 `flow-panel-settled` 写清首次 open 的触发时序与一次性约束**

`watch(() => props.stagingDrawerState, ...)` 在状态变为 `"open"` 后 `nextTick()` emit `"flow-panel-settled"`；如果组件挂载首帧就是 `"open"`，也要在 mounted 后补发一次；同一轮 open 生命周期内最多 emit 一次，避免 controller 在重复 open 信号上覆写已锁高度。

- [ ] **Step 5: 在 `controller.ts` 中接入真实测量，只允许 settled 后首次锁高一次**

```ts
// src/composables/launcher/useWindowSizing/controller.ts
function maybeLockCommandPanelHeight(options: UseWindowSizingOptions, state: WindowSizingState): void {
  if (!state.pendingCommandSettled || options.commandPanelLockedHeight.value !== null) {
    return;
  }

  const shell = options.searchShellRef.value;
  const fullNaturalHeight = shell ? measureCommandPanelFullNaturalHeight(shell) : null;
  const panelMinHeight = resolveCommandPanelMinHeight({
    fallbackMinHeight: options.constants.commandPanelFallbackMinHeight,
    fullNaturalHeight
  });

  options.commandPanelLockedHeight.value = resolvePanelHeight({
    panelMaxHeight: resolveFrameMaxHeight(options),
    inheritedPanelHeight: options.commandPanelInheritedHeight.value ?? options.constants.windowBaseHeight,
    panelMinHeight
  });
}
```

同理实现 `maybeLockFlowPanelHeight()`：只在 `flowPanelSettled === true && flowPanelLockedHeight === null` 时执行；使用 `measureFlowPanelMinHeight()` + `resolveFlowPanelMinHeight()`；如果测量返回 `null`，先使用 fallback min height 锁一次，后续就算真实高度到位也不能再改写已锁外框。

- [ ] **Step 6: 在 `LauncherWindow.vue` 增加 Flow settled 事件桥接**

```vue
<!-- src/components/launcher/LauncherWindow.vue -->
<LauncherFlowPanel
  v-if="props.stagingExpanded"
  ...
  @flow-panel-settled="emit('flow-panel-settled')"
/>
```

同时更新 `defineEmits`：

```ts
(e: "flow-panel-settled"): void;
```

- [ ] **Step 7: 在 `launcher.css` 落地三段式和唯一滚动宿主**

```css
.command-panel,
.flow-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100%;
  max-height: var(--launcher-panel-max-height, none);
  min-height: 0;
  overflow: hidden;
}

.flow-panel__body,
.command-panel__content {
  min-height: 0;
  overflow-y: auto;
}

.flow-panel--has-list .flow-panel__body {
  overflow: hidden;
}

.flow-panel__list,
.command-panel__content {
  overflow-y: auto;
}
```

- [ ] **Step 8: 删除 `flow-panel__list` 行内 `max-height`，并在组件测试里锁定该行内样式已消失**

执行要求：`LauncherFlowPanel.vue` 不再向列表根节点写 `:style="{ maxHeight: ... }"`；`LauncherFlowPanel.test.ts` 需要显式断言列表态根节点不再包含旧的行内 `max-height`。

- [ ] **Step 9: 把空态 / 列表态滚动宿主策略写成可验证 contract**

执行要求：空态时只让 `flow-panel__body` 承担滚动；列表态通过 `flow-panel--has-list` modifier 把 body 切回 `overflow: hidden`，只让 `flow-panel__list` 成为滚动宿主，避免双滚动。`LauncherFlowPanel.test.ts` 与 `launcher-style-contract.test.ts` 都要锁定这一选择。

- [ ] **Step 10: 把 `.flow-panel__empty` 的行内 style 迁回 CSS，并让测量口径只依赖 class 结构**

执行要求：把模板里写死的 `display / align-items / justify-content / padding / border-color / font-size` 等行内 style 迁回 `launcher.css`，避免测量 helper 依赖模板字面量；同时在组件测试里保留空态 DOM 结构断言。

- [ ] **Step 11: 运行本 Chunk focused tests 并修到全绿**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/panelMeasurement.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
npm run test:run -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts
npm run test:run -- src/styles/__tests__/launcher-style-contract.test.ts
```

Expected: 全绿。

- [ ] **Step 12: Commit（测量层与三段式落地）**

```bash
git add src/composables/launcher/useWindowSizing/panelMeasurement.ts
git add src/composables/launcher/useWindowSizing/controller.ts
git add src/components/launcher/LauncherWindow.vue
git add src/components/launcher/types.ts
git add src/components/launcher/parts/LauncherCommandPanel.vue
git add src/components/launcher/parts/LauncherFlowPanel.vue
git add src/styles/launcher.css
git add src/composables/__tests__/launcher/panelMeasurement.test.ts
git add src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
git add src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
git add src/components/launcher/__tests__/LauncherWindow.flow.test.ts
git add src/styles/__tests__/launcher-style-contract.test.ts
git commit -m "fix(launcher): 收口面板测量与三段式高度 contract"
```

---

## Chunk 3: 清理旧高度职责并完成交互回归

### Task 5: 先写失败测试，锁定 Search 自然高度、ViewModel / watcher 新接线与交互路径

**Files:**
- Modify: `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`
- Modify: `src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts`
- Modify: `src/composables/__tests__/launcher/useLauncherWatchers.test.ts`
- Modify: `src/composables/__tests__/launcher/useLauncherWatcherBindings.test.ts`
- Modify: `src/composables/__tests__/app/useAppCompositionViewModel.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`

- [ ] **Step 1: 把 Search floor-height 测试改成“Search 不额外补高”的新 contract**

```ts
// src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
it("drawerOpen=false 时不再渲染 result-drawer-floor 占位", () => {
  const wrapper = mount(LauncherSearchPanel, {
    props: createProps({
      query: "",
      drawerOpen: false
    })
  });

  expect(wrapper.find('[data-testid="result-drawer-floor"]').exists()).toBe(false);
  expect(wrapper.find('.result-drawer__filler').exists()).toBe(false);
});
```

```ts
// src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
it("overlay 打开也不再抬高 Search drawer 到 floor height", () => {
  const metrics = useLauncherLayoutMetrics({
    query: ref(""),
    filteredResults: ref([]),
    stagedCommands: ref([]),
    stagingExpanded: ref(true),
    flowOpen: ref(true)
  });

  expect("drawerFloorViewportHeight" in metrics).toBe(false);
});
```

- [ ] **Step 2: 更新 watcher / viewModel 测试，锁定旧职责已经移除**

```ts
// src/composables/__tests__/launcher/useLauncherWatchers.test.ts
it("不再因为 stagingVisibleRows 变化触发外框 resize", async () => {
  const harness = createHarness();
  expect("stagingVisibleRows" in harness.state).toBe(false);
});
```

```ts
// src/composables/__tests__/app/useAppCompositionViewModel.test.ts
expect(viewModel.notifyFlowPanelSettled).toBeTypeOf("function");
expect("drawerFloorViewportHeight" in viewModel).toBe(false);
expect("stagingListMaxHeight" in viewModel).toBe(false);
```

- [ ] **Step 3: 在 controller 交互测试里补齐关键路径**

```ts
// src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
it("搜索 -> Flow：先继承搜索当前高度，settled 后仅在不足时补高一次", async () => {
  const harness = createFlowHarness({ lastFrameHeight: 124 });
  harness.state.stagingExpanded.value = true;

  await harness.controller.syncWindowSize();
  expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
    expect.any(Number),
    124 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK
  );

  harness.controller.notifyFlowPanelSettled();
  await harness.controller.syncWindowSize();

  expect(harness.state.flowPanelLockedHeight.value).not.toBeNull();
});

it("Command -> Flow -> 关闭 Flow：恢复 commandPanelLockedHeight 语义", async () => {
  const harness = createCommandAndFlowHarness();
  harness.state.stagingExpanded.value = true;
  await harness.controller.syncWindowSize();
  harness.controller.notifyFlowPanelSettled();
  await harness.controller.syncWindowSize();

  expect(harness.state.commandPanelLockedHeight.value).toBe(560);
  expect(harness.state.flowPanelLockedHeight.value).not.toBeNull();

  harness.state.stagingExpanded.value = false;
  await harness.controller.syncWindowSize();

  expect(harness.state.commandPanelLockedHeight.value).toBe(560);
  expect(harness.state.flowPanelInheritedHeight.value).toBeNull();
  expect(harness.state.flowPanelLockedHeight.value).toBeNull();
  expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
    expect.any(Number),
    560 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK
  );
});

it("Chunk 3 改 wiring 后仍保留 requestCommandPanelExit -> search-page-settled -> 单次回落", async () => {
  const harness = createExitHarness();
  await harness.controller.syncWindowSize();
  harness.controller.requestCommandPanelExit();
  harness.state.pendingCommand.value = null;

  await harness.controller.syncWindowSize();
  expect(harness.spies.requestAnimateMainWindowSize).not.toHaveBeenCalledWith(
    expect.any(Number),
    WINDOW_SIZING_CONSTANTS.windowBaseHeight + UI_TOP_ALIGN_OFFSET_PX_FALLBACK
  );

  harness.controller.notifySearchPageSettled();
  await harness.controller.syncWindowSize();
  expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenCalledWith(
    expect.any(Number),
    WINDOW_SIZING_CONSTANTS.windowBaseHeight + UI_TOP_ALIGN_OFFSET_PX_FALLBACK
  );
});
```

- [ ] **Step 4: 运行定向测试并确认失败**

Run:
```bash
npm run test:run -- src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
npm run test:run -- src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
npm run test:run -- src/composables/__tests__/launcher/useLauncherWatchers.test.ts
npm run test:run -- src/composables/__tests__/launcher/useLauncherWatcherBindings.test.ts
npm run test:run -- src/composables/__tests__/app/useAppCompositionViewModel.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
```

Expected:
- Search floor placeholder / filler 仍存在，Search contract 测试失败。
- ViewModel / watcher 仍暴露旧 props 或旧 watch 项，测试失败。
- Flow 交互路径尚未接入 `notifyFlowPanelSettled`，测试失败。

- [ ] **Step 5: Commit（仅测试）**

```bash
git add src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
git add src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
git add src/composables/__tests__/launcher/useLauncherWatchers.test.ts
git add src/composables/__tests__/launcher/useLauncherWatcherBindings.test.ts
git add src/composables/__tests__/app/useAppCompositionViewModel.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git commit -m "test(launcher): 锁定搜索自然高度与 Flow 回退路径"
```

---

### Task 6: 删除旧 Search floor / Flow 列表高度职责，跑完整回归

**Files:**
- Modify: `src/composables/launcher/useLauncherLayoutMetrics.ts`
- Modify: `src/composables/launcher/useLauncherWatchers.ts`
- Modify: `src/composables/launcher/useLauncherWatcherBindings.ts`
- Modify: `src/composables/app/useAppCompositionRoot/runtime.ts`
- Modify: `src/composables/app/useAppCompositionRoot/viewModel.ts`
- Modify: `src/components/launcher/LauncherWindow.vue`
- Modify: `src/components/launcher/types.ts`
- Modify: `src/components/launcher/parts/LauncherSearchPanel.vue`
- Modify: `src/components/launcher/parts/LauncherFlowPanel.vue`
- Modify: `src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts`
- Modify: `src/composables/__tests__/launcher/useLauncherWatchers.test.ts`
- Modify: `src/composables/__tests__/launcher/useLauncherWatcherBindings.test.ts`
- Modify: `src/composables/__tests__/app/useAppCompositionViewModel.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`

- [ ] **Step 1: 从 layout metrics / SearchPanel / props 链路删除旧 floor / filler 责任**

```ts
// src/composables/launcher/useLauncherLayoutMetrics.ts
return {
  drawerOpen,
  windowHeightCap,
  windowWidthCap,
  searchMainWidth,
  searchShellStyle,
  minShellWidth,
  drawerVisibleRows,
  drawerViewportHeight
  // 删除 drawerUsesFloorHeight / drawerFloorViewportHeight / drawerFillerHeight
  // 删除 stagingVisibleRows / stagingListShouldScroll / stagingListMaxHeight
};
```

```vue
<!-- src/components/launcher/parts/LauncherSearchPanel.vue -->
<section v-if="props.drawerOpen" class="result-drawer" :style="{ maxHeight: `${props.drawerViewportHeight}px` }">
  ...
</section>
<!-- 删除 result-drawer-floor 与 filler -->
```

- [ ] **Step 2: 更新 watcher wiring，只保留真正影响 contract 的信号**

执行要求：`useLauncherWatchers()` 不再接 `stagingVisibleRows`；仅保留 `drawerVisibleRows`、`pendingCommand`、`stagingExpanded` 或 `stagingDrawerState` 这类真正影响面板显隐与锁高时机的信号，并在 `useLauncherWatchers.test.ts` / `useLauncherWatcherBindings.test.ts` 锁定旧 watch 项已经移除。

- [ ] **Step 3: 更新 ViewModel / Window / types 接线，彻底移除旧 props，并新增 `notifyFlowPanelSettled`**

执行要求：`viewModel.ts` / `LauncherWindow.vue` / `types.ts` 同步删除 `drawerFloorViewportHeight`、`drawerFillerHeight`、`stagingListShouldScroll`、`stagingListMaxHeight` 等旧 props；同时新增并透传 `notifyFlowPanelSettled`，并在 `useAppCompositionViewModel.test.ts` / `LauncherWindow.flow.test.ts` 锁定这些新旧接口边界。

- [ ] **Step 4: 在 `runtime.ts` 新增 settled notifier 接线**

```ts
function createWindowSizingSettleNotifiers(windowSizing: ReturnType<typeof useWindowSizing>) {
  return {
    notifySearchPageSettled: () => windowSizing.notifySearchPageSettled(),
    notifyCommandPageSettled: () => windowSizing.notifyCommandPageSettled(),
    notifyFlowPanelSettled: () => windowSizing.notifyFlowPanelSettled()
  };
}
```

- [ ] **Step 5: 收口 Flow 关闭路径，只清 Flow session 并恢复到底层面板语义**

执行要求：`stagingExpanded: true -> false` 时，`controller.ts` 只清 `flowPanelInheritedHeight / flowPanelLockedHeight`，再按底层 Search / Command 当前语义重新计算窗口高度；`useWindowSizing.controller.test.ts` 必须锁定 `Command -> Flow -> close` 的完整路径，而不是只看初始 state。

- [ ] **Step 6: 保护 Command 返回 Search 的统一恢复链路与首次锁高一次语义**

执行要求：`requestCommandPanelExit()` 继续优先使用 `commandPanelLockedHeight`，复用既有 `commandPanelExit` 协调器；`notifyFlowPanelSettled()` 只能触发首次 lock，后续再触发不得覆写锁高；对应断言必须落在 `useWindowSizing.controller.test.ts`。

- [ ] **Step 7: 运行本功能相关全部自动化测试**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/panelHeightContract.test.ts
npm run test:run -- src/composables/__tests__/launcher/panelHeightSession.test.ts
npm run test:run -- src/composables/__tests__/launcher/panelMeasurement.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
npm run test:run -- src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
npm run test:run -- src/composables/__tests__/launcher/useLauncherWatchers.test.ts
npm run test:run -- src/composables/__tests__/launcher/useLauncherWatcherBindings.test.ts
npm run test:run -- src/composables/__tests__/app/useAppCompositionViewModel.test.ts
npm run test:run -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
npm run test:run -- src/styles/__tests__/launcher-style-contract.test.ts
```

Expected: 全绿。

- [ ] **Step 8: 跑统一门禁**

Run:
```bash
npm run check:all
```

Expected:
- `lint`
- `typecheck`
- `typecheck:test`
- `test:coverage`
- `build`
- `check:rust`
- `test:rust`

全部通过。

- [ ] **Step 9: 在真实 Tauri 窗口手验关键路径**

Run:
```bash
npm run tauri:dev
```

手验清单：
1. Search 结果为 0 时，面板最低高度就是搜索框，不再出现 floor 占位。
2. Search -> Command：第一帧沿用当前搜索实际高度；settled 后若完整盒子更高，只补高一次，且不超过共享 cap。
3. Search -> Flow：第一帧沿用当前搜索实际高度；settled 后若低于 Flow 最小高度，只补高一次。
4. Command -> Flow：Flow 继承当前 `commandPanelLockedHeight`；关闭 Flow 后回到 Command 已锁高度。
5. Command 生命周期内输入变化、危险提示显隐、toast 反馈均只让 body 滚动，不再改变外框。
6. Flow 生命周期内异高卡片、拖拽、内联编辑、toast 只影响 body/list，不再改变外框。
7. 参数页返回搜索继续复用既有 `requestCommandPanelExit() -> search-page-settled -> 单次回落`，无回归。

- [ ] **Step 10: 最终 Commit（如前面有零散修正，这里补收口）**

```bash
git status
git add src/composables/launcher/useWindowSizing/panelHeightContract.ts
git add src/composables/launcher/useWindowSizing/panelMeasurement.ts
git add src/composables/launcher/useWindowSizing/panelHeightSession.ts
git add src/composables/launcher/useWindowSizing/model.ts
git add src/composables/launcher/useWindowSizing/calculation.ts
git add src/composables/launcher/useWindowSizing/controller.ts
git add src/composables/app/useAppCompositionRoot/runtime.ts
git add src/composables/app/useAppCompositionRoot/viewModel.ts
git add src/composables/launcher/useLauncherLayoutMetrics.ts
git add src/composables/launcher/useLauncherWatchers.ts
git add src/composables/launcher/useLauncherWatcherBindings.ts
git add src/components/launcher/LauncherWindow.vue
git add src/components/launcher/types.ts
git add src/components/launcher/parts/LauncherSearchPanel.vue
git add src/components/launcher/parts/LauncherCommandPanel.vue
git add src/components/launcher/parts/LauncherFlowPanel.vue
git add src/styles/launcher.css
git add src/composables/__tests__/launcher/panelHeightContract.test.ts
git add src/composables/__tests__/launcher/panelMeasurement.test.ts
git add src/composables/__tests__/launcher/panelHeightSession.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git add src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
git add src/composables/__tests__/launcher/useLauncherWatchers.test.ts
git add src/composables/__tests__/launcher/useLauncherWatcherBindings.test.ts
git add src/composables/__tests__/app/useAppCompositionViewModel.test.ts
git add src/components/launcher/__tests__/LauncherWindow.flow.test.ts
git add src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
git add src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
git add src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
git add src/styles/__tests__/launcher-style-contract.test.ts
git commit -m "fix(launcher): 更正 command flow 面板高度 contract"
```

---

## 验收对照表

- `panelMaxHeight` 仍是 Search / Command / Flow 共用的唯一最高高度来源。
- Search 最低高度回到搜索框自身，不再通过 floor placeholder / filler 额外补高。
- Command 完整盒子高度测量包含 `header + content + footer + divider`。
- Flow 最低高度来自空态或前 2 张真实异高卡片测量，静态估算只做 fallback。
- Command / Flow 都先继承最近面板的实际总高度，settled 后只允许首次锁高一次。
- Command / Flow 生命周期内后续内容变化不再改变外框高度，只允许 body/list 滚动。
- `nav-slide out-in` 时新面板 DOM 未挂载时不会错误读取旧面板高度。
- Flow 关闭后正确回到底层 Search / Command 的高度语义，`requestCommandPanelExit` 恢复链路不回归。
