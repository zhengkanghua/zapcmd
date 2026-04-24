# Runtime Safety And Startup Efficiency Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变现有用户行为 contract 的前提下，分阶段修复 Unix/mac 终端子进程回收风险、拆分过胖的 Rust 终端模块、统一多语言命令目录单一数据源，并消除启动期重复 builtin 加载。

**Architecture:** 本轮采用保守分阶段方案。每个 Chunk 先用测试锁定行为，再做最小实现，通过定向验证后立即提交，避免跨域改动叠加。`terminal.rs` 的拆分只做职责迁移，不重写命令执行协议；命令目录统一以当前支持多语言的 runtime 版本为唯一事实源。

**Tech Stack:** Rust, Tauri, Vue 3 Composition API, TypeScript, Vitest, Vue Test Utils

---

## Chunk 1: Unix/mac 子进程回收

### Task 1: 先写失败测试锁定新的启动回收边界

**Files:**
- Modify: `src-tauri/src/terminal/tests_exec.rs`

- [ ] **Step 1: 写失败测试**

新增测试方向：
- 非 Windows 下新增“后台回收路径”测试，断言新 helper 在 spawn 成功后会走回收分支。
- 保留现有 `spawn_and_forget_propagates_spawn_error` 语义测试，确保失败行为不变。

- [ ] **Step 2: 运行测试并确认 RED**

Run: `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests_exec`
Expected: FAIL，原因是新的回收 helper 或观测点尚不存在。

### Task 2: 最小实现 Unix/mac 回收逻辑

**Files:**
- Modify: `src-tauri/src/terminal.rs`

- [ ] **Step 1: 写最小实现**

要求：
- 引入平台分支的进程启动 helper。
- Windows 继续沿用 fire-and-forget。
- Unix/mac 在 `spawn` 后把 `Child` 交给后台回收逻辑执行 `wait()`。
- `run_command_linux` / `run_command_macos` 调用新 helper。

- [ ] **Step 2: 运行 Rust 定向测试确认 GREEN**

Run: `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests_exec`
Expected: PASS

- [ ] **Step 3: 运行本 Chunk 回归**

Run:
- `npm run test:rust`
- `npm run check:rust`

Expected:
- 全绿

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/terminal.rs src-tauri/src/terminal/tests_exec.rs docs/superpowers/specs/2026-04-24-runtime-safety-and-startup-efficiency-design.md docs/superpowers/plans/2026-04-24-runtime-safety-and-startup-efficiency.md
git commit -m "fix(runtime):补齐终端子进程回收与设计计划"
```

## Chunk 2: 安全拆分 terminal.rs

### Task 3: 先为拆分后的边界补测试锚点

**Files:**
- Modify: `src-tauri/src/terminal/tests_exec.rs`
- Modify: `src-tauri/src/terminal/tests_discovery.rs`
- Modify: `src-tauri/src/terminal/tests_cache.rs`

- [ ] **Step 1: 补失败测试或调整导入锚点**

要求：
- 让 execution / discovery / cache 的测试显式依赖待拆分模块导出，而不是只依赖单个巨型文件。

- [ ] **Step 2: 运行定向测试并确认 RED**

Run:
- `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests_exec`
- `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests_discovery`
- `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests_cache`

Expected: 至少一项因待拆分模块尚不存在而失败。

### Task 4: 拆分 terminal.rs，保持外部行为不变

**Files:**
- Create: `src-tauri/src/terminal/execution.rs`
- Create: `src-tauri/src/terminal/discovery.rs`
- Create: `src-tauri/src/terminal/cache.rs`
- Create: `src-tauri/src/terminal/launch_posix.rs`
- Create: `src-tauri/src/terminal/commands.rs`
- Modify: `src-tauri/src/terminal.rs`

- [ ] **Step 1: 抽离纯函数和平台逻辑**

要求：
- `execution.rs` 承载 sanitize 与 host command builder
- `discovery.rs` 承载 terminal detect / path lookup
- `cache.rs` 承载 snapshot 读写与 cache 协调
- `launch_posix.rs` 承载 mac/linux 的 `ProcessCommand` 构建与启动
- `commands.rs` 承载 Tauri command 入口
- `terminal.rs` 仅保留共享类型、模块导出与必要 glue

- [ ] **Step 2: 跑 Rust 回归**

Run:
- `npm run test:rust`
- `npm run check:rust`

Expected:
- 全绿

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/terminal.rs src-tauri/src/terminal/*.rs
git commit -m "refactor(runtime):拆分终端运行时模块边界"
```

## Chunk 3: 多语言命令目录单一数据源

### Task 5: 先写失败测试锁定唯一真源

**Files:**
- Modify: `src/composables/__tests__/launcher/useCommandCatalog.test.ts`
- Modify: `src/composables/__tests__/app/useLauncherEntry.test.ts`
- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`

- [ ] **Step 1: 写失败测试**

测试方向：
- `useLauncherSearch()` 不再隐式回退到模块级 builtin 常量。
- locale 切换后仍使用 runtime catalog 的多语言版本。
- catalog ready 前后命令来源一致。

- [ ] **Step 2: 运行定向测试并确认 RED**

Run:
- `npm run test:run -- src/composables/__tests__/launcher/useCommandCatalog.test.ts src/features/commands/__tests__/runtimeLoader.test.ts`

Expected: FAIL，原因是旧的全局 fallback 仍存在。

### Task 6: 统一命令目录入口

**Files:**
- Modify: `src/features/commands/commandTemplates.ts`
- Modify: `src/composables/launcher/useLauncherSearch.ts`
- Modify: `src/composables/app/useAppCompositionRoot/context.ts`
- Modify: `src/composables/app/useAppCompositionRoot/launcherEntry.ts`
- Modify: `src/composables/launcher/useCommandCatalog.ts`

- [ ] **Step 1: 最小实现**

要求：
- 明确 `useCommandCatalog()` 为唯一运行时真源。
- `useLauncherSearch()` 改为显式注入 `commandSource`，移除隐藏 fallback。
- 保留类型导出，不让调用方因为纯类型引用被迫大改。

- [ ] **Step 2: 跑前端定向回归**

Run:
- `npm run test:run -- src/composables/__tests__/launcher/useCommandCatalog.test.ts src/composables/__tests__/app/useLauncherEntry.test.ts src/features/commands/__tests__/runtimeLoader.test.ts`
- `npm run typecheck`

Expected:
- 全绿

- [ ] **Step 3: Commit**

```bash
git add src/features/commands/commandTemplates.ts src/composables/launcher/useLauncherSearch.ts src/composables/app/useAppCompositionRoot/context.ts src/composables/app/useAppCompositionRoot/launcherEntry.ts src/composables/launcher/useCommandCatalog.ts
git commit -m "refactor(commands):统一多语言命令目录单一数据源"
```

## Chunk 4: 启动期重复加载治理

### Task 7: 先写失败测试锁定“只初始化一次”

**Files:**
- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`
- Modify: `src/composables/__tests__/launcher/useCommandCatalog.test.ts`

- [ ] **Step 1: 写失败测试**

测试方向：
- builtin command load 结果在同一运行期内可复用。
- locale 切换时重映射，不重复全量初始化 builtin payload。

- [ ] **Step 2: 运行定向测试并确认 RED**

Run:
- `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts src/composables/__tests__/launcher/useCommandCatalog.test.ts`

Expected: FAIL，原因是当前仍会重复初始化。

### Task 8: 实现保守缓存与启动去重

**Files:**
- Modify: `src/features/commands/runtimeLoader.ts`
- Modify: `src/composables/launcher/useCommandCatalog.ts`
- Modify: `src/i18n/index.ts`（仅当需要最小辅助接口时）

- [ ] **Step 1: 最小实现**

要求：
- builtin runtime payload 加载结果改为单例缓存。
- `useCommandCatalog()` 复用缓存结果，不再重复初始化。
- 本轮不引入高风险异步懒加载。

- [ ] **Step 2: 跑全轮验证**

Run:
- `npm run test:rust`
- `npm run check:rust`
- `npm run test:run`
- `npm run typecheck`
- `npm run build`

Expected:
- 全绿

- [ ] **Step 3: 更新短期记忆**

Modify: `docs/active_context.md`

补充一条不超过 200 字的阶段摘要。

- [ ] **Step 4: Commit**

```bash
git add docs/active_context.md src/features/commands/runtimeLoader.ts src/composables/launcher/useCommandCatalog.ts src/i18n/index.ts
git commit -m "perf(runtime):消除启动期重复命令加载"
```
