# 队列与暂存区图标按钮 UI 微调设计稿（无发光）

日期：2026-03-11  
范围：启动器主窗口（搜索条）与队列/暂存区面板（Review Overlay）

## 背景

当前主窗口队列入口与暂存区面板操作按钮以文字为主，识别效率一般、占用空间偏大。希望将关键入口与高频操作改为“可识别的小图标”，并在队列有命令时展示数量，提升信息密度与可扫读性。

## 目标

- 主窗口队列入口改为小图标按钮，队列有命令时展示数量徽标（badge）。
- 暂存区面板按钮（关闭/复制/移除/清空）改为纯图标按钮，保留无障碍与悬浮提示。
- 暂存区面板左上角“队列 + 数量”改为紧凑“小 Tab”样式，并放在热键提示文本之前。
- 本次不引入发光效果，保持整体极简、克制。

## 非目标

- 不调整队列/暂存区的数据结构、执行逻辑与热键行为。
- 不做主题体系重构（颜色仍沿用现有 `--ui-*` 变量与按钮语义）。

## 现状定位（实现锚点）

以下是当前 UI 的主要落点（用于后续实现定位）：

- 主窗口搜索条右侧队列入口：`src/components/launcher/parts/LauncherQueueSummaryPill.vue`
- 队列/暂存区面板（Review Overlay）：`src/components/launcher/parts/LauncherReviewOverlay.vue`
- 队列抽屉侧栏（staging panel）现有“图标 + 数量”按钮：`src/components/launcher/parts/LauncherStagingPanel.vue`
- 全局样式：`src/styles.css`
- i18n 文案（无障碍标签等）：`src/i18n/messages.ts`

## 设计方案（已确认）

采用“方案 1：IconButton + 内联 SVG 图标集”：

- 新增一套可复用的“图标按钮”形态（可用组件或 class 组合实现，优先遵循现有 `<button class="btn-*>` 风格）。
- 图标使用内联 SVG（`currentColor`），统一尺寸与线条风格。

## 交互与布局细节

### 1) 主窗口：队列入口按钮（搜索条右侧）

- **常驻显示**：即使队列为空也显示队列图标按钮（不再依赖 `count > 0` 才渲染）。
- **数量徽标**：仅当 `count > 0` 时显示；空队列不显示徽标。
- **点击行为**：点击切换队列面板（与当前一致）。
- **无障碍**：按钮 `aria-label` 继续使用现有 `launcher.queueToggleAria`（包含 `{count}`），并补充 `title` 提示。

徽标显示规则：

- `1–99`：显示具体数字
- `>= 100`：显示 `99+`

无障碍约束：

- 读屏应始终使用真实的 `count`（不截断）；可视徽标本体建议 `aria-hidden="true"`，避免读屏读出“99+”造成误解。

### 2) 暂存区面板：顶部信息区（“队列 + 数量” + 热键提示）

目标是把“队列 {count}”从单独一行的标题感，收敛为更紧凑的 Tab 形态：

- 左侧：一个“小 Tab”（队列图标 + 数量徽标/或紧邻数字）
- 左侧：一个“小 Tab”（仅数量徽标/或紧邻数字）
- 右侧：热键提示（如 `Ctrl+Tab 切焦点`）保持原文案
- **排列顺序**：Tab 在前、热键提示在后，同一行对齐

说明：

- 本次明确 **不加发光**；Tab 仅使用边框/底色/轻微 hover 态体现“可见”。
- Tab 作为信息展示与视觉锚点，**不承担交互**（默认光标，不参与键盘 focus，不新增点击行为）。

### 3) 暂存区面板：操作按钮改为纯图标

将以下文字按钮替换为纯图标按钮（不显示文字）：

- 关闭：`X` 图标
- 复制：Copy 图标
- 移除：`X` 图标（danger 语义）
- 清空：Trash 图标（danger 或 warn 语义；默认按 danger 处理以降低误触）

约束：

- **保留语义与可访问性**：每个按钮必须有 `aria-label`（使用现有 i18n key：`common.close` / `common.copy` / `common.remove` / `common.clear`），并提供 `title` 作为悬浮提示。
- **点击热区**：纯图标按钮仍保持可点面积（建议最小 28×28），避免难点。

## 视觉规范（无发光）

### IconButton（图标按钮）建议规范

- 尺寸：`28×28`（`btn-small` 场景可 `26×26`）
- 图标：`16×16`（或 `14×14` 用于极紧凑区域）
- 颜色：继承按钮语义色（muted/primary/danger）
- Hover：轻微背景变化（沿用现有按钮 hover 逻辑即可）
- Focus：必须有清晰 `:focus-visible` 边框/描边（沿用现有 focus 规则）
- Disabled：遵循现有 `disabled` 外观（降低不透明度 + 禁用 pointer）

### 小 Tab（队列信息 Tab）

- 形态：圆角矩形（与现有 pill/按钮圆角一致即可）
- 内容：仅数量徽标（`count`）
- 颜色：使用 muted 风格（边框/背景低对比），避免抢过搜索结果

## 图标（内联 SVG）规范

- `viewBox="0 0 24 24"`，通过 `width/height` 控制到 16px
- `fill="none"`，`stroke="currentColor"`，`stroke-width` 统一（建议 2）
- `stroke-linecap="round"`，`stroke-linejoin="round"`
- 视觉含义：
  - Queue：建议使用“列表/堆叠”隐喻（3 条横线 + 小方块或叠层）
  - Copy：双纸张/双矩形重叠
  - Trash：垃圾桶轮廓
  - X：两条交叉线（用于 close/remove）

## 文案与 i18n

- 不新增必需文案；优先复用：
  - `launcher.queueToggleAria`
  - `launcher.queueTitle`
  - `common.close` / `common.copy` / `common.remove` / `common.clear`
- 仅在实现中确有需要（例如徽标的 `99+` 读屏）才补充 i18n key。

## 边界与风险

- 主窗口队列入口从“仅有命令时显示”改为“始终显示”，属于轻微行为变化；需确认不会误导用户（通过空队列点击可看到空态提示来闭环）。
- 纯图标按钮需要更严格的 `aria-label` 与足够点击面积，否则易影响可用性。

## 验收与测试清单（手动）

1. 队列为空时：主窗口仍显示队列图标按钮；无数字徽标；点击打开面板后展示空态文案。
2. 队列为 1/9/10/99/100+：徽标分别正确显示 `1/9/10/99/99+`。
3. 面板头部：小 Tab 在左、热键提示在右；整体不额外换行；不出现发光效果。
4. “关闭/复制/移除/清空”均为纯图标按钮：
   - 悬浮有 `title` 提示
   - 读屏/无障碍标签正确（`aria-label`）
   - 键盘 Tab 可聚焦，focus 样式清晰
5. 复制按钮：点击仍能复制命令（失败时保持现有 console error 行为）。
6. 移除与清空：行为与当前一致（仅 UI 变化）。

## 实施建议（进入计划阶段前的约束）

- 优先复用现有按钮 class（`btn-muted/btn-danger/btn-small`），在此基础上添加 `btn-icon`（或等价）修饰，避免重造按钮体系。
- 图标 SVG 建议集中在一个小模块（例如 `src/components/launcher/parts/icons.ts` 或等价位置）以避免重复定义。
