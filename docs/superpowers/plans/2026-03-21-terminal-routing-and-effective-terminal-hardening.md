# Terminal Routing And Effective Terminal Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Windows 终端复用改成显式三挡策略，并让默认终端失效时在设置加载和执行前都能自愈、持久化、稳定下发到 Rust 路由层。

**Architecture:** 前端新增 `terminalReusePolicy` 设置项，并通过统一的 `resolveEffectiveTerminal()` 在设置加载和执行前解析真正可用的终端 id；执行器把 `terminalReusePolicy + requiresElevation + alwaysElevated` 一并透传给 Tauri。Rust 端把终端 id 收口为经过发现与解析的 `ResolvedTerminalProgram`，按复用策略计算 normal/elevated lane，拒绝未知终端 id，并把最近可复用状态改成单一原子结构。

**Tech Stack:** Vue 3, Pinia, Vitest, Tauri 2.x, Rust

**设计文档:** `docs/superpowers/specs/2026-03-21-execution-contract-settings-hardening-design.md`

---

## 文件结构

### 新建

| 文件 | 职责 |
|---|---|
| `src/features/terminals/resolveEffectiveTerminal.ts` | 统一解析 `requestedId -> effectiveId`，返回是否发生回退与推荐提示 |
| `src/features/terminals/__tests__/resolveEffectiveTerminal.test.ts` | 锁定终端自愈解析 contract |

### 修改

| 文件 | 职责 |
|---|---|
| `src/stores/settings/defaults.ts` | 新增 `terminalReusePolicy` 默认值与快照字段 |
| `src/stores/settings/normalization.ts` | 新增 `normalizeTerminalReusePolicy()` |
| `src/stores/settings/migration.ts` | 从旧快照迁移 `terminalReusePolicy` |
| `src/stores/settingsStore.ts` | 暴露 `terminalReusePolicy` state / setter / snapshot |
| `src/stores/__tests__/settingsStore.test.ts` | 锁定新设置的默认值、迁移和 persist round-trip |
| `src/composables/settings/useSettingsWindow/model.ts` | 注入 `terminalReusePolicy` 相关 options/store setter |
| `src/composables/settings/useSettingsWindow/general.ts` | 暴露 `setTerminalReusePolicy()` |
| `src/composables/settings/useSettingsWindow/terminal.ts` | 使用 `resolveEffectiveTerminal()` 修复默认终端 |
| `src/composables/settings/useSettingsWindow/persistence.ts` | 在 `loadSettings()` 和终端列表加载后持久化自愈结果 |
| `src/composables/settings/useSettingsWindow/index.ts` | 透传新 general action 与终端自愈逻辑 |
| `src/components/settings/types.ts` | 为 General 区增加 `terminalReusePolicy` props |
| `src/components/settings/SettingsWindow.vue` | 透传新 General props / emits |
| `src/components/settings/parts/SettingsGeneralSection.vue` | 渲染三挡终端复用策略与解释文案 |
| `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts` | 锁定复用策略文案与布局 |
| `src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts` | 锁定 `setTerminalReusePolicy()` 与默认终端自愈持久化 |
| `src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts` | 锁定 `loadSettings()` 会在回退后写回 store |
| `src/composables/app/useAppCompositionRoot/context.ts` | 透传 `terminalReusePolicy` 到 Settings 和终端执行层 |
| `src/composables/app/useAppCompositionRoot/viewModel.ts` | 透传新设置项到 Settings Window |
| `src/App.vue` | 主窗口设置壳透传 `terminalReusePolicy` |
| `src/AppSettings.vue` | 独立设置窗口透传 `terminalReusePolicy` |
| `src/i18n/messages.ts` | 新增复用策略 label / description / 风险说明 |
| `src/services/commandExecutor.ts` | invoke payload 新增 `terminalReusePolicy` |
| `src/services/__tests__/commandExecutor.test.ts` | 锁定新 invoke payload |
| `src/composables/launcher/useTerminalExecution.ts` | 执行前解析 `effectiveTerminalId`，并透传 `terminalReusePolicy` |
| `src/composables/__tests__/launcher/useTerminalExecution.test.ts` | 锁定执行前自愈与透传 contract |
| `src/__tests__/app.core-path-regression.test.ts` | 锁定设置恢复出的 `terminalReusePolicy` / `effectiveTerminalId` 会沿执行链透传 |
| `src-tauri/src/app_state.rs` | 把最近会话改成单一原子结构，按 normal/elevated lane 记录 |
| `src-tauri/src/startup.rs` | 初始化新的终端 lane 状态 |
| `src-tauri/src/terminal.rs` | Tauri 命令签名升级，拒绝未知终端 id，并通过解析后的终端程序进入 Windows 路由 |
| `src-tauri/src/terminal/windows_routing.rs` | 引入 `TerminalReusePolicy`、lane 决策与未知终端拒绝逻辑 |
| `src-tauri/src/terminal/windows_launch.rs` | 消费 `ResolvedTerminalProgram` 的绝对路径，决定是否更新 lane 状态 |
| `src-tauri/src/terminal/tests_exec.rs` | 锁定三挡复用策略、未知终端、管理员 lane 污染防止、仅成功更新状态 |
| `docs/active_context.md` | 记录本轮计划摘要 |

---

## Chunk 1: Settings 与前端执行 contract

### Task 1: 新增 `terminalReusePolicy` 设置项与 Settings General UI

**Files:**
- Modify: `src/stores/settings/defaults.ts`
- Modify: `src/stores/settings/normalization.ts`
- Modify: `src/stores/settings/migration.ts`
- Modify: `src/stores/settingsStore.ts`
- Modify: `src/stores/__tests__/settingsStore.test.ts`
- Modify: `src/composables/settings/useSettingsWindow/model.ts`
- Modify: `src/composables/settings/useSettingsWindow/general.ts`
- Modify: `src/composables/settings/useSettingsWindow/index.ts`
- Modify: `src/components/settings/types.ts`
- Modify: `src/components/settings/SettingsWindow.vue`
- Modify: `src/components/settings/parts/SettingsGeneralSection.vue`
- Modify: `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`
- Modify: `src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts`
- Modify: `src/composables/app/useAppCompositionRoot/context.ts`
- Modify: `src/composables/app/useAppCompositionRoot/viewModel.ts`
- Modify: `src/App.vue`
- Modify: `src/AppSettings.vue`
- Modify: `src/i18n/messages.ts`

- [ ] **Step 1: 先写失败测试，锁定设置默认值、迁移和 UI 文案**

在 `settingsStore.test.ts` 补 3 组断言：

```ts
it("defaults terminalReusePolicy to never", () => {
  expect(createDefaultSettingsSnapshot().general.terminalReusePolicy).toBe("never");
});

it("migrates terminalReusePolicy from legacy payload", () => {
  const migrated = migrateSettingsPayload({
    version: 1,
    general: { terminalReusePolicy: "normal-and-elevated" }
  });
  expect(migrated?.general.terminalReusePolicy).toBe("normal-and-elevated");
});

it("persists terminalReusePolicy in snapshot", () => {
  const store = useSettingsStore();
  store.setTerminalReusePolicy("normal-only");
  expect(store.toSnapshot().general.terminalReusePolicy).toBe("normal-only");
});
```

在 `useSettingsWindowGeneral.test.ts` 和 `SettingsGeneralSection.i18n.test.ts` 增加：

```ts
expect(wrapper.text()).toContain("终端复用策略");
expect(wrapper.text()).toContain("管理员终端也会复用");
expect(setTerminalReusePolicy).toHaveBeenCalledWith("normal-only");
```

- [ ] **Step 2: 运行 Settings 定向测试，确认失败**

Run:
- `npm run test:run -- src/stores/__tests__/settingsStore.test.ts`
- `npm run test:run -- src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts`
- `npm run test:run -- src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`

Expected:
- FAIL，提示 `terminalReusePolicy` 字段、setter、文案或 props 不存在

- [ ] **Step 3: 做最小实现，把三挡枚举接到 store 与 Settings General**

实现要求：

```ts
export type TerminalReusePolicy = "never" | "normal-only" | "normal-and-elevated";
```

以及：

```ts
setTerminalReusePolicy(value: TerminalReusePolicy): void {
  this.terminalReusePolicy = normalizeTerminalReusePolicy(value);
}
```

UI 要点：
- Settings General 只提供三挡单选/下拉，不提供自由输入
- 每个选项紧贴风险说明
- 默认值必须是 `never`

- [ ] **Step 4: 重新运行 Settings 定向测试，确认变绿**

Run:
- `npm run test:run -- src/stores/__tests__/settingsStore.test.ts`
- `npm run test:run -- src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts`
- `npm run test:run -- src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/stores/settings/defaults.ts src/stores/settings/normalization.ts src/stores/settings/migration.ts src/stores/settingsStore.ts src/stores/__tests__/settingsStore.test.ts src/composables/settings/useSettingsWindow/model.ts src/composables/settings/useSettingsWindow/general.ts src/composables/settings/useSettingsWindow/index.ts src/components/settings/types.ts src/components/settings/SettingsWindow.vue src/components/settings/parts/SettingsGeneralSection.vue src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts src/composables/app/useAppCompositionRoot/context.ts src/composables/app/useAppCompositionRoot/viewModel.ts src/App.vue src/AppSettings.vue src/i18n/messages.ts
git commit -m "feat(settings):新增终端复用策略设置"
```

### Task 2: 引入 `resolveEffectiveTerminal()` 并让默认终端自愈后立即持久化

**Files:**
- Create: `src/features/terminals/resolveEffectiveTerminal.ts`
- Create: `src/features/terminals/__tests__/resolveEffectiveTerminal.test.ts`
- Modify: `src/composables/settings/useSettingsWindow/terminal.ts`
- Modify: `src/composables/settings/useSettingsWindow/persistence.ts`
- Modify: `src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts`
- Modify: `src/composables/launcher/useTerminalExecution.ts`
- Modify: `src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- Modify: `src/__tests__/app.core-path-regression.test.ts`

- [ ] **Step 1: 先写失败测试，锁定自愈解析 contract**

新增 `resolveEffectiveTerminal.test.ts`：

```ts
it("keeps requested terminal when available", () => {
  expect(resolveEffectiveTerminal("pwsh", [{ id: "pwsh" }, { id: "cmd" }], [])).toMatchObject({
    effectiveId: "pwsh",
    corrected: false
  });
});

it("falls back to first available terminal when requested one is missing", () => {
  expect(resolveEffectiveTerminal("ghost", [{ id: "cmd" }], [])).toMatchObject({
    effectiveId: "cmd",
    corrected: true
  });
});
```

并在 `useSettingsWindowPersistence.test.ts` / `useTerminalExecution.test.ts` 加断言：

```ts
expect(settingsStore.persist).toHaveBeenCalledTimes(1);
expect(commandExecutor.run).toHaveBeenCalledWith(
  expect.objectContaining({ terminalId: "cmd" })
);
```

- [ ] **Step 2: 运行终端相关定向测试，确认失败**

Run:
- `npm run test:run -- src/features/terminals/__tests__/resolveEffectiveTerminal.test.ts`
- `npm run test:run -- src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts`
- `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- `npm run test:run -- src/__tests__/app.core-path-regression.test.ts`

Expected:
- FAIL，提示缺少 helper 或执行前仍使用原始 `defaultTerminal`

- [ ] **Step 3: 实现统一终端解析 helper，并在 settings load / 执行前消费**

核心 helper：

```ts
export function resolveEffectiveTerminal(
  requestedId: string,
  availableTerminals: Array<{ id: string }>,
  fallbackOptions: Array<{ id: string }>
) {
  // 返回 effectiveId / corrected / reason
}
```

接线要求：
- `loadSettings()` 之后立即校验
- `readAvailableTerminals()` 结束后再次校验
- `useTerminalExecution()` 每次执行前再校验一次
- 一旦发生回退，必须 `settingsStore.persist()` + `broadcastSettingsUpdated()`

- [ ] **Step 4: 重新运行终端定向测试，确认变绿**

Run:
- `npm run test:run -- src/features/terminals/__tests__/resolveEffectiveTerminal.test.ts`
- `npm run test:run -- src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts`
- `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- `npm run test:run -- src/__tests__/app.core-path-regression.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/features/terminals/resolveEffectiveTerminal.ts src/features/terminals/__tests__/resolveEffectiveTerminal.test.ts src/composables/settings/useSettingsWindow/terminal.ts src/composables/settings/useSettingsWindow/persistence.ts src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts src/composables/launcher/useTerminalExecution.ts src/composables/__tests__/launcher/useTerminalExecution.test.ts src/__tests__/app.core-path-regression.test.ts
git commit -m "fix(terminal):执行前解析并持久化有效终端"
```

---

## Chunk 2: 执行器 payload 与 Rust Windows 路由

### Task 3: 扩展执行器请求结构，透传 `terminalReusePolicy`

**Files:**
- Modify: `src/services/commandExecutor.ts`
- Modify: `src/services/__tests__/commandExecutor.test.ts`
- Modify: `src/composables/launcher/useTerminalExecution.ts`
- Modify: `src/composables/__tests__/launcher/useTerminalExecution.test.ts`

- [ ] **Step 1: 先写失败测试，锁定新 invoke payload**

在 `commandExecutor.test.ts` 增加：

```ts
await executor.run({
  terminalId: "wt",
  command: "echo 1",
  requiresElevation: true,
  alwaysElevated: false,
  terminalReusePolicy: "normal-only"
});

expect(invokeMock).toHaveBeenCalledWith("run_command_in_terminal", {
  terminalId: "wt",
  command: "echo 1",
  requiresElevation: true,
  alwaysElevated: false,
  terminalReusePolicy: "normal-only"
});
```

- [ ] **Step 2: 运行执行器定向测试，确认失败**

Run:
- `npm run test:run -- src/services/__tests__/commandExecutor.test.ts`
- `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`

Expected:
- FAIL，提示 payload 缺少 `terminalReusePolicy`

- [ ] **Step 3: 最小实现 payload 扩展**

```ts
export interface CommandExecutionRequest {
  terminalId: string;
  command: string;
  requiresElevation?: boolean;
  alwaysElevated?: boolean;
  terminalReusePolicy?: TerminalReusePolicy;
}
```

`useTerminalExecution()` 必须透传当前设置值，不允许在执行器层回落成隐式默认值。

- [ ] **Step 4: 重新运行执行器定向测试，确认变绿**

Run:
- `npm run test:run -- src/services/__tests__/commandExecutor.test.ts`
- `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/services/commandExecutor.ts src/services/__tests__/commandExecutor.test.ts src/composables/launcher/useTerminalExecution.ts src/composables/__tests__/launcher/useTerminalExecution.test.ts
git commit -m "feat(terminal):透传终端复用策略到执行器"
```

### Task 4: 先写 Rust 失败测试，锁定三挡路由与未知终端拒绝

**Files:**
- Modify: `src-tauri/src/terminal/tests_exec.rs`
- Modify: `src-tauri/src/app_state.rs`
- Modify: `src-tauri/src/startup.rs`
- Modify: `src-tauri/src/terminal.rs`
- Modify: `src-tauri/src/terminal/windows_routing.rs`
- Modify: `src-tauri/src/terminal/windows_launch.rs`

- [ ] **Step 1: 在 `tests_exec.rs` 先写失败测试**

至少补以下断言：

```rust
#[test]
fn never_policy_does_not_reuse_previous_elevated_lane_for_normal_command() { ... }

#[test]
fn normal_only_policy_never_reuses_elevated_lane() { ... }

#[test]
fn normal_and_elevated_policy_can_reuse_wt_admin_lane() { ... }

#[test]
fn unknown_terminal_id_returns_invalid_request() { ... }

#[test]
fn only_success_updates_windows_reusable_session_state() { ... }
```

同时锁定 `launch_plan.program` 必须来自解析后的终端程序，而不是裸字符串 fallback。

- [ ] **Step 2: 运行 Rust 定向测试，确认失败**

Run: `cargo test --manifest-path src-tauri/Cargo.toml tests_exec -- --nocapture`

Expected:
- FAIL，提示路由策略、未知终端处理或 lane 状态与新 contract 不符

- [ ] **Step 3: 实现 `ResolvedTerminalProgram + TerminalReusePolicy + WindowsReusableSessionState`**

Rust 目标结构：

```rust
enum TerminalReusePolicy {
    Never,
    NormalOnly,
    NormalAndElevated,
}

struct ResolvedTerminalProgram {
    id: String,
    executable_path: PathBuf,
    supports_reuse: bool,
}

struct WindowsReusableSessionState {
    normal: Option<String>,
    elevated: Option<String>,
}
```

实现要求：
- `terminal_id` 必须先解析成白名单终端程序
- 未知值直接返回 `TerminalExecutionError::new("invalid-request", ...)`
- `Never` 不命中任何已有 lane
- `NormalOnly` 只允许 normal lane
- `NormalAndElevated` 才允许 elevated lane

- [ ] **Step 4: 用新状态结构重写 Windows launch/update 逻辑**

关键要求：
- `app_state.rs` 不再拆两个 `Mutex`
- 只有成功启动后才更新 lane 状态
- `alwaysElevated` 继续保留，但不能绕过 `terminalReusePolicy`
- `wt` 仍沿用普通/管理员双窗口 id；传统控制台只复用权限语义，不复用同一进程

- [ ] **Step 5: 重新运行 Rust 定向测试，确认变绿**

Run: `cargo test --manifest-path src-tauri/Cargo.toml tests_exec -- --nocapture`

Expected:
- PASS

- [ ] **Step 6: 提交 checkpoint**

```bash
git add src-tauri/src/app_state.rs src-tauri/src/startup.rs src-tauri/src/terminal.rs src-tauri/src/terminal/windows_routing.rs src-tauri/src/terminal/windows_launch.rs src-tauri/src/terminal/tests_exec.rs
git commit -m "feat(terminal):按显式策略重写 Windows 终端路由"
```

### Task 5: 跑跨层回归，确认前后端 contract 对齐

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 运行跨层定向测试**

Run:
- `npm run test:run -- src/services/__tests__/commandExecutor.test.ts`
- `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- `npm run test:run -- src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts`
- `npm run test:run -- src/__tests__/app.core-path-regression.test.ts`
- `cargo test --manifest-path src-tauri/Cargo.toml tests_exec -- --nocapture`

Expected:
- 全部 PASS

- [ ] **Step 2: 补充 `active_context`**

记录：
- `terminalReusePolicy` 已接入 settings / execution / Rust route
- 默认终端自愈与持久化已闭环
- Windows lane 状态已不再跟随“最近一次管理员会话”污染普通执行

- [ ] **Step 3: 提交 checkpoint**

```bash
git add docs/active_context.md
git commit -m "docs:记录终端路由与有效终端加固"
```

---

## 最终验证

- [ ] `npm run test:run -- src/stores/__tests__/settingsStore.test.ts`
- [ ] `npm run test:run -- src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts`
- [ ] `npm run test:run -- src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts`
- [ ] `npm run test:run -- src/features/terminals/__tests__/resolveEffectiveTerminal.test.ts`
- [ ] `npm run test:run -- src/services/__tests__/commandExecutor.test.ts`
- [ ] `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- [ ] `npm run test:run -- src/__tests__/app.core-path-regression.test.ts`
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml tests_exec -- --nocapture`
- [ ] `npm run check:all`

Expected:
- 全绿；若 `npm run check:all` 失败，不要继续实现其它计划，先修本计划回归
