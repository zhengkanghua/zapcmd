# Prerequisite Preflight Feedback Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 prerequisite preflight 反馈从技术日志式字符串升级为统一的三段式用户提示，并扩展 contract 支持 `displayName` / `resolutionHint`，同时兼容旧 `installHint`。

**Architecture:** 本轮不改 Rust probe 的输入 contract，也不重做 YAML 生成主链；先把 schema/runtime mapper 打通新字段，再把执行层的 prerequisite 反馈抽成独立 formatter，按 `code + metadata + fallback 标题解析` 生成用户文案。系统级预检异常 (`probe-error` / `probe-invalid-response`) 单独收口，避免再被按 prerequisite 重复展开。

**Tech Stack:** Vue 3, TypeScript, Vitest, JSON Schema, YAML catalog generator, Tauri 2.x

**设计文档:** `docs/superpowers/specs/2026-04-02-prerequisite-preflight-feedback-design.md`

---

## 当前迭代建议

- 当前迭代先从 `Chunk 1 / Task 1` 开始，先把 contract 打通，再进入 UI 反馈重构。
- 本轮先交付“框架能力 + 回归测试 + 文档示例”，确保真实 builtin / user command 都能消费新字段。
- 高频 builtin prerequisite 的批量 metadata 补齐不在本轮主路径里，放到下一迭代待办，避免把 authoring 机械改动和反馈体系重构混在一起。

---

## 文件结构

### 新建

| 文件 | 职责 |
|---|---|
| `src/composables/execution/useCommandExecution/preflightFeedback.ts` | prerequisite 反馈格式化器，负责三段式文案、fallback 标题解析、system failure 收口 |
| `src/composables/__tests__/execution/preflightFeedback.test.ts` | 锁定 `missing-binary / missing-shell / missing-env`、resolution 优先级、fallback 标题解析与 system failure 行为 |

### 修改

| 文件 | 职责 |
|---|---|
| `docs/schemas/command-file.schema.json` | prerequisite 新增 `displayName` / `resolutionHint` 结构字段 |
| `docs/schemas/README.md` | 更新 prerequisite contract 与旧字段兼容说明 |
| `docs/schemas/examples/command-file.platform-split.json` | 提供新字段 authoring 示例 |
| `src/features/commands/generated/commandSchemaValidator.ts` | schema 变更后的 committed validator |
| `src/features/commands/prerequisiteTypes.ts` | 前端 prerequisite 模型新增 `displayName` / `resolutionHint` |
| `src/features/commands/runtimeTypes.ts` | runtime localized prerequisite 模型与 schema 对齐 |
| `src/features/commands/runtimeMapper.ts` | 把 localized `displayName` / `resolutionHint` / `installHint` 映射成前端字符串，展示优先级留给 feedback formatter |
| `src/features/commands/__tests__/schemaGuard.test.ts` | 锁定 schema 可接受新字段与兼容旧字段 |
| `src/features/commands/__tests__/schemaValidation.test.ts` | 锁定业务校验不因新增字段回退 |
| `src/features/commands/__tests__/runtimeMapper.test.ts` | 锁定 prerequisite metadata 映射不丢失 |
| `src/features/commands/__tests__/runtimeMapper.i18n.test.ts` | 锁定 localized prerequisite 文本的 locale 优先级 |
| `scripts/__tests__/generate-builtin-commands.test.ts` | 锁定 YAML -> JSON 生成链会保留 prerequisite 新字段 |
| `src/composables/execution/useCommandExecution/model.ts` | 为 feedback formatter 增加 fallback 标题解析依赖 |
| `src/composables/execution/useCommandExecution/helpers.ts` | 改为委托 preflight formatter 生成 blocked/warning/system failure 文案 |
| `src/composables/execution/useCommandExecution/actions.ts` | 把新的 formatter 接入单条执行与队列执行 |
| `src/composables/app/useAppCompositionRoot/runtime.ts` | 从 command catalog 注入 `resolveCommandTitle` |
| `src/composables/__tests__/execution/useCommandExecution.test.ts` | 锁定 required/optional/queue/system failure 的最终反馈行为 |
| `src/i18n/messages.ts` | 新增/调整 prerequisite 用户提示模板 |
| `docs/active_context.md` | 记录本轮实施摘要 |

### 预期不修改

| 文件 | 原因 |
|---|---|
| `src-tauri/src/command_catalog/prerequisites.rs` | 本轮不改 probe 输入与返回 code，只消费已有稳定 code |
| `scripts/commands/catalogGenerator/buildRuntimeJson.mjs` | 当前 `structuredClone` 已能透传 prerequisite 对象；仅在测试证明字段被吞时再补丁 |

---

## Chunk 1: Contract 与 runtime mapper 打通

### Task 1: 扩展 schema，并锁定 YAML -> JSON -> runtime contract 可接受新字段

**Files:**
- Modify: `docs/schemas/command-file.schema.json`
- Modify: `docs/schemas/README.md`
- Modify: `docs/schemas/examples/command-file.platform-split.json`
- Modify: `src/features/commands/__tests__/schemaGuard.test.ts`
- Modify: `src/features/commands/__tests__/schemaValidation.test.ts`
- Modify: `scripts/__tests__/generate-builtin-commands.test.ts`
- Modify: `src/features/commands/generated/commandSchemaValidator.ts`

- [ ] **Step 1: 先写失败测试，锁定 schema 需要接受 `displayName` / `resolutionHint`**

在 `schemaGuard.test.ts` 的 valid payload prerequisite 中增加：

```ts
{
  id: "powershell",
  type: "shell",
  required: true,
  check: "shell:powershell",
  displayName: {
    "zh-CN": "PowerShell 7",
    "en-US": "PowerShell 7"
  },
  resolutionHint: {
    "zh-CN": "安装 PowerShell 7 后重试",
    "en-US": "Install PowerShell 7 and retry"
  },
  installHint: {
    "zh-CN": "兼容旧字段",
    "en-US": "legacy"
  },
  fallbackCommandId: "install-pwsh"
}
```

在 `schemaValidation.test.ts` 增加：

```ts
it("accepts prerequisites with displayName and resolutionHint", () => {
  const payload = createScriptPayload();
  payload.commands[0].prerequisites = [
    {
      id: "powershell",
      type: "shell",
      required: true,
      check: "shell:powershell",
      displayName: { "zh-CN": "PowerShell 7" },
      resolutionHint: { "zh-CN": "安装 PowerShell 7 后重试" }
    }
  ];
  expect(validateRuntimeCommandFile(payload).valid).toBe(true);
});
```

在 `generate-builtin-commands.test.ts` 的 YAML fixture prerequisite 中增加：

```yaml
displayName:
  zh-CN: Python 3
resolutionHint:
  zh-CN: 安装 Python 3 后重试
```

并断言生成 JSON 中包含 `"displayName"` 与 `"resolutionHint"`。

- [ ] **Step 2: 运行 schema 与生成链定向测试，确认当前会失败**

Run:

```bash
npm run test:run -- src/features/commands/__tests__/schemaGuard.test.ts src/features/commands/__tests__/schemaValidation.test.ts scripts/__tests__/generate-builtin-commands.test.ts
```

Expected:

- FAIL，提示 prerequisite 含未知 key，或 generated validator 与 schema 不同步

- [ ] **Step 3: 做最小 schema 实现并重新生成 validator**

在 `docs/schemas/command-file.schema.json` 的 prerequisite properties 中新增：

```json
"displayName": { "$ref": "#/$defs/localizedTextOrString" },
"resolutionHint": { "$ref": "#/$defs/localizedTextOrString" }
```

保留：

```json
"installHint": { "$ref": "#/$defs/localizedTextOrString" },
"fallbackCommandId": { "type": "string", "pattern": "^[a-zA-Z0-9_\\-]+$" }
```

然后：

```bash
npm run commands:schema:generate
```

同步更新 `docs/schemas/README.md` 与 `docs/schemas/examples/command-file.platform-split.json`，明确：

- `resolutionHint` 是新主字段
- `installHint` 是兼容字段
- YAML -> JSON 生成链允许直接 authoring 这两个字段

如果 `generate-builtin-commands.test.ts` 仍提示字段没进 JSON，再补 `scripts/commands/catalogGenerator/buildRuntimeJson.mjs`；否则不要无意义改生成器。

- [ ] **Step 4: 重新运行 schema 与生成链定向测试，确认变绿**

Run:

```bash
npm run test:run -- src/features/commands/__tests__/schemaGuard.test.ts src/features/commands/__tests__/schemaValidation.test.ts scripts/__tests__/generate-builtin-commands.test.ts
```

Expected:

- PASS，且 generated validator 与 schema 同步

- [ ] **Step 5: 提交 checkpoint**

```bash
git add docs/schemas/command-file.schema.json docs/schemas/README.md docs/schemas/examples/command-file.platform-split.json src/features/commands/__tests__/schemaGuard.test.ts src/features/commands/__tests__/schemaValidation.test.ts scripts/__tests__/generate-builtin-commands.test.ts src/features/commands/generated/commandSchemaValidator.ts
git commit -m "feat(commands):扩展 prerequisite 提示契约"
```

### Task 2: 把 localized prerequisite metadata 正式映射进前端模型

**Files:**
- Modify: `src/features/commands/prerequisiteTypes.ts`
- Modify: `src/features/commands/runtimeTypes.ts`
- Modify: `src/features/commands/runtimeMapper.ts`
- Modify: `src/features/commands/__tests__/runtimeMapper.test.ts`
- Modify: `src/features/commands/__tests__/runtimeMapper.i18n.test.ts`

- [ ] **Step 1: 先写失败测试，锁定 mapper 需要输出新字段且遵守优先级**

在 `runtimeMapper.test.ts` 增加：

```ts
expect(template.prerequisites).toEqual([
  expect.objectContaining({
    id: "docker",
    displayName: "Docker Desktop",
    resolutionHint: "安装 Docker Desktop 后重试",
    installHint: "兼容旧字段",
    fallbackCommandId: "install-docker"
  })
]);
```

再加一个兼容断言：

```ts
expect(template.prerequisites?.[0].resolutionHint).toBe("新字段优先");
```

在 `runtimeMapper.i18n.test.ts` 增加：

```ts
expect(
  resolveRuntimeText({
    "zh-CN": "Docker Desktop",
    "en-US": "Docker Desktop"
  })
).toBe("Docker Desktop");
```

并补一条 `resolutionHint` locale fallback 断言，确认只给 `zh` 时仍能回退。

- [ ] **Step 2: 运行 mapper 定向测试，确认失败**

Run:

```bash
npm run test:run -- src/features/commands/__tests__/runtimeMapper.test.ts src/features/commands/__tests__/runtimeMapper.i18n.test.ts
```

Expected:

- FAIL，提示 `displayName` / `resolutionHint` 未进入 `CommandPrerequisite`

- [ ] **Step 3: 做最小 mapper 实现**

`CommandPrerequisite` 目标模型：

```ts
export interface CommandPrerequisite {
  id: string;
  type: CommandPrerequisiteType;
  required: boolean;
  check: string;
  displayName?: string;
  resolutionHint?: string;
  installHint?: string;
  fallbackCommandId?: string;
}
```

`RuntimeCommandPrerequisite` 目标模型：

```ts
export interface RuntimeCommandPrerequisite
  extends Omit<CommandPrerequisite, "displayName" | "resolutionHint" | "installHint"> {
  displayName?: RuntimeLocalizedTextOrString;
  resolutionHint?: RuntimeLocalizedTextOrString;
  installHint?: RuntimeLocalizedTextOrString;
}
```

`runtimeMapper` 中明确：

```ts
displayName: resolveRuntimeText(prerequisite.displayName),
resolutionHint: resolveRuntimeText(prerequisite.resolutionHint),
installHint: resolveRuntimeText(prerequisite.installHint)
```

注意：

- 此时先只映射，不在 mapper 里做 `resolutionHint > installHint`
- 优先级判断留给 feedback formatter，避免把“展示策略”塞回 transport 层

- [ ] **Step 4: 重新运行 mapper 定向测试，确认变绿**

Run:

```bash
npm run test:run -- src/features/commands/__tests__/runtimeMapper.test.ts src/features/commands/__tests__/runtimeMapper.i18n.test.ts
```

Expected:

- PASS，且 locale fallback 正常

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/features/commands/prerequisiteTypes.ts src/features/commands/runtimeTypes.ts src/features/commands/runtimeMapper.ts src/features/commands/__tests__/runtimeMapper.test.ts src/features/commands/__tests__/runtimeMapper.i18n.test.ts
git commit -m "feat(commands):映射 prerequisite 提示元数据"
```

---

## Chunk 2: 执行层反馈重构

### Task 3: 抽出 preflight formatter，统一人话化提示模板

**Files:**
- Create: `src/composables/execution/useCommandExecution/preflightFeedback.ts`
- Create: `src/composables/__tests__/execution/preflightFeedback.test.ts`
- Modify: `src/i18n/messages.ts`

- [ ] **Step 1: 先写失败测试，锁定 formatter 的四类核心行为**

在 `preflightFeedback.test.ts` 覆盖以下场景：

1. `missing-binary`

```ts
expect(formatBlockingPreflightFeedback(...)).toContain("未检测到 Docker Desktop。");
expect(formatBlockingPreflightFeedback(...)).toContain("处理建议：安装 Docker Desktop 后重试。");
```

2. `missing-shell`

```ts
expect(formatBlockingPreflightFeedback(...)).toContain("当前环境缺少 PowerShell 7。");
```

3. `missing-env`

```ts
expect(formatBlockingPreflightFeedback(...)).toContain("缺少 GitHub Token（环境变量 GITHUB_TOKEN）。");
```

4. 优先级与 fallback

```ts
expect(formatBlockingPreflightFeedback(...)).toContain("处理建议：新字段优先");
expect(formatBlockingPreflightFeedback(...)).toContain("可改用“安装 Docker”命令。");
```

再补一个 queue 场景，确认多条 issue 时会附带命令标题前缀：

```ts
expect(formatBlockingPreflightFeedback(...)).toContain("docker-ps：未检测到 Docker Desktop。");
```

- [ ] **Step 2: 运行 formatter 定向测试，确认失败**

Run:

```bash
npm run test:run -- src/composables/__tests__/execution/preflightFeedback.test.ts
```

Expected:

- FAIL，提示文件不存在或仍沿用旧的拼接文案

- [ ] **Step 3: 实现 formatter，并把文案模板集中到 i18n**

`preflightFeedback.ts` 建议提供：

```ts
export function formatBlockingPreflightFeedback(...)
export function formatWarningPreflightFeedback(...)
export function isSystemPreflightFailure(...)
```

内部拆小函数：

```ts
function resolveCheckTarget(prerequisite): string
function resolveDisplaySubject(prerequisite): string
function resolveResolutionHint(prerequisite): string | null
function resolveFallbackTitle(commandId, resolveCommandTitle): string
function formatReason(issue): string
function formatActions(issue): string[]
```

文案走 `src/i18n/messages.ts`，新增或改造：

- `execution.preflightBlockedSummary`
- `execution.preflightWarningSummary`
- `execution.preflightReasonMissingBinary`
- `execution.preflightReasonMissingShell`
- `execution.preflightReasonMissingEnv`
- `execution.preflightResolutionHint`
- `execution.preflightFallbackCommandTitle`

要求：

- 统一 sentence 风格，不再出现“技术 message + 括号串接”
- `resolutionHint` 缺失时回退 `installHint`
- `displayName` 缺失时回退 `check` target，再回退 `id`

- [ ] **Step 4: 重新运行 formatter 定向测试，确认变绿**

Run:

```bash
npm run test:run -- src/composables/__tests__/execution/preflightFeedback.test.ts
```

Expected:

- PASS，且 queue 场景标题前缀只在需要区分命令时出现

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/composables/execution/useCommandExecution/preflightFeedback.ts src/composables/__tests__/execution/preflightFeedback.test.ts src/i18n/messages.ts
git commit -m "feat(execution):重构 prerequisite 反馈格式化"
```

### Task 4: 把 formatter 接入执行链，并收口 system preflight failure

**Files:**
- Modify: `src/composables/execution/useCommandExecution/model.ts`
- Modify: `src/composables/execution/useCommandExecution/helpers.ts`
- Modify: `src/composables/execution/useCommandExecution/actions.ts`
- Modify: `src/composables/app/useAppCompositionRoot/runtime.ts`
- Modify: `src/composables/__tests__/execution/useCommandExecution.test.ts`

- [ ] **Step 1: 先写失败测试，锁定最终用户可见反馈**

在 `useCommandExecution.test.ts` 补四组回归：

1. required prerequisite 失败时：

```ts
expect(message).toContain("无法执行该命令。");
expect(message).toContain("未检测到 Docker Desktop。");
expect(message).toContain("可改用“安装 Docker”命令。");
```

2. optional prerequisite 失败时：

```ts
expect(message).toContain("命令已发送到终端，但有一项可选依赖未满足。");
```

3. queue 多 issue 时：

```ts
expect(message).toContain("docker-ps：未检测到 Docker Desktop。");
expect(message).toContain("gh-auth：缺少 GitHub Token（环境变量 GITHUB_TOKEN）。");
```

4. preflight transport failure / invalid response：

```ts
expect(message).toContain("执行前检查暂时失败");
expect(message).not.toContain("docker / docker");
expect(message).not.toContain("powershell / powershell");
```

- [ ] **Step 2: 运行 execution 定向测试，确认失败**

Run:

```bash
npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts
```

Expected:

- FAIL，提示仍输出旧的 `docker not found` / `请先安装...` / `install-docker` 拼接格式

- [ ] **Step 3: 扩展 `UseCommandExecutionOptions`，注入 fallback 标题解析**

在 `model.ts` 中新增：

```ts
resolveCommandTitle?: (commandId: string) => string | null;
```

在 `runtime.ts` 中接入：

```ts
resolveCommandTitle: (commandId) =>
  context.commandCatalog.commandTemplates.value.find((item) => item.id === commandId)?.title ?? null
```

注意：

- 只做读取，不修改 command catalog
- resolver 找不到标题时必须回退到原始 `commandId`

- [ ] **Step 4: 在 helpers/actions 中接入 formatter，并单独收口 system failure**

在 `helpers.ts`：

- 删除或降级旧的 `formatPreflightGuidance()` / `formatPreflightIssue()` 主路径
- `buildPreflightBlockedFeedback()` / `appendPreflightWarnings()` 改为调用 `preflightFeedback.ts`

system failure 收口规则：

```ts
if (issues.every((issue) => isSystemPreflightFailure(issue.result))) {
  return t("execution.preflightProbeFailed");
}
```

如果要保留原始 transport error，可仅在单条系统级消息中带一次，不允许再按 prerequisite 数量重复展开。

- [ ] **Step 5: 重新运行 execution 定向测试，确认变绿**

Run:

```bash
npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts src/composables/__tests__/execution/preflightFeedback.test.ts
```

Expected:

- PASS，且 required / optional / queue / system failure 反馈都符合设计文档

- [ ] **Step 6: 提交 checkpoint**

```bash
git add src/composables/execution/useCommandExecution/model.ts src/composables/execution/useCommandExecution/helpers.ts src/composables/execution/useCommandExecution/actions.ts src/composables/app/useAppCompositionRoot/runtime.ts src/composables/__tests__/execution/useCommandExecution.test.ts
git commit -m "feat(execution):接入 prerequisite 用户提示收口"
```

---

## Chunk 3: 验证、文档与收尾

### Task 5: 跑完整回归并补短期记忆

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 运行所有相关定向测试**

Run:

```bash
npm run test:run -- src/features/commands/__tests__/schemaGuard.test.ts src/features/commands/__tests__/schemaValidation.test.ts src/features/commands/__tests__/runtimeMapper.test.ts src/features/commands/__tests__/runtimeMapper.i18n.test.ts scripts/__tests__/generate-builtin-commands.test.ts src/composables/__tests__/execution/preflightFeedback.test.ts src/composables/__tests__/execution/useCommandExecution.test.ts
```

Expected:

- PASS

- [ ] **Step 2: 运行全量门禁**

Run:

```bash
npm run check:all
```

Expected:

- PASS，覆盖率与 build / rust gate 全绿

- [ ] **Step 3: 更新短期记忆**

在 `docs/active_context.md` 追加一句精简摘要，例如：

```md
- prerequisite feedback：schema 支持 `displayName/resolutionHint`，执行层改为三段式提示并兼容旧 `installHint`。
```

- [ ] **Step 4: 提交最终 checkpoint**

```bash
git add docs/active_context.md
git commit -m "docs(context):更新 prerequisite feedback 实施摘要"
```

---

## 下一迭代待办

- [ ] 批量为高频 builtin prerequisite 补齐 metadata，优先覆盖：
  - `commands/catalog/_docker.yaml`
  - `commands/catalog/_git.yaml`
  - `commands/catalog/_gh.yaml`
  - `commands/catalog/_system.yaml`
  - `commands/catalog/_dev.yaml`
- [ ] 评估是否需要把 “常见 prerequisite displayName/resolutionHint” 抽成 catalog 复用片段，减少重复 authoring。
- [ ] 如果 UX 评审认为单行 feedback 仍不够清晰，再考虑把 prerequisite blocked/warning 升级为结构化列表 UI，而不是继续堆字符串。
