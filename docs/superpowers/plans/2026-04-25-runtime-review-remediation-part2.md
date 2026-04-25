# Runtime Review Remediation Part 2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复本轮运行时审查剩余的真实问题：Settings 命令目录重复加载、Catalog 过期刷新继续消耗 I/O、终端探测并发重复工作、复杂度门禁缺失以及启动更新失败无退避。

**Architecture:** 保持现有 public API 和窗口装配主路径稳定，只做最小必要的运行时收口。前端通过 `useCommandCatalog` 激活开关与请求取消收敛无效工作；Rust 侧通过 singleflight 风格的探测门禁避免重复扫描；工程侧新增 complexity guard，把既有规则变成自动化检查。

**Tech Stack:** Vue 3、Pinia、TypeScript、Vitest、Node.js scripts、Rust、Tauri

---

## Chunk 1: Settings 命令目录按需激活

### Task 1: 为 Settings 独立窗口补“非 commands 路由不加载 catalog”回归

**Files:**
- Modify: `src/composables/__tests__/app/settingsScene.test.ts`
- Modify: `src/composables/__tests__/app/settingsEntry.test.ts`
- Modify: `src/composables/__tests__/launcher/useCommandCatalog.test.ts`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行定向测试并确认 RED**
Run: `npm run test:run -- src/composables/__tests__/app/settingsScene.test.ts src/composables/__tests__/app/settingsEntry.test.ts src/composables/__tests__/launcher/useCommandCatalog.test.ts`
Expected: FAIL，证明 Settings 默认停留 `hotkeys/general` 时仍会触发 catalog startup refresh。
- [ ] **Step 3: 最小实现：为 `useCommandCatalog` 增加 `activated` 开关，并在 Settings 窗口仅对 `commands` 路由激活**
- [ ] **Step 4: 重跑定向测试确保 GREEN**

### Task 2: 保持主窗口与共享 context 的 catalog 行为不变

**Files:**
- Modify: `src/composables/app/useAppCompositionRoot/settingsScene.ts`
- Modify: `src/composables/launcher/useCommandCatalog.ts`
- Modify: `src/composables/launcher/useCommandCatalog/lifecycle.ts`
- Modify: `src/composables/launcher/useCommandCatalog/types.ts`

- [ ] **Step 1: 主窗口与 `createAppCompositionContext()` 默认仍激活 catalog**
- [ ] **Step 2: Settings 独立窗口 route 切到 `commands` 后再触发首次加载**
- [ ] **Step 3: 确保 locale / disabled ids watcher 在未激活状态下不触发实际 refresh**
- [ ] **Step 4: 重跑相关 app/catalog 测试**

## Chunk 2: Catalog 刷新停止后续读取

### Task 3: 为 user command cache 补“新请求到来后停止后续读取”回归

**Files:**
- Modify: `src/composables/__tests__/launcher/useCommandCatalog.test.ts`
- Modify: `src/features/commands/__tests__/userCommandSourceCache.test.ts`

- [ ] **Step 1: 写失败测试，证明 stale refresh 在被新请求取代后不会继续启动剩余 read 任务**
- [ ] **Step 2: 运行定向测试并确认 RED**
Run: `npm run test:run -- src/composables/__tests__/launcher/useCommandCatalog.test.ts src/features/commands/__tests__/userCommandSourceCache.test.ts`
Expected: FAIL，当前实现虽 latest-only 回写，但旧 refresh 仍继续调度剩余文件读取。
- [ ] **Step 3: 最小实现：request guard 增加 abort 语义，cache refresh 在调度前和任务完成后检查取消**
- [ ] **Step 4: 重跑定向测试确保 GREEN**

### Task 4: 保持 latest-only 回写语义不回退

**Files:**
- Modify: `src/composables/launcher/useCommandCatalog/requestGuard.ts`
- Modify: `src/composables/launcher/useCommandCatalog/controller.ts`
- Modify: `src/features/commands/userCommandSourceCache.ts`

- [ ] **Step 1: 新请求启动时显式中止旧 token**
- [ ] **Step 2: cache refresh 被取消时不再推进 `scannedPaths/lastScanIssues`**
- [ ] **Step 3: 不把取消视为真实错误，不污染 `loadIssues`**
- [ ] **Step 4: 重跑 catalog/cache 定向测试**

## Chunk 3: Rust 终端探测单飞

### Task 5: 为终端探测补 singleflight 回归

**Files:**
- Modify: `src-tauri/src/terminal/tests_cache.rs`
- Modify: `src-tauri/src/app_state.rs`
- Modify: `src-tauri/src/startup.rs`
- Modify: `src-tauri/src/terminal/cache.rs`

- [ ] **Step 1: 写失败测试，证明并发 refresh/discover 只执行一次真实探测**
- [ ] **Step 2: 运行 Rust 定向测试并确认 RED**
Run: `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests_cache -- --nocapture`
Expected: FAIL，当前并发触发会重复执行 detect。
- [ ] **Step 3: 最小实现：给探测流程增加 in-flight 状态与等待/复用结果逻辑**
- [ ] **Step 4: 重跑 Rust 定向测试确保 GREEN**

## Chunk 4: 工程门禁与启动退避

### Task 6: 新增 complexity guard，把体积规则自动化

**Files:**
- Create: `scripts/complexity-guard-lib.mjs`
- Create: `scripts/complexity-guard.mjs`
- Create: `scripts/__tests__/complexity-guard.test.ts`
- Modify: `package.json`

- [ ] **Step 1: 写失败测试，覆盖文件超长、函数超长、允许豁免的 data/generated 文件**
- [ ] **Step 2: 运行定向测试并确认 RED**
Run: `npm run test:run -- scripts/__tests__/complexity-guard.test.ts`
Expected: FAIL，当前仓库没有 complexity guard。
- [ ] **Step 3: 最小实现 complexity guard，并接入 `check:all`**
- [ ] **Step 4: 重跑定向测试确保 GREEN**

### Task 7: 为启动更新检查失败增加 attempt 退避

**Files:**
- Modify: `src/services/__tests__/startupUpdateCheck.test.ts`
- Modify: `src/services/startupUpdateCheck.ts`

- [ ] **Step 1: 写失败测试，证明失败后不会每次启动都立即重试**
- [ ] **Step 2: 运行定向测试并确认 RED**
Run: `npm run test:run -- src/services/__tests__/startupUpdateCheck.test.ts`
Expected: FAIL，当前失败不写 attempt timestamp。
- [ ] **Step 3: 最小实现 attempt timestamp / retry interval 退避**
- [ ] **Step 4: 重跑定向测试确保 GREEN**

## 验证

- [ ] `npm run test:run -- src/composables/__tests__/app/settingsScene.test.ts src/composables/__tests__/app/settingsEntry.test.ts src/composables/__tests__/launcher/useCommandCatalog.test.ts src/features/commands/__tests__/userCommandSourceCache.test.ts src/services/__tests__/startupUpdateCheck.test.ts scripts/__tests__/complexity-guard.test.ts`
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests_cache -- --nocapture`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test:coverage`
- [ ] `npm run build`
- [ ] `npm run check:rust`
- [ ] 补充 `docs/active_context.md`，追加 200 字以内短期记忆
