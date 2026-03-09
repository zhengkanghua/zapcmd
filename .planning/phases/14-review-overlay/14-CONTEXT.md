# Phase 14: Review Overlay 结构接入 - Context

**Gathered:** 2026-03-08  
**Status:** Ready for planning

<domain>
## Phase Boundary

本 Phase 交付：

- 将 launcher 主窗口从“左搜索 + 右侧常驻并列 staging”迁移为 **B4 Review overlay**（Review 成为打开后的唯一可交互层）。
- 建立 **背景锁定**：Review 打开后背景可见但不可交互（不可点击/滚动/聚焦）。
- 建立更宽的 Review 阅读面板（**宽度不固定**：按“搜索区宽度 × 比例”计算，并 clamp 到 `420px~480px` 的可读范围）。
- Review 内部列表在面板内滚动（Header/Footer 固定），避免队列项把窗口持续拉高。
- Review 打开时 **顶部 drag strip 仍可用**，且不被遮罩/overlay 吞掉。

本 Phase 不交付：

- 键盘 / 焦点 / Esc 分层后退语义的最终收口（Phase 15）
- 动画与新视觉系统的整体打磨（Phase 16）

</domain>

<decisions>
## Implementation Decisions

### 入口与关闭

- 入口形态：使用 **搜索区内的 queue summary pill** 作为主要入口（而不是右侧常驻 staging chip）。
- 显示时机：**仅队列非空**时显示 pill；空队列时不占位。
- 关闭方式：Review 面板内提供明确的 **关闭按钮**；同时支持 **点击 dim/遮罩区域关闭**。
- 背景锁定的视觉提示：采用 **轻 dim**（背景仍可读，但明确不可交互），不引入 blur。

### Overlay 形态

- 面板宽度：按 **搜索区宽度 `searchMainWidth` × 比例**计算；推荐比例 `2/3`（`0.67`），并 **clamp 到 `420px~480px`**。
- 魔法值处理：`2/3`、`420`、`480` 不要散落在组件/CSS 内写死；实现时抽成 **命名常量** 并集中到可统一配置的位置（后续要调参只改一处）。同时本 Phase 内所有新增/改动到的 **Review overlay 相关静态值**（如 dim 强度、间距、最小高度等）遵循同一规则；但**不做全局“扫仓库搬家式”常量重构**（避免引入无关回归）。
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

</decisions>

<specifics>
## Specific Ideas

- Review overlay 是从搜索上下文进入的“右侧阅读面板”，并且是当前唯一可交互层。
- dim/遮罩只作用于内部 shell（不做整窗遮罩），以保持圆角/透明外观的一致性。

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets

- `src/components/launcher/LauncherWindow.vue`：现有 shell（含 `shell-drag-strip`）+ Search/Staging/Overlay 的挂载编排点。
- `src/components/launcher/parts/LauncherStagingPanel.vue`：已有队列入口（chip）+ 队列列表/卡片/清空与执行 footer，可作为 Review UI 的迁移参考。
- `src/components/launcher/parts/LauncherSearchPanel.vue`：已有结果抽屉 + `drawerFillerHeight`（floor height 的视觉补足能力）。
- `docs/ui-redesign/08-b4-interaction-state-machine.md`：B4 交互/层级优先级与状态机的契约基线。
- `docs/ui-redesign/10-b4-component-architecture.md`：B4 推荐组件拆分（queue summary pill / review overlay / filler 等）。

### Established Patterns

- Drag/no-drag：通过 `data-tauri-drag-region` 与 CSS `app-region` 约束拖拽区与交互区边界。
- Search shell 布局：`.search-shell` 使用 CSS grid 管理主区与右侧区域；`stagingExpanded` 目前驱动宽度变化。

### Integration Points

- `stagingExpanded` / `stagingDrawerState` / `focusZone`：当前语义偏旧 staging，Phase 14 先以“Review overlay”语义接入，命名收口留到后续阶段。
- `useLauncherHitZones`（root pointerdown）：Review 打开后，遮罩/overlay 需要纳入“可交互层”，避免被当作 blank 点击导致隐藏主窗。
- `shell-drag-strip`：Review overlay 不能吞掉顶部拖拽区命中，且 dim/遮罩需要与 drag 语义兼容。

</code_context>

<deferred>
## Deferred Ideas

- 键盘 / 焦点 / Esc 分层后退语义的最终收口（Phase 15）
- 动画与新视觉系统整体打磨（Phase 16）

</deferred>

---

*Phase: 14-review-overlay*  
*Context gathered: 2026-03-08*
