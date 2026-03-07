# 10. B4 Component Architecture

> 本文定义 B4 方案在 Vue 组件层与 composable 层的推荐拆分方式。
> 目标是：在进入实现前，先把“谁负责什么、什么状态放哪里、哪些组件该新增/复用/废弃”写清楚。

## 文档目标

本文回答 5 个问题：

1. 当前 launcher / settings 的组件树长什么样
2. B4 目标结构下，主窗口应该拆成哪些组件
3. 哪些状态应该继续复用，哪些状态建议新增
4. 旧 staging 组件如何迁移到 Review Overlay 结构
5. Settings 第二波重构时推荐的组件边界是什么

## 当前 launcher 组件树（真实代码基线）

### 当前主窗口壳层
- `src/components/launcher/LauncherWindow.vue`
  - `LauncherSearchPanel.vue`
  - `LauncherStagingPanel.vue`
  - `LauncherParamOverlay.vue`
  - `LauncherSafetyOverlay.vue`

### 当前状态相关 composable
- `src/composables/launcher/useLauncherSearch.ts`
- `src/composables/launcher/useStagingQueue/index.ts`
- `src/composables/launcher/useLauncherLayoutMetrics.ts`
- `src/composables/launcher/useLauncherDomBridge.ts`
- `src/composables/launcher/useLauncherVisibility.ts`
- `src/composables/launcher/useMainWindowShell.ts`
- `src/composables/execution/useCommandExecution/index.ts`

### 当前判断
- 现在的组件树是围绕“左搜索 + 右 staging 并列”设计的。
- B4 下，`LauncherStagingPanel.vue` 这个组件名与角色都会逐渐失真。

## B4 目标 launcher 组件树（推荐）

推荐未来收敛为：

- `LauncherWindow.vue`
  - `LauncherSearchShell.vue`
    - `LauncherSearchPanel.vue`
    - `LauncherQueueSummaryPill.vue`
    - `LauncherSearchDrawerFiller.vue`
  - `LauncherReviewOverlay.vue`
    - `LauncherReviewHeader.vue`
    - `LauncherReviewList.vue`
    - `LauncherReviewCard.vue`
    - `LauncherReviewFooter.vue`
  - `LauncherParamOverlay.vue`
  - `LauncherSafetyOverlay.vue`

## 这个结构的核心逻辑

### `LauncherSearchShell.vue`
职责：
- 承载搜索输入、结果列表、drag strip、背景 dim 前的主 shell
- 在 Review 打开时作为“背景上下文层”存在
- 管理 `search drawer filler` 的展示

### `LauncherReviewOverlay.vue`
职责：
- 承担 B4 的核心 Review 交互层
- 只在 Review 态挂载或可见
- 管理右侧滑入、内部滚动、背景锁定语义

### `LauncherQueueSummaryPill.vue`
职责：
- 在搜索态显示“队列已存在”的轻量摘要入口
- 是进入 Review 的主视觉入口之一

### `LauncherSearchDrawerFiller.vue`
职责：
- 只负责“抽屉高度补足到 floor height”的视觉层
- 不承载真实结果数据
- 不出现在键盘焦点链中

## 状态归属建议

## 1. 应继续由组合根持有的状态

这些状态仍适合留在 `useAppCompositionRoot` / `viewModel`：

- `query`
- `filteredResults`
- `activeIndex`
- `stagedCommands`
- `pendingCommand`
- `safetyDialog`
- `executionFeedbackMessage`
- `executionFeedbackTone`
- `settingsRoute`
- `settingsSaved`
- `settingsError`

原因：
- 它们要跨多个 UI 层复用
- 已经是应用级状态，不值得拆碎

## 2. 建议新增的 B4 局部状态

建议新增一个新的 Review 相关 composable，例如：

- `useLauncherReviewMode.ts`

建议由它持有：

- `reviewOverlayState`
- `reviewBackgroundLocked`
- `drawerFloorHeight`
- `searchDrawerFillerHeight`
- `reviewLastOrigin`
- `reviewShouldRestoreSearchFocus`

原因：
- 这些状态是 B4 特有的
- 不应该继续混在旧 `stagingDrawerState` 语义里越滚越大

## 3. 继续复用但语义逐渐迁移的状态

这些状态建议第一阶段继续复用，但文档与后续实现要有迁移意识：

- `stagingExpanded`
- `stagingDrawerState`
- `focusZone`
- `stagingActiveIndex`

原因：
- 第一阶段不值得一口气全量重命名
- 但在组件结构上，应尽量让它们更多对应 Review 行为

## 组件职责与边界表

| 组件 / 模块 | 主要职责 | 不负责什么 |
|-------------|----------|------------|
| `LauncherWindow.vue` | 顶层编排和层级挂载 | 不直接写复杂业务规则 |
| `LauncherSearchShell.vue` | 搜索态壳层、drag strip、背景层 | 不负责队列执行逻辑 |
| `LauncherSearchPanel.vue` | 搜索输入、结果列表、结果点击 | 不负责 Review 状态切换策略 |
| `LauncherQueueSummaryPill.vue` | 进入 Review 的轻量入口 | 不负责 Review 详情渲染 |
| `LauncherSearchDrawerFiller.vue` | 补足抽屉 floor height | 不渲染任何假结果 |
| `LauncherReviewOverlay.vue` | Review 的主交互层 | 不负责终端执行底层实现 |
| `LauncherReviewCard.vue` | 单条队列项展示与局部交互 | 不负责全局排序策略 |
| `LauncherParamOverlay.vue` | 参数输入阻断层 | 不负责 Review 布局 |
| `LauncherSafetyOverlay.vue` | 风险确认阻断层 | 不负责搜索结果逻辑 |

## 旧组件迁移建议

## `LauncherStagingPanel.vue`

当前功能包含：
- 队列切换入口
- 队列列表
- 队列卡片
- 清空/执行全部 footer
- drag header

B4 推荐迁移方向：

### 第一阶段
- 不急着删除文件
- 可以把它内部逐步重构为 `Review Overlay` 的主体
- 也可以先复制为新文件 `LauncherReviewOverlay.vue`，降低迁移耦合

### 推荐策略
更推荐：
- 新建 `LauncherReviewOverlay.vue`
- `LauncherStagingPanel.vue` 保留作为对照参考
- 等 B4 稳定后再移除旧组件

原因：
- 避免边改边把旧并列布局和新 overlay 逻辑缠在一起
- 更利于测试与回滚

## `LauncherSearchPanel.vue`

建议保留，但扩职责：
- 继续负责结果列表
- 增加 `filler` 挂点
- 增加 queue summary pill 的插槽或挂载位
- 增加 Review 打开时的背景不可交互视觉态

## 推荐新增的 composable

## 1. `useLauncherReviewMode.ts`
职责：
- 管理 Review 的 open / preparing / opening / closing / closed
- 计算 B4 打开时的目标高度
- 驱动 `searchDrawerFillerHeight`
- 管理背景锁定状态
- 提供 `openReview()` / `closeReview()`

## 2. `useLauncherReviewFocus.ts`
职责：
- 管理 Review 内部初始焦点
- 管理关闭 Review 后的焦点恢复
- 管理 Review 内 `Tab` 循环逻辑（若不继续内联在组件中）

## 3. `useLauncherReviewLayout.ts`
职责：
- 管理 Review 宽度、最小高度、内部滚动策略
- 抽离与 `useLauncherLayoutMetrics.ts` 的 B4 相关逻辑

## B4 进入实现阶段时的组件优先顺序

### 第一批
- `LauncherReviewOverlay.vue`
- `LauncherQueueSummaryPill.vue`
- `LauncherSearchDrawerFiller.vue`
- `useLauncherReviewMode.ts`

### 第二批
- `LauncherReviewCard.vue`
- `LauncherReviewList.vue`
- `useLauncherReviewFocus.ts`

### 第三批
- `LauncherSearchShell.vue`
- 对 `LauncherWindow.vue` 做最终收口

## Settings 推荐组件边界（第二波）

当前 Settings 已经有分段组件，这是优点，应继续保留。

### 推荐未来结构
- `SettingsWindow.vue`
  - `SettingsHeader.vue`（建议新增）
  - `SettingsNav.vue`
  - `SettingsPageShell.vue`（建议新增）
  - `SettingsHotkeysSection.vue`
  - `SettingsGeneralSection.vue`
  - `SettingsCommandsSection.vue`
  - `SettingsAppearanceSection.vue`
  - `SettingsAboutSection.vue`
  - `SettingsFooterBar.vue`（建议新增）

### 为什么建议新增 `Header` / `PageShell` / `FooterBar`
- 当前 Settings 的“可用但不高级”问题，本质是壳层信息架构太薄
- 不是 section 组件不够，而是缺“总层级组件”

## Props / Emits 迁移原则

### 原则 1：先兼容旧 props，新增 B4 props
例如：
- 继续保留 `stagingExpanded`
- 同时引入 `reviewOverlayState`

### 原则 2：不要让 filler 假装成结果数据
- `LauncherSearchPanel` 不应收到“假的 `filteredResults`”
- filler 必须是独立 prop，例如：
  - `drawerFillerHeight`
  - `drawerHasFloorProtection`

### 原则 3：Review 与 Search 的事件分开
避免继续混成旧 staging 语义：
- `open-review`
- `close-review`
- `focus-review-list`
- `remove-review-item`
- `execute-review`

## 代码阶段的落地建议

### 先做壳层
先把结构和状态机接对，不要先改所有细部卡片。

### 再做卡片
等 Review Overlay 稳定后，再细修长命令展示、参数布局、meta badge。

### 最后收命名
命名迁移是最后一步，不是第一步。
