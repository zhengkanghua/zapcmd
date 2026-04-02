# Queue Preflight Cache And Panel Warning Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让命令加入执行流时立即执行 preflight 检测并缓存结果，入队只给 total 小提示，执行流面板按缓存展示单条环境提醒并支持批量/单条刷新，同时取消 prerequisite 对整队列执行的阻断。

**Architecture:** 在现有 `useCommandExecution` 之上新增“队列 preflight 缓存”小模块，负责把 preflight 结果收敛成可持久化的 `preflightCache` 与 total 小提示文案。队列执行链去掉 prerequisite 二次探测与阻断，执行流面板只消费缓存并提供刷新入口，刷新动作覆写缓存但不隐式触发。为避免继续膨胀 `helpers.ts` / `actions.ts`，新增独立 helper 文件承载缓存构建与摘要逻辑。

**Tech Stack:** Vue 3 Composition API, TypeScript, Vitest, vue-tsc, Tauri launcher session persistence

**Design Spec:** `docs/superpowers/specs/2026-04-03-queue-preflight-cache-and-panel-warning-design.md`

---

## 文件结构

### 新建

| 文件 | 职责 |
|---|---|
| `src/composables/execution/useCommandExecution/stagedPreflightCache.ts` | 把 preflight issue 转成 `preflightCache`、卡片摘要与 total 小提示 |
| `src/composables/__tests__/execution/stagedPreflightCache.test.ts` | 锁定缓存构建、系统失败收口、多问题折叠与 total 提示文案 |

### 修改

| 文件 | 职责 |
|---|---|
| `src/features/launcher/types.ts` | 为 `StagedCommand` 增加 `preflightCache` 类型 |
| `src/components/launcher/types.ts` | 为 `QueuedCommand`、QueueReview props 补充缓存与刷新状态/事件 |
| `src/composables/launcher/useLauncherSessionState.ts` | 持久化/恢复 `preflightCache`，升级 session version |
| `src/composables/__tests__/launcher/useLauncherSessionState.test.ts` | 锁定缓存恢复、非法缓存过滤与版本升级 |
| `src/composables/execution/useCommandExecution/model.ts` | 暴露刷新动作和刷新 loading refs |
| `src/composables/execution/useCommandExecution/state.ts` | 管理批量/单条刷新中的临时状态 |
| `src/composables/execution/useCommandExecution/helpers.ts` | 允许构建带缓存的队列项，避免 `appendToStaging` 只会裸入队 |
| `src/composables/execution/useCommandExecution/actions.ts` | 入队先检测并缓存；新增刷新动作；移除队列执行 prerequisite 阻断 |
| `src/composables/execution/useCommandExecution/index.ts` | 导出新增 refs / actions |
| `src/composables/__tests__/execution/useCommandExecution.test.ts` | 锁定入队缓存、total 小提示、刷新动作与队列执行新语义 |
| `src/composables/app/useAppCompositionRoot/launcherVm.ts` | 把刷新动作和刷新状态接到 Queue VM / Action VM |
| `src/components/launcher/LauncherWindow.vue` | 给 Queue 面板传刷新 props 并接收刷新事件 |
| `src/components/launcher/parts/LauncherQueueReviewPanel.vue` | 增加刷新事件透传与 header/list props |
| `src/components/launcher/parts/queueReview/QueueReviewHeader.vue` | 增加“刷新检测”按钮与 loading 态 |
| `src/components/launcher/parts/queueReview/QueueReviewList.vue` | 在有问题时渲染紧凑提醒行与“刷新此条” |
| `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts` | 锁定提醒行、按钮禁用态、事件派发与不显示“检测通过” |
| `src/i18n/messages.ts` | 新增 total 小提示与刷新按钮文案 |
| `docs/active_context.md` | 执行完成后补充实现摘要 |

### 预期不修改

| 文件 | 原因 |
|---|---|
| `src/services/commandPreflight.ts` | 本轮不改 probe transport / invoke contract |
| `src/composables/execution/useCommandExecution/preflightFeedback.ts` | 现有三段式执行反馈继续保留，用于单条直接执行；新增 helper 只服务队列缓存/摘要 |
| `docs/superpowers/specs/**` | spec 已确认，仅作为实现依据 |

---

## Chunk 1: 队列缓存 contract 与持久化

### Task 1: 扩展 `StagedCommand` 与 launcher session snapshot，让 `preflightCache` 可恢复

**Files:**
- Modify: `src/features/launcher/types.ts`
- Modify: `src/components/launcher/types.ts`
- Modify: `src/composables/launcher/useLauncherSessionState.ts`
- Test: `src/composables/__tests__/launcher/useLauncherSessionState.test.ts`

- [ ] **Step 1: 先写失败测试，锁定 `preflightCache` 可持久化恢复**

在 `useLauncherSessionState.test.ts`：

1. 把 `SESSION_VERSION` 从 `2` 升到计划中的新版本值。
2. 在 `createStagedCommand("restored")` 的 fixture 上补：

```ts
preflightCache: {
  checkedAt: 1743648000000,
  issueCount: 1,
  source: "issues",
  issues: ["未检测到 Docker Desktop。"]
}
```

新增两个断言：

```ts
expect(stagedCommands.value[0]?.preflightCache?.issues).toEqual(["未检测到 Docker Desktop。"]);
expect(stagedCommands.value[0]?.preflightCache?.issueCount).toBe(1);
```

再补一条非法缓存输入用例：

```ts
preflightCache: { checkedAt: "bad", issueCount: 1, source: "issues", issues: ["x"] }
```

断言 restore 后该命令仍可恢复，但 `preflightCache` 被安全丢弃。

- [ ] **Step 2: 运行定向测试，确认当前失败**

Run:

```bash
npm run test:run -- src/composables/__tests__/launcher/useLauncherSessionState.test.ts
```

Expected:

- FAIL，提示 `preflightCache` 未恢复，或 session version 不匹配

- [ ] **Step 3: 做最小实现**

在 `src/features/launcher/types.ts` 新增：

```ts
export interface StagedCommandPreflightCache {
  checkedAt: number;
  issueCount: number;
  source: "issues" | "system-failure";
  issues: string[];
}
```

并给 `StagedCommand` 增加：

```ts
preflightCache?: StagedCommandPreflightCache;
```

在 `src/components/launcher/types.ts` 的 `QueuedCommand` 上同步增加 `preflightCache?: StagedCommandPreflightCache;`。

在 `useLauncherSessionState.ts`：

1. 新增 `sanitizePreflightCache()`。
2. `sanitizeStagedCommand()` 中读取合法缓存。
3. `LAUNCHER_SESSION_SCHEMA_VERSION` 升到 `3`。
4. `writeLauncherSession()` 继续直接持久化 `stagedCommands`，不剥离 `preflightCache`。

- [ ] **Step 4: 重新运行定向测试**

Run:

```bash
npm run test:run -- src/composables/__tests__/launcher/useLauncherSessionState.test.ts
```

Expected:

- PASS，带缓存快照可以恢复，非法缓存被安全过滤

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/features/launcher/types.ts src/components/launcher/types.ts src/composables/launcher/useLauncherSessionState.ts src/composables/__tests__/launcher/useLauncherSessionState.test.ts
git commit -m "feat(queue):持久化执行流 preflight 缓存"
```

---

## Chunk 2: 入队缓存与执行语义调整

### Task 2: 抽出队列缓存 helper，锁定摘要规则与 total 小提示

**Files:**
- Create: `src/composables/execution/useCommandExecution/stagedPreflightCache.ts`
- Test: `src/composables/__tests__/execution/stagedPreflightCache.test.ts`

- [ ] **Step 1: 先写失败测试，锁定缓存与摘要规则**

在新测试文件中覆盖 4 类场景：

1. 单一 prerequisite 问题：

```ts
expect(buildStagedPreflightCache("docker-ps", [issue]).issues).toEqual(["未检测到 Docker Desktop。"]);
```

2. 多个问题折叠摘要：

```ts
expect(summarizeStagedPreflightIssues(cache)).toBe("未检测到 Docker Desktop 等 2 项环境提示。");
```

3. `probe-error` / `probe-invalid-response` 收口为系统失败摘要：

```ts
expect(buildStagedPreflightCache("docker-ps", [systemIssue]).source).toBe("system-failure");
```

4. 入队 total 提示：

```ts
expect(buildStageQueueFeedbackMessage(0)).toBe("已加入队列");
expect(buildStageQueueFeedbackMessage(1)).toContain("1 条命令存在环境提示");
```

- [ ] **Step 2: 运行新测试，确认失败**

Run:

```bash
npm run test:run -- src/composables/__tests__/execution/stagedPreflightCache.test.ts
```

Expected:

- FAIL，文件不存在或导出未实现

- [ ] **Step 3: 实现 helper**

在 `stagedPreflightCache.ts` 中实现：

```ts
buildStagedPreflightCache(...)
summarizeStagedPreflightIssues(...)
countQueuedCommandsWithPreflightIssues(...)
buildStageQueueFeedbackMessage(...)
buildRefreshQueueFeedbackMessage(...)
```

实现约束：

1. 只复用现有 prerequisite 文案口径，不新建等级体系。
2. 卡片默认只保留原因主句。
3. 多问题只折叠成一条摘要，不拼接处理建议与 fallback。
4. `buildStageQueueFeedbackMessage(0)` 回落到现有 `launcher.flowAdded`。

- [ ] **Step 4: 重新运行测试**

Run:

```bash
npm run test:run -- src/composables/__tests__/execution/stagedPreflightCache.test.ts
```

Expected:

- PASS，摘要与 total 提示稳定

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/composables/execution/useCommandExecution/stagedPreflightCache.ts src/composables/__tests__/execution/stagedPreflightCache.test.ts
git commit -m "feat(queue):新增执行流 preflight 缓存摘要 helper"
```

### Task 3: 入队先检测并缓存，同时移除队列执行 prerequisite 阻断

**Files:**
- Modify: `src/composables/execution/useCommandExecution/helpers.ts`
- Modify: `src/composables/execution/useCommandExecution/actions.ts`
- Modify: `src/composables/execution/useCommandExecution/model.ts`
- Modify: `src/composables/execution/useCommandExecution/index.ts`
- Test: `src/composables/__tests__/execution/useCommandExecution.test.ts`

- [ ] **Step 1: 先写失败测试，锁定新语义**

在 `useCommandExecution.test.ts` 增加或改写用例：

1. 无问题入队仍保留原提示：

```ts
harness.execution.stageResult(createNoArgCommand());
expect(harness.execution.executionFeedbackMessage.value).toBe("已加入队列");
```

2. prerequisite 失败时仍入队并写缓存：

```ts
harness.runCommandPreflight.mockResolvedValueOnce([missingDocker]);
harness.execution.stageResult(createPrerequisiteCommand());
await flushExecution();
expect(harness.stagedCommands.value[0]?.preflightCache?.issueCount).toBe(1);
expect(harness.execution.executionFeedbackMessage.value).toContain("1 条命令存在环境提示");
```

3. 参数面板 `stage` 模式提交同样写缓存。

4. `executeStaged()` 不再因为 prerequisite 问题阻断：

```ts
await harness.execution.executeStaged();
expect(harness.runCommandsInTerminal).toHaveBeenCalledTimes(1);
expect(harness.runCommandPreflight).not.toHaveBeenCalled();
```

把当前“blocks queue execution when any required prerequisite fails”那组测试整体改写为新语义。

- [ ] **Step 2: 运行定向测试，确认失败**

Run:

```bash
npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts
```

Expected:

- FAIL，现有逻辑仍在队列执行前阻断 prerequisite，且入队不写缓存

- [ ] **Step 3: 做最小实现**

实现要求：

1. 在 `helpers.ts` 中让 `buildStagedCommand()` 接收可选 `preflightCache`，或新增 `appendPreparedToStaging()`，避免再只有“裸命令入队”。
2. 在 `actions.ts` 中新增内部 `stageCommandWithPreflight(command, argValues?)`：
   - 有 prerequisite 时先跑 `runCommandPreflight`
   - 通过 `stagedPreflightCache.ts` 构建缓存
   - 再 append 到队列
   - 最后根据缓存 issue 数设置 total 小提示
3. `stageResult()` 的“无 panel 直接入队”路径改为调用该异步 staging helper。
4. `submitParamInput()` 在 `stage` 模式下 reset panel 后异步调用同一 helper。
5. 删除 `executeStaged()` 内的 `collectQueuePreflightIssues` / `buildPreflightBlockedFeedback` 阻断分支。
6. 队列执行成功提示不再附加 prerequisite warning。

- [ ] **Step 4: 重新运行定向测试**

Run:

```bash
npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts
```

Expected:

- PASS，入队会缓存并提示；队列执行不再被 prerequisite 阻断

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/composables/execution/useCommandExecution/helpers.ts src/composables/execution/useCommandExecution/actions.ts src/composables/execution/useCommandExecution/model.ts src/composables/execution/useCommandExecution/index.ts src/composables/__tests__/execution/useCommandExecution.test.ts
git commit -m "feat(queue):入队缓存 preflight 并移除队列执行阻断"
```

### Task 4: 增加刷新动作与 loading 状态，供执行流面板消费

**Files:**
- Modify: `src/composables/execution/useCommandExecution/model.ts`
- Modify: `src/composables/execution/useCommandExecution/state.ts`
- Modify: `src/composables/execution/useCommandExecution/actions.ts`
- Modify: `src/composables/execution/useCommandExecution/index.ts`
- Modify: `src/composables/app/useAppCompositionRoot/launcherVm.ts`
- Test: `src/composables/__tests__/execution/useCommandExecution.test.ts`

- [ ] **Step 1: 先写失败测试，锁定刷新行为**

在 `useCommandExecution.test.ts` 增加：

1. `refreshQueuedCommandPreflight(id)` 仅覆写一条缓存：

```ts
await harness.execution.refreshQueuedCommandPreflight(targetId);
expect(harness.stagedCommands.value[0]?.preflightCache?.issueCount).toBe(0);
expect(harness.stagedCommands.value[1]?.preflightCache?.issueCount).toBe(1);
```

2. `refreshAllQueuedPreflight()` 批量覆写并给 total 小提示。

3. loading refs：

```ts
expect(harness.execution.refreshingAllQueuedPreflight.value).toBe(false);
expect(harness.execution.refreshingQueuedCommandIds.value).toContain(targetId);
```

- [ ] **Step 2: 运行定向测试，确认失败**

Run:

```bash
npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts
```

Expected:

- FAIL，导出中不存在刷新 action / refs

- [ ] **Step 3: 做最小实现**

在 `model.ts` / `state.ts` / `index.ts` 暴露：

```ts
refreshingAllQueuedPreflight: Ref<boolean>;
refreshingQueuedCommandIds: Ref<string[]>;
refreshQueuedCommandPreflight(id: string): Promise<void>;
refreshAllQueuedPreflight(): Promise<void>;
```

实现约束：

1. loading 状态只存在内存中，不写入 `preflightCache`。
2. 单条刷新只更新命中的队列项。
3. 批量刷新保留原排序、原焦点、原参数值。
4. 完成后通过 `buildRefreshQueueFeedbackMessage()` 给 total 小提示。

在 `launcherVm.ts`：

1. `queue` VM 暴露 `refreshingAllPreflight`、`refreshingCommandIds`。
2. `actions` VM 暴露 `refreshQueuedCommandPreflight`、`refreshAllQueuedPreflight`。

- [ ] **Step 4: 重新运行定向测试**

Run:

```bash
npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts
```

Expected:

- PASS，刷新动作与 loading refs 正常

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/composables/execution/useCommandExecution/model.ts src/composables/execution/useCommandExecution/state.ts src/composables/execution/useCommandExecution/actions.ts src/composables/execution/useCommandExecution/index.ts src/composables/app/useAppCompositionRoot/launcherVm.ts src/composables/__tests__/execution/useCommandExecution.test.ts
git commit -m "feat(queue):新增执行流 preflight 刷新动作"
```

---

## Chunk 3: 面板 UI、文案与门禁

### Task 5: 新增 i18n 文案并把刷新状态接到 Queue 面板

**Files:**
- Modify: `src/i18n/messages.ts`
- Modify: `src/components/launcher/LauncherWindow.vue`
- Modify: `src/components/launcher/types.ts`

- [ ] **Step 1: 先补文案 keys**

在 `messages.ts` 中新增至少这些 key：

```ts
common: {
  refresh: "刷新"
}
launcher: {
  queuePreflightIssueSummary: "{count} 条命令存在环境提示",
  queuePreflightRefreshAll: "刷新检测",
  queuePreflightRefreshOne: "刷新此条",
  queuePreflightRefreshing: "检测中..."
}
```

英文字段同步补齐，名称可微调，但必须保持“common.refresh + launcher queue preflight”语义清晰。

- [ ] **Step 2: 扩展 Queue 面板 props / events contract**

在 `src/components/launcher/types.ts` 给 `LauncherQueueReviewPanelProps` 增加：

```ts
refreshingAllQueuedPreflight: boolean;
refreshingQueuedCommandIds: string[];
```

同时在 `LauncherWindow.vue` 给 `LauncherQueueReviewPanel` 透传：

1. `props.launcherVm.queue.refreshingAllPreflight`
2. `props.launcherVm.queue.refreshingCommandIds`
3. `@refresh-queue-preflight`
4. `@refresh-queued-command-preflight`

- [ ] **Step 3: 运行 typecheck**

Run:

```bash
npx vue-tsc --noEmit
```

Expected:

- PASS，Queue 面板 prop / event 接线完整

- [ ] **Step 4: 提交 checkpoint**

```bash
git add src/i18n/messages.ts src/components/launcher/LauncherWindow.vue src/components/launcher/types.ts
git commit -m "feat(queue):补充 preflight 刷新文案与面板接线"
```

### Task 6: 在 Flow Panel 渲染缓存提醒与刷新按钮

**Files:**
- Modify: `src/components/launcher/parts/LauncherQueueReviewPanel.vue`
- Modify: `src/components/launcher/parts/queueReview/QueueReviewHeader.vue`
- Modify: `src/components/launcher/parts/queueReview/QueueReviewList.vue`
- Test: `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts`

- [ ] **Step 1: 先写失败组件测试**

在 `LauncherFlowPanel.test.ts` 增加：

1. 没有 `preflightCache` 或 `issueCount === 0` 时，不出现“检测通过”或提醒行。
2. 有缓存问题时，卡片渲染紧凑状态行，且默认只显示原因/折叠摘要。
3. 头部“刷新检测”点击后发出 `refresh-queue-preflight`。
4. 单条“刷新此条”点击后发出 `refresh-queued-command-preflight` 并携带命令 id。
5. 批量刷新中时头部按钮 disabled；单条刷新中时该卡按钮 disabled，其他卡不受影响。

- [ ] **Step 2: 运行组件测试，确认失败**

Run:

```bash
npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
```

Expected:

- FAIL，缺少 props / event / DOM 节点

- [ ] **Step 3: 做最小实现**

实现约束：

1. `QueueReviewHeader.vue`：
   - 在清空按钮左侧或右侧新增“刷新检测”按钮
   - 使用 `props.refreshingAllQueuedPreflight` 控制 disabled / 文案
2. `QueueReviewList.vue`：
   - 只在 `cmd.preflightCache?.issueCount > 0` 时渲染紧凑状态行
   - 不渲染“检测通过”
   - 状态行右侧增加“刷新此条”
   - 文案优先取 `cmd.preflightCache.issues[0]`；多条时走折叠摘要 helper 结果
3. `LauncherQueueReviewPanel.vue`：
   - 透传 header/list 所需 props
   - 新增对应 emit

- [ ] **Step 4: 重新运行组件测试与 typecheck**

Run:

```bash
npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
npx vue-tsc --noEmit
```

Expected:

- 全部 PASS，且不出现新的 prop/event 类型错误

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/components/launcher/parts/LauncherQueueReviewPanel.vue src/components/launcher/parts/queueReview/QueueReviewHeader.vue src/components/launcher/parts/queueReview/QueueReviewList.vue src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
git commit -m "feat(queue):在执行流面板展示 preflight 缓存提醒"
```

### Task 7: 统一回归、门禁与短期记忆更新

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 运行所有定向测试**

Run:

```bash
npm run test:run -- \
  src/composables/__tests__/launcher/useLauncherSessionState.test.ts \
  src/composables/__tests__/execution/stagedPreflightCache.test.ts \
  src/composables/__tests__/execution/useCommandExecution.test.ts \
  src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
```

Expected:

- PASS，核心 contract / composable / UI 行为全部通过

- [ ] **Step 2: 运行全量本地门禁**

Run:

```bash
npm run check:all
```

Expected:

- PASS，按仓库门禁全绿

- [ ] **Step 3: 更新短期记忆**

在 `docs/active_context.md` 追加一条 200 字以内摘要，包含：

1. 入队 preflight 缓存已落地
2. 队列面板支持缓存提醒与刷新
3. 队列执行不再被 prerequisite 阻断

- [ ] **Step 4: 提交最终实现**

```bash
git add docs/active_context.md
git commit -m "docs(context):更新执行流 preflight 缓存实现摘要"
```

