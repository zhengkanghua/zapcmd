# Phase 14: Review Overlay 结构接入 - Research

**Researched:** 2026-03-09  
**Domain:** Launcher（Vue + Tauri）B4 分层：Review overlay / 背景锁定 / 尺寸与 floor height  
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### 入口与关闭

- 入口形态：使用 **搜索区内的 queue summary pill** 作为主要入口（而不是右侧常驻 staging chip）。
- 显示时机：**仅队列非空**时显示 pill；空队列时不占位。
- 关闭方式：Review 面板内提供明确的 **关闭按钮**；同时支持 **点击 dim/遮罩区域关闭**。
- 背景锁定的视觉提示：采用 **轻 dim**（背景仍可读，但明确不可交互），不引入 blur。

### Overlay 形态

- 面板宽度：按 **搜索区宽度 `searchMainWidth` × 比例**计算；推荐比例 `2/3`（`0.67`），并 **clamp 到 `420px~480px`**。
- 与 drag strip 的关系：Review overlay **不覆盖顶部拖拽区**；拖拽区始终可见可用。
- 滚动结构：Review 面板 **Header/Footer 固定**，队列列表在面板内部滚动；不随队列持续拉高窗口。
- 滚轮行为：Review 打开时，在背景区域滚轮应 **驱动 Review 列表滚动**（背景仍保持不可交互）。

### 卡片密度与长命令呈现

- 卡片信息密度：每条队列项以 **标题 + 一行命令摘要/预览**为主（长命令截断）。
- 完整命令获取：提供 **复制按钮**；hover/tooltip 可查看完整命令（不默认铺完整长命令）。
- 参数呈现：Review 内仍保持 **inline 可编辑参数输入框**（延续现有 staging 行为）。

### 空队列行为

- Review 打开后若队列被清空：**保持在 Review 内**，显示空态文案与关闭入口（不自动关闭）。

### Claude's Discretion

- queue summary pill 的具体文案、图标风格与排版细节（在不破坏可读性与可达性的前提下）。
- dim 强度与层级细节（保持“背景可见但不可交互”的明确性）。
- 卡片摘要的截断规则与 tooltip 呈现细节（不改变“默认摘要、可复制、可查看完整”的原则）。

### Deferred Ideas (OUT OF SCOPE)

- 键盘 / 焦点 / Esc 分层后退语义的最终收口（Phase 15）
- 动画与新视觉系统整体打磨（Phase 16）
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SHELL-01 | 用户打开 launcher 主窗口时只看到单焦点搜索态（不再存在常驻并列的右侧 staging 工作区） | `src/components/launcher/LauncherWindow.vue` + `src/styles.css` 的 `.search-shell` 双列 grid 是旧结构落点；Phase 14 需要把常驻右栏改为“仅搜索”+“按需 overlay”。 |
| SHELL-02 | 用户打开 Review overlay 后仍能看到搜索上下文，但背景不可交互（不可点击、不可滚动、不可获得焦点） | 需要在 `LauncherWindow.vue` 内新增 dim/lock 层（`data-hit-zone="overlay"` 防止 blank click hide），并通过 `useSearchFocus` 的 `shouldBlockFocus`（`src/composables/launcher/useSearchFocus.ts`）+ 背景区域 `inert/aria-hidden/pointer-events` 组合确保不可交互。 |
| SHELL-03 | 顶部拖拽区在 Search/Review 状态都可用，且不会被遮罩/overlay 吞掉 | Drag strip 现由 `.shell-drag-strip[data-tauri-drag-region]` 提供（`LauncherWindow.vue` + `src/styles.css`）；Review overlay 的 dim/panel 必须从 grid 第 2 行开始覆盖，避免覆盖第 1 行拖拽区；同时保持 `useWindowSizing` 中 drag strip 排除口径不变（`src/composables/launcher/useWindowSizing/calculation.ts`）。 |
| SIZE-02 | Review overlay 的最小可视高度与 floor height 对齐，且 Review 列表在面板内部滚动（不随队列项持续拉高窗口） | floor height 已在 Phase 13 通过 `drawerFillerHeight` 固化（`src/composables/launcher/useLauncherLayoutMetrics.ts` + `LauncherSearchPanel.vue` + floor-height 单测）。Review 面板可复用 `LauncherStagingPanel.vue` 的“header/footer + list(maxHeight + overflow)”结构，但要把高度约束与 window sizing（`useWindowSizing`) 对齐，并避免 overlay 绝对定位导致 measured height 失真。 |
| REV-01 | 用户可以通过 queue summary pill（如 `3 queued`）或等价入口进入 Review overlay | pill 更适合落在 `src/components/launcher/parts/LauncherSearchPanel.vue` 内（或新增 `LauncherQueueSummaryPill.vue` 由 `LauncherWindow.vue` 挂载），显示条件为 `stagedCommands.length>0`。 |
| REV-02 | 用户在 Review 中可以浏览队列项，且长命令以“可读摘要”呈现（不在主列表铺完整长命令） | 现 staging 卡片直接渲染 `cmd.renderedCommand`（`LauncherStagingPanel.vue`），需要在新 Review UI 中替换为摘要（可借用 `summarizeCommandForFeedback` 的“压缩空白+截断”逻辑：`src/composables/execution/useCommandExecution/helpers.ts`），并补充复制按钮与 tooltip/title。 |
| REV-03 | 用户在 Review 中可以删除队列项、调整顺序，并能触发队列执行/清空（复用现有队列能力） | 队列能力已存在：删除/更新参数/清空/执行（`src/composables/execution/useCommandExecution/actions.ts`），排序（`src/composables/launcher/useStagingQueue/focus.ts` 的 `moveStagedCommand` + drag handlers）；Review UI 复用这些 emits 即可。 |
| VIS-03 | Review overlay 宽度提升到可读范围（约 `420px ~ 480px`），长命令在 Review 中不再明显拥挤 | 需要在 `useLauncherLayoutMetrics.ts` 基于 `searchMainWidth` 计算 `reviewPanelWidth = clamp(searchMainWidth*0.67, 420, 480)`，并同步到 `useWindowSizing/calculation.ts` 的宽度公式 + `src/styles.css` 的 layout（旧 `WINDOW_STAGING_WIDTH=300` 将被替换）。 |
</phase_requirements>

## Summary

Phase 14 的核心不是“把右栏做宽一点”，而是把 launcher 的主结构从“Search + 常驻并列 staging”迁移为 B4 的 **Review overlay 分层模型**：搜索态只剩单焦点主舞台；Review 打开后背景仍可见，但任何输入（点击/滚动/聚焦）都必须被锁定到 Review 层（同时保住顶部 drag strip）。

仓库内已经有可复用的基础：Phase 13 引入的 `drawerFillerHeight`（严格禁止伪造结果 DOM）、`useWindowSizing` 的“measured/estimated 取 max + drag strip 排除”口径、`useLauncherHitZones` 的 hit-zone 分层、以及队列的增删改排/执行逻辑（`useCommandExecution` + `useStagingQueue`）。Phase 14 的规划重点在于：**把这些基础重新接线到 Review overlay**，并处理 “背景锁定 + overlay 宽度/高度 + window resize 时序 + 测试更新”。

## Standard Stack (HIGH)

- Frontend: `vue@^3.5.22` + `typescript@^5.9.2`（`package.json`）
- State/i18n: `pinia@^3.0.3` + `vue-i18n@^10.0.8`
- Desktop runtime: `@tauri-apps/api@^2.8.0`（WebView2/桌面）
- Build/test: `vite@^7.1.5` + `vitest@^3.2.4` + `@vue/test-utils@2.4.0`
- Styling: `tailwindcss@^3.4.17`（用于 base/components/utilities）+ `src/styles.css` 为主的自定义样式与 CSS 变量

## Architecture Patterns (HIGH)

### 1) Composition Root：数据与动作从 `useAppCompositionRoot` 下发

- `src/App.vue` 只做挂载与 props/emit 转接。
- `src/composables/app/useAppCompositionRoot/context.ts`：持有 DOM bridge、search、queue、settings、i18n 等上下文；`shouldBlockSearchInputFocusRef` 是“阻止搜索框聚焦”的全局开关。
- `src/composables/app/useAppCompositionRoot/runtime.ts`：组装 `useStagingQueue` / `useCommandExecution` / `useWindowSizing` / `useLauncherLayoutMetrics`，并绑定 watchers（`useLauncherWatcherBindings`）。
- `src/composables/app/useAppCompositionRoot/viewModel.ts`：把 runtime/context 映射成 `LauncherWindow` 所需 props + actions。

**对 Phase 14 的含义：** Review overlay 最终需要成为一等公民状态（至少要能：影响 layoutMetrics、影响 windowSizing、影响 shouldBlockSearchInputFocusRef、影响 hit zones）。

### 2) Layers 与输入拦截：`data-hit-zone` 是现成的“空白点击隐藏主窗”保护网

- `src/composables/launcher/useLauncherHitZones.ts` 决定 pointerdown 是否触发 hide：`overlay`/`drag`/`interactive` 都会阻止隐藏。
- Param/Safety overlay 已正确使用 `data-hit-zone="overlay"`（`LauncherParamOverlay.vue` / `LauncherSafetyOverlay.vue`）。

**对 Phase 14 的含义：** Review 的 dim/scrim 与面板必须标记为 `overlay` zone，否则：
1) 点击 dim 可能被当成 blank click 直接 hide 主窗；
2) 点击 overlay 外区域无法实现“只关闭 Review，不隐藏主窗”。

### 3) Sizing：窗体尺寸由“布局度量 + windowSizing controller”统一管理

- `src/composables/launcher/useLauncherLayoutMetrics.ts`：
  - 计算 `searchMainWidth` 与 `searchShellStyle`（CSS 变量注入）
  - floor height 通过 `drawerFillerHeight` 实现（且已有单测与组件 DOM 约束）
  - staging list 的 maxHeight/scroll 控制（可迁移到 Review list）
- `src/composables/launcher/useWindowSizing/calculation.ts`：
  - measured + estimated 取 max，避免时序裁切
  - drag strip 高度从 `.shell-drag-strip` 实测并排除在内容高度之外
- `src/composables/launcher/useLauncherWatchers.ts`：
  - staging drawer opening 时 immediate sync，其余 schedule sync（用来配合过渡期）

**对 Phase 14 的含义：**
- Review overlay 采用绝对定位时，measured height 可能“看不见 overlay” → 需要设计好“度量 ref”或为 overlay 提供参与测量的布局容器/估算口径。
- Review width/height 的引入必须进入 `layoutMetrics` 与 `windowSizing` 的同一条链路，否则会出现“UI 看着对，但窗口不 resize / 发生裁切”的回归。

## Key Code Touchpoints（本 Phase 规划必须掌握的落点）

### UI / Layout

- `src/components/launcher/LauncherWindow.vue`：层级编排点（Search shell + overlays），以及 root pointerdown capture（hit zones）。
- `src/components/launcher/parts/LauncherSearchPanel.vue`：queue summary pill 最自然的挂载位置；也可在这里加背景 locked 的视觉态/属性（如 `inert`）。
- `src/components/launcher/parts/LauncherStagingPanel.vue`：现有队列 UI 的最佳迁移参考；建议新建 `LauncherReviewOverlay.vue` 复制迁移以降低耦合（见 `docs/ui-redesign/10-b4-component-architecture.md`）。
- `src/styles.css`：`.search-shell` 当前为两列 grid + staging-chip 闭合态；Review overlay 需要新层级（dim + panel）与新的宽度变量。

### State / Composables

- `src/composables/launcher/useStagingQueue/*`：目前提供 open/close 状态机 + reorder + focusZone；Phase 14 可“先复用命名，后续收口”，但需要确认 guard 是否会在空队列时把焦点送回 search。
- `src/composables/execution/useCommandExecution/helpers.ts`：`appendToStaging()` 当前在队列从空变非空时 **自动 openStagingDrawer**（B4 结构下很可能需要去除/改写，避免 staging 一个命令就强制进入 Review）。
- `src/composables/launcher/useLauncherSessionState.ts`：持久化了 `stagingExpanded`；B4 下需要决定是否仍然恢复“Review 打开状态”，或只恢复队列本身。
- `src/composables/launcher/useSearchFocus.ts` + `src/composables/app/useAppCompositionRoot/context.ts`：背景锁定要求“不可获得焦点”，这里是阻断搜索框聚焦的统一开关。

## Don't Hand-Roll（优先复用/扩展现有能力）

- 不要自写“窗口 resize 逻辑”或在组件里直接调用 Tauri API：统一通过 `useWindowSizing` 调度。
- 不要用“假结果 DOM/假数据”去补 floor height：保持 `LauncherSearchPanel.floor-height.test.ts` 的约束成立。
- 不要在 Review 内重写队列增删改排/执行：复用 `useCommandExecution` 与 `useStagingQueue` 的动作接口（只是换 UI 承载）。
- 不要新造“点击空白隐藏主窗”的判定：复用 `useLauncherHitZones`，只扩展 hit-zone 使用。
- 不要手写新的 focus trap 算法：Param/Safety overlay 已有 Tab trap 实现，可直接复用到 Review（Phase 15 重点，但 Phase 14 的背景锁定至少要先阻断 search focus）。

## Common Pitfalls (MEDIUM)

1. **“入队即自动打开 Review”与单焦点搜索态冲突**：当前 `appendToStaging()` 会自动打开 staging drawer；B4 很可能需要变为“显示 pill/提示，但不打断搜索”。  
2. **空队列 guard 把焦点送回 search**：`useStagingQueue/guards.ts` 在队列清空且 focusZone=staging 时会调度 search focus；若此时 Review 仍打开，会破坏背景锁定。  
3. **overlay 未标记 hit-zone 导致误 hide 主窗**：dim/scrim 必须 `data-hit-zone="overlay"`，否则 root pointerdown 会触发 hide。  
4. **overlay 覆盖 drag strip**：B4 明确不允许；需确保 dim/panel 的覆盖区域从 drag strip 下方开始。  
5. **绝对定位导致 measured sizing 不包含 overlay**：`measureWindowContentHeightFromLayout()` 只看 shellRect 与 stagingRect；Review overlay 若不参与布局，会出现“视觉上更高，但窗口高度没变”的裁切风险。  
6. **测试大面积绑定 `.staging-*` 选择器**：Phase 14 的结构迁移会触发大量测试更新（例如 `src/__tests__/app.hotkeys.test.ts` / `app.core-path-regression.test.ts`）。规划时需预留专门的“测试同步”任务波次。

## Code Examples (from current repo)

### 1) hit-zones：overlay 区域必须阻止 blank click hide

```ts
// src/composables/launcher/useLauncherHitZones.ts
type LauncherHitZone = "drag" | "interactive" | "overlay";
// inHitZone(element, "overlay") => shouldHideLauncher = false
```

### 2) 背景锁定的统一入口：阻断 search input 聚焦

```ts
// src/composables/launcher/useSearchFocus.ts
if (options.shouldBlockFocus?.()) return;
```

### 3) 需要特别关注的“旧 staging 时代副作用”：入队会自动 open

```ts
// src/composables/execution/useCommandExecution/helpers.ts
if (wasEmpty) {
  options.openStagingDrawer();
}
```

### 4) window sizing：drag strip 排除 + measured/estimated 取 max

```ts
// src/composables/launcher/useWindowSizing/calculation.ts
const dragStripHeight = resolveShellDragStripHeight(options);
const measuredContentHeight = measureWindowContentHeightFromLayout(...);
const estimatedContentHeight = estimateWindowContentHeight(...);
const sizingContentHeight = measuredContentHeight === null
  ? estimatedContentHeight
  : Math.max(measuredContentHeight, estimatedContentHeight);
```

## Sources (repo-local)

### Primary (HIGH confidence)
- `src/components/launcher/LauncherWindow.vue`：主窗口层级编排与 hit zones
- `src/components/launcher/parts/LauncherSearchPanel.vue`：搜索 UI + drawer filler
- `src/components/launcher/parts/LauncherStagingPanel.vue`：队列 UI（Review 迁移参考）
- `src/composables/launcher/useLauncherLayoutMetrics.ts`：floor height / layout metrics / CSS vars
- `src/composables/launcher/useWindowSizing/calculation.ts`：窗口尺寸口径（drag strip 排除）
- `src/composables/launcher/useLauncherHitZones.ts`：overlay/interactive/drag 点击语义
- `docs/ui-redesign/08-b4-interaction-state-machine.md`：B4 状态机契约
- `docs/ui-redesign/10-b4-component-architecture.md`：B4 推荐组件拆分
- `docs/ui-redesign/11-b4-visual-spec.md`：Review 宽度/拖拽区/遮罩边界规格
- `docs/ui-redesign/12-b4-acceptance-matrix.md`：验收矩阵与手动用例

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - `package.json` 与现有构建/测试脚本清晰
- Architecture: HIGH - 关键层级/refs/sizing/hit-zones 已在代码中落地且有单测
- Pitfalls: MEDIUM - 需要在实现中验证 overlay 参与 window measured sizing 的策略，以及 background lock 的焦点/滚轮细节

**Research date:** 2026-03-09  
**Valid until:** 2026-03-23（B4 结构快速演进，超过两周建议复查关键落点与测试覆盖）

