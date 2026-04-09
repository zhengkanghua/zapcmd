# Launcher 搜索热路径与队列最小快照持久化 Implementation Plan

> **For agentic workers:** REQUIRED: Use `superpowers:subagent-driven-development`（若当前 harness 允许显式子代理）或 `superpowers:executing-plans` 执行本计划。步骤使用 checkbox (`- [ ]`) 语法跟踪。

**Goal:** 在不改变搜索结果语义的前提下，优化 Launcher 搜索热路径、把队列会话持久化收敛成最小快照、明确 Windows-only 终端复用约束，并补齐 settings 保存提示定时器的 scope cleanup。

**Architecture:** 保持现有 `LauncherSearch`、`LauncherSessionState`、`stagedCommands`、`TerminalExecution`、`AppCompositionViewModel` 边界不变，只在热点路径内部收口。搜索优化只改计算流程，不改分数规则；队列恢复继续走“按当前 catalog 重建，缺失模板标记 stale”路线；终端复用不扩平台，只补注释说明。

**Tech Stack:** Vue 3 Composition API、Vitest、Pinia、Tauri 2、Rust

---

## 范围与文件映射

- 搜索热路径
  - Modify: `src/composables/launcher/useLauncherSearch.ts`
  - Test: `src/composables/__tests__/launcher/useLauncherSearch.test.ts`
- 队列最小快照持久化
  - Modify: `src/composables/launcher/useLauncherSessionState.ts`
  - Modify: `src/features/launcher/stagedCommands.ts`
  - Modify: `src/composables/app/useAppCompositionRoot/runtime.ts`
  - Test: `src/composables/__tests__/launcher/useLauncherSessionState.test.ts`
  - Create: `src/features/launcher/__tests__/stagedCommands.test.ts`
- Windows-only 终端复用约束
  - Modify: `src/composables/launcher/useTerminalExecution.ts`
  - Modify: `src-tauri/src/terminal.rs`
  - Test: `src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- settingsSavedTimer cleanup
  - Modify: `src/composables/app/useAppCompositionRoot/viewModel.ts`
  - Test: `src/composables/__tests__/app/useAppCompositionViewModel.test.ts`
- 文档与短期记忆
  - Modify: `docs/active_context.md`
  - Modify: `docs/superpowers/specs/2026-04-09-launcher-search-session-persistence-windows-reuse-design.md`
  - Modify: `plan/2026-04-09-launcher-search-session-persistence-windows-reuse-implementation-plan.md`

---

## Chunk 1: 搜索热路径单次算分

### Task 1: 保持现有排序语义，消除排序阶段重复算分

**Files:**

- Modify: `src/composables/launcher/useLauncherSearch.ts`
- Test: `src/composables/__tests__/launcher/useLauncherSearch.test.ts`

- [ ] **Step 1: 写红灯测试，锁住现有排序语义**

在 `src/composables/__tests__/launcher/useLauncherSearch.test.ts` 补 3 类用例：

```ts
it("keeps ranking semantics for short and narrow queries", () => {
  const commandSource = ref([
    createCommand("docker-logs", "docker logs", "docker logs"),
    createCommand("docker-ps", "docker ps", "docker ps"),
    createCommand("doctl-auth", "doctl auth", "doctl auth init")
  ]);

  const search = useLauncherSearch({ commandSource });
  search.onQueryInput("do");
  const broad = search.filteredResults.value.map((item) => item.id);

  search.onQueryInput("dock");
  const narrow = search.filteredResults.value.map((item) => item.id);

  expect(broad).not.toEqual(narrow);
  expect(narrow[0]).toBe("docker-logs");
});
```

再补一个白盒用例，约束“单次查询里每个候选项只算一次 score”。为此可以先把排名逻辑抽成可注入 scorer 的 helper。

- [ ] **Step 2: 跑定向测试，确认新约束先失败**

Run:

```bash
npm run test -- src/composables/__tests__/launcher/useLauncherSearch.test.ts
```

Expected:

1. 现有语义测试通过
2. 新增“单次查询单次算分”测试失败

- [ ] **Step 3: 写最小实现，保留规则只改计算流程**

在 `src/composables/launcher/useLauncherSearch.ts`：

1. 保留 `tokenizeQuery()`、`matchCommand()`、`scoreCommand()` 的语义。
2. 引入中间结构，例如：

```ts
interface RankedMatch {
  command: CommandTemplate;
  index: number;
  score: number;
}
```

3. 对匹配命中的候选项先 materialize 一次：

```ts
const ranked = searchableCommands.value
  .filter((item) => matchCommand(tokens, item))
  .map((item) => ({
    command: item.command,
    index: item.index,
    score: scoreCommand(normalized, tokens, item)
  }));
```

4. 排序阶段只读 `score/index`，不重复调用 `scoreCommand()`。
5. 继续保留 `MAX_FILTERED_RESULTS = 500` 和现有返回类型。

- [ ] **Step 4: 跑测试确认通过**

Run:

```bash
npm run test -- src/composables/__tests__/launcher/useLauncherSearch.test.ts
```

Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add src/composables/launcher/useLauncherSearch.ts src/composables/__tests__/launcher/useLauncherSearch.test.ts
git commit -m "perf(search):收口 Launcher 搜索热路径重复算分"
```

---

## Chunk 2: 队列最小快照持久化

### Task 2: 只持久化恢复所需的最小信息

**Files:**

- Modify: `src/composables/launcher/useLauncherSessionState.ts`
- Modify: `src/features/launcher/stagedCommands.ts`
- Modify: `src/composables/app/useAppCompositionRoot/runtime.ts`
- Test: `src/composables/__tests__/launcher/useLauncherSessionState.test.ts`
- Create: `src/features/launcher/__tests__/stagedCommands.test.ts`

- [x] **Step 1: 写红灯测试，锁住新的持久化边界**

在 `src/composables/__tests__/launcher/useLauncherSessionState.test.ts` 增加：

1. 结构变化立即写，payload 里不再出现 `execution` / `preflightCache` / `prerequisites`
2. 参数变化 debounce 后写，且 payload 只包含最小快照字段
3. 仅 `preflightCache` 变化时不触发 `setItem`
4. 删除、重排后恢复顺序与最后状态一致

新增 `src/features/launcher/__tests__/stagedCommands.test.ts`：

1. 当前模板存在时，最小快照可按当前 catalog 重建完整 `StagedCommand`
2. 模板缺失时，仍能恢复为可见但阻断执行的 stale 项

示例断言：

```ts
expect(payload.stagedCommands[0]).toEqual({
  id: "docker-logs-1",
  sourceCommandId: "docker-logs",
  title: "docker logs",
  rawPreview: "docker logs {{container}}",
  renderedPreview: "docker logs api",
  argValues: { container: "api" }
});
```

- [x] **Step 2: 跑定向测试，确认边界先失败**

Run:

```bash
npm run test -- src/composables/__tests__/launcher/useLauncherSessionState.test.ts src/features/launcher/__tests__/stagedCommands.test.ts
```

Expected:

1. 现有恢复测试部分失败
2. 新增最小快照与 stale 恢复测试失败

- [x] **Step 3: 写最小实现**

实现拆分要求：

1. 在 `src/features/launcher/stagedCommands.ts` 增加最小 DTO 类型与 helper：

```ts
interface PersistedLauncherSessionCommand {
  id: string;
  sourceCommandId?: string;
  title: string;
  rawPreview: string;
  renderedPreview: string;
  argValues: Record<string, string>;
}
```

2. 增加两个 helper：
   - `buildPersistedLauncherSessionCommandSnapshot()`
   - `restorePersistedLauncherSessionCommandSnapshot()`
3. `useLauncherSessionState.ts` 只读写最小 DTO，不再 sanitize 整份运行态字段图。
4. `runtime.ts` 的 `restoreLauncherSessionCommands()` 改为消费最小 DTO，并继续按当前 catalog 重建。
5. watch 源改成：
   - 结构签名：立即写
   - 最小 DTO 深变化：debounce 写
6. `preflightCache` 不进入最小 DTO，因此不再触发持久化。

- [x] **Step 4: 跑定向测试确认通过**

Run:

```bash
npm run test -- src/composables/__tests__/launcher/useLauncherSessionState.test.ts src/features/launcher/__tests__/stagedCommands.test.ts
```

Expected: PASS

- [x] **Step 5: 跑相关回归，确认入队恢复链路未破**

Run:

```bash
npm run test -- src/__tests__/app.core-path-regression.test.ts src/composables/__tests__/execution/useCommandExecution.test.ts
```

Expected: PASS

- [ ] **Step 6: 提交本任务**

```bash
git add src/composables/launcher/useLauncherSessionState.ts src/features/launcher/stagedCommands.ts src/composables/app/useAppCompositionRoot/runtime.ts src/composables/__tests__/launcher/useLauncherSessionState.test.ts src/features/launcher/__tests__/stagedCommands.test.ts
git commit -m "refactor(session):收口队列最小快照持久化"
```

---

## Chunk 3: Windows-only 终端复用约束

### Task 3: 把“当前只做 Windows”写成清晰契约

**Files:**

- Modify: `src/composables/launcher/useTerminalExecution.ts`
- Modify: `src-tauri/src/terminal.rs`
- Test: `src/composables/__tests__/launcher/useTerminalExecution.test.ts`

- [x] **Step 1: 补一个不改行为的契约测试**

在 `src/composables/__tests__/launcher/useTerminalExecution.test.ts` 增加/补强断言：

1. 前端 dispatch 时继续把 `terminalReusePolicy` 传给 executor
2. 不在前端按平台做额外分支

示例：

```ts
expect(commandExecutor.run).toHaveBeenCalledWith(
  expect.objectContaining({
    terminalReusePolicy: "normal-only"
  })
);
```

- [x] **Step 2: 跑定向测试确认当前行为锁住**

Run:

```bash
npm run test -- src/composables/__tests__/launcher/useTerminalExecution.test.ts
```

Expected: PASS（或新增断言先失败后再进入下一步）

- [x] **Step 3: 在 TS / Rust 两端补契约注释**

要求：

1. `src/composables/launcher/useTerminalExecution.ts` 说明：
   - 前端统一透传策略值
   - 当前只有 Windows 后端真正消费
2. `src-tauri/src/terminal.rs` 说明：
   - 非 Windows 显式忽略 `terminal_reuse_policy`
   - 这是当前阶段的产品边界，不是遗漏实现

本任务不改：

1. UI 显示逻辑
2. 非 Windows 行为

- [x] **Step 4: 重新跑定向测试**

Run:

```bash
npm run test -- src/composables/__tests__/launcher/useTerminalExecution.test.ts
```

Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add src/composables/launcher/useTerminalExecution.ts src-tauri/src/terminal.rs src/composables/__tests__/launcher/useTerminalExecution.test.ts
git commit -m "docs(runtime):明确终端复用当前仅支持 Windows"
```

---

## Chunk 4: settingsSavedTimer scope cleanup

### Task 4: 收口 settings 保存提示定时器尾巴

**Files:**

- Modify: `src/composables/app/useAppCompositionRoot/viewModel.ts`
- Test: `src/composables/__tests__/app/useAppCompositionViewModel.test.ts`

- [ ] **Step 1: 写红灯测试，锁住 dispose 行为**

在 `src/composables/__tests__/app/useAppCompositionViewModel.test.ts` 新增 fake timers + effect scope 用例：

```ts
it("clears settings saved timer on scope dispose", async () => {
  vi.useFakeTimers();
  const scope = effectScope();

  scope.run(() => {
    const vm = createAppCompositionViewModel(context as never, runtime as never);
    void vm.settingsVm.saveSettings();
  });

  scope.stop();
  vi.runAllTimers();

  expect(/* 不再触发销毁后的 toast 更新 */).toBe(true);
});
```

测试目标不是改 toast 语义，而是确认销毁后不会再残留定时器回调。

- [ ] **Step 2: 跑定向测试确认先失败**

Run:

```bash
npm run test -- src/composables/__tests__/app/useAppCompositionViewModel.test.ts
```

Expected: 新增 dispose 用例失败

- [ ] **Step 3: 写最小实现**

在 `src/composables/app/useAppCompositionRoot/viewModel.ts`：

1. 引入 `onScopeDispose`
2. 在 `createSettingsMutationHandlers()` 中注册：

```ts
onScopeDispose(() => {
  clearSettingsSavedTimer();
});
```

3. 不改变 `SETTINGS_SAVED_TOAST_DISMISS_DELAY_MS`
4. 不改现有保存成功提示行为

- [ ] **Step 4: 跑定向测试确认通过**

Run:

```bash
npm run test -- src/composables/__tests__/app/useAppCompositionViewModel.test.ts
```

Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add src/composables/app/useAppCompositionRoot/viewModel.ts src/composables/__tests__/app/useAppCompositionViewModel.test.ts
git commit -m "fix(viewmodel):收口 settings 保存提示定时器生命周期"
```

---

## 最终验证

- [ ] **Step 1: 跑前端定向回归**

```bash
npm run test -- src/composables/__tests__/launcher/useLauncherSearch.test.ts src/composables/__tests__/launcher/useLauncherSessionState.test.ts src/features/launcher/__tests__/stagedCommands.test.ts src/composables/__tests__/launcher/useTerminalExecution.test.ts src/composables/__tests__/app/useAppCompositionViewModel.test.ts
```

Expected: PASS

- [ ] **Step 2: 跑主路径回归**

```bash
npm run test -- src/__tests__/app.core-path-regression.test.ts src/composables/__tests__/execution/useCommandExecution.test.ts
```

Expected: PASS

- [ ] **Step 3: 跑全量门禁**

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run check:rust
npm run test:rust
```

Expected: 全绿

- [ ] **Step 4: 更新短期记忆**

修改 `docs/active_context.md`，只补充本轮设计与计划摘要，控制在 200 字以内。

- [ ] **Step 5: 阶段收尾提交**

```bash
git add docs/active_context.md docs/superpowers/specs/2026-04-09-launcher-search-session-persistence-windows-reuse-design.md plan/2026-04-09-launcher-search-session-persistence-windows-reuse-implementation-plan.md
git commit -m "docs(plan):补充搜索与会话持久化优化设计和计划"
```

---

## 风险提示

1. 搜索优化本轮故意不碰产品语义，若实现时顺手改权重，属于越界。
2. 最小快照需要兼顾“模板存在时重建”和“模板缺失时可见 stale 项”两条路径，不能只保一条。
3. `terminalReusePolicy` 本轮不做 UI 限制，后续审查时必须知道这是有意保留的阶段性产品边界。
4. `settingsSavedTimer` cleanup 是小修，不应顺手引入新的全局 toast 机制或重写 ViewModel 结构。
