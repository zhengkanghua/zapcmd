# Adapter Boundary And Window Cache Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 `App.vue` / `viewModel.ts` / `LauncherFlowPanel.vue` / `useWindowSizing/controller.ts` 建立更清晰的边界，并把 Rust 动画/resize 高频路径的 `unwrap()` 改成可恢复缓存访问。

**Architecture:** 前端不做行为重写，而是把超大对象与超大控制器拆成更小的职责单元：`viewModel` 改成 `launcherVm / settingsVm / appShellVm` 三个边界，`LauncherFlowPanel` 抽出高度观察、抓手重排、内联参数编辑三个 composable，`useWindowSizing/controller.ts` 继续下沉窗口同步、观察期管理和 session 协调。Rust 端新增 `WindowSizeCache` 包装类型，把 `current_size` 从裸 `Mutex` 改成带 poison recovery 的缓存访问器。

**Tech Stack:** Vue 3, Vitest, Vue Test Utils, Tauri 2.x, Rust

**设计文档:** `docs/superpowers/specs/2026-03-21-execution-contract-settings-hardening-design.md`

---

## 文件结构

### 新建

| 文件 | 职责 |
|---|---|
| `src/composables/app/useAppCompositionRoot/launcherVm.ts` | 只组装 LauncherWindow 所需 props / actions |
| `src/composables/app/useAppCompositionRoot/settingsVm.ts` | 只组装 SettingsWindow 所需 props / actions |
| `src/composables/app/useAppCompositionRoot/appShellVm.ts` | 壳层共享动作，如保存 toast、window shell helpers |
| `src/components/launcher/parts/flowPanel/useFlowPanelHeightObservation.ts` | FlowPanel settled 后的高度观察与 timer 管理 |
| `src/components/launcher/parts/flowPanel/useFlowPanelGripReorder.ts` | 抓手重排事件与清理逻辑 |
| `src/components/launcher/parts/flowPanel/useFlowPanelInlineArgs.ts` | FlowPanel 内联参数编辑事件与提示反馈 |
| `src/composables/launcher/useWindowSizing/windowSync.ts` | 负责窗口大小同步、fallback resize 与 style 同步 |
| `src/composables/launcher/useWindowSizing/flowObservation.ts` | 负责 Flow observation 状态机 |
| `src/composables/launcher/useWindowSizing/sessionCoordinator.ts` | 负责 command/flow panel session 协调 |
| `src-tauri/src/animation/size_cache.rs` | 提供 `WindowSizeCache` 读写与 poison recovery |

### 修改

| 文件 | 职责 |
|---|---|
| `src/composables/app/useAppCompositionRoot/viewModel.ts` | 收口成三个子 VM，并删除扁平超大返回对象的组装细节 |
| `src/composables/__tests__/app/useAppCompositionViewModel.test.ts` | 锁定新 VM 边界与旧字段不再外泄 |
| `src/App.vue` | 改成消费 `launcherVm / settingsVm / appShellVm` |
| `src/components/launcher/parts/LauncherFlowPanel.vue` | 消费新的 flowPanel composables，收窄组件主体职责 |
| `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts` | 锁定提取后 DOM / emits contract 不回归 |
| `src/composables/launcher/useWindowSizing/controller.ts` | 只保留高层编排，调用新 helper 模块 |
| `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts` | 锁定控制器 contract 仍成立 |
| `src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts` | 需要时补充新 helper 覆盖 |
| `src-tauri/src/animation/mod.rs` | 改用 `WindowSizeCache` 访问尺寸缓存 |
| `src-tauri/src/windowing.rs` | 同步使用 `WindowSizeCache`，避免直接 `lock().unwrap()` |
| `src-tauri/src/animation/tests_logic.rs` | 锁定 poison recovery 与行为不 panic |
| `docs/active_context.md` | 记录本轮计划摘要 |

---

## Chunk 1: 前端 adapter 边界收口

### Task 1: 把 `viewModel.ts` 改成三个边界对象

**Files:**
- Create: `src/composables/app/useAppCompositionRoot/launcherVm.ts`
- Create: `src/composables/app/useAppCompositionRoot/settingsVm.ts`
- Create: `src/composables/app/useAppCompositionRoot/appShellVm.ts`
- Modify: `src/composables/app/useAppCompositionRoot/viewModel.ts`
- Modify: `src/composables/__tests__/app/useAppCompositionViewModel.test.ts`
- Modify: `src/App.vue`

- [ ] **Step 1: 先写失败测试，锁定新 VM 结构**

在 `useAppCompositionViewModel.test.ts` 增加：

```ts
expect(viewModel.launcherVm).toBeDefined();
expect(viewModel.settingsVm).toBeDefined();
expect(viewModel.appShellVm).toBeDefined();
expect("query" in viewModel).toBe(false);
expect("settingsNavItems" in viewModel).toBe(false);
```

并锁定 `App.vue` 只从这三个对象取值，不再直接解构几十个字段。

- [ ] **Step 2: 运行 view model 定向测试，确认失败**

Run: `npm run test:run -- src/composables/__tests__/app/useAppCompositionViewModel.test.ts`

Expected:
- FAIL，提示当前仍返回扁平超大对象

- [ ] **Step 3: 最小实现三段 VM**

要求：
- `launcherVm` 只含 LauncherWindow 所需 props / emits
- `settingsVm` 只含 SettingsWindow 所需 props / emits
- `appShellVm` 只含保存 toast、hide/close 等壳层动作

`viewModel.ts` 只负责组合，不再自己持有长篇 props 铺平逻辑。

- [ ] **Step 4: 重新运行 view model 定向测试，确认变绿**

Run: `npm run test:run -- src/composables/__tests__/app/useAppCompositionViewModel.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/composables/app/useAppCompositionRoot/launcherVm.ts src/composables/app/useAppCompositionRoot/settingsVm.ts src/composables/app/useAppCompositionRoot/appShellVm.ts src/composables/app/useAppCompositionRoot/viewModel.ts src/composables/__tests__/app/useAppCompositionViewModel.test.ts src/App.vue
git commit -m "refactor(app):拆分 composition view model 边界"
```

### Task 2: 从 `LauncherFlowPanel.vue` 抽出高度观察 / 抓手重排 / 内联编辑

**Files:**
- Create: `src/components/launcher/parts/flowPanel/useFlowPanelHeightObservation.ts`
- Create: `src/components/launcher/parts/flowPanel/useFlowPanelGripReorder.ts`
- Create: `src/components/launcher/parts/flowPanel/useFlowPanelInlineArgs.ts`
- Modify: `src/components/launcher/parts/LauncherFlowPanel.vue`
- Modify: `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts`

- [ ] **Step 1: 先写失败测试，锁定组件主文件缩身后 contract 不变**

在 `LauncherFlowPanel.test.ts` 补针对 emits 的 contract 测试：

```ts
expect(wrapper.emitted("flow-panel-settled")).toHaveLength(1);
expect(wrapper.emitted("staging-drag-end")).toBeTruthy();
expect(wrapper.emitted("update-staged-arg")).toBeTruthy();
```

并加一个快照式约束：主文件不再直接声明 grip cleanup / height timers / inline edit helpers 三套状态。

- [ ] **Step 2: 运行 FlowPanel 定向测试，确认当前基线**

Run: `npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts`

Expected:
- PASS，作为后续提取回归基线

- [ ] **Step 3: 提取三个 composable，并让主组件只做 DOM 组合**

拆分边界：
- `useFlowPanelHeightObservation.ts`
- `useFlowPanelGripReorder.ts`
- `useFlowPanelInlineArgs.ts`

`LauncherFlowPanel.vue` 保留：
- props / emits 定义
- 模板与少量 glue code

- [ ] **Step 4: 重新运行 FlowPanel 定向测试，确认变绿**

Run: `npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/components/launcher/parts/flowPanel/useFlowPanelHeightObservation.ts src/components/launcher/parts/flowPanel/useFlowPanelGripReorder.ts src/components/launcher/parts/flowPanel/useFlowPanelInlineArgs.ts src/components/launcher/parts/LauncherFlowPanel.vue src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
git commit -m "refactor(flow):拆分 flow panel 内部职责"
```

### Task 3: 继续下沉 `useWindowSizing/controller.ts` 的控制流

**Files:**
- Create: `src/composables/launcher/useWindowSizing/windowSync.ts`
- Create: `src/composables/launcher/useWindowSizing/flowObservation.ts`
- Create: `src/composables/launcher/useWindowSizing/sessionCoordinator.ts`
- Modify: `src/composables/launcher/useWindowSizing/controller.ts`
- Modify: `src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`

- [ ] **Step 1: 先写失败测试，锁定 controller 仍是高层编排器**

在 `useWindowSizing.controller.test.ts` 增加针对导出行为的 contract：

```ts
expect(typeof useWindowSizing(...).notifyFlowPanelSettled).toBe("function");
expect(typeof useWindowSizing(...).notifyFlowPanelHeightChange).toBe("function");
```

并补一条“不再直接暴露内部 observation timer 状态”的断言。

- [ ] **Step 2: 运行 window sizing 定向测试，确认当前基线**

Run:
- `npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`
- `npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`

Expected:
- PASS，作为重构前基线

- [ ] **Step 3: 把窗口同步 / observation / session 协调拆到新文件**

拆分目标：
- `windowSync.ts`：`applyWindowSize` 与 style sync
- `flowObservation.ts`：timer / idle / max observation
- `sessionCoordinator.ts`：command/flow panel session 协调

`controller.ts` 只保留：
- state 初始化
- 调度顺序
- 对外 API

- [ ] **Step 4: 重新运行 window sizing 定向测试，确认变绿**

Run:
- `npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`
- `npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/composables/launcher/useWindowSizing/windowSync.ts src/composables/launcher/useWindowSizing/flowObservation.ts src/composables/launcher/useWindowSizing/sessionCoordinator.ts src/composables/launcher/useWindowSizing/controller.ts src/composables/__tests__/launcher/useWindowSizing.controller.test.ts
git commit -m "refactor(layout):继续拆分 window sizing controller"
```

---

## Chunk 2: Rust 窗口尺寸缓存恢复

### Task 4: 引入 `WindowSizeCache`，替换高频路径 `lock().unwrap()`

**Files:**
- Create: `src-tauri/src/animation/size_cache.rs`
- Modify: `src-tauri/src/animation/mod.rs`
- Modify: `src-tauri/src/windowing.rs`
- Modify: `src-tauri/src/animation/tests_logic.rs`
- Modify: `docs/active_context.md`

- [ ] **Step 1: 先写失败测试，锁定 poison recovery 不 panic**

在 `tests_logic.rs` 增加：

```rust
#[test]
fn window_size_cache_recovers_after_poison() {
    // 先制造 poisoned mutex，再确认 read/write 仍返回安全值
}
```

再补：
- 首次读返回默认值
- 写入后读回最新值

- [ ] **Step 2: 运行 Rust 动画逻辑定向测试，确认失败**

Run: `cargo test --manifest-path src-tauri/Cargo.toml animation::tests_logic -- --nocapture`

Expected:
- FAIL，提示当前没有 `WindowSizeCache`

- [ ] **Step 3: 实现 `WindowSizeCache` 并替换高频路径**

建议接口：

```rust
pub(crate) struct WindowSizeCache {
    inner: Mutex<(f64, f64)>,
}

impl WindowSizeCache {
    pub fn read_or_recover(&self) -> (f64, f64) { ... }
    pub fn write_or_recover(&self, width: f64, height: f64) { ... }
}
```

替换位置：
- `animation/mod.rs` 中所有 `current_size.lock().unwrap()`
- `windowing.rs` 中同步缓存的 `unwrap()`

- [ ] **Step 4: 重新运行 Rust 动画逻辑定向测试，确认变绿**

Run: `cargo test --manifest-path src-tauri/Cargo.toml animation::tests_logic -- --nocapture`

Expected:
- PASS

- [ ] **Step 5: 跑一次 Rust 相关回归并提交 checkpoint**

Run:
- `cargo test --manifest-path src-tauri/Cargo.toml animation::tests_logic -- --nocapture`
- `cargo test --manifest-path src-tauri/Cargo.toml`

```bash
git add src-tauri/src/animation/size_cache.rs src-tauri/src/animation/mod.rs src-tauri/src/windowing.rs src-tauri/src/animation/tests_logic.rs docs/active_context.md
git commit -m "fix(window):恢复动画尺寸缓存访问"
```

---

## 最终验证

- [ ] `npm run test:run -- src/composables/__tests__/app/useAppCompositionViewModel.test.ts`
- [ ] `npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts`
- [ ] `npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.controller.test.ts`
- [ ] `npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml animation::tests_logic -- --nocapture`
- [ ] `npm run check:all`

Expected:
- 全绿；若 adapter 拆分导致任何用户行为变化，先回滚该部分结构提取，不要把“重构顺手改行为”混进本计划
