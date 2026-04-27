# Runtime Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收口本轮运行时技术审计确认的 6 个真实问题：命令缓存污染、队列项主键冲突、Catalog 重复刷新、终端 fallback 误持久化、Rust 后台刷新 inflight 卡死、Launcher/Settings 装配边界漂移。

**Architecture:** 保持现有对外 API 与主要交互不变，优先收口“状态正确性”和“边界清晰性”。前端以 TDD 方式把命令目录刷新改成原子提交 + 单飞，把队列项从时间戳伪主键切到真实唯一主键，并把终端 fallback 降为运行时行为；Rust 侧为后台刷新线程增加 guard，避免 panic/提前退出后 inflight 永久卡死；最后再拆分 Launcher 与 Settings 的装配边界，消除双根漂移。

**Tech Stack:** Vue 3、Pinia、TypeScript、Vitest、Rust、Tauri

---

## Chunk 1: 命令目录状态正确性

### Task 1: 为 user command cache 补“取消不污染稳定缓存”回归

**Files:**
- Modify: `src/features/commands/__tests__/userCommandSourceCache.test.ts`
- Modify: `src/composables/__tests__/launcher/useCommandCatalog.test.ts`

- [ ] **Step 1: 写失败测试**
  覆盖两类场景：1）旧 refresh 在删掉旧路径、但未完成新读时被取消，`remapFromCache()` 仍返回上一次稳定快照；2）旧 refresh 完成迟到后，latest refresh 的缓存与模板不被回写污染。

- [ ] **Step 2: 运行定向测试确认 RED**
  Run: `npm run test:run -- src/features/commands/__tests__/userCommandSourceCache.test.ts src/composables/__tests__/launcher/useCommandCatalog.test.ts`
  Expected: FAIL，证明当前 cache 是边扫边改共享状态，而不是原子提交。

- [ ] **Step 3: 写最小实现**
  `src/features/commands/userCommandSourceCache.ts` 改成两阶段提交：
  1. 基于稳定 state 构造 draft cache；
  2. 在 draft 上执行 scan/remove/read/parse；
  3. 只有在请求仍有效时才一次性提交 `cacheByPath/scannedPaths/lastScanIssues/primedScan`。

- [ ] **Step 4: 重跑定向测试确认 GREEN**

### Task 2: 为 command catalog 补 in-flight 单飞，避免重复 scan/read

**Files:**
- Modify: `src/composables/__tests__/launcher/commandCatalogController.test.ts`
- Modify: `src/composables/launcher/useCommandCatalog/controller.ts`

- [ ] **Step 1: 写失败测试**
  覆盖连续两次 `refreshUserCommands()` 时只允许一轮真实 scan/read；第二次调用应复用同一轮 Promise，而不是重新扫描。

- [ ] **Step 2: 运行定向测试确认 RED**
  Run: `npm run test:run -- src/composables/__tests__/launcher/commandCatalogController.test.ts`
  Expected: FAIL，当前 latest-only 只能拦最终应用，不能阻止重复 I/O。

- [ ] **Step 3: 写最小实现**
  在 `useCommandCatalog/controller.ts` 增加 in-flight refresh promise：
  1. 非 force 场景复用当前 refresh；
  2. refresh 完成后清空 in-flight；
  3. 保留 latest-only 语义，防止旧结果覆盖新状态。

- [ ] **Step 4: 重跑定向测试确认 GREEN**

## Chunk 2: 队列项主键与回写安全

### Task 3: 为队列项唯一主键补回归

**Files:**
- Modify: `src/features/launcher/__tests__/stagedCommands.test.ts`
- Modify: `src/composables/__tests__/execution/useCommandExecution.test.ts`
- Modify: `src/features/launcher/stagedCommands.ts`

- [ ] **Step 1: 写失败测试**
  覆盖同一毫秒内连续入队同一命令时，两个队列项 `id` 仍必须不同，且恢复源命令 id 的逻辑不依赖旧的时间戳后缀规则。

- [ ] **Step 2: 运行定向测试确认 RED**
  Run: `npm run test:run -- src/features/launcher/__tests__/stagedCommands.test.ts src/composables/__tests__/execution/useCommandExecution.test.ts`
  Expected: FAIL，当前 `Date.now()` 可产生主键碰撞。

- [ ] **Step 3: 写最小实现**
  把 `buildStagedCommandSnapshot()` 的内部主键改为稳定唯一值，优先使用 `crypto.randomUUID()`，并让 `resolveStagedCommandSourceId()` 只依赖 `sourceCommandId` 或显式兼容旧持久化数据。

- [ ] **Step 4: 重跑定向测试确认 GREEN**

### Task 4: 为 preflight 刷新补“只回写仍存在目标项”回归

**Files:**
- Modify: `src/composables/__tests__/execution/useCommandExecution.test.ts`
- Modify: `src/composables/execution/useCommandExecution/queue.ts`
- Modify: `src/composables/execution/useCommandExecution/actions.ts`

- [ ] **Step 1: 写失败测试**
  覆盖两类竞态：1）单项 preflight 刷新返回前，该项已被删除或替换；2）整队 preflight 刷新返回前，队列顺序或内容已变化。预期只更新仍存在且 id 匹配的项。

- [ ] **Step 2: 运行定向测试确认 RED**
  Run: `npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts`
  Expected: FAIL，当前回写逻辑按旧快照 map 全量覆盖，存在迟到结果污染风险。

- [ ] **Step 3: 写最小实现**
  为 queue preflight 刷新引入 request version / still-present 检查；单项与整队刷新都只对当前队列中仍存在的项回写 cache。

- [ ] **Step 4: 重跑定向测试确认 GREEN**

## Chunk 3: 终端设置纠正边界

### Task 5: 为 fallback 误持久化补回归

**Files:**
- Modify: `src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- Modify: `src/composables/__tests__/app/launcherSettingsWindow.test.ts`
- Modify: `src/composables/__tests__/settings/useSettingsWindowTerminal.test.ts`
- Modify: `src/composables/launcher/useTerminalExecution.ts`
- Modify: `src/composables/app/useAppCompositionRoot/launcherSettingsWindow.ts`
- Modify: `src/composables/settings/useSettingsWindow/terminal.ts`

- [ ] **Step 1: 写失败测试**
  覆盖 `readAvailableTerminals()/refreshAvailableTerminals()` 失败或返回空数组时：
  1. 本次执行可使用 fallback；
  2. 但不得持久化纠正默认终端；
  3. 只有拿到真实探测结果时才允许写回设置。

- [ ] **Step 2: 运行定向测试确认 RED**
  Run: `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts src/composables/__tests__/app/launcherSettingsWindow.test.ts src/composables/__tests__/settings/useSettingsWindowTerminal.test.ts`
  Expected: FAIL，当前 fallback 与持久化纠正被混在一起。

- [ ] **Step 3: 写最小实现**
  为终端解析显式区分 `discovered` 与 `fallback` 来源；仅当来源可信时才执行 `persistCorrectedTerminal()` / `persistSetting()`。

- [ ] **Step 4: 重跑定向测试确认 GREEN**

## Chunk 4: Rust 后台刷新恢复能力

### Task 6: 为 terminal background refresh guard 补回归并修复

**Files:**
- Modify: `src-tauri/src/startup.rs`
- Modify: `src-tauri/src/startup/tests_logic.rs`（若不存在则创建）

- [ ] **Step 1: 写失败测试**
  覆盖后台刷新执行体提前返回或 panic 后，`terminal_refresh_inflight` 仍会被复位。

- [ ] **Step 2: 运行 Rust 定向测试确认 RED**
  Run: `cargo test --manifest-path src-tauri/Cargo.toml startup::tests_logic -- --nocapture`
  Expected: FAIL，当前线程尾部手动 `store(false)` 无法覆盖 panic/早退路径。

- [ ] **Step 3: 写最小实现**
  在 `startup.rs` 引入 RAII guard 或 `catch_unwind + finally` 式收口，确保后台刷新线程退出时无条件复位 inflight。

- [ ] **Step 4: 重跑 Rust 定向测试确认 GREEN**

## Chunk 5: Launcher / Settings 装配边界清晰化

### Task 7: 为双根装配补边界回归并拆分 settings facts

**Files:**
- Modify: `src/composables/__tests__/app/useLauncherEntry.test.ts`
- Modify: `src/composables/__tests__/app/settingsScene.test.ts`
- Modify: `src/composables/app/useAppCompositionRoot/context.ts`
- Modify: `src/composables/app/useAppCompositionRoot/launcherEntry.ts`
- Modify: `src/composables/app/useAppCompositionRoot/settingsScene.ts`
- Modify: `src/composables/app/useAppCompositionRoot/launcherRuntimeAssembly.ts`
- Create: `src/composables/app/useAppCompositionRoot/settingsFacts.ts`（如需要）

- [ ] **Step 1: 写失败测试**
  覆盖主窗口入口不会隐式装配完整 settings scene 副作用；Settings 独立窗口仍保留完整 settings/update/commands 行为。

- [ ] **Step 2: 运行定向测试确认 RED**
  Run: `npm run test:run -- src/composables/__tests__/app/useLauncherEntry.test.ts src/composables/__tests__/app/settingsScene.test.ts`
  Expected: FAIL，当前两条 composition root 边界仍不一致。

- [ ] **Step 3: 写最小实现**
  抽出窗口无关的 settings facts，Launcher 只依赖 facts；Settings 独立窗口继续装配 scene 专属副作用，避免双根漂移。

- [ ] **Step 4: 重跑定向测试确认 GREEN**

## 验证

- [ ] `npm run test:run -- src/features/commands/__tests__/userCommandSourceCache.test.ts src/composables/__tests__/launcher/useCommandCatalog.test.ts src/composables/__tests__/launcher/commandCatalogController.test.ts src/features/launcher/__tests__/stagedCommands.test.ts src/composables/__tests__/execution/useCommandExecution.test.ts src/composables/__tests__/launcher/useTerminalExecution.test.ts src/composables/__tests__/app/launcherSettingsWindow.test.ts src/composables/__tests__/settings/useSettingsWindowTerminal.test.ts src/composables/__tests__/app/useLauncherEntry.test.ts src/composables/__tests__/app/settingsScene.test.ts`
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml startup::tests_logic -- --nocapture`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test:coverage`
- [ ] `npm run build`
- [ ] `npm run check:rust`
- [ ] `npm run test:rust`

## 文档同步

- [ ] 追加 `docs/active_context.md`（200 字以内）
- [ ] 如装配边界发生重命名或结构变化，更新 `docs/project_structure.md`
