# 搜索框防滚动双层防护设计

## 问题描述

在只有搜索框的初始状态下，点击队列 pill 打开 Review 面板时，搜索框会被暂时推到窗口顶部之上，等 Rust 缓动动画扩大窗口后才逐渐回到视野。

**复现条件**：冷启动或窗口已收缩到基础高度后，点击打开 Review 面板。
**不复现**：快速连续点击（300ms 收缩延迟内窗口仍大）、搜索结果出现时（焦点不离开搜索框）。

## 根因

1. `stagingExpanded` 变为 `true` → Vue 渲染 `result-drawer-floor`（298px）+ `review-overlay`（absolute）。
2. `LauncherReviewOverlay.vue` 的 watcher 在 `nextTick()` 后调用 `focusActiveCardOrFallback()`，将焦点移至 staging 卡片或关闭按钮。
3. 被聚焦的元素在 `.search-main`（`overflow: hidden`）的可视区域外。
4. Chromium 的 scroll-into-view 行为：`overflow: hidden` 隐藏滚动条但**不阻止编程式/焦点触发的滚动**。浏览器自动滚动 `.search-main` 将焦点元素带入视野，搜索框被推出可视区域。
5. 此时 Rust 端 120ms 缓动动画刚启动，窗口尚未扩大到位。
6. 随着动画逐帧扩大窗口，`.search-main` 可用高度增加，搜索框逐渐回到视野。

## 设计方案

### 第一层：局部修复 — `focus({ preventScroll: true })`

在所有 overlay 组件中会将焦点移至 `.search-main` 内部元素的 `.focus()` 调用加 `{ preventScroll: true }`。

**修改点**：

| 文件 | 行号（近似） | 当前 | 修改后 |
|------|-------------|------|--------|
| `LauncherReviewOverlay.vue` | 48 | `activeCard.focus()` | `activeCard.focus({ preventScroll: true })` |
| `LauncherReviewOverlay.vue` | 52 | `closeButtonRef.value?.focus()` | `closeButtonRef.value?.focus({ preventScroll: true })` |
| `LauncherReviewOverlay.vue` | 106 | `focusable[nextIndex]?.focus()` | `focusable[nextIndex]?.focus({ preventScroll: true })` |
| `LauncherFlowDrawer.vue` | 181 | `cancelButtonRef.value?.focus()` | `cancelButtonRef.value?.focus({ preventScroll: true })` |
| `LauncherFlowDrawer.vue` | 300 | `focusable[nextIndex]?.focus()` | `focusable[nextIndex]?.focus({ preventScroll: true })` |
| `useLauncherWatchers.ts` | 57 | `options.paramInputRef.value?.focus()` | `options.paramInputRef.value?.focus({ preventScroll: true })` |

**已排除的废弃组件**：`LauncherParamOverlay.vue` 和 `LauncherSafetyOverlay.vue` 包含裸 `.focus()` 调用，但它们是已被 `LauncherFlowDrawer` 替代的废弃组件（仅在测试 stub 中被引用），不在运行时组件树中挂载，无需修改。

### 第二层：结构性防线 — `overflow: clip`

将 `src/styles.css` 中 `.search-main` 的 `overflow: hidden` 改为 `overflow: clip`。

**`overflow: clip` vs `overflow: hidden`**：

- `hidden`：隐藏滚动条，但仍可被 JS `.focus()` / `scrollTop` 编程式滚动。
- `clip`：真正不可滚动。`scrollTop` 永远为 0，任何 focus/script 都无法让它偏移。

**影响范围**：仅影响 `.search-main` 自身。内部子容器（`.result-drawer`、`.staging-list`、`.flow-page__scroll`）各自拥有独立的 `overflow: auto`，不受影响。

**兼容性**：`overflow: clip` 自 Chrome 90 / Edge 90 起支持，WebView2 (Chromium) 完全覆盖。

### 层级示意

```
.search-main  ← overflow: clip（防止此层被滚动）
  ├── .search-capsule        ← 搜索框（始终在顶部可见）
  └── <section relative>
       ├── .result-drawer    ← overflow: auto → 搜索结果正常滚动
       ├── .review-overlay   ← position: absolute
       │    └── .staging-list ← overflow: auto → 队列卡片正常滚动
       └── .flow-overlay     ← position: absolute
            └── .flow-panel > .flow-page  ← overflow 自管 → 参数/安全表单正常滚动
```

## 不改动项

- Rust 端动画逻辑（`animation.rs`）：无需修改。
- 窗口 sizing 控制器（`controller.ts`）：无需修改。
- 布局计算（`useLauncherLayoutMetrics.ts`）：无需修改。
- 搜索框 `flex-shrink: 0` / `min-height`：保持不变，与本方案互补。

## 验收标准

1. 冷启动后，点击队列 pill 打开 Review，搜索框不被推上去。
2. 快速连续开合 Review，搜索框始终可见。
3. 搜索结果内滚动正常。
4. Review 面板内 staging 卡片列表滚动正常。
5. Flow 抽屉（参数/安全确认）内容滚动正常。
6. `npm run check:all` 全绿。
7. 冷启动后，选择带参数的命令打开参数面板（Flow Drawer），搜索框不被推上去。
