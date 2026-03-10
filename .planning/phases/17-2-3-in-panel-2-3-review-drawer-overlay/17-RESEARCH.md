<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

## Implementation Decisions

### 抽屉尺寸口径
- 覆盖比例：以“内容区宽度”为基准的 **约 2/3**（从右往左覆盖）。
- 宽度策略：采用 **2/3 + px clamp**（例如沿用既有可读性口径 `420–480px`），优先保证抽屉可读性；左侧上下文区不设硬性最小宽度下限。

### 三层结构与遮罩行为
- 层级：底层为结果区（可见上下文），中层为**轻遮罩 scrim**，顶层为抽屉 panel。
- 遮罩范围：**仅覆盖搜索框下方内容区**（不盖住 search capsule）。
- 遮罩强度：轻遮罩（结果仍清晰可读，但不可交互）。
- 遮罩效果：不加 blur，仅 dim。
- 滚轮语义：鼠标在遮罩上滚轮时，**滚动抽屉列表**（沿用现有 `onScrimWheel` 语义）。

### 打开/关闭与焦点契约
- 打开时初始焦点：聚焦当前激活队列项；无激活项则聚焦关闭按钮（沿用现状）。
- 关闭触发：点击遮罩/关闭按钮/Esc（按既有分层语义）。
- 关闭后回焦点：**始终回到搜索输入框**。
- 抽屉打开时的搜索框行为：点击搜索框视为“退出 Review”，即**关闭抽屉**后再输入 query（不支持“抽屉打开时直接改 query 且保持抽屉”这一新契约）。

### 抽屉内的信息布局与“命令修改”
- 抽屉内部允许重排，但保留三段式结构：Header（标题+提示+关闭）/ List（可滚动队列）/ Footer（清空+执行全部）。
- “修改命令”的主要路径：继续使用 Review 队列项卡片内的 **inline 参数输入**；删除/排序/执行能力保持。

### Claude's Discretion
- 抽屉内部具体排版密度、间距、阴影/边线的精修（不改变上述契约）。
- 具体 easing 曲线微调（总时长保持约 200ms 量级并与状态机对齐）。

### Deferred Ideas (OUT OF SCOPE)

## Deferred Ideas

- 挤压式（push）抽屉（会涉及长命令在窄栏下的展示策略）— 单独 phase 讨论。
- Alfred 式“列表 + 右预览”分栏信息架构 — 单独 phase 讨论。
</user_constraints>

## Phase Summary（研究结论）

Phase 17 的本质不是“重做 Review 功能”，而是把 **Review 的呈现方式**从当前的“search-shell 变宽 + 右侧独立列/分离抽屉感”，改为 **同一张搜索面板（search-main）内、仅覆盖搜索框下方内容区的 overlay 抽屉**：

- 视觉结构：结果层（可见但不可交互）→ scrim（仅 dim、不 blur）→ drawer panel（右侧滑入，宽约 2/3，clamp 420–480）。
- 交互契约：点击 scrim 关闭；Esc 关闭；关闭回到搜索输入框；点击搜索框等价“退出 Review”（关闭后再输入）。
- 可复用现有的 Review overlay 组件与状态机（`stagingDrawerState` + 动画 200ms + focus trap + `onScrimWheel`）。

## Standard Stack（HIGH）

- UI：Vue 3（`vue@^3.5.22`）+ SFC `script setup` + TypeScript（`typescript@^5.9.2`）。
- 测试：Vitest（`vitest@^3.2.4`）+ `@vue/test-utils@2.4.0`。
- 桌面壳：Tauri v2（`@tauri-apps/api@^2.8.0`，CLI `@tauri-apps/cli@^2.8.2`），拖拽区通过 `data-tauri-drag-region` 与 `app-region` 控制。
- 样式：全局 `src/styles.css` + CSS 变量（由 `useLauncherLayoutMetrics` 注入到 `.search-shell`）。

## Existing Implementation Map（HIGH）

### 现状：为何会有“右侧独立列/窗口变宽”的观感

- `src/components/launcher/LauncherWindow.vue`
  - `search-shell` 会在 `stagingExpanded` 时加上 `.search-shell--staging-wide`，从而启用“第二列 = `--review-width`”的 grid 布局（见 `src/styles.css`）。
  - `LauncherReviewOverlay` 作为 `search-shell` 里的 sibling 绝对定位，scrim 覆盖整个 shell 下半区，panel 通过 `margin-left: auto` 固定在最右侧。

- `src/styles.css`
  - `.search-shell` 默认 grid 两列：`var(--search-main-width)` + `var(--staging-collapsed-width)`（当前 collapsed=0）。
  - `.search-shell--staging-wide` 把第二列改成 `var(--review-width)`，同时 `useLauncherLayoutMetrics` 会在展开时把 `--shell-gap` 设为 12px。
  - `.review-overlay` 绝对定位：`top = --ui-top-align-offset + --search-capsule-height`（确保不覆盖 drag strip 与 search capsule），`left/right = 0`（覆盖整个 shell 的宽度）。
  - `.review-panel` 宽度 = `var(--review-width)`（目前就是 “2/3 + clamp(420–480)” 的结果）。

### 可直接复用的“契约/机制”

- `src/components/launcher/parts/LauncherReviewOverlay.vue`
  - scrim（button）点击关闭、focus trap、`onScrimWheel`（scrim 上滚轮滚动 review list）、打开时聚焦 active card / fallback close button。
  - `role="dialog"` + `aria-modal="true"` + `data-hit-zone="overlay"`（与 `useLauncherHitZones` 对齐）。

- `src/components/launcher/parts/LauncherSearchPanel.vue`
  - 背景锁定：当 `reviewOpen` 时，结果抽屉 `:inert="true"` + `aria-hidden="true"`，符合“可见但不可交互”。
  - 点击 search capsule 会触发 `pointerdown.capture` 并 `emit('toggle-staging')`（除 queue pill 外），符合“点击搜索框=退出 Review”。

- `src/composables/launcher/useStagingQueue/guards.ts`
  - drawer 关闭后把 `focusZone` 切回 `search`，并 `scheduleSearchInputFocus(false)`，与“关闭回到搜索输入框”契约一致。

## Architecture Patterns（HIGH）

### 1) “背景可见但不可交互”的实现口径

- 交互层：Review overlay 组件自身（scrim + panel）标记 `data-hit-zone="overlay"`，避免 root pointerdown 触发“点击空白隐藏窗口”。
- 背景层：SearchPanel 的 `result-drawer` 使用 `inert` + `aria-hidden`；这比“手动挡 click handler / stopPropagation”更稳定，且已有回归。

### 2) 动画/状态机口径

- 展开/收起使用 `stagingDrawerState: closed/opening/open/closing` 驱动 class（`review-overlay--${state}`）。
- CSS 动画统一 200ms，并已在 Phase 16 统一 `STAGING_TRANSITION_MS=200`，并含 `prefers-reduced-motion` 降级（禁用动画）。

### 3) 事件语义口径

- scrim click 关闭（`toggle-staging`）。
- scrim wheel → scroll review list（`onScrimWheel`），避免“scrim 吃掉滚轮导致无法滚动”的 UX 回归。
- search form `pointerdown.capture` 在 review 打开时强制关闭（除 queue pill），保证“点击搜索框=退出 Review”。

## Key Risks / Planning Checklist（最重要的“提前知道”）

### R1. “只覆盖搜索框下方内容区”的结构改造点（HIGH）

当前 overlay 是挂在 `.search-shell` 下并 `left/right:0` 覆盖整个 shell 宽度。Phase 17 需要它 **只覆盖 `.search-main` 的内容区**：

- 需要决定 overlay 的“挂载点”：
  1) **推荐**：把 `LauncherReviewOverlay` 作为 `LauncherSearchPanel` 内部子节点（或插槽）渲染，并让 `.search-main` 作为定位容器（`position: relative` 已存在）。
  2) 或保持 sibling，但通过 CSS 限制宽度/裁切到 `--search-main-width` 并对齐左侧（实现更绕，容易误盖 hit-zone）。

规划时要明确：overlay 的 DOM 范围必须让 scrim 的 hit-zone 覆盖“结果区”但不覆盖 search capsule / drag strip。

### R2. “窗口宽度不再因为 Review 打开而变宽”（HIGH）

目前展开 Review 会影响窗口宽度的关键点有三处（都需要在计划里明确改动范围与回归点）：

- `src/composables/launcher/useWindowSizing/calculation.ts`
  - `resolveWindowWidth()` 在 `stagingExpanded=true` 时把 `stagingWidth + gap` 加到窗口宽度里。
- `src/composables/launcher/useLauncherLayoutMetrics.ts`
  - `minShellWidth` 在 `stagingExpanded=true` 时把 `reviewWidth` 计入 shell 最小宽度。
  - `shellGap` 在展开时为 12px；若不再使用第二列，会导致无意义的右侧空白/宽度漂移。
- `src/styles.css` + `LauncherWindow.vue`
  - `.search-shell--staging-wide` 直接改变 grid 第二列宽度为 `--review-width`，制造“右侧列”。

Phase 17 的目标是 in-panel overlay，因此 **`stagingExpanded` 不应再触发窗口宽度/布局列数的变化**；只应触发 overlay 的显示与动画。

### R3. 点击空白区域时的优先级（MEDIUM，需产品确认）

`useLauncherHitZones` 规则是：不在 `overlay/drag/interactive` 区域的左键 pointerdown → 隐藏窗口。

当 overlay 的 scrim 不再覆盖整个 `.search-shell` 宽度后：
- 用户点击到 search-shell 的“非 search-main 区域”（例如右侧 padding/空白）可能会 **直接隐藏窗口**，而不是“先关闭 Review”。

需要在计划里明确：这是可接受的既有语义，还是要让 Review 打开时把更大区域标为 overlay hit-zone（例如给 `.search-shell` 增加 `data-hit-zone="overlay"`，或扩大 scrim 覆盖范围但仍不盖住 search capsule）。

### R4. 宽度口径：2/3 + clamp 在窄宽场景的边界（MEDIUM）

既有 `reviewWidth = clamp(floor(searchMainWidth*2/3), 420, 480)`。
- 当 `searchMainWidth` 逼近最小值（420）时，clamp 会让 drawer 变成 420px（几乎/完全盖住内容区），这符合“左侧上下文区不设硬性最小宽度”。
- 但必须保证 panel **不溢出容器**（建议同时加 `max-width: 100%` 或以容器宽度为上限计算）。

### R5. 回归风险：焦点/键盘层级不要被结构改动破坏（HIGH）

结构迁移（尤其是把 overlay 移入 SearchPanel）容易引入这些回归：
- Tab focus trap 不再生效（事件绑定层级变化、或 focusable 查询范围变化）。
- Esc 的分层优先级被打断（Review/Param/Safety 的顺序需要保持：Safety > Param > Review > Search/Hide）。
- 关闭后不回焦到 search input（必须保持 `bindDrawerGuards` 的行为链路不变）。

规划阶段应要求：所有相关行为继续由既有 `useStagingQueue` / `guards` / overlay 组件内部逻辑负责，避免重新手写一套。

## Don’t Hand-Roll（强约束）

- 不要重写“点击空白隐藏窗口”逻辑：继续复用 `useLauncherHitZones`，只在必要时调整 hit-zone 覆盖范围。
- 不要新造 focus 管理：继续复用 `LauncherReviewOverlay.vue` 的 focus trap + `useStagingQueue` 的 focus guards（关闭回焦、open 时 focusZone 切换）。
- 不要用 blur/backdrop-filter：按约束只做 dim（复用 `--ui-shell-dim`）。
- 不要引入新的动画系统：继续使用 `stagingDrawerState` class + 200ms keyframes + `prefers-reduced-motion` 降级。

## Suggested Implementation Approach（给 planner 的“可执行方向”）

1) **DOM 归位**：让 Review overlay 的 DOM 范围落在 `.search-main`（或其子树）内，使 scrim 只覆盖内容区。
2) **去掉“第二列变宽”链路**：
   - `LauncherWindow.vue` 不再在 `stagingExpanded` 时添加 `.search-shell--staging-wide`（或让该 class 不再改变 grid）。
   - `useLauncherLayoutMetrics`：`shellGap`、`minShellWidth` 不再随 `stagingExpanded` 变化而增加 `reviewWidth`。
   - `resolveWindowWidth`：不再因为 `stagingExpanded` 把 `reviewWidth` 计入窗口宽度。
3) **宽度与样式变量**：继续通过 `--review-width` 驱动 drawer 宽度（因为它已经是 “2/3 + clamp(420–480)”），但把其语义从“右侧列宽度”改为“in-panel drawer 宽度”。
4) **动画/降级**：沿用 `review-overlay--opening/--closing` 的 keyframes 与 `prefers-reduced-motion`。
5) **回归护栏**：
   - 保持 SearchPanel 的 `inert/aria-hidden` 背景锁定。
   - 保持 `onScrimWheel` 行为。
   - 保持关闭回焦链路（`bindDrawerGuards` + `useSearchFocus`）。

## Test / Verification Notes（规划时要补齐的验证点）

- 现有测试覆盖了 overlay 的语义与 focus trap（`LauncherReviewOverlay.test.ts`）以及 floor height / inert 语义（`LauncherSearchPanel.floor-height.test.ts`）。
- **目前缺少**对“Review 打开不应改变窗口宽度/最小宽度”的单测断言（`resolveWindowWidth` 现未被 width 维度测试覆盖）。
- 建议在 Phase 17 计划里加入：
  - 对 `useLauncherLayoutMetrics.minShellWidth` 与 `shellGap` 在 `stagingExpanded=true` 下的断言（不应引入额外宽度）。
  - 对 `resolveWindowWidth()` 在 `stagingExpanded=true` 下的断言（宽度不应叠加 `reviewWidth`）。
  - 组件级 smoke：Review 打开时 `.review-overlay` 的定位范围应仅在 `.search-main` 内容区（可用 wrapper DOM 结构断言或 class 断言）。

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | 直接从 `package.json` 与现有代码确认版本与测试栈 |
| Existing Code Map | HIGH | 关键文件与逻辑点已在仓库中明确定位 |
| Implementation Direction | HIGH | 现有 `reviewWidth`、状态机、scrim/focus/inert 均可复用，只需“结构归位 + 去宽度链路” |
| UX Edge Cases | MEDIUM | “点击非内容区”应关闭还是隐藏窗口需要产品确认；窄宽覆盖比例需回归验证 |

## Open Questions（需要在 plan-phase 前/计划内明确）

1) Review 打开时，点击 search-shell 的“非 search-main 区域”（若存在）应该：A. 关闭 Review；B. 隐藏窗口（现状）；还是 C. 不响应？
2) `resolveSearchMainWidth()` 是否要移除对 “open layout 预留 review max width” 的扣减？（若保留会让窗口偏窄，但不违反约束；若移除会提升可读性与一致性。）
3) 是否需要在 CSS 层面确保 drawer 宽度不超过容器（例如 `max-width: 100%`），以避免未来常量变更引入溢出？

