# 设计文档：启动器 UX 优化（频闪修复 / 居中 / 搜索结果保留）

> 日期：2026-03-14
> 状态：待审查

---

## 背景

将窗口大小控制迁移到 Rust 动画后，发现三个 UX 问题：
1. 打开执行流面板时搜索框被挤压导致频闪
2. 搜索面板在窗口中水平左对齐，应居中
3. 命令加入执行流后搜索结果被清空，窗口反复变动

---

## 问题 1：执行流打开时的频闪

### 根因

Vue 响应式更新是同步的（`pendingCommand` 变化 → FlowDrawer 立即渲染），但 Rust 窗口扩展动画需 ~120ms。在窗口尚未扩大的瞬间，`.search-main` 内容高度从 ~62px 跳到 ~340px+，OS 窗口约束导致搜索框被压缩。等动画完成窗口变大，搜索框恢复——这一压一恢复就是频闪。

### 方案：CSS 防缩 + 裁剪

- 给 `.search-capsule` 设定不可压缩的最小高度（`flex-shrink: 0` + `min-height`）
- 确保 `.search-main` 的 `overflow: hidden` 有效裁剪超出窗口的内容
- 窗口扩展动画完成后，FlowDrawer 自然完整显现

### 涉及文件

- `src/styles.css`：修改 `.search-capsule` 和 `.search-main` 样式规则

### 测试要点

- 紧凑状态（仅搜索框）下打开执行流，搜索框不闪烁
- 有搜索结果时打开执行流，搜索框和结果列表不抖动
- 窗口扩展动画完成后，FlowDrawer 完整可见

---

## 问题 2：搜索面板居中

### 根因

`styles.css` 中 `.launcher-root` 的 `place-items: start start` 使内容靠左上角对齐。

### 方案

将 `place-items` 改为 `start center`，使搜索面板水平居中，垂直方向保持靠上。

### 涉及文件

- `src/styles.css`：修改 `.launcher-root` 的 `place-items` 值

### 测试要点

- 搜索面板在各种窗口宽度下水平居中
- staging panel 展开时布局不偏移

---

## 问题 3：保留搜索结果 + 焦点管理

### 根因

`helpers.ts` 中 `appendToStaging` 调用 `clearSearchQueryAndSelection()` 将 `query` 清空，导致 `filteredResults`（computed）返回空数组，搜索结果消失，窗口缩小。

### 方案

**第一步：不清空搜索内容**
- 移除 `appendToStaging` 中的 `clearSearchQueryAndSelection()` 调用
- 搜索框文字和结果列表保持不变，窗口不缩小

**第二步：焦点回搜索框 + 全选**
- 加入执行流 / 确认执行完成后，调用 `scheduleSearchInputFocus(true)`（`true` = 全选文字）
- 用户直接打字即覆盖旧内容，输入下一个命令

### 涉及文件

- `src/composables/execution/useCommandExecution/helpers.ts`：修改 `appendToStaging`
- `src/composables/execution/useCommandExecution/actions.ts`：在完成操作后调用 `scheduleSearchInputFocus(true)`

### 测试要点

- 右键 stage 命令后，搜索结果不消失，搜索框文字全选
- 提交参数执行后，焦点回搜索框，文字全选
- 安全确认后，焦点回搜索框，文字全选
- Esc 取消参数输入后，焦点回搜索框
- 取消安全确认弹窗后，焦点回搜索框（注意：当前 `cancelSafetyExecution` 未调用 `scheduleSearchInputFocus`，实现时需补充）

---

## 不做的事（YAGNI）

- 不改动 Rust 端动画逻辑
- 不改动 FlowDrawer 的动画状态机
- 不引入新的 JS/TS 定时器或 Promise 链来协调窗口与内容渲染
- 不对已 stage 的搜索结果添加视觉标记（保持简单）

---

## 验收标准

1. 紧凑状态下打开执行流无频闪
2. 搜索面板水平居中
3. stage 命令后搜索结果保留，焦点在搜索框且文字全选
4. 所有现有测试通过，`npm run check:all` 全绿
