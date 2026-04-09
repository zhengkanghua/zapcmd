# Launcher 搜索热路径 / 队列最小快照持久化 / Windows 终端复用约束设计

> 日期：2026-04-09
> 状态：approved
> 范围：Launcher 搜索计算路径、会话持久化快照边界、Windows-only 终端复用语义、settings 保存提示定时器收口

---

## 1. 背景

本轮不是做大重构，而是针对上一轮审查里已经确认的 4 个真实问题，做一次小步但高收益的收口：

1. 搜索结果面板已经做了分批渲染，但搜索计算本身仍是“每次输入都重新匹配 + 重新排序”，而排序比较器里会重复计算分数。
2. 队列会话持久化需要保留，但当前写入的是整份运行态快照，导致高频交互下同步 `localStorage` 写入过重。
3. 终端复用策略当前只有 Windows 真正消费，但前后端没有把“这是有意只做 Windows”的约束写清楚。
4. `settingsSavedTimer` 生命周期已经很短，但缺少 scope dispose 兜底清理。

本轮的原则是：

1. 不改用户能感知到的搜索匹配语义。
2. 不顺手扩平台，不把 Windows-only 功能做成跨平台工程。
3. 不趁机做大架构拆分，只收口热路径和边界。
4. 所有改动都优先复用现有 composable / helper 结构。

---

## 2. 目标

本轮目标：

1. 保持当前搜索结果顺序规则不变，但减少同一查询里的重复算分。
2. 保留会话恢复能力，同时把队列持久化收敛成“最小必要快照”。
3. 明确终端复用策略当前是 Windows-only 约束，而不是未完成的跨平台特性。
4. 收掉 `settingsSavedTimer` 的生命周期尾巴。

本轮不做：

1. 不引入 Web Worker、倒排索引或新的搜索引擎。
2. 不改 Launcher 搜索面板现有的滚动分批渲染策略。
3. 不扩展 macOS / Linux 终端复用实现。
4. 不做 `useAppCompositionRoot/runtime.ts`、`useCommandExecution/actions.ts`、`src-tauri/src/terminal.rs` 的结构性拆分。

---

## 3. 总体决策

### 3.1 搜索继续沿用当前匹配与分数语义

当前搜索的核心语义已经满足产品需求：

1. 大小写不敏感。
2. 支持空格分词后的 AND 匹配。
3. `do` 和 `dock` 这样的查询会得到不同排序结果。
4. tie-break 继续按原始命令顺序稳定排序。

因此本轮不改：

1. `tokenizeQuery()` 的行为。
2. `matchCommand()` 的 AND 匹配语义。
3. `scoreCommand()` 的规则与权重。

本轮只改“计算路径”：

1. 每个候选项在一次查询里只计算一次 score。
2. 排序使用预先算好的 score，而不是在比较器里反复计算。

大白话就是：

1. 搜索规则不动。
2. 只是把“反复算同一道题”改成“每条只算一次”。

### 3.2 不把“结果分页”当成搜索性能主方案

Launcher 搜索面板当前已经有结果分批渲染：

1. 首屏只渲染固定数量。
2. 滚动接近底部时再补渲染。

这解决的是 DOM 渲染成本，不是搜索计算成本。

如果只做“每次先显示 20 条，滚动时再查后 20 条”，问题仍然存在：

1. 为了知道前 20 条是谁，系统还是得先匹配候选项。
2. 仍然需要知道它们的相关性顺序。

因此本轮结论是：

1. 保留现有渲染分批。
2. 先优化搜索计算本身。
3. 不把滚动分页当成主优化方案。

### 3.3 队列持久化改成最小快照，而不是取消持久化

本轮不是删除持久化，而是缩小持久化边界。

当前需要保留的业务能力有 3 类：

1. 参数编辑后，重开应用仍能恢复。
2. 删除队列项后，恢复结果与最后状态一致。
3. 拖动排序后，恢复顺序与最后状态一致。

这些能力不需要保存整份运行态，只需要保存：

1. 队列项顺序
2. 队列项身份
3. 队列项展示兜底信息
4. 参数值

因此本轮最小持久化快照定义为：

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

说明：

1. `id` 用来保留同一命令重复入队时的稳定身份。
2. `sourceCommandId` 用来和当前 catalog 对齐并重建运行态。
3. `title/rawPreview/renderedPreview` 用来在模板缺失时仍能可见地恢复 stale 项。
4. `argValues` 用来恢复用户输入。

本轮明确不持久化：

1. `execution`
2. `executionTemplate`
3. `args`
4. `prerequisites`
5. `preflightCache`
6. `adminRequired`
7. `dangerous`

原因：

1. 这些字段都属于模板衍生或运行时状态。
2. 恢复时应该按当前 catalog 重建，而不是沿用旧快照。
3. `preflightCache` 是临时提示，不值得写盘。

### 3.4 持久化触发策略继续分“立即写”和“延迟写”

上一轮已经有“结构变化立即写 / 高频参数变化延迟写”的基础。

本轮继续保留这个方向，但把 watch 源从“整份 `StagedCommand` 运行态”收敛到“最小快照投影”。

这样带来的直接收益：

1. 参数改动仍然会在 debounce 后持久化。
2. 删除、重排、展开状态仍然立即写入。
3. `preflightCache` 变化不会再触发本地持久化。

大白话就是：

1. 该存的继续存。
2. 不该进持久化的运行时字段，不再带着一起写。

### 3.5 Windows 终端复用策略明确为当前阶段的产品边界

当前实现里：

1. 前端会继续把 `terminalReusePolicy` 下发给执行层。
2. Rust 后端只有 Windows 会真正消费这个值。
3. 非 Windows 会忽略它。

本轮不改行为，只补充注释与契约说明，明确这是“当前阶段有意只做 Windows”的产品边界。

本轮不做：

1. 不补 Linux/macOS 终端复用实现。
2. 不在本轮联动 UI 做平台差异展示。

这样做的原因：

1. 用户已经明确当前只做 Windows。
2. 先把真实边界写清楚，比半成品扩平台更稳。

### 3.6 `settingsSavedTimer` 做 scope cleanup，避免尾部异步残留

这个问题不大，但应该收口：

1. 定时器最长只活 2.2 秒。
2. 页面销毁后，它仍可能短暂持有闭包引用。

本轮做法：

1. 在 `createSettingsMutationHandlers()` 所在作用域里加 `onScopeDispose(clearSettingsSavedTimer)`。
2. 不改现有 toast 行为，不改时长。

---

## 4. 代码边界

### 4.1 搜索路径

修改范围：

1. `src/composables/launcher/useLauncherSearch.ts`
2. `src/composables/__tests__/launcher/useLauncherSearch.test.ts`

边界要求：

1. 结果集仍然输出 `CommandTemplate[]`。
2. 不把分页状态耦合进搜索 composable。
3. 搜索面板 `LauncherSearchPanel.vue` 不需要改交互，只继续消费 `filteredResults`。

### 4.2 队列持久化路径

修改范围：

1. `src/composables/launcher/useLauncherSessionState.ts`
2. `src/features/launcher/stagedCommands.ts`
3. `src/composables/app/useAppCompositionRoot/runtime.ts`
4. `src/composables/__tests__/launcher/useLauncherSessionState.test.ts`
5. 新增 `src/features/launcher/__tests__/stagedCommands.test.ts`

边界要求：

1. `useLauncherSessionState` 负责读写最小 DTO。
2. `stagedCommands.ts` 负责最小 DTO 与完整 `StagedCommand` 的恢复/重建 helper。
3. `runtime.ts` 继续负责在 catalog ready 后按当前模板重建会话队列。

### 4.3 Windows-only 终端复用约束

修改范围：

1. `src/composables/launcher/useTerminalExecution.ts`
2. `src-tauri/src/terminal.rs`
3. 如有必要补充 `src/composables/__tests__/launcher/useTerminalExecution.test.ts`

边界要求：

1. 不改变当前参数传递行为。
2. 只补注释和契约说明。
3. 不在本轮扩平台。

### 4.4 toast 定时器 cleanup

修改范围：

1. `src/composables/app/useAppCompositionRoot/viewModel.ts`
2. `src/composables/__tests__/app/useAppCompositionViewModel.test.ts`

边界要求：

1. 不改变 settings 保存成功提示的显示时长。
2. 只增加作用域销毁时的清理。

---

## 5. 验收标准

### 5.1 搜索

1. `do`、`dock` 等查询的结果语义与当前实现保持一致。
2. tie-break 仍然稳定。
3. 搜索面板现有的滚动增量渲染不受影响。

### 5.2 持久化

1. 参数编辑后仍能恢复。
2. 删除与重排后的顺序仍能恢复。
3. 缺失模板时仍能看到 stale 队列项。
4. `preflightCache` 变化不再触发持久化写入。

### 5.3 Windows 终端复用

1. Windows 现有行为不回退。
2. 非 Windows 忽略该策略的事实被代码注释明确表达。

### 5.4 定时器 cleanup

1. scope dispose 后不再残留 `settingsSavedTimer`。
2. 现有 view model 行为和测试接口不被破坏。

---

## 6. 风险与约束

1. 搜索本轮只做“单次查询单次算分”，不承诺一次性解决未来几千命令规模下的全部性能问题。
2. 最小快照需要兼容旧版本 session；如果快照字段缺失或结构错误，必须 fail-safe 清理。
3. Windows-only 终端复用本轮只补注释，不应被误读成“跨平台已对齐”。
4. `settingsSavedTimer` 是小修，不应顺手把整个 view model 重构成另一套生命周期模型。
