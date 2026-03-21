# Windows 管理员终端路由 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Windows 下为 `adminRequired` 命令和执行流引入真实的管理员终端路由，同时保持 ZapCmd 主进程不提权、`wt`/传统控制台语义稳定、执行流仍是一条终端一次投递。

**Architecture:** 前端只新增两个稳定输入：Settings 的 `alwaysElevatedTerminal` 开关，以及每次执行的 `requiresElevation` 布尔值；不保存任何终端权限状态。Rust 端在现有 Windows launch plan 之上新增纯路由层和 UAC 提权分支，利用 `AppState` 维护“最近权限态”，把 `wt` 的普通/管理员窗口 ID 与 `cmd` / `powershell` / `pwsh` 的提权差异都收口在一个中心路由里。前端错误处理改为优先识别结构化执行错误，再回退到现有字符串分类。

**Tech Stack:** Vue 3, Pinia, Vitest, Tauri 2.x, Rust, Windows ShellExecuteEx / `runas`

**设计文档:** `docs/superpowers/specs/2026-03-21-windows-terminal-admin-routing-design.md`

---

## 文件结构

### 新建

| 文件 | 职责 |
|---|---|
| `src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts` | 锁定新管理员终端开关在 Settings General actions 中的持久化与错误状态语义 |
| `src-tauri/src/terminal/windows_routing.rs` | Windows 纯路由层：权限策略、最近权限态、`wt` 普通/管理员窗口 ID、launch plan 决策 |

### 修改

| 文件 | 职责 |
|---|---|
| `src/stores/settings/defaults.ts` | 为 `general` 新增 `alwaysElevatedTerminal` 默认值与快照类型 |
| `src/stores/settings/normalization.ts` | 规范化 `alwaysElevatedTerminal` |
| `src/stores/settings/migration.ts` | 从旧设置快照迁移 `alwaysElevatedTerminal` |
| `src/stores/settingsStore.ts` | 暴露 `alwaysElevatedTerminal` state / setter / snapshot |
| `src/stores/__tests__/settingsStore.test.ts` | 锁定新设置的默认值、迁移、persist round-trip |
| `src/components/settings/types.ts` | 把新设置透传到 Settings General props |
| `src/components/settings/SettingsWindow.vue` | 增加 General 分区的事件与 props 透传 |
| `src/components/settings/parts/SettingsGeneralSection.vue` | 渲染“始终调用管理员权限终端”开关并发出事件 |
| `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts` | 锁定新开关在中英文下的文案和布局 |
| `src/components/settings/__tests__/SettingsWindow.layout.test.ts` | 锁定 SettingsWindow props shell 继续稳定 |
| `src/composables/settings/useSettingsWindow/model.ts` | 为 Settings General actions / options 注入 `alwaysElevatedTerminal` 与 store setter |
| `src/composables/settings/useSettingsWindow/general.ts` | 增加 `setAlwaysElevatedTerminal` 动作 |
| `src/composables/settings/useSettingsWindow/index.ts` | 透传新的 General action |
| `src/composables/app/useAppCompositionRoot/context.ts` | 从 store 读出 `alwaysElevatedTerminal` 并透传给设置页与终端执行层 |
| `src/composables/app/useAppCompositionRoot/viewModel.ts` | Settings props 与 mutation handlers 透传新开关 |
| `src/App.vue` | 主应用设置窗口透传新 props / 事件 |
| `src/AppSettings.vue` | 独立设置窗口透传新 props / 事件 |
| `src/services/commandExecutor.ts` | 扩展 invoke payload，统一把 Tauri 错误归一成结构化 JS 执行错误 |
| `src/services/__tests__/commandExecutor.test.ts` | 锁定 invoke payload 与结构化错误归一化 |
| `src/composables/launcher/useTerminalExecution.ts` | 每次执行时把 `requiresElevation` 与 `alwaysElevated` 一并传给执行器 |
| `src/composables/__tests__/launcher/useTerminalExecution.test.ts` | 锁定单条 / 队列请求中两个权限标记的透传 |
| `src/composables/execution/useCommandExecution/model.ts` | 终端执行函数签名升级，接受执行选项 |
| `src/composables/execution/useCommandExecution/helpers.ts` | 结构化执行错误映射为 UI 反馈文案 |
| `src/composables/execution/useCommandExecution/actions.ts` | 单条命令与队列计算 `requiresElevation`；队列按 `some(adminRequired)` 整体升权 |
| `src/composables/__tests__/execution/useCommandExecution.test.ts` | 锁定单条按需升权、队列整体升权、UAC 取消反馈 |
| `src/__tests__/app.core-path-regression.test.ts` | 锁定 Settings 恢复出的 `alwaysElevatedTerminal` 会沿执行链传到执行器 |
| `src/i18n/messages.ts` | 新增管理员终端设置、UAC 取消/失败文案，修正文案误导 |
| `src-tauri/Cargo.toml` | 如需要，新增 Windows Shell API 直接依赖 |
| `src-tauri/src/app_state.rs` | 扩展最近权限态存储 |
| `src-tauri/src/startup.rs` | 初始化最近权限态 |
| `src-tauri/src/terminal.rs` | Tauri 命令签名升级、Windows 提权分支接线、错误返回升级 |
| `src-tauri/src/terminal/tests_exec.rs` | 锁定 Windows 权限路由、`wt` 双窗口 ID、UAC 错误映射 |
| `docs/command_sources/README.md` | 修正文档中 `adminRequired` 的 Windows 行为说明 |
| `README.md` | 补充 Windows 管理员终端行为说明 |
| `README.zh-CN.md` | 补充 Windows 管理员终端行为说明（中文） |
| `docs/active_context.md` | 记录本轮管理员终端路由计划摘要 |

### 不改

| 文件 | 原因 |
|---|---|
| `src/features/security/commandSafety.ts` | 继续只负责安全确认与 `adminRequired` 元数据暴露，不承担提权逻辑 |
| `src/features/commands/*` | `adminRequired` 元数据已经完整存在，无需变更 schema/runtime mapper |
| `src-tauri/src/terminal/tests_discovery.rs` | 终端发现逻辑本轮不变 |
| `src/composables/launcher/useLauncherSessionState.ts` | 执行流项里已有 `adminRequired`，不需要扩展 session 存储结构 |

---

## Chunk 1: Settings Contract 与前端开关透传

### Task 1: 先把 `alwaysElevatedTerminal` 做成稳定设置项

**Files:**
- Modify: `src/stores/settings/defaults.ts`
- Modify: `src/stores/settings/normalization.ts`
- Modify: `src/stores/settings/migration.ts`
- Modify: `src/stores/settingsStore.ts`
- Modify: `src/stores/__tests__/settingsStore.test.ts`

- [ ] **Step 1: 在 `settingsStore.test.ts` 先写失败测试，锁定默认值 / 迁移 / persist**

补 3 组断言：

```ts
it("defaults alwaysElevatedTerminal to false", () => {
  expect(createDefaultSettingsSnapshot().general.alwaysElevatedTerminal).toBe(false);
});

it("migrates alwaysElevatedTerminal from legacy payload", () => {
  const migrated = migrateSettingsPayload({
    version: 1,
    general: { alwaysElevatedTerminal: "true" }
  });
  expect(migrated?.general.alwaysElevatedTerminal).toBe(true);
});

it("persists alwaysElevatedTerminal in snapshot", () => {
  const store = useSettingsStore();
  store.setAlwaysElevatedTerminal(true);
  expect(store.toSnapshot().general.alwaysElevatedTerminal).toBe(true);
});
```

- [ ] **Step 2: 运行设置存储定向测试，确认失败**

Run: `npm run test:run -- src/stores/__tests__/settingsStore.test.ts`

Expected:
- FAIL，提示 `alwaysElevatedTerminal` 不存在
- 或 setter / snapshot 字段缺失

- [ ] **Step 3: 只做最小实现，把新布尔值接入 store**

实现要点：

```ts
general: {
  defaultTerminal: string;
  language: AppLocale;
  autoCheckUpdate: boolean;
  launchAtLogin: boolean;
  alwaysElevatedTerminal: boolean;
}
```

以及：

```ts
setAlwaysElevatedTerminal(value: boolean): void {
  this.alwaysElevatedTerminal = normalizeBoolean(value, false);
}
```

注意：
- `defaults.ts` 设默认值 `false`
- `normalization.ts` / `migration.ts` 都必须兼容旧快照缺字段
- `snapshotFromState()` 与 `applySnapshot()` 保持 DRY

- [ ] **Step 4: 重新运行设置存储定向测试，确认变绿**

Run: `npm run test:run -- src/stores/__tests__/settingsStore.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/stores/settings/defaults.ts src/stores/settings/normalization.ts src/stores/settings/migration.ts src/stores/settingsStore.ts src/stores/__tests__/settingsStore.test.ts
git commit -m "feat(settings):新增管理员终端开关存储"
```

### Task 2: 把管理员终端开关接到 Settings General UI

**Files:**
- Create: `src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts`
- Modify: `src/composables/settings/useSettingsWindow/model.ts`
- Modify: `src/composables/settings/useSettingsWindow/general.ts`
- Modify: `src/composables/settings/useSettingsWindow/index.ts`
- Modify: `src/components/settings/types.ts`
- Modify: `src/components/settings/SettingsWindow.vue`
- Modify: `src/components/settings/parts/SettingsGeneralSection.vue`
- Modify: `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`
- Modify: `src/components/settings/__tests__/SettingsWindow.layout.test.ts`
- Modify: `src/composables/app/useAppCompositionRoot/context.ts`
- Modify: `src/composables/app/useAppCompositionRoot/viewModel.ts`
- Modify: `src/App.vue`
- Modify: `src/AppSettings.vue`
- Modify: `src/i18n/messages.ts`

- [ ] **Step 1: 先写失败测试，锁定 General actions 与 UI 透传**

新增 `useSettingsWindowGeneral.test.ts`，至少覆盖：

```ts
it("setAlwaysElevatedTerminal persists immediately", async () => {
  actions.setAlwaysElevatedTerminal(true);
  expect(options.alwaysElevatedTerminal.value).toBe(true);
  expect(persistSetting).toHaveBeenCalledTimes(1);
});
```

并在 `SettingsGeneralSection.i18n.test.ts` 增加断言：

```ts
expect(wrapper.text()).toContain("始终调用管理员权限终端");
expect(wrapper.findAll(".setting-item")).toHaveLength(6);
```

还要在 `SettingsWindow.layout.test.ts` 保持 props shell 稳定，确认新字段显式出现在 props，而没有回流成 legacy dropdown 状态。

- [ ] **Step 2: 运行 Settings 定向测试，确认失败**

Run:
- `npm run test:run -- src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts`
- `npm run test:run -- src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`
- `npm run test:run -- src/components/settings/__tests__/SettingsWindow.layout.test.ts`

Expected:
- FAIL，提示 `alwaysElevatedTerminal` props / action / i18n key 缺失

- [ ] **Step 3: 最小实现 Settings 开关链路**

实现要点：

1. `UseSettingsWindowOptions` / `SettingsStoreLike` 新增：

```ts
alwaysElevatedTerminal: Ref<boolean>;
setAlwaysElevatedTerminal: (value: boolean) => void;
```

2. `createGeneralActions()` 新增：

```ts
function setAlwaysElevatedTerminal(value: boolean): void {
  options.alwaysElevatedTerminal.value = value;
  options.settingsStore.setAlwaysElevatedTerminal(value);
  clearSettingsErrorState(state);
  void persistSetting();
}
```

3. `SettingsGeneralSection.vue` 在“默认终端”下方新增 `SToggle`
4. `App.vue` 与 `AppSettings.vue` 都要透传这个 prop / event，避免主窗口和独立设置窗口行为分裂
5. `messages.ts` 同步新增中英文 label/description，并把旧的 `terminalHint` 改成不再暗示“ZapCmd 自身提权”

- [ ] **Step 4: 重新运行 Settings 定向测试，确认变绿**

Run:
- `npm run test:run -- src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts`
- `npm run test:run -- src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`
- `npm run test:run -- src/components/settings/__tests__/SettingsWindow.layout.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts src/composables/settings/useSettingsWindow/model.ts src/composables/settings/useSettingsWindow/general.ts src/composables/settings/useSettingsWindow/index.ts src/components/settings/types.ts src/components/settings/SettingsWindow.vue src/components/settings/parts/SettingsGeneralSection.vue src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts src/composables/app/useAppCompositionRoot/context.ts src/composables/app/useAppCompositionRoot/viewModel.ts src/App.vue src/AppSettings.vue src/i18n/messages.ts
git commit -m "feat(settings):接入管理员终端开关"
```

---

## Chunk 2: 前端执行 Contract 与错误反馈

### Task 3: 扩展执行器请求结构，并把 Tauri 错误归一成结构化 JS 错误

**Files:**
- Modify: `src/services/commandExecutor.ts`
- Modify: `src/services/__tests__/commandExecutor.test.ts`

- [ ] **Step 1: 先写失败测试，锁定新 invoke payload 与错误归一化**

补 2 组测试：

```ts
await executor.run({
  terminalId: "wt",
  command: "echo test",
  requiresElevation: true,
  alwaysElevated: false
});

expect(invokeMock).toHaveBeenCalledWith("run_command_in_terminal", {
  terminalId: "wt",
  command: "echo test",
  requiresElevation: true,
  alwaysElevated: false
});
```

以及：

```ts
invokeMock.mockRejectedValueOnce({
  code: "elevation-cancelled",
  message: "user cancelled elevation"
});

await expect(executor.run(...)).rejects.toMatchObject({
  code: "elevation-cancelled"
});
```

- [ ] **Step 2: 运行执行器定向测试，确认失败**

Run: `npm run test:run -- src/services/__tests__/commandExecutor.test.ts`

Expected:
- FAIL，提示 invoke payload 缺字段
- 或 rejection 仍是裸对象 / 字符串

- [ ] **Step 3: 最小实现请求扩展与错误归一化**

实现要点：

```ts
export interface CommandExecutionRequest {
  terminalId: string;
  command: string;
  requiresElevation?: boolean;
  alwaysElevated?: boolean;
}
```

以及：

```ts
export class CommandExecutionError extends Error {
  code: string;
}
```

归一化规则：
- 如果 Tauri reject 的是 `{ code, message }`，转成 `CommandExecutionError`
- 否则保持现有 `Error` / string fallback

- [ ] **Step 4: 重新运行执行器定向测试，确认变绿**

Run: `npm run test:run -- src/services/__tests__/commandExecutor.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/services/commandExecutor.ts src/services/__tests__/commandExecutor.test.ts
git commit -m "feat(execution):扩展终端执行请求结构"
```

### Task 4: 让单条命令和队列都显式传递 `requiresElevation`

**Files:**
- Modify: `src/composables/launcher/useTerminalExecution.ts`
- Modify: `src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- Modify: `src/composables/execution/useCommandExecution/model.ts`
- Modify: `src/composables/execution/useCommandExecution/helpers.ts`
- Modify: `src/composables/execution/useCommandExecution/actions.ts`
- Modify: `src/composables/__tests__/execution/useCommandExecution.test.ts`
- Modify: `src/composables/app/useAppCompositionRoot/context.ts`
- Modify: `src/__tests__/app.core-path-regression.test.ts`
- Modify: `src/i18n/messages.ts`

- [ ] **Step 1: 先写失败测试，锁定 3 个 contract**

1. `useTerminalExecution.test.ts`

```ts
expect(run).toHaveBeenCalledWith({
  terminalId: "wt",
  command: expect.any(String),
  requiresElevation: true,
  alwaysElevated: true
});
```

2. `useCommandExecution.test.ts`

```ts
expect(harness.runCommandsInTerminal).toHaveBeenCalledWith(
  ["ls -la", "ipconfig /flushdns"],
  { requiresElevation: true }
);
```

并补一条“全是普通命令时 `requiresElevation=false`”。

3. `app.core-path-regression.test.ts`

从 localStorage 恢复：

```ts
general: {
  defaultTerminal: "wt",
  alwaysElevatedTerminal: true
}
```

断言最后一次执行请求里 `alwaysElevated === true`。

- [ ] **Step 2: 运行前端执行链路定向测试，确认失败**

Run:
- `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- `npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts`
- `npm run test:run -- src/__tests__/app.core-path-regression.test.ts`

Expected:
- FAIL，提示 `runCommandInTerminal` / `runCommandsInTerminal` 签名不匹配
- 或请求缺少 `requiresElevation` / `alwaysElevated`

- [ ] **Step 3: 最小实现权限标记传递与错误文案**

建议把执行函数签名升级成：

```ts
runCommandInTerminal(renderedCommand: string, options?: { requiresElevation?: boolean }): Promise<void>
runCommandsInTerminal(renderedCommands: string[], options?: { requiresElevation?: boolean }): Promise<void>
```

实现规则：

1. `useTerminalExecution` 每次从 `defaultTerminal` 与 `alwaysElevatedTerminal` 的最新 `Ref` 读取值
2. 单条命令：
   - `requiresElevation = command.adminRequired === true`
3. 队列：
   - `requiresElevation = staged.some(item => item.adminRequired === true)`
4. `buildExecutionFailureFeedback()` 优先识别 `CommandExecutionError.code`
   - `elevation-cancelled` -> “已取消管理员授权，本次未执行”
   - `elevation-launch-failed` -> “管理员终端启动失败”
   - 其他仍走现有 fallback 分类

- [ ] **Step 4: 重新运行前端执行链路定向测试，确认变绿**

Run:
- `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- `npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts`
- `npm run test:run -- src/__tests__/app.core-path-regression.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/composables/launcher/useTerminalExecution.ts src/composables/__tests__/launcher/useTerminalExecution.test.ts src/composables/execution/useCommandExecution/model.ts src/composables/execution/useCommandExecution/helpers.ts src/composables/execution/useCommandExecution/actions.ts src/composables/__tests__/execution/useCommandExecution.test.ts src/composables/app/useAppCompositionRoot/context.ts src/__tests__/app.core-path-regression.test.ts src/i18n/messages.ts
git commit -m "feat(execution):传递管理员终端执行标记"
```

---

## Chunk 3: Rust Windows 路由、UAC 与最近权限态

### Task 5: 先把 Windows 纯路由决策做成可单测模块

**Files:**
- Create: `src-tauri/src/terminal/windows_routing.rs`
- Modify: `src-tauri/src/terminal.rs`
- Modify: `src-tauri/src/terminal/tests_exec.rs`

- [ ] **Step 1: 在 `tests_exec.rs` 先写失败测试，锁定权限路由 contract**

至少新增这些测试：

```rust
#[test]
fn follow_latest_without_history_keeps_normal_session_for_normal_command() { ... }

#[test]
fn follow_latest_promotes_to_elevated_when_command_requires_elevation() { ... }

#[test]
fn follow_latest_keeps_latest_elevated_session_for_normal_command() { ... }

#[test]
fn always_elevated_forces_elevated_session_even_for_normal_command() { ... }

#[test]
fn wt_elevated_route_uses_admin_window_id() { ... }
```

断言核心输出：

```rust
target_session_kind == WindowsSessionKind::Elevated
window_id == "zapcmd-main-terminal-admin"
```

- [ ] **Step 2: 运行 Rust 定向测试，确认失败**

Run: `cargo test --manifest-path src-tauri/Cargo.toml tests_exec -- --nocapture`

Expected:
- FAIL，提示 `windows_routing` 模块 / 类型 / window id 缺失

- [ ] **Step 3: 最小实现纯路由模块**

在 `windows_routing.rs` 中定义纯数据层：

```rust
pub(crate) enum WindowsSessionKind {
    Normal,
    Elevated,
}

pub(crate) struct WindowsRoutingInput<'a> {
    pub terminal_id: &'a str,
    pub command: &'a str,
    pub requires_elevation: bool,
    pub always_elevated: bool,
    pub last_session_kind: Option<WindowsSessionKind>,
}
```

以及：

```rust
pub(crate) fn decide_windows_route(input: WindowsRoutingInput<'_>) -> WindowsRoutingDecision
```

要求：
- 只做决策，不做 `spawn`
- `wt` 普通 / 管理员窗口 ID 分离
- `cmd` / `powershell` / `pwsh` 只输出对应 launch plan，不做提权副作用

- [ ] **Step 4: 重新运行 Rust 定向测试，确认纯路由变绿**

Run: `cargo test --manifest-path src-tauri/Cargo.toml tests_exec -- --nocapture`

Expected:
- PASS 至少覆盖纯路由部分

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src-tauri/src/terminal/windows_routing.rs src-tauri/src/terminal.rs src-tauri/src/terminal/tests_exec.rs
git commit -m "feat(terminal):抽离 Windows 管理员路由决策"
```

### Task 6: 接入 `AppState`、`runas` 和结构化错误返回

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/app_state.rs`
- Modify: `src-tauri/src/startup.rs`
- Modify: `src-tauri/src/terminal.rs`
- Modify: `src-tauri/src/terminal/tests_exec.rs`

- [ ] **Step 1: 先写失败测试，锁定最近权限态与错误映射**

在 `tests_exec.rs` 新增纯函数级别测试，覆盖：

1. `ERROR_CANCELLED` -> `elevation-cancelled`
2. 只有在“成功生成启动分支”后才更新最近权限态
3. 失败或取消时不改写旧的最近权限态

建议先把错误映射抽成可测函数：

```rust
fn map_windows_launch_error(code: u32) -> TerminalExecutionError
```

并为最近权限态抽一个小 helper：

```rust
fn should_update_last_session_kind(result: &Result<(), TerminalExecutionError>) -> bool
```

- [ ] **Step 2: 运行 Rust 定向测试，确认失败**

Run: `cargo test --manifest-path src-tauri/Cargo.toml tests_exec -- --nocapture`

Expected:
- FAIL，提示错误类型 / AppState 字段 / helper 缺失

- [ ] **Step 3: 最小实现 Windows 管理员启动接线**

实现原则：

1. `AppState` 新增最近权限态：

```rust
pub last_terminal_session_kind: Mutex<Option<WindowsSessionKind>>
```

2. `startup.rs` 初始化为 `None`
3. `run_command_in_terminal` 签名升级为：

```rust
pub(crate) fn run_command_in_terminal(
    app: tauri::AppHandle,
    terminal_id: String,
    command: String,
    requires_elevation: Option<bool>,
    always_elevated: Option<bool>,
) -> Result<(), TerminalExecutionError>
```

4. 提权实现：
   - 普通分支仍用现有 `spawn_and_forget`
   - 管理员分支使用 Windows Shell `runas`
   - 把 `ERROR_CANCELLED (1223)` 映射为 `elevation-cancelled`

5. 最近权限态更新规则：
   - 只在真正成功投递后更新
   - UAC 取消 / 启动失败保持旧值不变

6. 若引入 `windows-sys`，放到 Windows target-specific dependency，不污染其它平台

- [ ] **Step 4: 重新运行 Rust 定向测试，确认变绿**

Run: `cargo test --manifest-path src-tauri/Cargo.toml tests_exec -- --nocapture`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src-tauri/Cargo.toml src-tauri/src/app_state.rs src-tauri/src/startup.rs src-tauri/src/terminal.rs src-tauri/src/terminal/tests_exec.rs
git commit -m "feat(terminal):接入 Windows 管理员终端启动"
```

---

## Chunk 4: 文档、回归与最终验证

### Task 7: 修正文案、补文档，并跑最终门禁

**Files:**
- Modify: `src/i18n/messages.ts`
- Modify: `docs/command_sources/README.md`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `docs/active_context.md`

- [ ] **Step 1: 先补一条前端回归，锁定文案不再误导**

在已有 i18n / Settings 测试中确认：

```ts
expect(wrapper.text()).toContain("始终调用管理员权限终端");
expect(wrapper.text()).not.toContain("ZapCmd 自身提权");
```

如果前面的 Task 2 / Task 4 已经覆盖，可复用该测试而不再新增文件。

- [ ] **Step 2: 更新文档与 active context**

明确写清：

1. `adminRequired` 在 Windows 下会按需触发管理员终端，而不是提升 ZapCmd 主进程
2. `wt` 使用普通 / 管理员两套固定窗口 ID
3. 队列中只要包含 `adminRequired`，整队整体升权

- [ ] **Step 3: 运行最终自动化验证**

Run:
- `npm run test:run -- src/stores/__tests__/settingsStore.test.ts`
- `npm run test:run -- src/composables/__tests__/settings/useSettingsWindowGeneral.test.ts`
- `npm run test:run -- src/services/__tests__/commandExecutor.test.ts`
- `npm run test:run -- src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- `npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts`
- `npm run test:run -- src/__tests__/app.core-path-regression.test.ts`
- `cargo test --manifest-path src-tauri/Cargo.toml tests_exec -- --nocapture`
- `npm run check:all`

Expected:
- 全部 PASS

- [ ] **Step 4: 做 Windows 手工 smoke**

必须覆盖：

1. 默认终端=`wt`，普通命令首次执行 -> 普通窗口
2. 默认终端=`wt`，`flush-dns-win` -> 系统 UAC，成功后进入管理员窗口
3. UAC 取消 -> UI 提示“已取消管理员授权，本次未执行”
4. 管理员命令执行成功后，再执行普通命令 -> 继续落到管理员窗口
5. Settings 开启“始终调用管理员权限终端”后，普通命令首次执行也触发管理员终端
6. 队列中有一条 `adminRequired` -> 整队都在管理员终端运行
7. 默认终端切到 `powershell` / `pwsh` / `cmd`，上述语义仍成立，但传统控制台继续是新开控制台，不追踪旧进程

- [ ] **Step 5: 提交最终 checkpoint**

```bash
git add src/i18n/messages.ts docs/command_sources/README.md README.md README.zh-CN.md docs/active_context.md
git commit -m "docs:补充 Windows 管理员终端行为说明"
```

---

## 执行备注

1. **不要**把最近权限态放到前端 localStorage；它只属于 Rust 运行时状态。
2. **不要**在执行流内部拆分普通/管理员终端；整队一次投递的语义必须保留。
3. `wt` 的普通 / 管理员窗口 ID 必须是两个稳定常量，不要临时拼随机值。
4. `cmd` / `powershell` / `pwsh` 的“复用最近终端”只表示复用最近权限语义，不是复用现有控制台进程。
5. UAC 取消与终端启动失败必须优先走结构化错误，不要继续靠字符串 contains 猜。
6. 如果 Windows Shell API 的 FFI 接线比预期更重，优先把“纯路由 + 错误映射 + 最近权限态 contract”先锁死，再接最薄的系统调用层。

Plan complete and saved to `docs/superpowers/plans/2026-03-21-windows-terminal-admin-routing.md`. Ready to execute?
