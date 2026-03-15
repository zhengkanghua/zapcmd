# 执行流面板重构与 Toast 系统补全 — 实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 ReviewOverlay 重构为全覆盖 FlowPanel，补全 toast 反馈，审计主题变量对齐。

**Architecture:** 在现有 ReviewOverlay 基础上通过 git mv 重命名为 FlowPanel，调整 CSS 定位使其覆盖 search-shell 全高。卡片参数从完整输入框改为紧凑标签+点击编辑。Toast 通过在 `setExecutionFeedback` 调用点补全缺失的反馈。

**Tech Stack:** Vue 3 Composition API / TypeScript / CSS Custom Properties / Vitest

**Design Spec:** `docs/superpowers/specs/2026-03-15-flow-panel-toast-redesign-design.md`

---

## File Structure

### 新增文件
| 文件 | 职责 |
|------|------|
| `src/components/launcher/parts/flowPanelLayout.ts` | FlowPanel 宽度比例/最值常量 |

### 重命名文件
| 原文件 | 新文件 | 说明 |
|--------|--------|------|
| `src/components/launcher/parts/LauncherReviewOverlay.vue` | `src/components/launcher/parts/LauncherFlowPanel.vue` | git mv + 重构 |

### 修改文件
| 文件 | 修改内容 |
|------|----------|
| `src/i18n/messages.ts` | 新增 4 个 toast i18n keys（中/英） |
| `src/composables/execution/useCommandExecution/helpers.ts` | appendToStaging + executeSingleCommand 增加 toast |
| `src/composables/execution/useCommandExecution/actions.ts` | removeStagedCommand + clearStaging + runStagedSnapshot 增加 toast |
| `src/components/launcher/types.ts` | LauncherReviewOverlayProps → LauncherFlowPanelProps |
| `src/components/launcher/parts/LauncherSearchPanel.vue` | 替换 ReviewOverlay → FlowPanel，toast 双渲染槽，inert 策略 |
| `src/components/launcher/LauncherWindow.vue` | 更新 slot 中组件引用 |
| `src/composables/app/useAppCompositionRoot/viewModel.ts` | 更新 prop 名称（reviewOpen → flowPanelOpen 等） |
| `src/styles/launcher.css` | FlowPanel 全高覆盖 CSS，卡片紧凑参数样式 |

### 审查文件（仅修复硬编码色值）
| 文件 | 审查项 |
|------|--------|
| `src/styles/shared.css` | `.execution-toast` 语义色值 |
| `src/styles/launcher.css` | `.staging-card`、`.review-card`、`.review-panel` |
| `src/styles/settings.css` | 设置窗口 toast |
| `src/styles/animations.css` | toast 动画 |

---

## Chunk 1: Toast 系统补全 + 主题审计

### Task 1: 新增 Toast 国际化 keys

**Files:**
- Modify: `src/i18n/messages.ts:20-34` (zh launcher), `src/i18n/messages.ts:299-313` (en launcher)

- [ ] **Step 1: 在 zh-CN launcher 区块末尾添加 4 个 key**

在 `src/i18n/messages.ts` 的 zh-CN `launcher` 对象中（在 `safetyDialogAria: "高风险命令确认"` 这一行之后、launcher 对象闭合 `}` 之前）追加：

```typescript
    flowAdded: "已加入执行流",
    flowRemoved: "删除成功",
    flowCleared: "已清空 {n} 个节点",
    executionStarted: "开始执行",
```

- [ ] **Step 2: 在 en-US launcher 区块末尾添加对应 4 个 key**

在 `src/i18n/messages.ts` 的 en-US `launcher` 对象中（在 `safetyDialogAria` 之后、launcher 对象闭合 `}` 之前）追加：

```typescript
    flowAdded: "Added to flow",
    flowRemoved: "Removed",
    flowCleared: "Cleared {n} node(s)",
    executionStarted: "Execution started",
```

- [ ] **Step 3: 运行 typecheck 确认无编译错误**

运行: `npx vue-tsc --noEmit`
期望: 无错误（i18n keys 是字符串字面量，不影响类型）

- [ ] **Step 4: 提交**

```bash
git add src/i18n/messages.ts
git commit -m "feat(i18n): 新增执行流 toast 反馈中英文 keys"
```

---

### Task 2: Toast 触发点 — helpers.ts（入队 + 执行开始）

**Files:**
- Modify: `src/composables/execution/useCommandExecution/helpers.ts:152-195`
- Test: `src/composables/__tests__/execution/useCommandExecution.test.ts`

> **架构说明**：`helpers.ts` 第 3 行已有 `import { t } from "../../../i18n"`（模块级导入）。
> `setExecutionFeedback` 位于 `state`（`CommandExecutionState`）上，而非 `options`（`UseCommandExecutionOptions`）上。
> 因此所有 toast 调用使用 `state.setExecutionFeedback(...)` + 模块级 `t(...)`，无需修改任何接口。

- [ ] **Step 1: 在 `appendToStaging` 中添加入队 toast**

在 `helpers.ts` 的 `appendToStaging` 函数中（约第 192 行，`options.stagedCommands.value.push(staged)` 之后）添加：

```typescript
    state.setExecutionFeedback("success", t("launcher.flowAdded"));
```

注意：`appendToStaging` 的签名是 `appendToStaging(options: UseCommandExecutionOptions, state: CommandExecutionState, ...)`，`state` 已作为第二个参数传入。

- [ ] **Step 2: 在 `executeSingleCommand` 执行前添加 "开始执行" toast**

在 `helpers.ts` 的 `executeSingleCommand` 函数中（约第 160 行，`await options.runInTerminal(...)` 之前）添加：

```typescript
    state.setExecutionFeedback("success", t("launcher.executionStarted"));
```

同样通过 `state` 参数调用，`t` 为模块级导入。

- [ ] **Step 3: 运行现有测试确认不破坏**

运行: `npx vitest run src/composables/__tests__/execution/useCommandExecution.test.ts`
期望: 全部通过（测试 mock 中的 `state` 已包含 `setExecutionFeedback`）

- [ ] **Step 4: 提交**

```bash
git add src/composables/execution/useCommandExecution/helpers.ts
git commit -m "feat(toast): 入队和执行开始触发 toast 反馈"
```

---

### Task 3: Toast 触发点 — actions.ts（删除 + 清空 + 队列执行）

**Files:**
- Modify: `src/composables/execution/useCommandExecution/actions.ts:25-60,304-327`
- Test: `src/composables/__tests__/execution/useCommandExecution.test.ts`

> **架构说明**：`actions.ts` 第 2 行已有 `import { t } from "../../../i18n"`（模块级导入）。
> `state` 参数（`CommandExecutionState`）上有 `setExecutionFeedback` 方法。无需修改接口。

- [ ] **Step 1: 在 `removeStagedCommand` 中添加删除 toast**

在 `actions.ts` 第 304-309 行 `removeStagedCommand` 函数中，`filter` 之后添加：

```typescript
    state.setExecutionFeedback("neutral", t("launcher.flowRemoved"));
```

- [ ] **Step 2: 在 `clearStaging` 中添加清空 toast**

在 `actions.ts` 第 325-327 行 `clearStaging` 函数，改为先记录数量再清空：

```typescript
    function clearStaging(): void {
      const count = options.stagedCommands.value.length;
      options.stagedCommands.value = [];
      if (count > 0) {
        state.setExecutionFeedback("neutral", t("launcher.flowCleared", { n: count }));
      }
    }
```

> 注意：`{n}` 是 vue-i18n 命名插值语法，传入 `{ n: count }` 对象。

- [ ] **Step 3: 在 `runStagedSnapshot` 执行前添加 "开始执行" toast**

在 `actions.ts` 第 25-60 行 `runStagedSnapshot` 函数中，`for (const cmd of snapshot)` 循环之前添加：

```typescript
      state.setExecutionFeedback("success", t("launcher.executionStarted"));
```

- [ ] **Step 4: 运行测试**

运行: `npx vitest run src/composables/__tests__/execution/useCommandExecution.test.ts`
期望: 全部通过

- [ ] **Step 5: 提交**

```bash
git add src/composables/execution/useCommandExecution/actions.ts
git commit -m "feat(toast): 删除/清空/队列执行开始触发 toast 反馈"
```

---

### Task 4: 主题审计 — 修复硬编码语义色值

**Files:**
- Modify: `src/components/launcher/parts/LauncherReviewOverlay.vue:224`
- Audit: `src/styles/shared.css`, `src/styles/launcher.css`, `src/styles/settings.css`, `src/styles/animations.css`

- [ ] **Step 1: 修复 LauncherReviewOverlay.vue 硬编码色值**

在 `LauncherReviewOverlay.vue` 第 224 行附近，找到 `color: #ececf1` 的 inline style，替换为 `color: var(--ui-text)`。

- [ ] **Step 2: 审查 shared.css 中 .execution-toast 样式**

检查 `shared.css` 第 29-56 行的 `.execution-toast` 及其变体：
- `.execution-feedback--neutral` 使用 `var(--ui-brand)` → OK
- `.execution-feedback--success` 使用 `var(--ui-success)` → OK
- `.execution-feedback--error` 使用 `var(--ui-danger)` → OK
- `.execution-toast` 背景 `rgba(...)` → 装饰性透明度，允许保留

记录审查结果，修复发现的任何硬编码语义色值。

- [ ] **Step 3: 审查 launcher.css 中卡片和面板相关样式**

检查 `launcher.css` 中以下选择器的所有色值引用：
- `.staging-card`（第 921-941 行）
- `.review-card__actions`（第 758-762 行）
- `.review-card__command`（第 764-768 行）
- `.review-panel` 及其子选择器（第 629-756 行）
- `.queue-summary-pill`（第 122-167 行）

判定标准：
- `color`/`border-color`/`background-color` 属性中的 hex/named 色值 → 必须替换为 `--ui-*`
- `rgba()` 中用于半透明效果（如 `rgba(255,255,255,0.08)` border、`rgba(0,0,0,0.17)` background）→ 属于装饰性透明度，**允许保留**
- 已使用 `var(--ui-*)` 或 `rgba(var(--ui-*-rgb), ...)` 的 → OK，无需修改

- [ ] **Step 4: 审查 settings.css 中 toast 样式**

检查 `settings.css` 中 `.execution-toast` 相关样式，确认无硬编码色值。

- [ ] **Step 5: 审查 animations.css**

检查 `animations.css` 中 `toast-slide-down`（第 9-18 行）和 `toast-auto-dismiss`（第 286-301 行）动画关键帧。
预期结论：这两个动画仅使用 `opacity` 和 `transform`，无色值引用，**无需修改**。

- [ ] **Step 6: 运行 lint + typecheck**

运行: `npm run lint && npx vue-tsc --noEmit`
期望: 全部通过

- [ ] **Step 7: 提交**

> 注：此时文件仍名为 `LauncherReviewOverlay.vue`，将在 Chunk 2 Task 7 中重命名。

```bash
git add src/styles/ src/components/launcher/parts/LauncherReviewOverlay.vue
git commit -m "fix(theme): 修复硬编码语义色值，全部迁移到 --ui-* 变量"
```

---

## Chunk 2: FlowPanel 组件重构

### Task 5: 创建 flowPanelLayout.ts 常量文件

**Files:**
- Create: `src/components/launcher/parts/flowPanelLayout.ts`

- [ ] **Step 1: 创建常量文件**

```typescript
/** FlowPanel 宽度相对于 search-shell 的比例（默认 2/3） */
export const FLOW_PANEL_WIDTH_RATIO = 2 / 3;

/** FlowPanel 最小宽度（px） */
export const FLOW_PANEL_MIN_WIDTH = 420;

/** FlowPanel 最大宽度（px） */
export const FLOW_PANEL_MAX_WIDTH = 480;
```

- [ ] **Step 2: 运行 typecheck**

运行: `npx vue-tsc --noEmit`
期望: 通过

- [ ] **Step 3: 提交**

```bash
git add src/components/launcher/parts/flowPanelLayout.ts
git commit -m "feat(flow-panel): 新增 FlowPanel 宽度常量"
```

---

### Task 6: 更新 types.ts — FlowPanel Props 类型

**Files:**
- Modify: `src/components/launcher/types.ts:60-74`

- [ ] **Step 1: 将 LauncherReviewOverlayProps 重命名为 LauncherFlowPanelProps**

在 `src/components/launcher/types.ts` 第 60 行，将 `LauncherReviewOverlayProps` 直接改为 `LauncherFlowPanelProps`，不保留旧别名（遵循项目"清理原则"）。

- [ ] **Step 2: 添加 executionFeedbackMessage 和 executionFeedbackTone 到 FlowPanelProps**

FlowPanel 内部需要渲染 toast，添加这两个字段：

```typescript
  executionFeedbackMessage: string;
  executionFeedbackTone: "neutral" | "success" | "error";
```

- [ ] **Step 3: 运行 typecheck（预期有编译错误，将在 Task 7 中修复）**

运行: `npx vue-tsc --noEmit`
期望: 编译错误（旧类型名引用尚未更新），这是正常的，将在 Task 7 一并修复。

- [ ] **Step 4: 提交**

```bash
git add src/components/launcher/types.ts
git commit -m "refactor(types): LauncherReviewOverlayProps → LauncherFlowPanelProps"
```

---

### Task 7: git mv 重命名 + DOM 结构调整（定位上下文修复）

**Files:**
- Rename: `src/components/launcher/parts/LauncherReviewOverlay.vue` → `src/components/launcher/parts/LauncherFlowPanel.vue`
- Modify: `src/components/launcher/parts/LauncherSearchPanel.vue` (DOM 结构调整)

> **关键架构说明**：当前 ReviewOverlay 位于 `LauncherSearchPanel.vue` 的 `<section style="position: relative">` 内部（约第 89 行），
> 该 section 在 `search-capsule` **之下**。`position: absolute; inset: 0` 只能覆盖该 section 的范围，无法向上覆盖搜索框。
>
> **解决方案**：将 FlowPanel 从 `<section style="position: relative">` 内提升到 `<section class="search-main">` 层级。
> `search-main` 包含 search-capsule + result 区域，是正确的定位上下文。需要确保 `search-main` 有 `position: relative`。
> 这样 FlowPanel 的 `inset: 0` 将覆盖 search-main 全高（含搜索框），而 drag-strip 在 `search-shell` 层级的 grid-row-1，
> 不在 search-main 内部，因此不会被遮挡。

- [ ] **Step 1: git mv 重命名**

```bash
git mv src/components/launcher/parts/LauncherReviewOverlay.vue src/components/launcher/parts/LauncherFlowPanel.vue
```

- [ ] **Step 2: 更新所有 import 引用**

搜索代码库中所有 `LauncherReviewOverlay` 引用，替换为 `LauncherFlowPanel`：
- `src/components/launcher/parts/LauncherSearchPanel.vue` — import 路径和组件名
- `src/composables/__tests__/` 下的测试文件（如有）

同步将 `LauncherReviewOverlayProps` 替换为 `LauncherFlowPanelProps`。

- [ ] **Step 3: 调整 LauncherSearchPanel.vue DOM 结构**

将 FlowPanel 从 `<section style="position: relative">` 内部移出，放到 `<section class="search-main">` 的直接子元素位置：

```html
<section class="search-main">
  <section class="search-capsule">
    <!-- 搜索框内容不变 -->
  </section>
  <section style="position: relative">
    <section class="result-drawer" ...>
      <!-- 搜索结果不变 -->
    </section>
    <!-- FlowPanel 从这里移走 -->
    <slot name="content-overlays" />
  </section>
  <!-- FlowPanel 提升到这里，成为 search-main 的直接子元素 -->
  <LauncherFlowPanel
    v-if="props.reviewOpen"
    ...props...
  />
</section>
```

- [ ] **Step 4: 确保 search-main 有 position: relative**

在 `launcher.css` 中检查 `.search-main`（第 37-43 行），如果没有 `position: relative`，添加之：

```css
.search-main {
  position: relative; /* FlowPanel 定位上下文 */
  /* ...保留其他现有样式 */
}
```

- [ ] **Step 5: 运行 typecheck + 测试**

运行: `npx vue-tsc --noEmit && npx vitest run`
期望: 通过

- [ ] **Step 6: 提交**

```bash
git add src/components/launcher/parts/LauncherFlowPanel.vue src/components/launcher/parts/LauncherSearchPanel.vue src/styles/launcher.css
git commit -m "refactor: git mv ReviewOverlay → FlowPanel + DOM 结构提升到 search-main 层级"
```

---

### Task 8: FlowPanel 模板重构 — 三段式布局

**Files:**
- Modify: `src/components/launcher/parts/LauncherFlowPanel.vue`（原 `<template>` 第 171-326 行）

- [ ] **Step 1: 重写标题栏（header）**

替换现有 header（约第 190-220 行）为新设计：

```html
<header class="flow-panel__header" data-tauri-drag-region>
  <div class="flow-panel__title-group">
    <h2 class="flow-panel__heading">{{ t('launcher.queueTitle') }}</h2>
    <span class="flow-panel__count" v-if="props.stagedCommands.length > 0">
      {{ formatCount(props.stagedCommands.length) }}
    </span>
  </div>
  <div class="flow-panel__header-actions">
    <button
      class="btn-icon btn-danger"
      :aria-label="t('common.clearAll')"
      :disabled="props.stagedCommands.length === 0"
      @click="$emit('clear-staging')"
    >
      <!-- 垃圾桶 SVG icon -->
    </button>
    <button
      ref="closeButtonRef"
      class="btn-icon flow-panel__close"
      :aria-label="t('common.close')"
      @click="closeReview"
    >
      <!-- X SVG icon -->
    </button>
  </div>
</header>
```

- [ ] **Step 2: 添加 FlowPanel 内部 toast 渲染槽**

在 header 之后、列表之前添加：

```html
<p
  v-if="props.executionFeedbackMessage"
  class="execution-feedback execution-toast"
  :class="`execution-feedback--${props.executionFeedbackTone}`"
>
  {{ props.executionFeedbackMessage }}
</p>
```

- [ ] **Step 3: 重写底部（footer）**

替换现有 footer（约第 303-323 行）为大面积执行按钮：

```html
<footer class="flow-panel__footer">
  <button
    class="flow-panel__execute-btn"
    :disabled="props.stagedCommands.length === 0 || props.executing"
    @click="onExecuteStagedClick"
  >
    {{ props.executing ? t('launcher.executing') : t('launcher.executeAll') }}
  </button>
</footer>
```

- [ ] **Step 4: 运行开发服务器视觉验证**

运行: `npm run dev`
在浏览器中检查 FlowPanel 三段式布局是否正确（标题栏/卡片列表/底部按钮）。

- [ ] **Step 5: 提交**

```bash
git add src/components/launcher/parts/LauncherFlowPanel.vue
git commit -m "feat(flow-panel): 三段式布局（标题栏/卡片列表/执行按钮）"
```

---

### Task 9: FlowPanel CSS — 全高覆盖 + 宽度

**Files:**
- Modify: `src/styles/launcher.css:602-682`
- Modify: `src/composables/launcher/useLauncherLayoutMetrics.ts` (已有 `createOverlayPanelWidths` 函数)

> **宽度计算说明**：代码库中已有 `useLauncherLayoutMetrics.ts` 的 `createOverlayPanelWidths` 函数（约第 166 行），
> 通过 JS 计算 `reviewWidth` 并注入 CSS 变量 `--review-width`。应修改此函数使用 `flowPanelLayout.ts` 中的新常量，
> 并将 CSS 变量重命名为 `--flow-panel-width`，避免 TS 常量与 CSS 值不同步。

- [ ] **Step 1: 更新 useLauncherLayoutMetrics.ts 中的宽度计算**

修改 `createOverlayPanelWidths` 函数，import 新常量：

```typescript
import { FLOW_PANEL_WIDTH_RATIO, FLOW_PANEL_MIN_WIDTH, FLOW_PANEL_MAX_WIDTH } from '../components/launcher/parts/flowPanelLayout';
```

使用新常量替换原有的硬编码比例值，将输出的 CSS 变量从 `--review-width` 改为 `--flow-panel-width`。

- [ ] **Step 2: 将 .review-overlay 改为 .flow-panel-overlay**

在 `launcher.css` 中重命名 `.review-overlay`（约第 602-614 行）：

```css
.flow-panel-overlay {
  position: absolute;
  inset: 0;            /* 覆盖 search-main 全高全宽 */
  z-index: 20;
  display: flex;
  pointer-events: none;
}
.flow-panel-overlay.state-open,
.flow-panel-overlay.state-opening,
.flow-panel-overlay.state-closing {
  pointer-events: auto;
}
```

> 由于 Task 7 已将 FlowPanel 提升到 `search-main` 层级，`inset: 0` 相对于 `search-main` 生效，
> 覆盖 search-capsule + result-drawer 全高。drag-strip 在 `search-shell` grid-row-1，不受影响。

- [ ] **Step 3: 将 .review-panel 改为 .flow-panel**

```css
.flow-panel {
  width: min(var(--flow-panel-width, 67%), 100%);
  min-width: min(420px, 100%);  /* 降级：MIN > shell 时用 100% */
  margin-left: auto;
  display: grid;
  grid-template-rows: auto 1fr auto;  /* header / list / footer */
  /* ...保留原有背景/圆角/阴影 */
}
```

- [ ] **Step 3: 添加标题栏、计数徽标、执行按钮的 CSS**

```css
.flow-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ui-border);
  -webkit-app-region: drag;  /* 标题栏可拖拽 */
}
.flow-panel__header-actions {
  display: flex;
  gap: 4px;
  -webkit-app-region: no-drag;  /* 按钮不可拖拽 */
}
.flow-panel__title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.flow-panel__heading {
  font-size: 14px;
  font-weight: 600;
  color: var(--ui-text);
  margin: 0;
}
.flow-panel__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--ui-accent);
  color: var(--ui-accent-text);
  font-size: 11px;
  font-weight: 700;
}
.flow-panel__footer {
  padding: 12px 16px;
  border-top: 1px solid var(--ui-border);
}
.flow-panel__execute-btn {
  width: 100%;
  padding: 10px 0;
  border: none;
  border-radius: 8px;
  background: var(--ui-accent);
  color: var(--ui-accent-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.flow-panel__execute-btn:disabled {
  background: var(--ui-hover);
  color: var(--ui-dim);
  cursor: not-allowed;
}
```

- [ ] **Step 4: 更新动画类名**

将 `launcher.css` 中 `.review-overlay.state-opening`、`.state-closing` 等动画选择器更新为 `.flow-panel-overlay.state-*`，同步更新 `.review-panel` → `.flow-panel` 的 transition/animation 规则。

- [ ] **Step 5: 清理旧 .review-* 选择器**

删除或重命名所有 `.review-overlay`、`.review-panel`、`.review-panel__header`、`.review-panel__close` 等旧选择器，避免 CSS 冗余。

- [ ] **Step 6: 运行 lint**

运行: `npm run lint`
期望: 通过

- [ ] **Step 7: 提交**

```bash
git add src/styles/launcher.css
git commit -m "feat(flow-panel): CSS 全高覆盖 + 三段式布局样式"
```

---

### Task 10: LauncherSearchPanel 集成 + Toast 双渲染槽 + inert + 键盘交互

**Files:**
- Modify: `src/components/launcher/parts/LauncherSearchPanel.vue:78-86,94`
- Modify: `src/components/launcher/parts/LauncherFlowPanel.vue` (keyboard handler)

- [ ] **Step 1: 实现 Toast 双渲染槽**

在 `LauncherSearchPanel.vue` 的 toast 位置（约第 78-86 行），添加 `!props.reviewOpen` 条件排斥 FlowPanel 打开时的 toast：

```html
<!-- search-capsule 内的 toast：仅在 FlowPanel 关闭时显示 -->
<p
  v-if="props.executionFeedbackMessage && !props.reviewOpen"
  class="execution-feedback execution-toast"
  :class="`execution-feedback--${props.executionFeedbackTone}`"
>
  {{ props.executionFeedbackMessage }}
</p>
```

FlowPanel 内部的 toast 渲染槽（Task 8 Step 2 中已添加）通过 `v-if="props.executionFeedbackMessage"` 控制。
二者通过各自 `v-if` 条件实现逻辑互斥（FlowPanel 仅在 `reviewOpen=true` 时渲染，因此 FlowPanel 内的 toast 只在 `reviewOpen=true` 时存在）。

- [ ] **Step 2: 传入 toast props 给 FlowPanel**

在 `LauncherSearchPanel.vue` 的 FlowPanel 组件使用处（Task 7 Step 3 中已移动的位置），确保传入 toast props：

```html
<LauncherFlowPanel
  v-if="props.reviewOpen"
  :execution-feedback-message="props.executionFeedbackMessage"
  :execution-feedback-tone="props.executionFeedbackTone"
  ...其他现有 props...
/>
```

- [ ] **Step 3: 调整 inert 策略**

`result-drawer` 的 inert 条件保持不变：`:inert="props.reviewOpen || props.flowOpen ? true : undefined"`。

在搜索输入框上新增 inert（仅 FlowPanel 打开时），保留 flowOpen 的现有 readonly/tabindex 处理：

```html
<input
  id="zapcmd-search-input"
  class="search-input"
  :inert="props.reviewOpen ? true : undefined"
  :readonly="props.flowOpen"
  :tabindex="props.flowOpen ? -1 : undefined"
  ...
/>
```

`QueueSummaryPill` 在 `search-form` 内但不在 `input` 上，不受 input 的 inert 影响。

- [ ] **Step 4: 验证键盘交互保持正常**

现有 `onReviewPanelKeydown`（FlowPanel 内，原第 67-107 行）已处理 Tab 焦点陷阱。
现有 `switchFocusWithStagingOpen`（在 `main.ts` 中）在 staging 展开时 `Ctrl+Tab` 会调用 `toggleStaging()` + `switchFocusZone()` 关闭面板。

确认以下键盘交互在重命名后仍正常：
- `Esc`：由 `handleMainGlobalHotkeys` 中 staging 展开时的处理逻辑关闭 FlowPanel
- `Tab`：FlowPanel 内的焦点陷阱（`onReviewPanelKeydown` → 保留改名为 `onFlowPanelKeydown`）
- `Ctrl+Tab`：`switchFocusWithStagingOpen` 关闭面板并切回搜索焦点

如果以上逻辑依赖组件名或类名，需同步更新。

- [ ] **Step 5: 运行 typecheck + 测试**

运行: `npx vue-tsc --noEmit && npx vitest run src/components/launcher/`
期望: 通过

- [ ] **Step 6: 提交**

```bash
git add src/components/launcher/
git commit -m "feat(flow-panel): SearchPanel 集成 FlowPanel + toast 双渲染槽 + inert + 键盘验证"
```

---

### Task 11: LauncherWindow + viewModel 集成

**Files:**
- Modify: `src/components/launcher/LauncherWindow.vue:115-175`
- Modify: `src/composables/app/useAppCompositionRoot/viewModel.ts:122-166`

- [ ] **Step 1: 更新 LauncherWindow 中的组件引用**

在 `LauncherWindow.vue` 中，更新 import 和 `#content-overlays` slot 区域（如有直接引用 ReviewOverlay 的地方）。主要是确保 props 透传名称与新的 FlowPanel props 对齐。

- [ ] **Step 2: 更新 viewModel.ts 中的 prop 名称**

如果 viewModel 中有 `reviewOpen` 或类似命名，保持不变（因为 `stagingExpanded` 是底层状态，组件层面的 `reviewOpen` prop 只是一个传递）。确保新增的 `executionFeedbackMessage`/`executionFeedbackTone` 已在 viewModel 中透传到 FlowPanel。

- [ ] **Step 3: 运行全量测试**

运行: `npm run test:run`
期望: 全部通过

- [ ] **Step 4: 提交**

```bash
git add src/components/launcher/LauncherWindow.vue src/composables/app/useAppCompositionRoot/viewModel.ts
git commit -m "feat(flow-panel): LauncherWindow + viewModel 集成更新"
```

---

## Chunk 3: 卡片紧凑参数设计 + 回归测试

### Task 12: 卡片紧凑参数标签（替换完整输入框）

**Files:**
- Modify: `src/components/launcher/parts/LauncherFlowPanel.vue` (卡片 template 区域)
- Modify: `src/styles/launcher.css` (卡片样式区域)

> **字段说明**：`CommandArg` 接口（`src/features/commands/types.ts`）使用 `key`（标识符）和 `label`（显示名），
> **不存在** `name` 字段。现有代码 `LauncherReviewOverlay.vue` 第 285-286 行已正确使用 `arg.key` 和 `arg.label`。

- [ ] **Step 1: 重写卡片参数区域模板**

替换现有卡片中的参数编辑区（原 `staging-card__args` 区域），改为紧凑标签 + 内联编辑：

```html
<!-- 有参数时 -->
<div v-if="cmd.args.length > 0" class="flow-card__params">
  <span
    v-for="arg in cmd.args"
    :key="arg.key"
    class="flow-card__param"
  >
    <span class="flow-card__param-key">{{ arg.label }}:</span>
    <!-- 未编辑态：紧凑标签 -->
    <span
      v-if="editingParam?.cmdId !== cmd.id || editingParam?.argKey !== arg.key"
      class="flow-card__param-value"
      @click.stop="startParamEdit(cmd.id, arg.key, cmd.argValues[arg.key] || arg.defaultValue || '')"
    >
      {{ cmd.argValues[arg.key] || arg.defaultValue || '...' }}
    </span>
    <!-- 编辑态：内联输入框 -->
    <input
      v-else
      class="flow-card__param-input"
      :value="editingParam.currentValue"
      @input="onParamEditInput(cmd.id, arg.key, ($event.target as HTMLInputElement).value)"
      @keydown.enter.stop="commitParamEdit(cmd.id, arg.key)"
      @keydown.escape.stop="cancelParamEdit()"
      @blur="commitParamEdit(cmd.id, arg.key)"
      ref="paramEditInputRef"
    />
  </span>
</div>
<!-- 无参数时：不显示参数标签行，直接由命令预览覆盖 -->
```

> 注意：`ref="paramEditInputRef"` 在 `v-for` 中同一时刻只有一个 input 被渲染（`v-if/v-else` 控制），因此不会冲突。

- [ ] **Step 2: 添加内联编辑状态管理**

在 `<script setup>` 中添加：

```typescript
const editingParam = ref<{
  cmdId: string;
  argKey: string;
  currentValue: string;
  originalValue: string;
} | null>(null);

const paramEditInputRef = ref<HTMLInputElement | null>(null);

function startParamEdit(cmdId: string, argKey: string, currentValue: string) {
  editingParam.value = { cmdId, argKey, currentValue, originalValue: currentValue };
  nextTick(() => paramEditInputRef.value?.focus());
}

function onParamEditInput(cmdId: string, argKey: string, value: string) {
  if (editingParam.value) {
    editingParam.value.currentValue = value;
  }
  // 实时 emit 以更新命令预览（设计文档 4.1：参数变化时命令预览实时更新）
  emit('update-staged-arg', cmdId, argKey, value);
}

function commitParamEdit(cmdId: string, argKey: string) {
  if (!editingParam.value) return;
  const newValue = editingParam.value.currentValue;
  editingParam.value = null;
  emit('update-staged-arg', cmdId, argKey, newValue);
}

function cancelParamEdit() {
  if (!editingParam.value) return;
  const { cmdId, argKey, originalValue } = editingParam.value;
  editingParam.value = null;
  // 恢复原值
  emit('update-staged-arg', cmdId, argKey, originalValue);
}
```

> **实时更新策略**：`@input` 时即 emit `update-staged-arg` 使 `cmd.renderedCommand` 实时更新。
> `cancelParamEdit` 时 emit 一次恢复原值。这与现有的即时 emit 模式（原 `onStagingArgInput`）保持一致。

- [ ] **Step 3: 添加命令预览行**

在参数区域之后（或无参数时直接在标题之后），为每张卡片添加命令预览：

```html
<code class="flow-card__command">
  &gt; {{ cmd.renderedCommand }}
</code>
```

- [ ] **Step 4: 添加紧凑参数标签 CSS**

在 `launcher.css` 中添加：

```css
.flow-card__params {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  padding: 4px 0;
}
.flow-card__param {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}
.flow-card__param-key {
  color: var(--ui-subtle);
}
.flow-card__param-value {
  color: var(--ui-accent);
  cursor: pointer;
  border-bottom: 1px solid transparent;
  transition: border-color 0.12s;
}
.flow-card__param-value:hover {
  border-bottom-color: var(--ui-accent);
}
.flow-card__param-input {
  background: var(--ui-hover);
  border: 1px solid var(--ui-border);
  border-radius: 4px;
  color: var(--ui-accent);
  font-size: 12px;
  padding: 1px 4px;
  outline: none;
  width: auto;
  min-width: 40px;
}
.flow-card__command {
  display: block;
  padding: 4px 0;
  font-family: var(--ui-font-mono);
  font-size: 11px;
  color: var(--ui-subtle);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* prefers-reduced-motion 降级 */
@media (prefers-reduced-motion: reduce) {
  .flow-card__param-value,
  .flow-card__param-input {
    transition: none;
  }
}
```

- [ ] **Step 5: 运行视觉验证**

运行: `npm run dev`
验证清单：
- [ ] 有参数卡片：显示紧凑 `key: value` 标签
- [ ] 点击 value 变为输入框，Enter/Esc/blur 收起
- [ ] 编辑过程中命令预览实时更新
- [ ] Esc 取消编辑后恢复原值
- [ ] **无参数卡片：仅显示标题行和命令预览，无参数标签区域**
- [ ] 多参数水平排列，溢出换行

- [ ] **Step 6: 提交**

```bash
git add src/components/launcher/parts/LauncherFlowPanel.vue src/styles/launcher.css
git commit -m "feat(flow-panel): 卡片紧凑参数标签 + 内联编辑 + 命令预览"
```

---

### Task 13: 拖拽门控 + 编辑冲突处理

**Files:**
- Modify: `src/components/launcher/parts/LauncherFlowPanel.vue`

> **设计要求**：拖拽 vs 点击区分通过 mousedown 延迟（~150ms）实现。
> 默认卡片不可拖拽，只有 mousedown 持续超过阈值或移动超过 5px 才进入拖拽模式。
> 这样点击参数 value 不会意外触发拖拽。

- [ ] **Step 1: 实现 mousedown 延迟门控**

在 `<script setup>` 中添加：

```typescript
const dragReady = ref(false);
let dragTimer: ReturnType<typeof setTimeout> | null = null;

function onCardMouseDown() {
  dragTimer = setTimeout(() => { dragReady.value = true; }, 150);
}

function onCardMouseUp() {
  if (dragTimer) { clearTimeout(dragTimer); dragTimer = null; }
  dragReady.value = false;
}

function onCardMouseLeave() {
  // 鼠标离开卡片时也重置（避免残留状态）
  if (dragTimer) { clearTimeout(dragTimer); dragTimer = null; }
}
```

模板中卡片使用动态 draggable：

```html
<article
  class="staging-card flow-card"
  :draggable="dragReady"
  @mousedown="onCardMouseDown"
  @mouseup="onCardMouseUp"
  @mouseleave="onCardMouseLeave"
  @dragstart="onDragStartWithEditGuard($event, index)"
  @dragend="dragReady = false"
  ...
>
```

- [ ] **Step 2: 在 dragstart 事件中检查并取消编辑态**

```typescript
function onDragStartWithEditGuard(event: DragEvent, index: number) {
  if (editingParam.value) {
    cancelParamEdit();
  }
  // 注意 emit 参数顺序：(index, event)，与现有 emit 定义一致
  emit('staging-drag-start', index, event);
}
```

> **emit 参数顺序**：现有 emit 定义（原第 17 行）为 `(e: "staging-drag-start", index: number, event: DragEvent): void`，
> 参数顺序是 `(index, event)` 而非 `(event, index)`。

- [ ] **Step 3: 运行测试**

运行: `npx vitest run src/components/launcher/`
期望: 通过

- [ ] **Step 4: 提交**

```bash
git add src/components/launcher/parts/LauncherFlowPanel.vue
git commit -m "feat(flow-panel): mousedown 延迟门控拖拽 + 编辑态冲突处理"
```

---

### Task 14: 新功能自动化测试 + 回归测试 + 全量门禁

**Files:**
- Create/Modify: `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts`
- Modify: 现有测试文件（补充 mock）
- Run: `npm run check:all`

- [ ] **Step 1: 更新现有测试中的 ReviewOverlay 引用**

搜索测试文件中所有 `ReviewOverlay` / `review-overlay` 引用，替换为 `FlowPanel` / `flow-panel`。

- [ ] **Step 2: 补充测试 mock 中缺失的字段**

在测试 mock 中补充 `setExecutionFeedback`、`executionFeedbackMessage`、`executionFeedbackTone` 等新增的 props/方法。

- [ ] **Step 3: 新增 FlowPanel 组件级测试**

在 `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts` 中添加测试：

```typescript
describe('LauncherFlowPanel', () => {
  // 紧凑参数标签
  it('有参数卡片渲染 key: value 紧凑标签', () => { /* ... */ });
  it('无参数卡片不渲染参数标签区域', () => { /* ... */ });

  // 内联编辑
  it('点击 value 进入编辑态，显示输入框', () => { /* ... */ });
  it('Enter 确认编辑并 emit update-staged-arg', () => { /* ... */ });
  it('Esc 取消编辑并恢复原值', () => { /* ... */ });
  it('blur 自动确认编辑', () => { /* ... */ });

  // 拖拽冲突
  it('dragstart 时取消正在进行的参数编辑', () => { /* ... */ });

  // Toast 渲染
  it('FlowPanel 打开时在面板内渲染 toast', () => { /* ... */ });
});
```

- [ ] **Step 4: 运行全量门禁**

运行: `npm run check:all`
期望: lint + typecheck + test:coverage + build + check:rust 全绿

- [ ] **Step 5: 视觉 smoke 验证**

运行: `npm run tauri:dev`

验证清单：
- [ ] FlowPanel 覆盖 search-main 全高（含搜索框位置），drag-strip 不被遮挡
- [ ] 标题栏：「执行流详情」+ 数量徽标 + 垃圾桶 + 关闭按钮
- [ ] 标题栏可拖拽窗口（按钮区域除外）
- [ ] 有参数卡片：紧凑参数标签 + 命令预览
- [ ] **无参数卡片：仅标题 + 命令预览，无参数标签行**
- [ ] 点击参数 value 展开为内联输入框
- [ ] Enter 确认 / Esc 取消（恢复原值）/ 失焦确认
- [ ] 编辑过程中命令预览实时更新
- [ ] 拖拽排序正常（mousedown 延迟后才可拖拽）
- [ ] 短点击不触发拖拽
- [ ] 入队 → toast "已加入执行流" + 闪烁动画
- [ ] 删除卡片 → toast "删除成功"
- [ ] 清空队列 → toast "已清空 N 个节点"
- [ ] 执行 → toast "开始执行" → "已发送到终端: ..."
- [ ] 复制命令 → toast "已复制"
- [ ] 所有 toast 颜色跟随主题
- [ ] Esc 关闭面板 → 焦点回搜索框
- [ ] Ctrl+Tab 关闭面板
- [ ] 搜索框在面板打开时不可输入，QueueSummaryPill 仍可点击
- [ ] prefers-reduced-motion 下参数编辑无动效过渡

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "test: FlowPanel 新功能测试 + 回归测试更新 + 全量门禁通过"
```

---

## Summary

| Chunk | Tasks | 说明 |
|-------|-------|------|
| Chunk 1 | Task 1-4 | Toast 系统补全 + 主题审计（无 UI 变更） |
| Chunk 2 | Task 5-11 | FlowPanel 组件重构（核心 UI 变更） |
| Chunk 3 | Task 12-14 | 卡片紧凑参数 + 拖拽 + 回归测试 |

**总计**: 14 Tasks, 3 Chunks
