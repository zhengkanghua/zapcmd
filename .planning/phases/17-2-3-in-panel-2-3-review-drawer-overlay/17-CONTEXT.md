# Phase 17: 面板内 2/3 覆盖抽屉（in-panel 2/3 review drawer overlay）- Context

**Gathered:** 2026-03-10  
**Status:** Ready for planning

<domain>
## Phase Boundary

把 Review（暂存队列）从“右侧独立列/窗口变宽的分离抽屉感”回归为**同一张搜索面板内部**的抽屉式 overlay：
- 抽屉只出现在**搜索框下方内容区**（结果抽屉区域），不覆盖搜索框；
- 三层结构固定：结果层 → 轻遮罩层 → 抽屉层；
- 抽屉从右向左滑入，覆盖内容区宽度约 **2/3**（允许 clamp 以保证可读性）；
- 点击遮罩关闭抽屉；关闭后焦点回到搜索输入框；
- 动画顺滑，并保留 `prefers-reduced-motion` 降级。

不做范围扩展（例如 push/挤压式布局、Alfred 式右侧预览分栏等）。

</domain>

<decisions>
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

</decisions>

<specifics>
## Specific Ideas

- 期望观感参考：Raycast/Alfred（同面板内、搜索框下方抽屉式 overlay），避免当前“右侧独立卡片/分离露底”的效果（见 `docs/bug_img/image1.png`）。
- 抽屉覆盖目标：从右向左覆盖 2/3，左侧保留可见上下文（遮罩下可见查询结果轮廓与内容）。

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/launcher/parts/LauncherReviewOverlay.vue`：已有 scrim（button）关闭语义、Tab focus trap、`onScrimWheel` 滚动列表、打开时聚焦 active card 的行为，可复用到“面板内抽屉”形态。
- `src/components/launcher/parts/LauncherSearchPanel.vue`：结果区已支持 `inert/aria-hidden` 锁定；并有“点击搜索框区域关闭 Review”的现成语义（pointerdown capture）。
- `src/styles.css`：已有 review opening/closing 的动画 keyframes 与 200ms 时长基线，可迁移到新 overlay 的定位与尺寸口径上。

### Established Patterns
- Review 打开时背景“可见但不可交互”：使用 `inert` + `aria-hidden` 的组合信号。
- scrim 作为关闭入口（button + aria-label），并避免吞掉 drag strip（历史约束）。
- 通过 `stagingDrawerState` 驱动 opening/closing 样式与 pointer-events 控制。

### Integration Points
- `src/components/launcher/LauncherWindow.vue`：当前 Review overlay 挂在 `search-shell` 内，且依赖 `search-shell--staging-wide` 的两列布局；Phase 17 需要把 overlay 迁移为“search-main 内容区内的 2/3 抽屉”。
- `src/composables/launcher/useLauncherLayoutMetrics.ts`：当前会计算 `--review-width`、`minShellWidth` 并在 `stagingExpanded` 时把 reviewWidth 纳入最小宽度；新契约要求 Review 打开时窗口宽度不变，因此需要调整相关口径（planner/researcher 需评估最小改动面）。
- `src/composables/launcher/useWindowSizing/calculation.ts`：当前 `resolveWindowWidth` 在 `stagingExpanded` 时把 `--review-width` 加入窗口宽度计算；Phase 17 需要移除/改写该宽度扩展逻辑（保持高度测量与引用 `stagingPanelRef` 的兼容）。

</code_context>

<deferred>
## Deferred Ideas

- 挤压式（push）抽屉（会涉及长命令在窄栏下的展示策略）— 单独 phase 讨论。
- Alfred 式“列表 + 右预览”分栏信息架构 — 单独 phase 讨论。

</deferred>

---

*Phase: 17-2-3-in-panel-2-3-review-drawer-overlay*  
*Context gathered: 2026-03-10*

