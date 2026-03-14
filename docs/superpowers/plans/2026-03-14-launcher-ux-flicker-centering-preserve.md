# 启动器 UX 优化实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复三个 UX 问题：打开执行流时频闪、搜索面板居中、操作后保留搜索结果并全选聚焦。

**Architecture:** 问题 1&2 为纯 CSS 修复，问题 3 需修改 `appendToStaging` 移除清空逻辑，并将相关 `scheduleSearchInputFocus` 参数改为 `true`（全选）。TDD 驱动行为变更。

**Tech Stack:** Vue 3 / TypeScript / CSS / Vitest

**Spec:** `docs/superpowers/specs/2026-03-14-launcher-ux-flicker-centering-preserve-design.md`

**CSS 变量继承说明：** `--search-capsule-height` 定义在 `.search-shell`（`styles.css:64`），`.search-capsule` 是其后代元素，CSS 自定义属性可继承。

**Scope 说明：** `cancelSafetyExecution` 的焦点管理不在本次范围内。用户需求是"完成之后"（staging/执行后），取消安全弹窗时 pendingCommand 仍保留（参数面板仍开启），焦点自然留在参数输入区。

---

## Chunk 1: CSS 修复（居中 + 频闪防护）

### Task 1: 搜索面板居中

**Files:**
- Modify: `src/styles.css:55`

- [ ] **Step 1: 修改 `.launcher-root` 的 `place-items`**

```css
/* 修改前 */
place-items: start start;

/* 修改后 */
place-items: start center;
```

将 `src/styles.css` 第 55 行的 `place-items: start start` 改为 `place-items: start center`，使搜索面板水平居中。

- [ ] **Step 2: 提交**

```bash
git add src/styles.css
git commit -m "fix(ui): 搜索面板在窗口中水平居中"
```

---

### Task 2: 搜索框防缩（频闪修复）

**Files:**
- Modify: `src/styles.css:155-161`（`.search-capsule` 规则）

- [ ] **Step 1: 给 `.search-capsule` 添加防缩样式**

在 `.search-capsule` 规则中添加 `flex-shrink: 0` 和 `min-height`，确保窗口扩展动画期间搜索框不被压缩：

```css
.search-capsule {
  width: 100%;
  margin: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  flex-shrink: 0;
  min-height: var(--search-capsule-height);
}
```

新增最后两行：`flex-shrink: 0` 和 `min-height: var(--search-capsule-height)`。

- [ ] **Step 2: 提交**

```bash
git add src/styles.css
git commit -m "fix(ui): 搜索框设为不可压缩，防止执行流打开时频闪"
```

---

## Chunk 2: 搜索结果保留 + 焦点管理（TDD）

> **TDD 循环 A**：`appendToStaging` 行为变更（不清空搜索 → 焦点全选）
> **TDD 循环 B**：执行完成后焦点全选（`executeSingleCommand` / `runStagedSnapshot`）

### Task 3: 更新所有受 appendToStaging 影响的测试（红灯 A）

**Files:**
- Modify: `src/composables/__tests__/execution/useCommandExecution.test.ts`

本次修改 `appendToStaging` 后，所有调用 `stageResult(无参命令)` 的测试都受影响，因为它们会走 `appendToStaging` 路径。需一次性更新所有相关断言，避免红绿不对齐。

- [ ] **Step 1: 修改 "stages no-arg command" 测试（第 90-101 行）**

```typescript
// 修改前（第 99 行）:
expect(harness.clearSearchQueryAndSelection).toHaveBeenCalledTimes(1);

// 修改后:
expect(harness.clearSearchQueryAndSelection).not.toHaveBeenCalled();
expect(harness.scheduleSearchInputFocus).toHaveBeenCalledWith(true);
```

- [ ] **Step 2: 修改 "blocks queue execution" 测试（第 247-260 行）**

`stageResult(createNoArgCommand())` 现在会触发 `scheduleSearchInputFocus(true)`。在 `executeStaged` 前插入 `mockClear`，隔离 stageResult 和 executeStaged 的焦点调用：

```typescript
// 在第 250 行（executeResult 调用之前）插入:
harness.scheduleSearchInputFocus.mockClear();

// 第 259 行的断言保持不变:
expect(harness.scheduleSearchInputFocus).not.toHaveBeenCalled();
```

这样断言只检查 executeStaged（被阻断）没有额外调用焦点，与原意一致。

- [ ] **Step 3: 修改 "executes staged queue" 测试（第 262-282 行）**

两次 `stageResult` 会各触发一次 `scheduleSearchInputFocus(true)`。在 `executeStaged` 前清空 mock，只检查 executeStaged 本身的焦点行为：

```typescript
// 在第 273 行（executeStaged 调用之前）插入:
harness.scheduleSearchInputFocus.mockClear();

// 修改第 278 行:
// 修改前:
expect(harness.scheduleSearchInputFocus).toHaveBeenCalledWith(false);
// 修改后:
expect(harness.scheduleSearchInputFocus).toHaveBeenCalledWith(true);
```

- [ ] **Step 4: 运行测试确认失败**

Run: `npx vitest run src/composables/__tests__/execution/useCommandExecution.test.ts --reporter=verbose`

Expected: 以下 3 个测试 FAIL：
- "stages no-arg command"（`clearSearchQueryAndSelection` 仍被调用）
- "blocks queue execution"（mockClear 后断言仍通过，但 stageResult 测试已失败所以整体有红灯）
- "executes staged queue"（`scheduleSearchInputFocus` 最后一次调用仍为 `false`）

---

### Task 4: 修改 appendToStaging + submitParamInput 实现（绿灯 A）

**Files:**
- Modify: `src/composables/execution/useCommandExecution/helpers.ts:188`
- Modify: `src/composables/execution/useCommandExecution/actions.ts:268`

- [ ] **Step 1: 修改 `appendToStaging`（helpers.ts）**

将 `clearSearchQueryAndSelection()` 替换为 `scheduleSearchInputFocus(true)`：

```typescript
// 修改前（helpers.ts 第 188 行）:
options.clearSearchQueryAndSelection();

// 修改后:
options.scheduleSearchInputFocus(true);
```

- [ ] **Step 2: 移除 `submitParamInput` 中多余的焦点调用（actions.ts）**

`submitParamInput` 的 stage 分支末尾的 `scheduleSearchInputFocus(false)` 现在多余了（`appendToStaging` 已经包含了焦点调用），删除第 268 行：

```typescript
// 修改前（actions.ts 第 266-268 行）:
resetPendingCommand();
appendToStaging(options, state, command, values);
options.scheduleSearchInputFocus(false);

// 修改后:
resetPendingCommand();
appendToStaging(options, state, command, values);
```

- [ ] **Step 3: 运行测试确认绿灯 A 通过**

Run: `npx vitest run src/composables/__tests__/execution/useCommandExecution.test.ts --reporter=verbose`

Expected: "stages no-arg command" 和 "blocks queue execution" PASS；"executes staged queue" 仍 FAIL（`runStagedSnapshot` 尚未修改）

---

### Task 5: 更新执行后焦点测试（红灯 B）

**Files:**
- Modify: `src/composables/__tests__/execution/useCommandExecution.test.ts`

- [ ] **Step 1: 修改 "executes command from pending execute mode" 测试（第 143 行）**

单命令执行后焦点应全选：

```typescript
// 修改前（第 143 行）:
expect(harness.scheduleSearchInputFocus).toHaveBeenCalledWith(false);

// 修改后:
expect(harness.scheduleSearchInputFocus).toHaveBeenCalledWith(true);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/composables/__tests__/execution/useCommandExecution.test.ts --reporter=verbose`

Expected: "executes command from pending execute mode" FAIL（实现仍传 `false`）

---

### Task 6: 修改执行焦点实现（绿灯 B）

**Files:**
- Modify: `src/composables/execution/useCommandExecution/helpers.ts:177`
- Modify: `src/composables/execution/useCommandExecution/actions.ts:58`

- [ ] **Step 1: 修改 `executeSingleCommand` 的焦点参数（helpers.ts）**

```typescript
// 修改前（helpers.ts 第 177 行）:
options.scheduleSearchInputFocus(false);

// 修改后:
options.scheduleSearchInputFocus(true);
```

- [ ] **Step 2: 修改 `runStagedSnapshot` 的焦点参数（actions.ts）**

```typescript
// 修改前（actions.ts 第 58 行）:
options.scheduleSearchInputFocus(false);

// 修改后:
options.scheduleSearchInputFocus(true);
```

- [ ] **Step 3: 运行测试确认全部通过**

Run: `npx vitest run src/composables/__tests__/execution/useCommandExecution.test.ts --reporter=verbose`

Expected: 全部 17 个测试 PASS

- [ ] **Step 4: 提交**

```bash
git add src/composables/execution/useCommandExecution/helpers.ts src/composables/execution/useCommandExecution/actions.ts src/composables/__tests__/execution/useCommandExecution.test.ts
git commit -m "fix(ux): 操作完成后保留搜索结果，焦点回搜索框并全选文字"
```

---

## Chunk 3: 全量验证

### Task 7: 工程门禁验证

- [ ] **Step 1: 运行全量检查**

Run: `npm run check:all`

Expected: 全绿（lint → typecheck → test:coverage → build → check:rust）

- [ ] **Step 2: 手动验证清单**

1. 紧凑状态（仅搜索框）下打开执行流 → 搜索框不频闪
2. 搜索面板在窗口中水平居中
3. 搜索→右键 stage 命令 → 搜索结果不消失，搜索框文字全选
4. 搜索→点击执行命令 → 执行完成后焦点回搜索框，文字全选
5. Esc 取消参数输入 → 焦点回搜索框（不全选，与之前一致）
