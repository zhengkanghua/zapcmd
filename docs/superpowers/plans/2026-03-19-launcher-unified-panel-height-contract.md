# Launcher 统一面板高度 Contract Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Launcher 的 SearchPanel、CommandPanel、FlowPanel 共享同一最大高度 cap，修复外层盒子左贴齐、参数面板 footer 超出统一盒子、以及参数提交成功后未复用统一退出锁高链路的问题。

**Architecture:** 保留现有“搜索结果少时可低于最大高度、参数面板按需增高”的动态特征，但把“搜索框 + 最大结果条数”提升为全局唯一 cap。`LauncherCommandPanel` 改为 `header / content / footer` 三段式，footer 固定但计入总高度；所有从 CommandPanel 回到 SearchPanel 的路径，包括取消、Esc 和 submit 成功，都统一走 `requestCommandPanelExit() -> search-page-settled -> 单次回落` 链路。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vitest, Tauri window sizing bridge, CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-19-launcher-unified-panel-height-contract-design.md`

---

## 文件结构

### 预期修改文件

| 文件路径 | 职责 / 改动概述 |
|---|---|
| `src/styles/launcher.css` | 修复 Launcher 外层盒子水平居中；将 `command-panel` 收口为三段式布局；把 `command-panel__content` 设为唯一滚动宿主，footer 固定但纳入总高度。 |
| `src/composables/launcher/useLauncherLayoutMetrics.ts` | 把搜索面板最大高度口径提升为全局共享 cap；让 Search / Command / Flow 使用一致的最大高度定义。 |
| `src/composables/launcher/useWindowSizing/calculation.ts` | 在现有 floor/exit-lock 计算基础上应用共享 cap，保证 CommandPanel 可按需增高但不超过 cap。 |
| `src/composables/launcher/useWindowSizing/controller.ts` | 让 submit 成功返回也复用 `requestCommandPanelExit()` 已有的退出锁高链路。 |
| `src/components/launcher/LauncherWindow.vue` | CommandPanel submit 成功后不只做业务 submit，还要向上抛统一退出意图；保留 `search-page-settled` 信号。 |
| `src/composables/app/useAppCompositionRoot/runtime.ts` | 统一组装“submit 成功后回到搜索页”与 `requestCommandPanelExit()` 的接线，避免组件层各自处理。 |
| `src/composables/app/useAppCompositionRoot/viewModel.ts` | 暴露新的 submit-success 返回动作给 `App.vue`。 |
| `src/App.vue` | 接上 `LauncherWindow` 新的事件，不直接把 submit success 当成单纯业务动作处理。 |
| `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts` | 锁定 CommandPanel 结构 contract 和事件 contract。 |
| `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts` | 锁定共享 cap 口径与 Search/Flow floor 语义不被破坏。 |
| `src/components/launcher/__tests__/LauncherWindow.flow.test.ts` | 锁定 submit 成功路径也会走统一退出链路。 |
| `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts` | 锁定共享 cap 在 CommandPanel / FlowPanel 场景下的高度上限。 |
| `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts` | 锁定 submit 成功返回搜索页时仍只回落一次。 |
| `src/__tests__/app.hotkeys.test.ts` | 从真实 UI 行为层验证参数提交成功后关闭 CommandPanel 并保持统一返回链路表现。 |

### 预期新增文件

本轮不强制新增实现文件；优先复用现有 `useLauncherLayoutMetrics`、`useWindowSizing`、`LauncherWindow` 结构，避免为小范围 contract 变更引入额外抽象。

### 关键边界

- 不重做 FlowPanel 结构；它继续消费统一 cap。
- 不引入新的通用 PanelShell 抽象。
- 不改变 Tauri 窗口中心化配置，只改 Launcher UI 盒子在窗口内部的布局。
- submit 成功的“执行 / 加入执行流”业务逻辑仍在 `useCommandExecution`；本轮只统一其“返回搜索页”的布局链路。

---

## Chunk 1: 锁定共享 cap 与 CommandPanel 结构 contract

### Task 1: 先写失败测试，锁定 UI 高度与结构 contract

**Files:**
- Modify: `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`

- [ ] **Step 1: 为 `LauncherCommandPanel` 增加“footer 属于统一盒子、content 是唯一滚动宿主”的测试**

```ts
// src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
it("使用 header/content/footer 三段式结构，footer 固定但属于面板内部", () => {
  const wrapper = mountPanel();

  expect(wrapper.find(".command-panel__header").exists()).toBe(true);
  expect(wrapper.find(".command-panel__content").exists()).toBe(true);
  expect(wrapper.find(".command-panel__footer").exists()).toBe(true);
  expect(wrapper.find(".command-panel__footer").element.parentElement).toBe(
    wrapper.get(".command-panel").element
  );
});
```

- [ ] **Step 2: 为 `LauncherSearchPanel.floor-height.test.ts` 增加“搜索页 floor/cap 口径仍稳定”的测试**

```ts
// src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
it("Flow 打开时 floor 占位高度仍等于搜索页共享最大高度口径", () => {
  const wrapper = mount(LauncherSearchPanel, {
    props: createProps({
      query: "",
      drawerOpen: false,
      drawerViewportHeight: 0,
      flowOpen: true,
      drawerFloorViewportHeight: DEFAULT_DRAWER_FLOOR_VIEWPORT_HEIGHT_PX
    })
  });

  expect(wrapper.get('[data-testid="result-drawer-floor"]').attributes("style"))
    .toContain(`${DEFAULT_DRAWER_FLOOR_VIEWPORT_HEIGHT_PX}px`);
});
```

- [ ] **Step 3: 为 `useWindowSizing.calculation.test.ts` 增加“CommandPanel 不超过共享 cap”的测试**

```ts
// src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
it("CommandPanel 高度不会超过 launcher frame design cap", () => {
  const size = resolveWindowSize(
    createBaseOptions({
      pendingCommand: ref({ id: "pending" }),
      windowHeightCap: ref(10_000),
      drawerOpen: ref(true),
      drawerViewportHeight: ref(5_000)
    })
  );

  expect(size.height).toBeLessThanOrEqual(
    LAUNCHER_FRAME_DESIGN_CAP_PX + UI_TOP_ALIGN_OFFSET_PX_FALLBACK
  );
});
```

- [ ] **Step 4: 运行定向测试并确认失败**

Run:
```bash
npm run test:run -- src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
```

Expected:
- `LauncherCommandPanel` 当前还没有稳定三段式 contract 测试，至少一项会失败或暴露结构不足。
- `useWindowSizing.calculation` 还未显式锁住共享 cap，测试失败。

- [ ] **Step 5: Commit（仅测试）**

```bash
git add src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
git add src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
git commit -m "test(launcher): 锁定统一高度 contract 与参数面板结构"
```

---

### Task 2: 落地共享 cap 口径与 CommandPanel 三段式布局

**Files:**
- Modify: `src/styles/launcher.css`
- Modify: `src/composables/launcher/useLauncherLayoutMetrics.ts`
- Modify: `src/composables/launcher/useWindowSizing/calculation.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`

- [ ] **Step 1: 在 `useLauncherLayoutMetrics.ts` 明确共享 cap 的唯一来源**

```ts
// src/composables/launcher/useLauncherLayoutMetrics.ts
export const LAUNCHER_DRAWER_MAX_VIEWPORT_HEIGHT_DESIGN_PX =
  LAUNCHER_DRAWER_MAX_ROWS * LAUNCHER_DRAWER_ROW_HEIGHT_PX +
  LAUNCHER_DRAWER_VIEWPORT_CHROME_HEIGHT_PX;

export const LAUNCHER_FRAME_DESIGN_CAP_PX =
  WINDOW_SIZING_CONSTANTS.windowBaseHeight +
  LAUNCHER_DRAWER_MAX_VIEWPORT_HEIGHT_DESIGN_PX +
  DRAWER_GAP_EST_PX;
```

实现要点：
- 不新增第二套 CommandPanel 专属 cap 常量。
- Search / Command / Flow 都继续引用同一套 `LAUNCHER_FRAME_DESIGN_CAP_PX`。

- [ ] **Step 2: 在 `calculation.ts` 中确保 CommandPanel 只会在 floor 与共享 cap 之间变化**

```ts
// src/composables/launcher/useWindowSizing/calculation.ts
const frameMaxHeight = Math.min(screenCapFrame, LAUNCHER_FRAME_DESIGN_CAP_PX);
// CommandPanel 场景下仍然以同一个 frameMaxHeight 作为最终 clamp 上限
```

实现要点：
- 不为 `pendingCommand` 增加更高上限。
- 保留“搜索结果少时可按需增高”的 floor 逻辑。

- [ ] **Step 3: 修正最外层盒子水平居中**

```css
/* src/styles/launcher.css */
.launcher-root {
  display: grid;
  place-items: start center;
}

.search-shell {
  justify-content: start;
}
```

实现要点：
- 只让 `launcher-root` 把 `search-shell` 居中。
- 不改 `search-shell` 内部自身的顶部与左右布局逻辑。

- [ ] **Step 4: 把 `command-panel` 改成稳定三段式**

```css
/* src/styles/launcher.css */
.command-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
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
- footer 固定但属于 `.command-panel` 的内部。
- 所有超长内容都让 `.command-panel__content` 吸收。
- 不要通过额外绝对定位把 footer“悬浮”到盒子外。

- [ ] **Step 5: 重新运行本 Task 测试并修到全绿**

Run:
```bash
npm run test:run -- src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
```

Expected: 全绿。

- [ ] **Step 6: Commit（共享 cap 与结构落地）**

```bash
git add src/styles/launcher.css
git add src/composables/launcher/useLauncherLayoutMetrics.ts
git add src/composables/launcher/useWindowSizing/calculation.ts
git add src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
git add src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
git commit -m "fix(launcher): 统一面板最大高度并收口参数面板结构"
```

---

## Chunk 2: submit 成功路径并入统一退出锁高链路

### Task 3: 先写失败测试，锁定 submit 成功路径也要走统一退出动作

**Files:**
- Modify: `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`
- Modify: `src/__tests__/app.hotkeys.test.ts`

- [ ] **Step 1: 在 `LauncherWindow.flow.test.ts` 锁定 submit 成功后向上请求统一退出**

```ts
// src/components/launcher/__tests__/LauncherWindow.flow.test.ts
it("command-action 页面 submit 成功后发出 request-command-panel-exit", async () => {
  const command = createCommandTemplate("cmd-submit");
  const commandPage: NavPage = {
    type: "command-action",
    props: { command, mode: "stage", isDangerous: false }
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
          template: "<button class='stub-submit' @click=\"$emit('submit', { value: 'x' }, false)\" />"
        }
      }
    }
  });

  await wrapper.get(".stub-submit").trigger("click");
  expect(wrapper.emitted("submit-param-input")).toHaveLength(1);
  expect(wrapper.emitted("request-command-panel-exit")).toHaveLength(1);
});
```

- [ ] **Step 2: 在 `useWindowSizing.controller.test.ts` 增加“submit 成功返回也只回落一次”的测试**

```ts
// src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
it("submit 成功后走同一退出锁高链路，搜索页稳定后只回落一次", async () => {
  const harness = createExitHarness();

  await harness.controller.syncWindowSize();
  harness.spies.requestAnimateMainWindowSize.mockClear();

  harness.controller.requestCommandPanelExit();
  harness.state.pendingCommand.value = null;
  harness.state.drawerOpen.value = true;
  harness.state.drawerViewportHeight.value = 0;

  await harness.controller.syncWindowSize();
  harness.controller.notifySearchPageSettled();
  await harness.controller.syncWindowSize();

  expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 3: 在 `app.hotkeys.test.ts` 增加 submit 成功后的 UI 回归**

```ts
// src/__tests__/app.hotkeys.test.ts
it("参数填写后加入执行流成功时关闭 CommandPanel 并返回搜索态", async () => {
  const wrapper = await mountApp();
  await focusSearchAndType(wrapper, "查看容器日志");

  dispatchWindowKeydown("Enter", { ctrlKey: true });
  await waitForUi();

  const inputs = wrapper.findAll(".command-panel__form .command-panel__input");
  await inputs[0].setValue("my-container");
  await inputs[1].setValue("50");
  await wrapper.get("[data-testid='confirm-btn']").trigger("click");
  await waitForUi();

  expect(wrapper.find(".command-panel").exists()).toBe(false);
  expect(wrapper.find(".result-drawer, [data-testid='result-drawer-floor']").exists()).toBe(true);
});
```

- [ ] **Step 4: 运行定向测试并确认失败**

Run:
```bash
npm run test:run -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
npm run test:run -- src/__tests__/app.hotkeys.test.ts
```

Expected:
- `LauncherWindow` 目前 submit 只 emit `submit-param-input`，不会同步 emit `request-command-panel-exit`。
- `app.hotkeys` / sizing controller 至少一项失败。

- [ ] **Step 5: Commit（仅测试）**

```bash
git add src/components/launcher/__tests__/LauncherWindow.flow.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git add src/__tests__/app.hotkeys.test.ts
git commit -m "test(launcher): 锁定参数提交成功后的统一退出链路"
```

---

### Task 4: 落地 submit 成功路径的统一退出接线

**Files:**
- Modify: `src/components/launcher/LauncherWindow.vue`
- Modify: `src/composables/app/useAppCompositionRoot/runtime.ts`
- Modify: `src/composables/app/useAppCompositionRoot/viewModel.ts`
- Modify: `src/App.vue`
- Modify: `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`
- Modify: `src/__tests__/app.hotkeys.test.ts`

- [ ] **Step 1: 让 `LauncherWindow` 的 CommandPanel submit 成功后同时发出统一退出意图**

```ts
// src/components/launcher/LauncherWindow.vue
function onCommandPanelSubmit(argValues: Record<string, string>, shouldDismiss: boolean): void {
  void argValues;
  if (shouldDismiss && props.navCurrentPage.props?.command) {
    dismissDanger(props.navCurrentPage.props.command.id);
  }
  emit("submit-param-input");
  emit("request-command-panel-exit");
}
```

实现要点：
- 这里表达的是“submit 成功后本质返回搜索页”的布局 contract。
- 不在组件层判断 execute/stage；业务提交仍由上层处理。

- [ ] **Step 2: 在 runtime / viewModel / App 里复用既有 `requestCommandPanelExit()`**

实现要点：
- 不新增第二套“submitSuccessExit”函数。
- submit success 与 cancel/Esc 全部复用已有 `requestCommandPanelExit()`。
- 保持 `notifySearchPageSettled()` 由搜索页 after-enter 信号触发。

- [ ] **Step 3: 确认 controller 无需分支区分“取消返回”与“submit 返回”**

实现要点：
- 只要走了 `requestCommandPanelExit()`，controller 就应当表现一致。
- 若代码里出现 `reason === 'submit'` 之类分支，删掉，回到统一 contract。

- [ ] **Step 4: 运行本 Task 测试并修到全绿**

Run:
```bash
npm run test:run -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
npm run test:run -- src/__tests__/app.hotkeys.test.ts
```

Expected: 全绿。

- [ ] **Step 5: Commit（submit 返回链路收口）**

```bash
git add src/components/launcher/LauncherWindow.vue
git add src/composables/app/useAppCompositionRoot/runtime.ts
git add src/composables/app/useAppCompositionRoot/viewModel.ts
git add src/App.vue
git add src/components/launcher/__tests__/LauncherWindow.flow.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git add src/__tests__/app.hotkeys.test.ts
git commit -m "fix(launcher): 统一参数提交成功后的返回锁高链路"
```

---

## Chunk 3: 最终回归与人工验证

### Task 5: 跑完整回归矩阵并做 Tauri 手验

**Files:**
- Modify: `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`
- Modify: `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`
- Modify: `src/__tests__/app.hotkeys.test.ts`

- [ ] **Step 1: 跑本功能相关全部测试**

Run:
```bash
npm run test:run -- src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
npm run test:run -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
npm run test:run -- src/__tests__/app.hotkeys.test.ts
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
1. 外层 Launcher 视觉盒子在窗口内水平居中，但顶部对齐与 drag strip 手感不变。
2. 搜索结果很多时，Search / Command / Flow 的最大高度一致，没有哪个面板比搜索态更高。
3. 搜索结果只有 1 条时进入 CommandPanel，面板可以按需增高，但不会超过最大 cap。
4. CommandPanel 底部按钮区不再在盒子底部额外长出一截；超长内容只在中间内容区滚动。
5. 点击取消、按 `Esc`、提交“加入执行流”、提交“直接执行 / 确定执行”，都回到搜索页，并且只在搜索页稳定后做一次平滑回落。
6. FlowPanel 打开时仍遵守共享最大高度，不破坏既有拖拽、空态与 footer 行为。

- [ ] **Step 4: 最终 Commit（若前面有零散修正，这里补收口）**

```bash
git status
git add src/styles/launcher.css
git add src/composables/launcher/useLauncherLayoutMetrics.ts
git add src/composables/launcher/useWindowSizing/calculation.ts
git add src/composables/launcher/useWindowSizing/controller.ts
git add src/components/launcher/LauncherWindow.vue
git add src/composables/app/useAppCompositionRoot/runtime.ts
git add src/composables/app/useAppCompositionRoot/viewModel.ts
git add src/App.vue
git add src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
git add src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
git add src/components/launcher/__tests__/LauncherWindow.flow.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git add src/__tests__/app.hotkeys.test.ts
git commit -m "fix(launcher): 统一面板高度 contract 与提交返回链路"
```

---

## 验收对照表

- Launcher 外层视觉盒子在窗口内水平居中，顶部对齐与 drag strip 不变。
- Search / Command / Flow 共享同一最大高度 cap。
- 参数面板在搜索结果少时可按需增高，但最高不超过共享 cap。
- 参数面板 footer 固定且属于统一高度盒子的一部分，不再额外长出一截。
- 超长内容只在 `command-panel__content` 滚动。
- 取消、Esc、加入执行流成功、直接执行成功都复用统一退出锁高链路。
- CommandPanel 返回 SearchPanel 时只回落一次，不再出现“先缩一下再回弹”。
