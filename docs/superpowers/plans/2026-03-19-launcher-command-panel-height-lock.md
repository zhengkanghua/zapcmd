# Launcher CommandPanel Height Lock Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正 Launcher `CommandPanel` 的锁高 contract：进入参数页先继承进入前搜索页实际总高度，`command-page-settled` 后只按完整盒子高度锁定一次，参数页生命周期内不再回缩或再次增高，仅 `content` 区滚动，返回搜索页继续复用现有统一退出锁高恢复链路。

**Architecture:** 当前实现把 `commandPanelFrameHeightFloor` 当成过时语义保留下来，但 `resolveWindowSize()` 在 `pendingCommand` 场景里已经改回“内容驱动 + `paramOverlayMinHeight`”路径，这正是本次 spec 要纠正的点。本轮实现应显式拆分 `entrySearchFrameHeight` 与 `commandPanelLockedFrameHeight` 两个状态：进入参数页第一帧仅继承搜索页高度；收到 `command-page-settled` 后测量 `header + content + footer + divider` 的完整自然高度，按 `max(entry, natural)` 只锁定一次；后续 sizing 只消费锁定值，不再根据参数内容变化反复重算。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vitest, Tauri window sizing bridge, CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-19-launcher-command-panel-height-lock-design.md`

---

## 文件结构

### 预期新增文件

| 文件路径 | 职责 |
|---|---|
| `src/composables/launcher/useWindowSizing/commandPanelLock.ts` | 只负责 CommandPanel 锁高相关的纯逻辑：测量完整自然高度、计算首次锁定高度，避免继续把这部分职责塞进已接近上限的 `controller.ts`。 |
| `src/composables/__tests__/launcher/commandPanelLock.test.ts` | 只覆盖新 helper 的纯函数 contract，防止“继承高度 / 完整盒子 / clamp 到 cap”三件事再次混淆。 |

### 预期修改文件

| 文件路径 | 职责 / 改动概述 |
|---|---|
| `src/composables/launcher/useWindowSizing/model.ts` | 用 `entrySearchFrameHeight`、`commandPanelLockedFrameHeight` 替换旧的 `commandPanelFrameHeightFloor`。 |
| `src/composables/app/useAppCompositionRoot/runtime.ts` | 创建并注入新的两个 ref，移除旧 floor 命名。 |
| `src/composables/launcher/useWindowSizing/calculation.ts` | 改写 CommandPanel 高度分支：未锁定前只继承 `entrySearchFrameHeight`，首次锁定后只读 `commandPanelLockedFrameHeight`，不再让参数内容驱动外框反复变化。 |
| `src/composables/launcher/useWindowSizing/controller.ts` | 负责进入参数页时捕获 entry height、在 `command-page-settled` 后首次测量并锁定、退出时优先使用 locked height，且保证只锁一次。 |
| `src/styles/launcher.css` | 保证 `.command-panel` 填满 `.launcher-frame`，剩余空间只交给 `.command-panel__content`，确保 footer 留在统一盒子内部且内容滚动发生在 content 内。 |
| `src/styles/__tests__/launcher-style-contract.test.ts` | 锁定 `.command-panel` 高度与 `content` 滚动宿主 contract。 |
| `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts` | 锁定 `header + divider + content + divider + footer` 结构，保证完整盒子测量依赖的 DOM contract 稳定。 |
| `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts` | 删除旧的“进入参数页后不使用搜索高度”断言，改成新的 entry/locked contract。 |
| `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts` | 锁定 `command-page-settled` 后只锁一次、退出时优先用 locked height、搜索页恢复链路无回归。 |

### 不应修改的文件

| 文件路径 | 原因 |
|---|---|
| `src/App.vue` | submit 成功后的统一退出链路已经在上一轮落地，本次 spec 明确要求继续复用该链路，不应重新改接线。 |
| `src/components/launcher/LauncherWindow.vue` | `command-page-settled` / `search-page-settled` 事件已具备，本轮只消费现有信号，不重做页面事件模型。 |
| `src/composables/app/useAppCompositionRoot/viewModel.ts` | 不新增新的页面退出动作，本轮只更正高度语义。 |

### 关键边界

- 不引入新的全局 cap；继续使用 `LAUNCHER_FRAME_DESIGN_CAP_PX`。
- 不改 Search / Flow 的布局结构与业务行为，只修正 CommandPanel 的进入和生命周期锁高语义。
- 不把“首次进入的继承高度”与“参数页生命周期内的锁定高度”继续混成一个变量。
- 不在参数输入、危险提示增减、预览文本变化时再次触发外框 resize；这些变化只能留给 `.command-panel__content` 内部滚动消化。

---

## Chunk 1: 用新状态语义替换旧 floor 语义

### Task 1: 先写失败测试，锁定新的 `entrySearchFrameHeight / commandPanelLockedFrameHeight` contract

**Files:**
- Create: `src/composables/__tests__/launcher/commandPanelLock.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`

- [ ] **Step 1: 为新 helper 增加“完整盒子 + 首次锁定公式”的纯函数测试**

```ts
// src/composables/__tests__/launcher/commandPanelLock.test.ts
import { describe, expect, it } from "vitest";

import {
  resolveCommandPanelLockedFrameHeight
} from "../../launcher/useWindowSizing/commandPanelLock";

describe("resolveCommandPanelLockedFrameHeight", () => {
  it("先继承 entrySearchFrameHeight，不够时只补到 full natural height，再 clamp 到 cap", () => {
    expect(
      resolveCommandPanelLockedFrameHeight({
        entrySearchFrameHeight: 420,
        commandPanelFullNaturalHeight: 560,
        commandPanelMinFrameHeight: 340,
        globalCapFrameHeight: 700
      })
    ).toBe(560);
  });

  it("entry 已够高时保持 entry，高于 natural 也不回缩", () => {
    expect(
      resolveCommandPanelLockedFrameHeight({
        entrySearchFrameHeight: 620,
        commandPanelFullNaturalHeight: 480,
        commandPanelMinFrameHeight: 340,
        globalCapFrameHeight: 700
      })
    ).toBe(620);
  });
});
```

- [ ] **Step 2: 把旧的“进入参数页后不再把进入前搜索高度当作 floor”测试改成新 contract**

```ts
// src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
it("pendingCommand 未完成首次锁定前，直接沿用 entrySearchFrameHeight", () => {
  const size = resolveWindowSize(
    createBaseOptions({
      pendingCommand: ref({ id: "pending" }),
      entrySearchFrameHeight: ref(520),
      commandPanelLockedFrameHeight: ref<number | null>(null)
    })
  );

  expect(size.height).toBe(520 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK);
});

it("pendingCommand 完成首次锁定后，只读取 commandPanelLockedFrameHeight", () => {
  const size = resolveWindowSize(
    createBaseOptions({
      pendingCommand: ref({ id: "pending" }),
      entrySearchFrameHeight: ref(420),
      commandPanelLockedFrameHeight: ref<number | null>(560)
    })
  );

  expect(size.height).toBe(560 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK);
});
```

- [ ] **Step 3: 运行定向测试并确认失败**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/commandPanelLock.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
```

Expected:
- `commandPanelLock.ts` 尚不存在，helper 测试失败。
- `useWindowSizing.calculation.test.ts` 仍在引用旧的 `commandPanelFrameHeightFloor` 语义，至少一项失败。

- [ ] **Step 4: Commit（仅测试）**

```bash
git add src/composables/__tests__/launcher/commandPanelLock.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
git commit -m "test(launcher): 锁定参数页继承高度与首次锁高 contract"
```

---

### Task 2: 落地新的高度状态、纯函数与 calculation 分支

**Files:**
- Create: `src/composables/launcher/useWindowSizing/commandPanelLock.ts`
- Modify: `src/composables/launcher/useWindowSizing/model.ts`
- Modify: `src/composables/app/useAppCompositionRoot/runtime.ts`
- Modify: `src/composables/launcher/useWindowSizing/calculation.ts`
- Modify: `src/composables/__tests__/launcher/commandPanelLock.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`

- [ ] **Step 1: 创建 `commandPanelLock.ts`，收口首次锁高公式与自然高度测量**

```ts
// src/composables/launcher/useWindowSizing/commandPanelLock.ts
interface ResolveCommandPanelLockedFrameHeightOptions {
  entrySearchFrameHeight: number;
  commandPanelFullNaturalHeight: number;
  commandPanelMinFrameHeight: number;
  globalCapFrameHeight: number;
}

export function resolveCommandPanelLockedFrameHeight(
  options: ResolveCommandPanelLockedFrameHeightOptions
): number {
  return Math.min(
    options.globalCapFrameHeight,
    Math.max(
      options.commandPanelMinFrameHeight,
      Math.max(options.entrySearchFrameHeight, options.commandPanelFullNaturalHeight)
    )
  );
}

export function measureCommandPanelFullNaturalHeight(shell: HTMLElement): number | null {
  const panel = shell.querySelector<HTMLElement>(".command-panel");
  const header = panel?.querySelector<HTMLElement>(".command-panel__header");
  const content = panel?.querySelector<HTMLElement>(".command-panel__content");
  const footer = panel?.querySelector<HTMLElement>(".command-panel__footer");
  const dividers = panel?.querySelectorAll<HTMLElement>(".command-panel__divider") ?? [];
  if (!panel || !header || !content || !footer || dividers.length < 2) {
    return null;
  }

  const dividerHeight = Array.from(dividers).reduce(
    (sum, item) => sum + item.getBoundingClientRect().height,
    0
  );

  return Math.ceil(
    header.getBoundingClientRect().height +
      content.scrollHeight +
      footer.getBoundingClientRect().height +
      dividerHeight
  );
}
```

- [ ] **Step 2: 在 `model.ts` 与 `runtime.ts` 用新状态替换旧 floor 命名**

```ts
// src/composables/launcher/useWindowSizing/model.ts
export interface UseWindowSizingOptions {
  // ...
  entrySearchFrameHeight: Ref<number | null>;
  commandPanelLockedFrameHeight: Ref<number | null>;
  // 删除 commandPanelFrameHeightFloor
}
```

```ts
// src/composables/app/useAppCompositionRoot/runtime.ts
const entrySearchFrameHeight = ref<number | null>(null);
const commandPanelLockedFrameHeight = ref<number | null>(null);

const windowSizing = useWindowSizing({
  // ...
  entrySearchFrameHeight,
  commandPanelLockedFrameHeight,
  // 删除 commandPanelFrameHeightFloor
});
```

- [ ] **Step 3: 改写 `calculation.ts` 的 CommandPanel 分支，让未锁定前只继承 entry，高度锁定后只消费 locked**

```ts
// src/composables/launcher/useWindowSizing/calculation.ts
function resolveCommandPanelFrameHeight(
  options: UseWindowSizingOptions,
  frameMaxHeight: number
): number | null {
  if (!options.pendingCommand.value) {
    return null;
  }

  const preferredFrameHeight =
    options.commandPanelLockedFrameHeight.value ??
    options.entrySearchFrameHeight.value;

  if (preferredFrameHeight === null) {
    return null;
  }

  return clamp(
    preferredFrameHeight,
    options.constants.windowBaseHeight,
    frameMaxHeight
  );
}
```

```ts
// src/composables/launcher/useWindowSizing/calculation.ts
const commandPanelFrameHeight = resolveCommandPanelFrameHeight(options, frameMaxHeight);

if (commandPanelFrameHeight !== null) {
  const estimatedContentHeight = estimateWindowContentHeight(
    options,
    frameMaxHeight,
    commandPanelFrameHeight
  );

  return {
    width,
    height: estimatedContentHeight + dragStripHeight
  };
}
```

实现要点：
- `pendingCommand` 场景不再回落到 `paramOverlayMinHeight` 作为进入第一帧高度。
- `estimateWindowContentHeight()` 需要接收 `commandPanelFrameHeight`，在 `pendingCommand` 场景里把它当成左侧面板高度基线，同时保留右侧 FlowPanel 需要时的 `max(left, right)` 口径。
- `measureWindowContentHeightFromLayout()` 不再把 `.command-panel` 当前可视高度当成“自然高度”来源，否则会再次把已锁定阶段变回内容驱动。

- [ ] **Step 4: 重新运行本 Chunk 测试并修到全绿**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/commandPanelLock.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
```

Expected: 全绿。

- [ ] **Step 5: Commit（状态语义与 calculation 收口）**

```bash
git add src/composables/launcher/useWindowSizing/commandPanelLock.ts
git add src/composables/launcher/useWindowSizing/model.ts
git add src/composables/app/useAppCompositionRoot/runtime.ts
git add src/composables/launcher/useWindowSizing/calculation.ts
git add src/composables/__tests__/launcher/commandPanelLock.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
git commit -m "fix(launcher): 拆分参数页进入高度与锁定高度语义"
```

---

## Chunk 2: 在 settled 时首次锁高，并把滚动限制在 content 内

### Task 3: 先写失败测试，锁定“只锁一次”与完整盒子 DOM contract

**Files:**
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
- Modify: `src/styles/__tests__/launcher-style-contract.test.ts`

- [ ] **Step 1: 在 `useWindowSizing.controller.test.ts` 锁定 `command-page-settled` 后只锁一次**

```ts
// src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
it("command-page-settled 后按完整盒子高度只锁一次，后续内容变化不再触发再次增高或回缩", async () => {
  const harness = createCommandPanelLockHarness({
    entrySearchFrameHeight: 420,
    initialNaturalHeight: 560
  });

  await harness.controller.syncWindowSize();
  expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
    expect.any(Number),
    420 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK
  );

  harness.controller.notifyCommandPageSettled();
  await harness.controller.syncWindowSize();

  harness.setNaturalHeight(720);
  await harness.controller.syncWindowSize();
  harness.setNaturalHeight(360);
  await harness.controller.syncWindowSize();

  expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenCalledWith(
    expect.any(Number),
    560 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK
  );
  expect(harness.spies.requestAnimateMainWindowSize).not.toHaveBeenCalledWith(
    expect.any(Number),
    720 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK
  );
});
```

- [ ] **Step 2: 在 `LauncherCommandPanel.test.ts` 锁定完整盒子依赖的 DOM 结构**

```ts
// src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
it("保留 header + divider + content + divider + footer 结构，供完整盒子高度测量使用", () => {
  const wrapper = mountPanel();

  expect(wrapper.find(".command-panel__header").exists()).toBe(true);
  expect(wrapper.findAll(".command-panel__divider")).toHaveLength(2);
  expect(wrapper.find(".command-panel__content").exists()).toBe(true);
  expect(wrapper.find(".command-panel__footer").exists()).toBe(true);
});
```

- [ ] **Step 3: 在 `launcher-style-contract.test.ts` 锁定“footer 在盒子内、content 负责滚动”样式 contract**

```ts
// src/styles/__tests__/launcher-style-contract.test.ts
it("CommandPanel 填满 launcher-frame，content 是唯一滚动宿主", () => {
  expect(launcherCss).toMatch(/\.command-panel\s*\{[\s\S]*height:\s*100%;/);
  expect(launcherCss).toMatch(/\.command-panel__content[\s\S]*flex:\s*1;/);
  expect(launcherCss).toMatch(/\.command-panel__content[\s\S]*min-height:\s*0;/);
  expect(launcherCss).toMatch(/\.command-panel__content[\s\S]*overflow-y:\s*auto;/);
});
```

- [ ] **Step 4: 运行定向测试并确认失败**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
npm run test:run -- src/styles/__tests__/launcher-style-contract.test.ts
```

Expected:
- controller 目前没有“只锁一次”的逻辑，测试失败。
- `.command-panel` 当前未显式 `height: 100%`，样式 contract 测试失败。

- [ ] **Step 5: Commit（仅测试）**

```bash
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git add src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
git add src/styles/__tests__/launcher-style-contract.test.ts
git commit -m "test(launcher): 锁定参数页首次锁高与滚动宿主 contract"
```

---

### Task 4: 实现 settled 后首次锁高、退出优先用 locked、高度固定只在 content 内滚动

**Files:**
- Modify: `src/composables/launcher/useWindowSizing/controller.ts`
- Modify: `src/styles/launcher.css`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
- Modify: `src/styles/__tests__/launcher-style-contract.test.ts`

- [ ] **Step 1: 在 `controller.ts` 中引入“进入捕获 + settled 后首次锁高 + 退出优先 locked”的状态机**

```ts
// src/composables/launcher/useWindowSizing/controller.ts
interface WindowSizingState {
  lastWindowSize: WindowSize | null;
  syncingWindowSize: boolean;
  queuedWindowSync: boolean;
  pendingCommandActive: boolean;
  pendingCommandSettled: boolean;
}
```

```ts
function syncPendingCommandState(
  options: UseWindowSizingOptions,
  state: WindowSizingState,
  dragStripHeight: number
): void {
  const isPending = options.pendingCommand.value !== null;
  if (isPending && !state.pendingCommandActive) {
    options.entrySearchFrameHeight.value = state.lastWindowSize
      ? state.lastWindowSize.height - dragStripHeight
      : options.constants.windowBaseHeight;
    options.commandPanelLockedFrameHeight.value = null;
    state.pendingCommandActive = true;
    state.pendingCommandSettled = false;
    return;
  }

  if (!isPending && state.pendingCommandActive) {
    options.entrySearchFrameHeight.value = null;
    options.commandPanelLockedFrameHeight.value = null;
    state.pendingCommandActive = false;
    state.pendingCommandSettled = false;
  }
}
```

```ts
function maybeLockCommandPanelHeight(
  options: UseWindowSizingOptions,
  state: WindowSizingState,
  dragStripHeight: number
): void {
  if (
    !state.pendingCommandActive ||
    !state.pendingCommandSettled ||
    options.commandPanelLockedFrameHeight.value !== null
  ) {
    return;
  }

  const shell = options.searchShellRef.value;
  if (!shell) {
    return;
  }

  const frameMaxHeight = Math.min(
    Math.max(0, options.windowHeightCap.value - dragStripHeight),
    LAUNCHER_FRAME_DESIGN_CAP_PX
  );
  const naturalHeight = measureCommandPanelFullNaturalHeight(shell);
  if (naturalHeight === null) {
    return;
  }

  options.commandPanelLockedFrameHeight.value =
    resolveCommandPanelLockedFrameHeight({
      entrySearchFrameHeight:
        options.entrySearchFrameHeight.value ?? options.constants.windowBaseHeight,
      commandPanelFullNaturalHeight: naturalHeight,
      commandPanelMinFrameHeight: options.constants.paramOverlayMinHeight,
      globalCapFrameHeight: frameMaxHeight
    });
}
```

实现要点：
- `notifyCommandPageSettled()` 只负责把 `pendingCommandSettled` 置为 `true` 并调度 sync，不直接把锁高写死在事件函数里。
- `requestCommandPanelExit()` 必须改成优先读取 `commandPanelLockedFrameHeight`，没有 locked 时才回退到 `entrySearchFrameHeight`，最后才回退到 `paramOverlayMinHeight`。
- `pendingCommand` 存活期间如果已经有 `commandPanelLockedFrameHeight`，后续 sync 不再覆盖它。

- [ ] **Step 2: 在 `launcher.css` 里把剩余空间只交给 content**

```css
/* src/styles/launcher.css */
.command-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: var(--launcher-panel-max-height, none);
  min-height: 0;
  overflow: hidden;
}

.command-panel__content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.command-panel__footer {
  flex-shrink: 0;
}
```

实现要点：
- 不用绝对定位把 footer“钉”到底部；它必须留在统一盒子内部。
- `content` 的 `scrollHeight` 之后会被测量 helper 使用，避免再从整个 `.command-panel` 的当前可视高度反推自然高度。

- [ ] **Step 3: 运行本 Chunk 的 focused tests 并修到全绿**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
npm run test:run -- src/styles/__tests__/launcher-style-contract.test.ts
```

Expected: 全绿。

- [ ] **Step 4: Commit（首次锁高与样式落地）**

```bash
git add src/composables/launcher/useWindowSizing/controller.ts
git add src/styles/launcher.css
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git add src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
git add src/styles/__tests__/launcher-style-contract.test.ts
git commit -m "fix(launcher): 参数页 settled 后只锁定一次高度"
```

---

## Chunk 3: 回归验证与手动验收

### Task 5: 跑完整回归，确认旧退出链路与新锁高 contract 同时成立

**Files:**
- Modify: `src/composables/__tests__/launcher/commandPanelLock.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
- Modify: `src/styles/__tests__/launcher-style-contract.test.ts`

- [ ] **Step 1: 跑本功能相关全部自动化测试**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/commandPanelLock.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
npm run test:run -- src/styles/__tests__/launcher-style-contract.test.ts
```

Expected: 全绿。

- [ ] **Step 2: 跑统一门禁**

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

- [ ] **Step 3: 在真实 Tauri 窗口里手动验收**

Run:
```bash
npm run tauri:dev
```

手验清单：
1. 搜索结果很多时进入参数页，CommandPanel 第一帧直接继承当前搜索页实际总高度，不再先缩小。
2. 搜索结果很少、参数页完整盒子更高时，`command-page-settled` 后只增高一次，且最高不超过全局 cap。
3. 参数页内输入文本、预览变长、危险提示显隐变化后，外框高度保持不变，只出现 content 内滚动。
4. footer 始终留在同一盒子内部，不再出现“底部额外长出一截”的观感。
5. 点击返回、按 `Esc`、点击取消、加入执行流成功、直接执行成功后，仍然沿用现有 `requestCommandPanelExit() -> search-page-settled -> 单次回落` 恢复链路。

- [ ] **Step 4: 最终 Commit（若前面有零散修正，这里补收口）**

```bash
git status
git add src/composables/launcher/useWindowSizing/commandPanelLock.ts
git add src/composables/launcher/useWindowSizing/model.ts
git add src/composables/launcher/useWindowSizing/calculation.ts
git add src/composables/launcher/useWindowSizing/controller.ts
git add src/composables/app/useAppCompositionRoot/runtime.ts
git add src/styles/launcher.css
git add src/composables/__tests__/launcher/commandPanelLock.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git add src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
git add src/styles/__tests__/launcher-style-contract.test.ts
git commit -m "fix(launcher): 更正参数页首次锁高 contract"
```

---

## 验收对照表

- 进入参数页第一帧直接继承进入前搜索页实际总高度，不再先缩小。
- 完整参数面板盒子高度测量包含 `header + content + footer + divider`。
- 若继承高度不足，只允许在 `command-page-settled` 后首次增高一次，且不超过全局 cap。
- 参数页生命周期内不再因内容变化回缩或再次增高。
- `content` 是唯一滚动宿主；footer 始终位于统一盒子内部。
- 返回搜索页仍复用现有统一退出锁高恢复链路，无回归。

