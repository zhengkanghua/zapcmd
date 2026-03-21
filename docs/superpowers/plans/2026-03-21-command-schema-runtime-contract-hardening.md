# Command Schema Runtime Contract Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `validation.min/max` 与 `prerequisites` 从 schema-only 声明变成真正的运行时 contract，并在单条命令与执行流里统一执行 preflight。

**Architecture:** 前端 `CommandArg` / `CommandTemplate` 模型补齐 `min/max/prerequisites`，`runtimeMapper` 不再丢字段；`commandSafety` 负责参数范围校验；新的 `commandPreflight` service 在执行前调用 Tauri prerequisite probe，当前优先支持 `binary` 与 `env`，其余类型返回结构化 `unsupported-prerequisite`，由 `useCommandExecution` 统一决定阻断或告警。

**Tech Stack:** Vue 3, Vitest, Tauri 2.x, Rust

**设计文档:** `docs/superpowers/specs/2026-03-21-execution-contract-settings-hardening-design.md`

---

## 文件结构

### 新建

| 文件 | 职责 |
|---|---|
| `src/services/commandPreflight.ts` | 前端 prerequisite probe service，调用 Tauri 命令并归一化结构化结果 |
| `src/services/__tests__/commandPreflight.test.ts` | 锁定前端 preflight service contract |
| `src/features/commands/prerequisiteTypes.ts` | 前端共享 prerequisite 类型与结果模型 |
| `src/features/commands/__tests__/prerequisiteTypes.test.ts` | 锁定 prerequisite transport 类型收口 |
| `src-tauri/src/command_catalog/prerequisites.rs` | Tauri prerequisite probe：当前实现 `binary` / `env`，其余类型返回 unsupported |

### 修改

| 文件 | 职责 |
|---|---|
| `src/features/commands/types.ts` | `CommandArg` / `CommandTemplate` 补齐 `min/max/prerequisites` |
| `src/features/commands/runtimeMapper.ts` | 把 `min/max/prerequisites` 映射进运行时模板 |
| `src/features/commands/runtimeTypes.ts` | 与前端运行时模型对齐 |
| `src/features/commands/__tests__/runtimeMapper.test.ts` | 锁定 `min/max/prerequisites` 不再丢失 |
| `src/features/security/commandSafety.ts` | 为 `number` 参数增加 `min/max` 校验 |
| `src/features/security/__tests__/commandSafety.test.ts` | 锁定数值边界验证 |
| `src/features/launcher/types.ts` | `StagedCommand` 带上 prerequisites，供队列 preflight |
| `src/composables/execution/useCommandExecution/model.ts` | 注入 `runCommandPreflight` 能力 |
| `src/composables/execution/useCommandExecution/helpers.ts` | 统一 preflight 错误到 UI 文案 |
| `src/composables/execution/useCommandExecution/actions.ts` | 单条 / 队列执行前跑 prerequisite preflight |
| `src/composables/__tests__/execution/useCommandExecution.test.ts` | 锁定 required 阻断、optional 告警、unsupported 显式提示 |
| `src-tauri/src/command_catalog.rs` | 暴露 prerequisite probe 命令 |
| `src-tauri/src/lib.rs` | 注册新的 invoke handler |
| `src/i18n/messages.ts` | 新增 prerequisite 阻断 / 告警文案 |
| `docs/active_context.md` | 记录本轮计划摘要 |

---

## Chunk 1: 前端运行时模型与参数范围校验

### Task 1: 让 `runtimeMapper` 把 `min/max/prerequisites` 真正映射进模板

**Files:**
- Create: `src/features/commands/prerequisiteTypes.ts`
- Create: `src/features/commands/__tests__/prerequisiteTypes.test.ts`
- Modify: `src/features/commands/types.ts`
- Modify: `src/features/commands/runtimeTypes.ts`
- Modify: `src/features/commands/runtimeMapper.ts`
- Modify: `src/features/commands/__tests__/runtimeMapper.test.ts`
- Modify: `src/features/launcher/types.ts`

- [ ] **Step 1: 先写失败测试，锁定字段不再丢失**

在 `runtimeMapper.test.ts` 增加：

```ts
expect(template.args?.[0]).toMatchObject({
  min: 1,
  max: 65535
});
expect(template.prerequisites).toEqual([
  expect.objectContaining({ id: "docker", type: "binary", required: true })
]);
```

在 `prerequisiteTypes.test.ts` 锁定 transport 类型：

```ts
expect(isSupportedPrerequisiteType("binary")).toBe(true);
expect(isSupportedPrerequisiteType("env")).toBe(true);
```

- [ ] **Step 2: 运行 commands 定向测试，确认失败**

Run:
- `npm run test:run -- src/features/commands/__tests__/runtimeMapper.test.ts`
- `npm run test:run -- src/features/commands/__tests__/prerequisiteTypes.test.ts`

Expected:
- FAIL，提示 `min/max` 或 `prerequisites` 未进入模板模型

- [ ] **Step 3: 最小实现前端模板模型扩展**

模型要求：

```ts
export interface CommandArg {
  ...
  min?: number;
  max?: number;
}

export interface CommandTemplate {
  ...
  prerequisites?: CommandPrerequisite[];
}
```

并让 `buildStagedCommand()` 把 `command.prerequisites` 一并带入 `StagedCommand`。

- [ ] **Step 4: 重新运行 commands 定向测试，确认变绿**

Run:
- `npm run test:run -- src/features/commands/__tests__/runtimeMapper.test.ts`
- `npm run test:run -- src/features/commands/__tests__/prerequisiteTypes.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/features/commands/prerequisiteTypes.ts src/features/commands/__tests__/prerequisiteTypes.test.ts src/features/commands/types.ts src/features/commands/runtimeTypes.ts src/features/commands/runtimeMapper.ts src/features/commands/__tests__/runtimeMapper.test.ts src/features/launcher/types.ts
git commit -m "feat(commands):补齐 runtime contract 字段映射"
```

### Task 2: 在 `commandSafety` 中实现 `min/max` 校验

**Files:**
- Modify: `src/features/security/commandSafety.ts`
- Modify: `src/features/security/__tests__/commandSafety.test.ts`

- [ ] **Step 1: 先写失败测试，锁定数值边界**

补测试：

```ts
it("blocks number args below min", () => {
  const result = checkSingleCommandSafety({
    title: "port",
    renderedCommand: "echo {{port}}",
    args: [{ key: "port", label: "port", token: "{{port}}", argType: "number", min: 1, max: 10 }],
    argValues: { port: "0" }
  });
  expect(result.blockedMessage).toContain("port");
});
```

再补 `above max` 和 queue 场景。

- [ ] **Step 2: 运行安全校验定向测试，确认失败**

Run: `npm run test:run -- src/features/security/__tests__/commandSafety.test.ts`

Expected:
- FAIL，提示 `0` / `99999` 没被范围拦截

- [ ] **Step 3: 做最小实现，数值合法后继续判范围**

核心顺序：

```ts
if (arg.argType === "number") {
  // 先判 number
  // 再 Number(value) 与 min/max 比较
}
```

错误提示：
- 优先用 `arg.validationError`
- 否则走统一 i18n 文案，如 `safety.validation.min` / `max`

- [ ] **Step 4: 重新运行安全校验定向测试，确认变绿**

Run: `npm run test:run -- src/features/security/__tests__/commandSafety.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/features/security/commandSafety.ts src/features/security/__tests__/commandSafety.test.ts
git commit -m "feat(commands):实现数值参数边界校验"
```

---

## Chunk 2: prerequisite preflight

### Task 3: 新增 Tauri prerequisite probe 与前端 service

**Files:**
- Create: `src/services/commandPreflight.ts`
- Create: `src/services/__tests__/commandPreflight.test.ts`
- Create: `src-tauri/src/command_catalog/prerequisites.rs`
- Modify: `src-tauri/src/command_catalog.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 先写失败测试，锁定 probe contract**

前端 `commandPreflight.test.ts`：

```ts
await expect(
  service.check([
    { id: "docker", type: "binary", required: true, check: "docker" }
  ])
).resolves.toEqual([
  expect.objectContaining({ id: "docker", ok: true })
]);
```

Rust 侧至少锁定：

```rust
#[test]
fn binary_prerequisite_reports_missing_binary() { ... }

#[test]
fn env_prerequisite_reports_missing_variable() { ... }

#[test]
fn shell_prerequisite_returns_unsupported() { ... }
```

- [ ] **Step 2: 运行 service 与 Rust 定向测试，确认失败**

Run:
- `npm run test:run -- src/services/__tests__/commandPreflight.test.ts`
- `cargo test --manifest-path src-tauri/Cargo.toml prerequisite -- --nocapture`

Expected:
- FAIL，提示 service / invoke handler / probe 命令不存在

- [ ] **Step 3: 实现 prerequisite probe 的最小支持集**

本计划当前支持：
- `binary`
- `env`

当前显式不支持，但必须返回结构化结果：
- `shell`
- `network`
- `permission`

Rust 结果模型示意：

```rust
struct PrerequisiteProbeResult {
    id: String,
    ok: bool,
    code: String,
    message: String,
    required: bool,
}
```

前端 service 只做 invoke + 结果归一，不做业务决策。

- [ ] **Step 4: 重新运行 service 与 Rust 定向测试，确认变绿**

Run:
- `npm run test:run -- src/services/__tests__/commandPreflight.test.ts`
- `cargo test --manifest-path src-tauri/Cargo.toml prerequisite -- --nocapture`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/services/commandPreflight.ts src/services/__tests__/commandPreflight.test.ts src-tauri/src/command_catalog/prerequisites.rs src-tauri/src/command_catalog.rs src-tauri/src/lib.rs
git commit -m "feat(commands):新增 prerequisite probe service"
```

### Task 4: 在 `useCommandExecution` 中接入 preflight，统一阻断和告警

**Files:**
- Modify: `src/composables/execution/useCommandExecution/model.ts`
- Modify: `src/composables/execution/useCommandExecution/helpers.ts`
- Modify: `src/composables/execution/useCommandExecution/actions.ts`
- Modify: `src/composables/__tests__/execution/useCommandExecution.test.ts`
- Modify: `src/i18n/messages.ts`
- Modify: `docs/active_context.md`

- [ ] **Step 1: 先写失败测试，锁定 required / optional / unsupported 三类语义**

补测试：

```ts
it("blocks single execution when required prerequisite fails", async () => {
  runCommandPreflight.mockResolvedValueOnce([
    { id: "docker", ok: false, code: "missing-binary", required: true, message: "docker not found" }
  ]);
  await actions.executeResult(command);
  expect(runCommandInTerminal).not.toHaveBeenCalled();
});
```

再补：
- optional 失败不阻断，但反馈里有告警
- queue 中任一 required 失败时整队阻断
- unsupported-prerequisite 不再被当作成功

- [ ] **Step 2: 运行执行链定向测试，确认失败**

Run: `npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts`

Expected:
- FAIL，提示当前执行链完全没跑 prerequisite preflight

- [ ] **Step 3: 实现 preflight 接线**

接线要求：
- 单条命令：安全确认前先跑 prerequisite preflight
- 队列：逐项 preflight，先汇总 required 失败，再汇总 optional 告警
- `unsupported-prerequisite` 视为失败，不允许默默放过

反馈策略：
- required 失败：阻断执行
- optional 失败：继续执行，但在 feedback 中追加 warning

- [ ] **Step 4: 重新运行执行链定向测试，确认变绿**

Run: `npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts`

Expected:
- PASS

- [ ] **Step 5: 记录上下文并提交 checkpoint**

```bash
git add src/composables/execution/useCommandExecution/model.ts src/composables/execution/useCommandExecution/helpers.ts src/composables/execution/useCommandExecution/actions.ts src/composables/__tests__/execution/useCommandExecution.test.ts src/i18n/messages.ts docs/active_context.md
git commit -m "feat(commands):在执行前接入 prerequisite preflight"
```

---

## 最终验证

- [ ] `npm run test:run -- src/features/commands/__tests__/runtimeMapper.test.ts`
- [ ] `npm run test:run -- src/features/security/__tests__/commandSafety.test.ts`
- [ ] `npm run test:run -- src/services/__tests__/commandPreflight.test.ts`
- [ ] `npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts`
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml prerequisite -- --nocapture`
- [ ] `npm run check:all`

Expected:
- 全绿；如果 probe 相关回归卡在平台差异，先修 probe 测试适配，不要回退成“schema 接受但运行时忽略”
