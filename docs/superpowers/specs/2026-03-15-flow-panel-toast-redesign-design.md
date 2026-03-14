# 执行流面板重构与 Toast 系统补全 — 设计文档

> 日期: 2026-03-15
> 状态: approved
> 范围: Launcher 主窗口执行流面板 UI 重构 + Toast 反馈补全 + 主题审计

---

## 1. 背景与目标

黑曜石主题系统已落地，但执行流（原 Review Overlay）存在以下问题：

1. **Toast 缺失**：命令入队、删除卡片、清空队列、安全确认通过等操作无反馈
2. **Toast 主题对齐**：部分 toast 可能残留硬编码色值，未完全接入 `--ui-*` 变量
3. **面板覆盖范围不足**：当前 ReviewOverlay 仅覆盖搜索框下方的结果区域，与搜索框割裂
4. **卡片参数交互笨重**：参数始终展示完整输入框，占用空间大
5. **缺少拖拽排序**：FlowPanel 中需要继承拖拽能力

### 目标

- 补全所有缺失的 toast 反馈，审计全部 toast 确保主题系统对齐
- 将 ReviewOverlay 重构为 FlowPanel，覆盖 search-shell 全高（含搜索框）
- 卡片参数改为紧凑标签展示 + 点击展开编辑 + 命令预览
- 保留整卡片拖拽排序

---

## 2. Toast 系统补全

### 2.1 新增 Toast

| 操作 | 语气 | 文案 | 自动消失 |
|------|------|------|----------|
| 命令入队（stage） | `success` | `launcher.flowAdded` — "已加入执行流" | 3s |
| 删除卡片 | `neutral` | `launcher.flowRemoved` — "删除成功" | 3s |
| 清空队列 | `neutral` | `launcher.flowCleared` — "已清空 {n} 个节点" | 3s |
| 安全确认通过 | `success` | `launcher.executionStarted` — "开始执行" | 3s |

### 2.2 入队双重反馈

命令入队时同时触发：

1. 现有 `stagedFeedback` 行高亮闪烁动画（220ms）— 保留不变
2. 顶部 toast "已加入执行流" — 新增

### 2.3 Toast 触发点

| 触发位置 | 修改内容 |
|----------|----------|
| `helpers.ts` — `appendToStaging()` | 在 push 后调用 `setExecutionFeedback("success", t("launcher.flowAdded"))` |
| `actions.ts` — `removeStagedCommand()` | 调用 `setExecutionFeedback("neutral", t("launcher.flowRemoved"))` |
| `actions.ts` — `clearStaging()` | 调用 `setExecutionFeedback("neutral", t("launcher.flowCleared", { n: count }))` |
| `helpers.ts` — `executeSingleCommand()` 执行前 | 调用 `setExecutionFeedback("success", t("launcher.executionStarted"))` |
| `actions.ts` — `runStagedSnapshot()` 执行前 | 调用 `setExecutionFeedback("success", t("launcher.executionStarted"))` |

> **注意**："开始执行" toast 在执行流程开始前触发（而非在 `state.ts` 的 `confirmSafetyExecution` 中），
> 这样无论是直接执行还是安全确认后执行都会出现。该 toast 是过渡性反馈，
> 会被后续的执行成功/失败 toast 自然替换（`setExecutionFeedback` 内部会先清除前一个定时器再设新值）。

### 2.4 国际化 keys

`messages.ts` 新增：

```typescript
// zh
launcher: {
  flowAdded: "已加入执行流",
  flowRemoved: "删除成功",
  flowCleared: "已清空 {n} 个节点",
  executionStarted: "开始执行",
}
// en
launcher: {
  flowAdded: "Added to flow",
  flowRemoved: "Removed",
  flowCleared: "Cleared {n} node(s)",
  executionStarted: "Execution started",
}
```

### 2.5 主题审计

审查范围：

| 文件 | 审查项 |
|------|--------|
| `shared.css` | `.execution-toast` 及 `--neutral`/`--success`/`--error` 三变体 |
| `launcher.css` | `.staging-card`、`.review-card`、`.review-panel`、`.queue-summary-pill` |
| `settings.css` | 设置窗口 toast 样式 |
| `animations.css` | `toast-slide-down`、`toast-auto-dismiss` 关键帧 |

目标：0 处**语义色值**硬编码，全部引用 `--ui-*` 语义变量。纯装饰性的半透明覆盖层（如毛玻璃背景的 `rgba()` 值）允许保留，不强制替换为变量。

已知硬编码色值需处理：
- `LauncherReviewOverlay.vue` 第 224 行：`color: #ececf1`（inline style）→ 迁移到 `--ui-*`

---

## 3. 执行流面板（FlowPanel）布局

### 3.1 组件重命名

- `LauncherReviewOverlay.vue` → 重构为 `LauncherFlowPanel.vue`
- 语义从"审查覆盖层"升级为"执行流面板"
- `LauncherQueueSummaryPill.vue` 保留作为入口按钮

### 3.2 覆盖范围

```
┌─ search-shell ──────────────────────────────┐
│ ┌─ drag-strip ───────────────────────────┐  │  ← 保持不变，始终可拖拽
│ └────────────────────────────────────────┘  │
│ ┌─ search-capsule ──┐ ┌─── FlowPanel ───┐  │
│ │ 搜索框 [pill]     │ │ 标题栏（可拖拽）│  │  ← FlowPanel 从搜索框顶部开始
│ └───────────────────┘ │                  │  │
│ ┌─ result-drawer ───┐ │  卡片列表        │  │
│ │ （被 scrim 遮罩） │ │  （可滚动）      │  │
│ │                   │ │                  │  │
│ └───────────────────┘ │ 底部执行按钮     │  │
│                       └──────────────────┘  │
└─────────────────────────────────────────────┘
```

- **宽度** = `search-shell` 宽度 × `FLOW_PANEL_WIDTH_RATIO`（默认 2/3），clamp 到 `[FLOW_PANEL_MIN_WIDTH, FLOW_PANEL_MAX_WIDTH]`
- **高度** = `search-shell` 全高（从搜索框顶部到底部）
- **定位模式**：`position: absolute`，right: 0，覆盖在 search-capsule + result-drawer 之上（与现有 ReviewOverlay 的 overlay 定位模式一致）。搜索框保持原宽度不变，不被缩窄
- 右侧定位，左侧渲染半透明 scrim 遮罩
- 宽度常量为可配置值，后续可改为 1（全宽）、3/4 等
- **宽度降级**：当 `FLOW_PANEL_MIN_WIDTH > search-shell 宽度` 时，FlowPanel 回退到 100% 宽度（全宽模式）

### 3.3 宽度常量

```typescript
// src/components/launcher/parts/flowPanelLayout.ts
export const FLOW_PANEL_WIDTH_RATIO = 2 / 3;
export const FLOW_PANEL_MIN_WIDTH = 420;
export const FLOW_PANEL_MAX_WIDTH = 480;
```

### 3.4 三段式布局

**标题栏（固定顶部）：**
- 左侧：「执行流详情」文字 + 队列数量徽标（`--ui-accent` 圆形 badge）
- 右侧：垃圾桶按钮（清空队列，触发 toast）+ 关闭按钮（✕）
- 标题栏区域（按钮除外）设置 `data-tauri-drag-region` 可拖拽窗口

**卡片列表（中间可滚动）：**
- `overflow-y: auto`，细滚动条（4px，与现有风格一致）
- 卡片间距统一，整卡片可拖拽排序

**底部按钮（固定底部）：**
- 大面积"开始执行队列"按钮，使用 `--ui-accent` 背景色
- 队列为空时按钮禁用，使用 `--ui-surface-hover` 灰色
- 执行中显示 loading 状态

### 3.5 FlowDrawer 保留

- 首次入队命令的参数填写和安全确认仍使用 `LauncherFlowDrawer.vue`
- FlowDrawer 从左侧滑入，与 FlowPanel 互不干扰
- FlowPanel 和 FlowDrawer 同时打开时，FlowDrawer 覆盖在 FlowPanel 之上

### 3.6 Toast 在 FlowPanel 中的位置

- FlowPanel 打开时：toast 渲染在 FlowPanel 标题栏下方（面板内部顶部）
- FlowPanel 关闭时：toast 回到原位（search-capsule 内）
- **实现机制**：在两个位置各放一个 toast 渲染槽，通过 `v-if="flowPanelOpen"` / `v-else` 控制显示。
  FlowPanel 内部的 toast 槽接收相同的 `executionFeedbackMessage` / `executionFeedbackTone` props。
  由于两个槽互斥显示，不会出现切换瞬间的闪烁问题。

### 3.7 FlowPanel 打开时的 inert 策略

- `result-drawer`（搜索结果列表）设置 `inert` + `aria-hidden`（与现有行为一致）
- `search-input`（搜索输入框）设置 `inert`，禁止输入但不影响整个 `search-capsule`
- `QueueSummaryPill` 保持可交互（用于关闭 FlowPanel）
- 注意：不在 `search-capsule` 整体设置 `inert`，避免禁用 pill 按钮

---

## 4. 卡片设计

### 4.1 有参数卡片

```
┌──────────────────────────────────────────┐
│ DNS 查询 (nslookup)              📋   ✕  │  ← 标题 + 操作按钮
│                                          │
│ domain: google.com   server: 8.8.8.8     │  ← 紧凑参数标签行
│                                          │
│ > nslookup google.com 8.8.8.8            │  ← 完整渲染命令
└──────────────────────────────────────────┘
```

**参数标签（未编辑态）：**
- 每个参数渲染为 `key: value` 紧凑标签
- `key` 使用 `--ui-text-secondary`，`value` 使用 `--ui-accent`
- 多参数以 `flex-wrap: wrap` 水平排列
- 鼠标悬停 value 部分显示下划线

**参数标签（编辑态）：**
- 点击 value → 原地替换为 inline 输入框，宽度自适应
- 输入框背景使用 `--ui-surface-hover`
- 收起条件：Enter 确认 / Esc 取消 / blur 自动确认
- **拖拽冲突处理**：`dragstart` 事件触发时，检查是否有正在编辑的参数输入框；如果有，先取消编辑（恢复原值）再进入拖拽模式，避免未完成的输入被意外提交
- 参数变化时命令预览实时更新

**命令预览：**
- 前缀 `>` 符号，`--ui-font-mono` 等宽字体
- 颜色 `--ui-text-secondary`
- 单行，超长 `text-overflow: ellipsis`

### 4.2 无参数卡片

```
┌──────────────────────────────────────────┐
│ 刷新 DNS 缓存                    📋   ✕  │
│                                          │
│ > ipconfig /flushdns                     │
└──────────────────────────────────────────┘
```

- 不显示参数标签行
- 直接显示命令预览

### 4.3 拖拽排序

- 整卡片 `draggable="true"`
- 拖拽 vs 点击区分：`mousedown` 启动延迟（~150ms），移动超过阈值进入拖拽
- 拖拽中：卡片 `opacity: 0.5` + `scale(1.02)` + 投影
- 目标位置：`2px solid var(--ui-accent)` 插入指示线
- 复用 `useStagingQueue/focus.ts` 中的 `onStagingDragStart/Over/End`

### 4.4 操作按钮

- **复制**（📋）：复制完整渲染命令 → toast "已复制"（复用现有 `common.copied` i18n key）
- **删除**（✕）：移除该条命令 → toast "删除成功"
- 默认颜色 `--ui-text-muted`
- hover：复制 → `--ui-text-primary`，删除 → `--ui-danger`

---

## 5. 键盘交互

| 按键 | FlowPanel 打开时行为 |
|------|----------------------|
| `Esc` | 关闭 FlowPanel，焦点回搜索框 |
| `Tab` | 卡片间循环焦点（焦点陷阱） |
| `Enter` | 聚焦卡片时：聚焦第一个可编辑参数；聚焦执行按钮时：执行队列 |
| `Delete` / `Backspace` | 聚焦卡片时：删除该卡片 |
| `Ctrl+Tab` | 保留现有 `switchFocusZone` 语义（在 search 和 staging 焦点区域切换），FlowPanel 打开时等效于关闭面板并切回搜索焦点 |

> **快捷键迁移说明**：`Ctrl+Tab` 不改变其在 `stores/settings/defaults.ts` 中的 `switchFocus` 绑定语义。
> FlowPanel 的打开/关闭入口为 `QueueSummaryPill` 按钮和现有的 `toggleQueue` 可配置快捷键。
> 当 FlowPanel 打开时，`Ctrl+Tab`（switchFocus）行为等效于关闭面板并将焦点切回搜索区域。

FlowPanel 打开时：`result-drawer` 和 `search-input` 设置 `inert`（详见 3.7）。

---

## 6. 动效

| 动效 | 时长 | 说明 |
|------|------|------|
| FlowPanel 打开 | scrim 淡入 200ms → 面板右侧滑入 200ms | 复用现有 ReviewOverlay 动效 |
| FlowPanel 关闭 | 面板滑出 200ms → scrim 淡出 200ms | 复用现有 ReviewOverlay 动效 |
| 参数 value↔输入框 | `width 120ms` | 无突兀切换 |
| 拖拽中卡片 | `opacity: 0.5`, `scale(1.02)` | 视觉区分 |
| 拖拽插入线 | `2px solid var(--ui-accent)` | 即时出现 |
| Toast | 复用 `toast-slide-down` | 现有关键帧 |

所有动效在 `prefers-reduced-motion: reduce` 下时长降为 0 或跳过（与现有 FlowDrawer 的 `getPrefersReducedMotion()` 策略一致）。

---

## 7. 打开/关闭交互

- **打开入口**：QueueSummaryPill（队列非空时搜索框右侧显示）
- **关闭方式**：关闭按钮 / 点击左侧 scrim / Esc 键
- 关闭后焦点回到搜索框

---

## 8. 实现边界

### 本次范围内

- FlowPanel 全覆盖面板（替代 ReviewOverlay）
- 卡片紧凑参数标签 + 命令预览 + 内联编辑
- 整卡片拖拽排序
- 4 项新增 toast + 主题变量审计
- 国际化 keys
- 宽度比例常量化

### 不在本次范围

- FlowPanel 宽度配置化 UI（仅定义常量，不做设置界面）
- 卡片编号显示
- FlowDrawer（参数/安全确认）改版
- Settings 窗口 toast 改版

---

## 9. 文件影响

| 类型 | 文件 |
|------|------|
| **新增** | `flowPanelLayout.ts`（宽度常量） |
| **重构/重命名** | `LauncherReviewOverlay.vue` → git mv + 重构为 `LauncherFlowPanel.vue` |
| **修改** | `LauncherSearchPanel.vue`、`LauncherWindow.vue`、`actions.ts`、`helpers.ts`、`messages.ts`、`viewModel.ts`、`types.ts` |
| **审查** | `shared.css`、`launcher.css`、`settings.css`、`animations.css` |
| **不变** | `LauncherFlowDrawer.vue`、`useStagingQueue/*`、`useCommandExecution/state.ts` |

---

## 10. 所有颜色均通过主题系统控制

本设计中提及的所有颜色均引用 `--ui-*` 语义变量，由主题层 `--theme-*` 映射而来：

| 语义变量 | 用途 | 黑曜石主题值 |
|----------|------|-------------|
| `--ui-accent` | 强调色（徽标、参数值、执行按钮） | `--theme-accent` |
| `--ui-brand` | 品牌色（neutral toast 文字颜色） | `--theme-brand` |
| `--ui-text-primary` | 主文字（标题） | `--theme-text-primary` |
| `--ui-text-secondary` | 次要文字（参数 key、命令预览） | `--theme-text-secondary` |
| `--ui-text-muted` | 弱文字（按钮默认态） | `--theme-text-muted` |
| `--ui-surface` | 卡片背景 | `--theme-surface` |
| `--ui-surface-hover` | 输入框背景、悬停态 | `--theme-surface-hover` |
| `--ui-danger` | 删除按钮悬停 | `--theme-danger` |
| `--ui-success` | 成功 toast | `--theme-success` |
| `--ui-border` | 卡片边框 | `--theme-border` |

切换主题时所有颜色自动跟随，零硬编码。
