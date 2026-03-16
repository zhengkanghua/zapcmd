# LauncherFrame 外框统一：高度口径统一 + CommandPanel 对齐修复 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Launcher 主窗口引入常驻 `LauncherFrame` 外框容器，统一最大高度口径（`designCap`）与命中规则；修复 CommandPanel 点击误判为空白导致隐藏、进入参数面板高度抖动/过度增高；并统一 FlowPanel/SafetyOverlay 在 Frame 内去重挂载与裁剪。

**Architecture:** `LauncherWindow.vue` 增加 `LauncherFrame`（drag-strip 下唯一外框），并在其上设置 `data-hit-zone="interactive"` 作为全局命中兜底；Search/Command 页仅渲染内部结构，外框样式上提到 Frame；FlowPanel/SafetyOverlay 作为 overlays 只在 `LauncherWindow.vue` 内挂载一次并绝对定位覆盖 Frame；窗口 sizing 在 `resolveWindowSize()` 中引入 `frameMaxHeight = min(screenCap - dragStripHeight, designCap)`，并在 `pendingCommand` 进入期间应用“只增不减” floor（进入前的 frameHeight）。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vitest, CSS

**Spec:** `docs/superpowers/specs/2026-03-16-launcher-frame-height-unification-design.md`

---

## 文件结构

### 修改文件（预期）

| 文件路径 | 职责 / 改动概述 |
|---|---|
| `src/components/launcher/LauncherWindow.vue` | 引入常驻 `LauncherFrame` 容器（drag-strip 下），统一挂载 Page + Overlays；Frame 标记 `data-hit-zone="interactive"`；FlowPanel/SafetyOverlay 在 Frame 内只挂载一次（去重）。 |
| `src/components/launcher/parts/LauncherSearchPanel.vue` | SearchPanel 不再承担外框职责：移除 `.search-main` 外框类与 `data-hit-zone`；移除 `LauncherFlowPanel` 的直接渲染（避免重复挂载）。 |
| `src/components/launcher/parts/LauncherCommandPanel.vue` | 去除与外框冲突的背景假设（必要时设为透明）；保证 `content` 可滚动且 `footer` 固定可见（补 `min-height: 0` 等约束）。 |
| `src/styles/launcher.css` | 将 `.search-main` 的外框样式上提/复用到 `.launcher-frame`；确保 Frame `overflow: hidden`、圆角裁剪一致；必要时调整 overlays 的边界/圆角对齐。 |
| `src/composables/launcher/useLauncherLayoutMetrics.ts` | 明确 `designCap` 唯一计算口径与常量（例如 `DRAWER_GAP_EST_PX`、`LAUNCHER_FRAME_DESIGN_CAP_PX`），避免 `+10` 漂移。 |
| `src/composables/launcher/useWindowSizing/model.ts` | 为“只增不减”增加 floor 状态输入（Ref），供 controller 设置、calculation 应用。 |
| `src/composables/launcher/useWindowSizing/controller.ts` | 监听 `pendingCommand` 进入/退出：记录进入前 `frameHeightBeforeEnter`，退出时清理；保证切命令时 floor 不变。 |
| `src/composables/launcher/useWindowSizing/calculation.ts` | 引入 `designCap` 参与 `frameMaxHeight`；抽离 `DRAWER_GAP_EST_PX`；进入 CommandPanel 时应用 floor（只增不减）；超出上限时不再增高（交给 CommandPanel 内容区滚动）。 |
| `src/composables/app/useAppCompositionRoot/runtime.ts` | 传入新增的 floor Ref 到 `useWindowSizing()`（作为 options 字段）。 |
| `src/components/launcher/__tests__/LauncherWindow.flow.test.ts` | 命中/overlay 去重相关回归测试（CommandPanel 点击不隐藏；Search 页 stagingExpanded 时 FlowPanel 仍由 LauncherWindow 挂载）。 |
| `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts` | 适配 FlowPanel 挂载位置变化（SearchPanel 不再包含 FlowPanel）；保留 floor 占位/禁用输入等语义测试。 |
| `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts` | 适配“FlowPanel 不在 SearchPanel 内渲染”的结构约束测试（改为验证 overlay 语义本身；结构约束移到 LauncherWindow 级）。 |
| `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts` | 新增/调整 sizing 单测：designCap clamp + 进入 CommandPanel “只增不减” + 退出后允许回落。 |

---

## Chunk 1: LauncherFrame 结构 + 命中修复 + Overlay 去重

### Task 1: 命中与去重回归测试（先写失败测试）

**Files:**
- Modify: `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`

- [ ] **Step 1: 增加两个回归用例（预期先失败）**

```ts
// src/components/launcher/__tests__/LauncherWindow.flow.test.ts
it("command-action 页面点击任意内容不应触发 blank-pointerdown（命中兜底）", async () => {
  const command = createCommandTemplate("cmd-hit");
  const commandPage: NavPage = { type: "command-action", props: { command, mode: "execute", isDangerous: false } };

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
          template: "<button class='inside-command-panel'>inside</button>"
        }
      }
    }
  });

  await wrapper.get(".inside-command-panel").trigger("pointerdown");
  expect(wrapper.emitted(\"blank-pointerdown\")).toBeUndefined();
});

it("Search 页面 stagingExpanded=true 时 FlowPanel 由 LauncherWindow 挂载（SearchPanel 即使被 stub 也仍存在）", () => {
  const wrapper = mount(LauncherWindow, {
    props: createBaseProps({
      navCurrentPage: { type: "search" },
      stagingExpanded: true,
      stagingDrawerState: "open"
    }),
    global: {
      stubs: {
        LauncherSearchPanel: true,
        LauncherCommandPanel: true,
        LauncherSafetyOverlay: true,
        LauncherFlowPanel: true
      }
    }
  });

  expect(wrapper.find("launcher-flow-panel-stub").exists()).toBe(true);
});
```

- [ ] **Step 2: 运行定向测试并确认失败**

Run: `npm run test:run -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts`  
Expected:  
- 第一个用例应失败（当前点击 CommandPanel 会触发 `blank-pointerdown`）。  
- 第二个用例应失败（当前 Search 页 FlowPanel 在 SearchPanel 内渲染，stub 掉后不再出现）。

- [ ] **Step 3: Commit（仅测试）**

Run:
```bash
git add src/components/launcher/__tests__/LauncherWindow.flow.test.ts
git commit -m "test(launcher): 添加 LauncherFrame 命中与 overlay 去重回归用例"
```

---

### Task 2: 引入 LauncherFrame 容器 + FlowPanel 去重挂载 + SearchPanel 去外框

**Files:**
- Modify: `src/components/launcher/LauncherWindow.vue`
- Modify: `src/components/launcher/parts/LauncherSearchPanel.vue`
- Modify: `src/components/launcher/types.ts`
- Modify: `src/styles/launcher.css`
- Modify: `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts`

- [ ] **Step 1: SearchPanel 侧先移除 FlowPanel 渲染（让结构去重）**
  - 删除 `LauncherFlowPanel` import
  - 移除模板底部的 `<LauncherFlowPanel .../>`
  - 将根节点从 `.search-main` 改为“仅内容容器”类名（示例：`.search-panel`），并移除 `data-hit-zone="interactive"`（命中由 Frame 统一兜底）
  - 同步精简 `LauncherSearchPanelProps`：移除仅用于 FlowPanel 的 props（`stagedCommands/stagingHints/.../setStagingPanelRef` 等）

最小形态示例（示意，按现有结构落地）：

```vue
<!-- src/components/launcher/parts/LauncherSearchPanel.vue -->
<section class="search-panel">
  <!-- 原 search-capsule / result-drawer 保持 -->
</section>
```

- [ ] **Step 2: LauncherWindow 引入常驻 LauncherFrame**
  - 将 `.launcher-nav-container` 替换为 `.launcher-frame`
  - 在 `.launcher-frame` 上添加 `data-hit-zone="interactive"`（命中兜底）
  - FlowPanel 挂载条件改为仅依赖 `stagingExpanded`（不再分 Search/Command 两处挂载）
  - `flow-open` 统一用 `props.navCurrentPage.type !== 'search'` 传入 FlowPanel

示例片段（示意）：

```vue
<!-- src/components/launcher/LauncherWindow.vue -->
<div class="launcher-frame" data-hit-zone="interactive">
  <Transition ...>
    <LauncherSearchPanel v-if="..." ... />
    <LauncherCommandPanel v-else-if="..." ... />
  </Transition>

  <LauncherSafetyOverlay v-if="props.safetyDialog" ... />
  <LauncherFlowPanel
    v-if="props.stagingExpanded"
    :flow-open="props.navCurrentPage.type !== 'search'"
    ...
  />
</div>
```

- [ ] **Step 3: CSS 将外框样式上提到 `.launcher-frame`**
  - 把 `launcher.css` 中 `.search-main` 的“外框职责”迁移到 `.launcher-frame`：
    - `border-radius/border/background/overflow: hidden`
    - （保留原有渐变背景口径）
  - `.search-main` 不再作为外框：要么删除相关选择器，要么改为 `.search-panel` 的内部布局样式

- [ ] **Step 4: 适配受影响测试**
  - `LauncherSearchPanel.floor-height.test.ts`：移除对 `.flow-panel-overlay__scrim` 的依赖；若保留“关闭后 focus 回输入框”覆盖，改为在 test Harness 中将 `LauncherFlowPanel` 作为 SearchPanel 的兄弟节点模拟新结构
  - `LauncherFlowPanel.test.ts`：删除“FlowPanel 必须位于 search-main 子树内”的断言；将结构约束迁移到 `LauncherWindow.flow.test.ts`（断言 `.launcher-frame` 内存在 `.flow-panel-overlay` 且不在 `.search-capsule` 子树中）

- [ ] **Step 5: 运行本 Chunk 相关测试**

Run:
```bash
npm run test:run -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
```
Expected: 全绿。

- [ ] **Step 6: Commit（结构/样式/测试适配）**

Run:
```bash
git add src/components/launcher/LauncherWindow.vue
git add src/components/launcher/parts/LauncherSearchPanel.vue
git add src/components/launcher/types.ts
git add src/styles/launcher.css
git add src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
git add src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
git commit -m "fix(launcher): 引入 LauncherFrame 外框并去重挂载 overlays"
```

---

## Chunk 2: 高度口径统一（designCap）+ CommandPanel 进入只增不减

### Task 3: sizing 计算单测（designCap clamp + 只增不减）—— 先写失败测试

**Files:**
- Modify: `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`

- [ ] **Step 1: 新增/调整测试用例**

新增常量引用（后续会在实现中补齐导出）：

```ts
import { DRAWER_GAP_EST_PX, LAUNCHER_FRAME_DESIGN_CAP_PX } from "../../launcher/useLauncherLayoutMetrics";
```

新增用例示意：

```ts
it("frameMaxHeight 受 designCap 限制（即使 screen cap 很大也不超过搜索最大高度）", () => {
  const windowHeightCap = ref(10_000);
  const drawerViewportHeight = ref(5_000); // 故意很大，若无 designCap 会撑爆

  const size = resolveWindowSize(
    createBaseOptions({
      searchShellRef: ref(null),
      windowHeightCap,
      drawerOpen: ref(true),
      drawerViewportHeight
    })
  );

  // drag strip fallback + designCap
  expect(size.height).toBe(LAUNCHER_FRAME_DESIGN_CAP_PX + UI_TOP_ALIGN_OFFSET_PX_FALLBACK);
});

it("进入 CommandPanel 时应用 floor：只增不减（needed 小于进入前高度也不缩小）", () => {
  const size = resolveWindowSize(
    createBaseOptions({
      searchShellRef: ref(null),
      windowHeightCap: ref(10_000),
      drawerOpen: ref(false),
      drawerViewportHeight: ref(0),
      pendingCommand: ref({ id: "pending" }),
      commandPanelFrameHeightFloor: ref(520)
    })
  );
  expect(size.height).toBe(520 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK);
});

it("非 CommandPanel 时不应用 floor（避免 Search 粘住）", () => {
  const size = resolveWindowSize(
    createBaseOptions({
      searchShellRef: ref(null),
      windowHeightCap: ref(10_000),
      drawerOpen: ref(false),
      drawerViewportHeight: ref(0),
      pendingCommand: ref(null),
      commandPanelFrameHeightFloor: ref(520)
    })
  );
  expect(size.height).not.toBe(520 + UI_TOP_ALIGN_OFFSET_PX_FALLBACK);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`  
Expected:  
- 因尚未导出常量/未实现 floor/designCap clamp，测试应失败（编译失败或断言失败均可）。

- [ ] **Step 3: Commit（仅测试）**

Run:
```bash
git add src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
git commit -m "test(sizing): 增加 designCap 与 CommandPanel 只增不减回归用例"
```

---

### Task 4: 落地 designCap 与只增不减（controller 记录 floor + calculation 应用）

**Files:**
- Modify: `src/composables/launcher/useLauncherLayoutMetrics.ts`
- Modify: `src/composables/launcher/useWindowSizing/model.ts`
- Modify: `src/composables/launcher/useWindowSizing/controller.ts`
- Modify: `src/composables/launcher/useWindowSizing/calculation.ts`
- Modify: `src/composables/app/useAppCompositionRoot/runtime.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`

- [ ] **Step 1: 在 layoutMetrics 中引入唯一口径常量**
  - 新增并导出：
    - `export const DRAWER_GAP_EST_PX = 10`
    - `export const LAUNCHER_DRAWER_MAX_VIEWPORT_HEIGHT_DESIGN_PX = ...`
    - `export const LAUNCHER_FRAME_DESIGN_CAP_PX = WINDOW_SIZING_CONSTANTS.windowBaseHeight + LAUNCHER_DRAWER_MAX_VIEWPORT_HEIGHT_DESIGN_PX + DRAWER_GAP_EST_PX`
  - 把 `drawerMaxRowsByHeight` 里出现的 `- 10` 改为 `- DRAWER_GAP_EST_PX`（避免口径漂移）

- [ ] **Step 2: window sizing calculation 引入 frameMaxHeight**
  - 在 `resolveWindowSize()` 内实现：
    - `dragStripHeight = resolveShellDragStripHeight(options)`
    - `screenCapFrame = max(0, options.windowHeightCap.value - dragStripHeight)`
    - `frameMaxHeight = min(screenCapFrame, LAUNCHER_FRAME_DESIGN_CAP_PX)`
  - `measureWindowContentHeightFromLayout()` / `estimateWindowContentHeight()` 的 `contentHeightCap` 参数统一改为 `frameMaxHeight`
  - 把 `estimateWindowContentHeight()` 内的 `+ 10` 替换为 `+ DRAWER_GAP_EST_PX`

- [ ] **Step 3: 为 calculation 增加 floor 输入，并在 pendingCommand 期间应用**
  - `UseWindowSizingOptions` 增加：
    - `commandPanelFrameHeightFloor: Ref<number | null>`
  - calculation 应用规则（按 spec §5.3）：

```ts
if (options.pendingCommand.value && options.commandPanelFrameHeightFloor.value !== null) {
  resolvedContentHeight = clamp(
    Math.max(resolvedContentHeight, options.commandPanelFrameHeightFloor.value),
    options.constants.paramOverlayMinHeight,
    frameMaxHeight
  );
}
```

- [ ] **Step 4: controller 负责记录/清理 floor（pendingCommand 进入/退出）**
  - state 增加 `pendingCommandActive: boolean`
  - 在每次 `syncWindowSizeCore()` 计算前：
    - `isPending = options.pendingCommand.value !== null`
    - `isPending && !pendingCommandActive`：记录 `frameHeightBeforeEnter`
      - 优先：`state.lastWindowSize ? state.lastWindowSize.height - dragStripHeight : options.constants.windowBaseHeight`
      - 写入：`options.commandPanelFrameHeightFloor.value = frameHeightBeforeEnter`
    - `!isPending && pendingCommandActive`：清理 floor：`options.commandPanelFrameHeightFloor.value = null`
    - 切命令（非 null -> 非 null）不改 floor

- [ ] **Step 5: runtime 注入 floor Ref**
  - 在 `bindAppRuntime()` 创建 `const commandPanelFrameHeightFloor = ref<number | null>(null)` 并传入 `useWindowSizing({ ..., commandPanelFrameHeightFloor })`

- [ ] **Step 6: 运行 sizing 测试并修复到全绿**

Run:
```bash
npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
```

- [ ] **Step 7: Commit（sizing 口径统一）**

Run:
```bash
git add src/composables/launcher/useLauncherLayoutMetrics.ts
git add src/composables/launcher/useWindowSizing/model.ts
git add src/composables/launcher/useWindowSizing/controller.ts
git add src/composables/launcher/useWindowSizing/calculation.ts
git add src/composables/app/useAppCompositionRoot/runtime.ts
git add src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
git commit -m "fix(sizing): 引入 designCap 与 CommandPanel 进入只增不减"
```

---

## Chunk 3: 视觉对齐与滚动策略（CommandPanel footer 固定 + Frame 裁剪一致）

### Task 5: CommandPanel 内部滚动与外框对齐（含手动验收清单）

**Files:**
- Modify: `src/styles/launcher.css`
- Modify: `src/components/launcher/parts/LauncherCommandPanel.vue`

- [ ] **Step 1: 修复/加固滚动容器**
  - `.command-panel__content` 增加 `min-height: 0`（必要时 `.command-panel` 也补 `min-height: 0`），避免 flex 下滚动失效
  - 若外框背景已上提到 Frame：将 `.command-panel { background: ... }` 改为 `transparent` 或移除，避免与 Frame 渐变背景口径冲突

- [ ] **Step 2: 运行相关组件测试（若有）**

Run:
```bash
npm run test:run -- src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
```

- [ ] **Step 3: 手动验收（开发环境）**

Run: `npm run dev`，打开 `http://127.0.0.1:5173/`

1. **命中（点击不隐藏）**：在 CommandPanel 任意区域点击，不触发隐藏；仅点击真实窗口空白才隐藏。
2. **窗口 sizing（只增不减）**：
   - Search 结果很多（到最大行数）→ 进入 CommandPanel：窗口不变高；参数超长时内容区滚动。
   - Search 结果很少（窗口矮）→ 进入 CommandPanel：仅在不够高时增高；最高不超过“搜索最大高度（designCap）”。
   - 退出 CommandPanel → 返回 Search：窗口允许按结果自然回落/增长，但仍不超过 designCap。
3. **Overlay 去重**：Search/Command 两页来回切换，FlowPanel/SafetyOverlay 不出现“双份挂载”的异味（事件/焦点/滚动不分裂）。
4. **样式外框对齐**：Search/Command 外框圆角、边框、背景一致；FlowPanel/SafetyOverlay scrim 在 Frame 内裁剪一致（不露边、不越界）。
5. **CommandPanel footer 固定**：参数很多时底部按钮区始终可见，滚动仅发生在 `.command-panel__content`。

- [ ] **Step 4: 全量门禁（最后一步）**

Run: `npm run check:all`  
Expected: 全绿。

- [ ] **Step 5: Commit（样式/滚动加固）**

Run:
```bash
git add src/styles/launcher.css
git add src/components/launcher/parts/LauncherCommandPanel.vue
git commit -m "fix(ui): CommandPanel 滚动与外框口径对齐"
```

---

## 验收对照表（与 spec §8 对齐）

- 命中：CommandPanel 内任意点击不隐藏（依赖 `LauncherFrame[data-hit-zone=interactive]` 兜底）。
- 窗口 sizing：
  - 进入 CommandPanel 不缩小；仅按需增高；
  - 增高上限不超过 Search 最大高度（`designCap`）；
  - 超出上限时内容区滚动；
  - 退出后允许回落（仍受 `designCap` 上限约束）。
- Overlay 去重：FlowPanel/SafetyOverlay 在 Frame 内只挂载一次，跨页面一致。
- 样式对齐：Search/Command 外框一致，overlays 在 Frame 内裁剪一致。

