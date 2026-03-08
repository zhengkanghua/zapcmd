# 05. Code Impact Map

> 本文基于当前仓库真实结构，评估如果采用 **B4：Overlay Review Mode with Floor Height Protection**，哪些模块会受影响。

## 总体判断

如果采用 B4：

- **视觉层面**：高影响
- **布局 / 窗口尺寸层**：高影响
- **键盘 / 焦点契约层**：中高影响
- **执行逻辑层**：中低影响
- **Rust / Tauri 后端层**：低影响

换句话说：

这次改动不小，但主要是 **前端 shell 重构**，不是执行链路重写。

## 高影响模块

## 1. 主窗口壳层编排

核心文件：

- `src/App.vue`
- `src/components/launcher/LauncherWindow.vue`
- `src/components/launcher/types.ts`
- `src/styles.css`

### 为什么会受影响
- 当前主窗口将 `LauncherSearchPanel` 与 `LauncherStagingPanel` 并列挂在同一个 shell 中。
- B4 要改成：
  - 搜索态保持主舞台
  - Review 态通过内部 Overlay 出现
  - 背景可见但不可交互

### 当前代码证据
- `LauncherSearchPanel` / `LauncherStagingPanel` 共同挂载：`src/components/launcher/LauncherWindow.vue`
- `search-shell` 当前是两列 grid：`src/styles.css`

### 设计后果
- 不能继续沿用“右侧永远参与布局”的壳层结构
- 需要把 Review 从“常驻并列面板”改成“按需覆盖层”

## 2. 窗口尺寸与高度估算层

核心文件：

- `src/composables/launcher/useLauncherLayoutMetrics.ts`
- `src/composables/launcher/useWindowSizing/calculation.ts`
- `src/composables/launcher/useWindowSizing/controller.ts`
- `src/composables/launcher/useWindowSizing/model.ts`

### 为什么会受影响
B4 的核心不是“右侧滑出”本身，而是：

- 搜索态高度动态
- Review 态有最小高度保护
- 左侧搜索抽屉需要视觉 floor height
- 高度比较不能把拖拽区错误计入内容区

### 当前实现现状
- `drawerOpen` 与 query 联动：`src/composables/launcher/useLauncherLayoutMetrics.ts`
- `drawerViewportHeight` 跟结果行数联动：`src/composables/launcher/useLauncherLayoutMetrics.ts`
- `resolveWindowSize()` 最终把抽屉高度与 staging 高度一起算进窗口：`src/composables/launcher/useWindowSizing/calculation.ts`

### B4 需要新增/重构的概念
- `drawerFloorHeight`（由“4 条结果高度 + 搜索框高度”计算，不写死 px）
- `searchDrawerFillerHeight`
- `reviewOverlayOpen`
- `reviewTargetContentHeight`
- `reviewPanelWidth`

### 风险点
- 如果继续沿用当前“结果多少就只给多少内容高度”，Review 会在 1 条结果时显得过矮
- 如果直接用假数据结果补高度，会污染键盘导航和测试

## 3. 拖拽区 / shell 可视层级

核心文件：

- `src/components/launcher/LauncherWindow.vue`
- `src/styles.css`
- `src/composables/launcher/useWindowSizing/calculation.ts`

### 为什么会受影响
B4 已明确要求：

- 搜索框上方拖拽区不计入 Review 内容下限
- 遮罩不能作用于整个原生窗口，只能作用在内部 shell

### 当前代码证据
- `shell-drag-strip` 存在独立拖拽区：`src/components/launcher/LauncherWindow.vue`
- `data-tauri-drag-region` 已明确拖拽语义：`src/styles.css`
- 窗口高度测量中存在 `topOffset` 与内容 bottom 的分离：`src/composables/launcher/useWindowSizing/calculation.ts`

### B4 的具体要求
- 保留 `shell-drag-strip`
- Review Overlay 不覆盖或吞掉拖拽区语义
- dim / blur / overlay 只能在内部圆角 shell 中做

## 中影响模块

## 4. staging / review 状态机

核心文件：

- `src/components/launcher/parts/LauncherStagingPanel.vue`
- `src/composables/launcher/useStagingQueue/index.ts`
- `src/composables/launcher/useStagingQueue/drawer.ts`
- `src/composables/launcher/useStagingQueue/model.ts`
- `src/composables/launcher/useStagingQueue/focus.ts`
- `src/composables/launcher/useStagingQueue/guards.ts`

### 为什么会受影响
- 当前 `stagingExpanded / stagingDrawerState` 语义是“右侧队列栏打开/关闭”。
- B4 下，它更接近“Review Overlay 打开/关闭”。

### 判断
- 状态机本身可以复用不少
- 但其命名与挂载位置会越来越不准确

### 推荐策略
- 第一阶段允许 `staging` 语义继续存在
- 先把视觉和壳层改对
- 第二阶段再考虑是否统一重命名为 `review`

## 5. 键盘与焦点契约

核心文件：

- `src/composables/app/useAppWindowKeydown.ts`
- `src/features/hotkeys/windowKeydownHandlers/main.ts`
- `src/features/hotkeys/windowKeydownHandlers/types.ts`

### 为什么会受影响
- 当前 `Ctrl+Tab` 更像“切到 staging 焦点”
- B4 下它要升级为“进入 Review Overlay”
- Review 打开后，背景不可操作，因此键盘焦点必须被锁入 overlay 范围

### 会改什么
- `switchFocusWithStagingOpen()` 的语义将变化
- `focusZone = search | staging` 可能继续暂时保留，但实际体验会更接近“search vs review overlay”
- `Esc` 的层级也会增加一层：Review Overlay

## 6. 主搜索结果区

核心文件：

- `src/components/launcher/parts/LauncherSearchPanel.vue`

### 为什么会受影响
- B4 中左侧结果区不仅是内容区，还是 Review 的背景上下文区
- 当结果不足 4 条时，需要补“视觉 floor filler”，但不能补假结果 DOM

### 需要的新增能力
- 结果抽屉支持最小可视高度
- 支持 filler / spacer 层
- 支持 Review 打开时的背景不可交互视觉状态

## 7. 文案与 i18n

核心文件：

- `src/i18n/messages.ts`

### 为什么会受影响
- 需要把“暂存区 / 队列切换”文案升级为更清晰的 Review / Queue Summary 语义
- 需要新增：
  - `queued` 摘要文案
  - Review 标题 / 描述文案
  - 关闭 Review / 返回搜索态提示

## Settings 重构影响面

### 高影响
- `src/components/settings/SettingsWindow.vue`
- `src/components/settings/parts/SettingsNav.vue`
- `src/components/settings/parts/SettingsHotkeysSection.vue`
- `src/components/settings/parts/SettingsGeneralSection.vue`
- `src/components/settings/parts/SettingsCommandsSection.vue`
- `src/components/settings/parts/SettingsAppearanceSection.vue`
- `src/components/settings/parts/SettingsAboutSection.vue`
- `src/styles.css`

### 判断
- Settings 与 B4 主结构无强耦合
- 但会跟随新的颜色系统、表面层级和图标规则进行第二波重构

## 中低影响模块

## 8. 执行逻辑层

核心文件：

- `src/composables/execution/useCommandExecution.ts`
- `src/composables/launcher/useTerminalExecution.ts`
- `src/features/launcher/types.ts`

### 判断
- 加入队列、排序、删除、参数填写、执行全部这些核心能力仍成立
- 变化主要在“怎么呈现”和“什么时候成为主交互层”
- 因此业务执行逻辑大体可复用

## 测试影响面

### 高概率要改
- `src/__tests__/app.hotkeys.test.ts`
- `src/__tests__/app.settings-hotkeys.test.ts`
- `src/__tests__/app.failure-events.test.ts`
- `src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts`
- `src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`
- `src/composables/__tests__/launcher/useMainWindowShell.test.ts`

### 原因
- 当前测试默认 staging 是并列右栏
- B4 会把它改成带 floor height 的 Review Overlay
- 尺寸估算、类名、焦点路径、Esc 行为都要同步更新

## 大概率不需要改动的区域

- Rust 命令实现
- Tauri 插件接入
- 更新器底层逻辑
- 自动启动底层逻辑
- 命令目录 schema
- 命令导入解析规则

## 建议新增的抽象

### 可能新增的 UI 抽象
- `LauncherReviewOverlay.vue`
- `LauncherQueueSummaryPill.vue`
- `LauncherDrawerFiller.vue`

### 可能新增的布局抽象
- `useLauncherReviewLayout.ts`
- `reviewTargetContentHeight`
- `drawerFloorHeight`
- `reviewOverlayOpen`

### 命名策略
- 第一阶段允许 `staging` 与 `review` 并存
- 等壳层稳定后，再决定是否统一做 staging -> review 命名迁移

## 迁移原则

### 原则 1：先换壳，不动执行核心
- 先让主窗口结构和视觉语义正确
- 尽量复用 `useCommandExecution`

### 原则 2：先实现 floor protection，再做大动画
- 先把高度和 overlay 逻辑做稳
- 再决定是否保留实时动态 resize

### 原则 3：遮罩只在内部 shell
- 绝不做整窗遮罩
- 必须保住圆角、透明和拖拽区边界的完整性

### 原则 4：先主窗口，再 Settings
- 主窗口是这次结构重构的核心
- Settings 第二波跟随新的设计系统迁移即可
