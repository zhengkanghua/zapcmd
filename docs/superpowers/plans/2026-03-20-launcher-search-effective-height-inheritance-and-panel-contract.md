# Launcher Search Effective Height Inheritance Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地 `searchPanelEffectiveHeight` / `sharedPanelMaxHeight` / `Search -> Command` 继承修正，让参数页首帧只继承“搜索框 + 搜索结果区域”，并保持 Command 完整盒子测量与 Flow 现有跟随语义不回归。

**Architecture:** 现有高度链路把 Search 有效内容高度、窗口 chrome、高度上限和 Command/Flow 继承基线混在一起，导致搜索页底部 breathing space 会被错误继承到参数页。实现时先把 Search 纯口径拆清楚，再让 `useWindowSizing` 只消费显式的 `searchPanelEffectiveHeight` 和 `sharedPanelMaxHeight`；Command 继续用完整盒子测量一次锁高，Flow 继续“跟随当前面板高度，不够再补高”，重点补齐防回归护栏。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vitest, Tauri window sizing bridge, CSS custom properties

**Specs:**
- `docs/superpowers/specs/2026-03-20-launcher-search-effective-height-inheritance-design.md`
- `docs/superpowers/specs/2026-03-20-launcher-command-flow-height-contract-correction-design.md`

**References:**
- `docs/active_context.md`
- `docs/bug_img/bug5.png`
- `src/composables/launcher/useWindowSizing/controller.ts`
- `src/composables/launcher/useWindowSizing/calculation.ts`
- `src/composables/launcher/useWindowSizing/panelMeasurement.ts`
- `src/components/launcher/parts/LauncherSearchPanel.vue`
- `src/components/launcher/parts/LauncherCommandPanel.vue`
- `src/components/launcher/parts/LauncherFlowPanel.vue`
- `src/styles/launcher.css`

**Supersedes:** `docs/superpowers/plans/2026-03-20-launcher-command-flow-height-contract-correction.md`

---

## 文件结构

### 预期修改文件

| 文件路径 | 职责 |
|---|---|
| `src/composables/launcher/useLauncherLayoutMetrics.ts` | 拆出 Search 口径相关计算：`searchCapsuleHeight`、`searchPanelEffectiveHeight`、`sharedPanelMaxHeight`，并把底部 breathing space 明确留在 shell/frame chrome，不再混进 panel 有效高度。 |
| `src/composables/launcher/useWindowSizing/model.ts` | 为 sizing 链路新增明确输入：`searchPanelEffectiveHeight`、`sharedPanelMaxHeight`，避免继续通过 `windowBaseHeight` 或 `lastWindowSize` 反推 Search 有效高度。 |
| `src/composables/launcher/useWindowSizing/panelHeightContract.ts` | 保留 `resolvePanelHeight()`，并新增 Search 纯口径 helper，统一定义 `searchPanelEffectiveHeight` 与 `sharedPanelMaxHeight`。 |
| `src/composables/launcher/useWindowSizing/calculation.ts` | Search 分支改为直接消费 `searchPanelEffectiveHeight`；统一 cap 改为 `sharedPanelMaxHeight`；Flow 仍用当前面板高度和自身最小高度做 `max()`，但不得携带 Search breathing。 |
| `src/composables/launcher/useWindowSizing/controller.ts` | `Search -> Command` 改为冻结 `searchPanelEffectiveHeight` 作为 `commandPanelInheritedHeight`；`Search -> Flow` / `Command -> Flow` 保持现有语义；退出恢复链路继续复用现有 coordinator。 |
| `src/composables/app/useAppCompositionRoot/runtime.ts` | 将新的 layout metrics refs 传给 `useWindowSizing()`；不改组件对外 API。 |
| `src/styles/launcher.css` | 显式参数化并缩小 Search shell 底部 breathing space；保证它属于窗口 chrome，而非 Search / Command / Flow 共用 panel 高度。 |
| `src/composables/__tests__/launcher/panelHeightContract.test.ts` | 锁定 `searchPanelEffectiveHeight`、`sharedPanelMaxHeight` 公式和旧 `resolvePanelHeight` 不回归。 |
| `src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts` | 锁定 layout metrics 暴露的新 refs 与 Search/Flow 打开时的稳定值。 |
| `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts` | 锁定 Search 高度只按有效高度 clamp、共享 cap 不含 breathing、Flow 仍跟随当前面板高度。 |
| `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts` | 锁定“搜索页底部呼吸留白不进入 `commandPanelInheritedHeight`”这一明确测试，以及 Search/Command/Flow 进入与返回链路。 |
| `src/composables/__tests__/launcher/panelMeasurement.test.ts` | 仅补回归断言：Command 完整盒子测量和 Flow 最小高度测量语义不变。 |
| `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts` | 继续锁定 SearchPanel 不通过 filler/floor 伪造高度，并补一条与 Search 有效高度口径对应的组件 contract。 |
| `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts` | 继续锁定 `header + content + footer + divider` 完整盒子 DOM contract。 |
| `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts` | 继续锁定 Flow “三段式 + settled + body/list 单一滚动宿主”不回归。 |
| `src/styles/__tests__/launcher-style-contract.test.ts` | 锁定共享 panel max-height 和 Command/Flow 三段式 CSS contract；如引入 breathing token，也在这里锁住。 |

### 只读参考，默认不改

| 文件路径 | 原因 |
|---|---|
| `src/components/launcher/parts/LauncherCommandPanel.vue` | 当前 DOM 结构已符合“完整盒子”要求；除非测试暴露稳定选择器不足，否则不做功能性修改。 |
| `src/components/launcher/parts/LauncherFlowPanel.vue` | 当前语义基本正确，本轮重点是回归护栏，不主动重构。 |
| `src/components/launcher/LauncherWindow.vue` | 现有 `flow-panel-settled` 接线已存在；除非 runtime 类型链路需要极小调整，否则保持不动。 |

### 关键 contract 清单

- `searchPanelEffectiveHeight = searchCapsuleHeight + resultDrawerEffectiveHeight`
- `sharedPanelMaxHeight = searchCapsuleHeight + maxSearchResultsViewportHeight`
- `commandPanelInheritedHeight` 只能取 Search 有效高度，不能取 `lastWindowSize - dragStripHeight`
- `CommandPanel` 完整盒子继续按 `header + content + footer + divider` 测量
- `FlowPanel` 继续“跟随当前面板高度，不够再补高”，但其跟随基线不能带 Search breathing
- Search 底部 breathing 允许保留，但只能属于 shell/frame chrome

## Chunk 1: 锁定 Search 纯口径与共享上限

### Task 1: 先写失败测试，明确 `searchPanelEffectiveHeight` 与 `sharedPanelMaxHeight`

**Files:**
- Modify: `src/composables/__tests__/launcher/panelHeightContract.test.ts`
- Modify: `src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`

- [ ] **Step 1: 在 `panelHeightContract.test.ts` 新增 Search 纯口径测试**

```ts
it("searchPanelEffectiveHeight 只等于 search capsule + result drawer", () => {
  expect(
    resolveSearchPanelEffectiveHeight({
      searchCapsuleHeight: 62,
      resultDrawerEffectiveHeight: 0
    })
  ).toBe(62);

  expect(
    resolveSearchPanelEffectiveHeight({
      searchCapsuleHeight: 62,
      resultDrawerEffectiveHeight: 274
    })
  ).toBe(336);
});

it("sharedPanelMaxHeight 只等于 search capsule + 最大结果视口高度", () => {
  expect(
    resolveSharedPanelMaxHeight({
      searchCapsuleHeight: 62,
      maxSearchResultsViewportHeight: 462
    })
  ).toBe(524);
});
```

- [ ] **Step 2: 在 `useLauncherLayoutMetrics.test.ts` 锁定新 refs 的来源**

```ts
it("query 为空时 searchPanelEffectiveHeight 仅为搜索框高度", () => {
  const metrics = useLauncherLayoutMetrics({ ... });
  expect(metrics.searchPanelEffectiveHeight.value).toBe(metrics.searchCapsuleHeight.value);
});

it("sharedPanelMaxHeight 与 stagingExpanded / flowOpen 无关，只取搜索最大结果口径", () => {
  const metrics = useLauncherLayoutMetrics({ ... });
  expect(metrics.sharedPanelMaxHeight.value).toBe(
    metrics.searchCapsuleHeight.value + LAUNCHER_DRAWER_MAX_VIEWPORT_HEIGHT_DESIGN_PX
  );
});
```

- [ ] **Step 3: 在 `useWindowSizing.calculation.test.ts` 锁定 Search 计算路径**

```ts
it("搜索页窗口高度只由 searchPanelEffectiveHeight + drag strip 决定，不吃底部 breathing", () => {
  const size = resolveWindowSize(
    createBaseOptions({
      searchPanelEffectiveHeight: ref(62),
      sharedPanelMaxHeight: ref(524),
      drawerOpen: ref(false)
    })
  );

  expect(size.height).toBe(62 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK);
});

it("searchPanelEffectiveHeight 超过 sharedPanelMaxHeight 时只 clamp 到 sharedPanelMaxHeight", () => {
  const size = resolveWindowSize(
    createBaseOptions({
      searchPanelEffectiveHeight: ref(600),
      sharedPanelMaxHeight: ref(524)
    })
  );

  expect(size.height).toBe(524 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK);
});
```

- [ ] **Step 4: 运行定向测试并确认失败**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/panelHeightContract.test.ts
npm run test:run -- src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
```

Expected:
- `resolveSearchPanelEffectiveHeight()` / `resolveSharedPanelMaxHeight()` 尚不存在。
- `useLauncherLayoutMetrics()` 尚未暴露 `searchCapsuleHeight` / `searchPanelEffectiveHeight` / `sharedPanelMaxHeight`。
- Search sizing 仍依赖旧的 `windowBaseHeight` 语义，新增断言失败。

- [ ] **Step 5: Commit（仅测试）**

```bash
git add src/composables/__tests__/launcher/panelHeightContract.test.ts
git add src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
git commit -m "test(launcher): 锁定 search effective height 与共享上限口径"
```

### Task 2: 实现 Search 纯口径与共享上限

**Files:**
- Modify: `src/composables/launcher/useLauncherLayoutMetrics.ts`
- Modify: `src/composables/launcher/useWindowSizing/model.ts`
- Modify: `src/composables/launcher/useWindowSizing/panelHeightContract.ts`
- Modify: `src/composables/launcher/useWindowSizing/calculation.ts`
- Modify: `src/composables/__tests__/launcher/panelHeightContract.test.ts`
- Modify: `src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`

- [ ] **Step 1: 在 `panelHeightContract.ts` 增加 Search helper，保留现有 `resolvePanelHeight()` 不变**

```ts
export interface ResolveSearchPanelEffectiveHeightOptions {
  searchCapsuleHeight: number;
  resultDrawerEffectiveHeight: number;
}

export interface ResolveSharedPanelMaxHeightOptions {
  searchCapsuleHeight: number;
  maxSearchResultsViewportHeight: number;
}

export function resolveSearchPanelEffectiveHeight(
  options: ResolveSearchPanelEffectiveHeightOptions
): number {
  return options.searchCapsuleHeight + options.resultDrawerEffectiveHeight;
}

export function resolveSharedPanelMaxHeight(
  options: ResolveSharedPanelMaxHeightOptions
): number {
  return options.searchCapsuleHeight + options.maxSearchResultsViewportHeight;
}
```

- [ ] **Step 2: 在 `useLauncherLayoutMetrics.ts` 拆分 Search capsule、高度上限和 breathing**

执行要求：
- 明确新增 `searchCapsuleHeight` computed。
- 明确新增 `searchPanelEffectiveHeight` computed，只由 capsule + 当前 drawer viewport height 组成。
- 明确新增 `sharedPanelMaxHeight` computed，只由 capsule + `LAUNCHER_DRAWER_MAX_VIEWPORT_HEIGHT_DESIGN_PX` 组成。
- 保留 shell/frame breathing，但不要再把它编码进 `searchPanelEffectiveHeight` 或 `sharedPanelMaxHeight`。
- 若 `LAUNCHER_FRAME_DESIGN_CAP_PX` 继续保留名称，也要在注释中明确它现在语义上等同 `sharedPanelMaxHeight`。

- [ ] **Step 3: 在 `model.ts` 扩充 `UseWindowSizingOptions`，让 sizing 显式接收这两个 ref**

```ts
export interface UseWindowSizingOptions {
  // ...
  searchPanelEffectiveHeight: Ref<number>;
  sharedPanelMaxHeight: Ref<number>;
  // ...
}
```

- [ ] **Step 4: 改写 `calculation.ts` 的 Search 分支**

执行要求：
- `resolveSearchPanelFrameHeight()` 优先直接消费 `searchPanelEffectiveHeight`。
- 旧的 DOM measured path 只能作为 Search 页面安全校验或兼容兜底，不能再成为 Search -> Command 继承来源。
- `resolveFrameMaxHeight()` 的设计 cap 改为基于 `sharedPanelMaxHeight`，仍保留 screen cap clamp。

- [ ] **Step 5: 运行 Chunk 1 focused tests 并修到全绿**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/panelHeightContract.test.ts
npm run test:run -- src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
```

Expected: 全绿。

- [ ] **Step 6: Commit（纯口径落地）**

```bash
git add src/composables/launcher/useLauncherLayoutMetrics.ts
git add src/composables/launcher/useWindowSizing/model.ts
git add src/composables/launcher/useWindowSizing/panelHeightContract.ts
git add src/composables/launcher/useWindowSizing/calculation.ts
git add src/composables/__tests__/launcher/panelHeightContract.test.ts
git add src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
git commit -m "refactor(launcher): 拆分 search effective height 与 shared panel max"
```

## Chunk 2: 修正 Search -> Command 继承，并保护 Flow 语义

### Task 3: 先写失败测试，锁定“呼吸留白不进入 commandPanelInheritedHeight”

**Files:**
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`
- Modify: `src/composables/__tests__/launcher/panelMeasurement.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts`

- [ ] **Step 1: 在 `useWindowSizing.controller.test.ts` 增加明确回归测试**

```ts
it("搜索页底部呼吸留白不进入 commandPanelInheritedHeight", async () => {
  const harness = createCommandHarness({
    lastFrameHeight: 124,
    searchPanelEffectiveHeight: 62
  });

  await harness.controller.syncWindowSize();
  harness.state.pendingCommand.value = { id: "pending" };
  harness.state.drawerOpen.value = false;
  harness.state.drawerViewportHeight.value = 0;

  await harness.controller.syncWindowSize();

  expect(harness.state.commandPanelInheritedHeight.value).toBe(62);
});

it("Search -> Command 首帧先继承 searchPanelEffectiveHeight，不够完整盒子时才补高", async () => {
  const harness = createCommandHarness({
    lastFrameHeight: 124,
    searchPanelEffectiveHeight: 62
  });

  harness.state.pendingCommand.value = { id: "pending" };
  await harness.controller.syncWindowSize();
  expect(harness.spies.requestAnimateMainWindowSize).toHaveBeenLastCalledWith(
    expect.any(Number),
    62 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK
  );
});
```

- [ ] **Step 2: 在同一文件补 Flow 护栏**

```ts
it("Search -> Flow 继续跟随当前 Search 有效高度，不携带 breathing", async () => {
  const harness = createFlowHarness({
    lastFrameHeight: 124,
    searchPanelEffectiveHeight: 62
  });

  harness.state.stagingExpanded.value = true;
  await harness.controller.syncWindowSize();

  expect(harness.state.flowPanelInheritedHeight.value).toBe(62);
});
```

- [ ] **Step 3: 在 `panelMeasurement.test.ts` / `LauncherCommandPanel.test.ts` / `LauncherFlowPanel.test.ts` 加回归断言**

执行要求：
- `panelMeasurement.test.ts` 明确 `measureCommandPanelFullNaturalHeight()` 仍包含两个 divider。
- `LauncherCommandPanel.test.ts` 保留“完整骨架”断言，避免执行期误删 footer/divider。
- `LauncherFlowPanel.test.ts` 保留“三段式 + settled + body/list 单一滚动宿主”断言，重点防止本轮为修 Search inheritance 误伤 Flow。

- [ ] **Step 4: 运行定向测试并确认失败**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
npm run test:run -- src/composables/__tests__/launcher/panelMeasurement.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
```

Expected:
- `controller.ts` 仍在用旧的 frame height / lastWindowSize 作为 Command 进入基线，新增测试失败。
- 组件/测量回归测试至少有一部分尚未覆盖新的显式命名，测试失败或待补。

- [ ] **Step 5: Commit（仅测试）**

```bash
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git add src/composables/__tests__/launcher/panelMeasurement.test.ts
git add src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
git add src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
git commit -m "test(launcher): 锁定 command 继承与 flow 回归护栏"
```

### Task 4: 实现 controller/runtime 接线，修正 Search -> Command 继承

**Files:**
- Modify: `src/composables/launcher/useWindowSizing/controller.ts`
- Modify: `src/composables/launcher/useWindowSizing/model.ts`
- Modify: `src/composables/launcher/useWindowSizing/calculation.ts`
- Modify: `src/composables/app/useAppCompositionRoot/runtime.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`
- Modify: `src/composables/__tests__/launcher/panelMeasurement.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts`

- [ ] **Step 1: 在 `controller.ts` 抽出“当前面板有效高度”解析函数**

```ts
function resolveCurrentPanelEffectiveHeight(
  options: UseWindowSizingOptions
): number {
  if (options.pendingCommand.value !== null) {
    return (
      options.commandPanelLockedHeight.value ??
      options.commandPanelInheritedHeight.value ??
      options.constants.paramOverlayMinHeight
    );
  }

  if (options.stagingExpanded.value) {
    return (
      options.flowPanelLockedHeight.value ??
      options.flowPanelInheritedHeight.value ??
      options.searchPanelEffectiveHeight.value
    );
  }

  return options.searchPanelEffectiveHeight.value;
}
```

- [ ] **Step 2: 进入 CommandPanel 时只冻结 `searchPanelEffectiveHeight`**

执行要求：
- `pendingCommandActive` 从 `false -> true` 时，如果底层页面是 Search，`beginCommandPanelSession()` 传入值必须是 `options.searchPanelEffectiveHeight.value`。
- 不能再用 `lastWindowSize - dragStripHeight` 作为 Search -> Command 的默认入口值。
- `requestCommandPanelExit()`、`search-page-settled` 恢复链路保持现有 coordinator 逻辑，不重做第二条退出路径。

- [ ] **Step 3: 进入 FlowPanel 时继续按“当前面板高度”继承，但要剔除 Search breathing**

执行要求：
- 从 Search 打开 Flow 时，继承基线使用 `searchPanelEffectiveHeight`。
- 从 Command 打开 Flow 时，继承基线继续使用 `commandPanelLockedHeight` / `commandPanelInheritedHeight`。
- `maybeLockFlowPanelHeight()` 保持现有 settled 后一次锁高逻辑，不把 toast / 编辑态写入外框 contract。

- [ ] **Step 4: 在 `runtime.ts` 将新的 layout metrics refs 透传给 `useWindowSizing()`**

```ts
const windowSizing = useWindowSizing({
  // ...
  searchPanelEffectiveHeight: launcherRuntime.layoutMetrics.searchPanelEffectiveHeight,
  sharedPanelMaxHeight: launcherRuntime.layoutMetrics.sharedPanelMaxHeight,
  // ...
});
```

- [ ] **Step 5: 运行 Chunk 2 focused tests 并修到全绿**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
npm run test:run -- src/composables/__tests__/launcher/panelMeasurement.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
```

Expected: 全绿。

- [ ] **Step 6: Commit（继承链路落地）**

```bash
git add src/composables/launcher/useWindowSizing/controller.ts
git add src/composables/launcher/useWindowSizing/model.ts
git add src/composables/launcher/useWindowSizing/calculation.ts
git add src/composables/app/useAppCompositionRoot/runtime.ts
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git add src/composables/__tests__/launcher/panelMeasurement.test.ts
git add src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
git add src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
git commit -m "fix(launcher): 更正 search 到 command 的高度继承"
```

## Chunk 3: 收口 Search breathing、样式 contract 与全量验证

### Task 5: 先写失败测试，锁定 Search breathing 只属于 shell chrome

**Files:**
- Modify: `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`
- Modify: `src/styles/__tests__/launcher-style-contract.test.ts`
- Modify: `src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts`

- [ ] **Step 1: 在 `LauncherSearchPanel.floor-height.test.ts` 补充 SearchPanel contract**

```ts
it("SearchPanel 不通过 filler / floor 占位把 breathing space 挤进结果区域", () => {
  const wrapper = mount(LauncherSearchPanel, {
    props: createProps({
      drawerOpen: true,
      drawerViewportHeight: 24,
      filteredResults: [createCommandTemplate("a")]
    })
  });

  const drawer = wrapper.get(".result-drawer");
  expect(drawer.attributes("style")).toContain("max-height: 24px");
  expect(wrapper.find(".result-drawer__filler").exists()).toBe(false);
});
```

- [ ] **Step 2: 在 `launcher-style-contract.test.ts` 锁定 shell breathing 与共享 panel max-height 分离**

```ts
it("search-shell breathing 与 launcher-panel-max-height 分离声明", () => {
  expect(launcherCss).toMatch(
    /\.search-shell[\s\S]*padding-bottom:\s*var\(--launcher-shell-breathing-bottom/
  );
  expect(launcherCss).toMatch(/--launcher-panel-max-height/);
});
```

- [ ] **Step 3: 在 `useLauncherLayoutMetrics.test.ts` 锁定 breathing 不影响 sharedPanelMaxHeight**

```ts
it("sharedPanelMaxHeight 不包含 shell bottom breathing", () => {
  const metrics = useLauncherLayoutMetrics({ ... });
  expect(metrics.sharedPanelMaxHeight.value).toBe(
    metrics.searchCapsuleHeight.value + LAUNCHER_DRAWER_MAX_VIEWPORT_HEIGHT_DESIGN_PX
  );
});
```

- [ ] **Step 4: 运行定向测试并确认失败**

Run:
```bash
npm run test:run -- src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
npm run test:run -- src/styles/__tests__/launcher-style-contract.test.ts
npm run test:run -- src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
```

Expected:
- Search shell 还没有独立 breathing token 或对应注释，新增样式断言失败。
- Layout metrics 尚未把 breathing 与 shared max 完全分离，相关断言失败。

- [ ] **Step 5: Commit（仅测试）**

```bash
git add src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
git add src/styles/__tests__/launcher-style-contract.test.ts
git add src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
git commit -m "test(launcher): 锁定 search breathing 与样式 contract"
```

### Task 6: 最小化 CSS 调整、全量验证与收尾

**Files:**
- Modify: `src/styles/launcher.css`
- Modify: `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`
- Modify: `src/styles/__tests__/launcher-style-contract.test.ts`
- Modify: `src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts`
- Modify: `docs/active_context.md`

- [ ] **Step 1: 在 `launcher.css` 明确并缩小 Search shell breathing**

执行要求：
- 为 `.search-shell` 引入明确 token，例如 `--launcher-shell-breathing-bottom`。
- breathing 继续保留在 shell/frame 外围，但不能再通过 magic number 和 Search 有效高度耦合。
- 不主动改 `CommandPanel` / `FlowPanel` 样式结构，除非回归测试证明必须补一个极小样式修正。

- [ ] **Step 2: 跑与本功能直接相关的全部自动化测试**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/panelHeightContract.test.ts
npm run test:run -- src/composables/__tests__/launcher/panelMeasurement.test.ts
npm run test:run -- src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
npm run test:run -- src/styles/__tests__/launcher-style-contract.test.ts
```

Expected: 全绿。

- [ ] **Step 3: 跑统一工程门禁**

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

- [ ] **Step 4: 在真实 Tauri 窗口手验 `bug5.png` 对应路径**

Run:
```bash
npm run tauri:dev
```

手验清单：
1. Search 仅显示搜索框时，底部只保留极小 breathing，不再像一个空 panel。
2. Search 结果较多但未触顶时，进入 Command 首帧高度等于当前 Search 有效高度。
3. Search 已接近上限时，进入 Command 不再出现“footer 落进旧空白区”的视觉问题。
4. Search 较矮时，Command 只在完整盒子放不下时补高，且不超过共享上限。
5. Search -> Flow 仍是“跟随当前面板高度，不够再补高”，且不携带 Search breathing。
6. Command -> Flow -> 关闭 Flow 后，回到 Command 已锁定高度。

- [ ] **Step 5: 更新短期记忆文档**

执行要求：
- 只补充，不覆盖 `docs/active_context.md`。
- 控制在 200 字以内。
- 明确记录新计划路径，以及它 supersede 旧的 `2026-03-20-launcher-command-flow-height-contract-correction.md`。

- [ ] **Step 6: 最终 Commit**

```bash
git add src/composables/launcher/useLauncherLayoutMetrics.ts
git add src/composables/launcher/useWindowSizing/model.ts
git add src/composables/launcher/useWindowSizing/panelHeightContract.ts
git add src/composables/launcher/useWindowSizing/calculation.ts
git add src/composables/launcher/useWindowSizing/controller.ts
git add src/composables/app/useAppCompositionRoot/runtime.ts
git add src/styles/launcher.css
git add src/composables/__tests__/launcher/panelHeightContract.test.ts
git add src/composables/__tests__/launcher/panelMeasurement.test.ts
git add src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
git add src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git add src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
git add src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
git add src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
git add src/styles/__tests__/launcher-style-contract.test.ts
git add docs/active_context.md
git commit -m "fix(launcher): 收口 search effective height 与面板继承 contract"
```

## 验收对照表

- `searchPanelEffectiveHeight` 只等于“搜索框 + 搜索结果区域”。
- `sharedPanelMaxHeight` 只等于“搜索框 + 最大搜索结果展示高度”。
- Search 底部 breathing space 明确存在但不进入 `commandPanelInheritedHeight`。
- `Search -> Command` 首帧先继承 `searchPanelEffectiveHeight`，只有完整 CommandPanel 盒子放不下时才补高。
- `CommandPanel` 完整盒子测量仍是 `header + content + footer + divider`。
- `FlowPanel` 现有“跟随当前面板高度，不够再补高”的语义不回归。
- 新增自动化测试明确覆盖“搜索页底部呼吸留白不进入 `commandPanelInheritedHeight`”。

## 分步提交建议

1. `test(launcher): 锁定 search effective height 与共享上限口径`
2. `refactor(launcher): 拆分 search effective height 与 shared panel max`
3. `test(launcher): 锁定 command 继承与 flow 回归护栏`
4. `fix(launcher): 更正 search 到 command 的高度继承`
5. `test(launcher): 锁定 search breathing 与样式 contract`
6. `fix(launcher): 收口 search effective height 与面板继承 contract`

Plan complete and saved to `docs/superpowers/plans/2026-03-20-launcher-search-effective-height-inheritance-and-panel-contract.md`. Ready to execute?
