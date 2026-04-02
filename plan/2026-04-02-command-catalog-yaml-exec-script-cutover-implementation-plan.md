# Command Catalog YAML 真源与 Exec/Script 切换 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一次性把 builtin 命令真源切到 YAML，并把 runtime/执行链从 `template` 字符串切到 `exec | script` 结构化模型，同时重建 JSON+Markdown 生成链、收紧 CLI、打通 `shell runner` 与 prerequisite 闭环。

**Architecture:** 保留“builtin 产物 JSON + 用户 JSON 共用同一 runtime schema”的总体架构，但把 builtin authoring 改到 `commands/catalog/_*.yaml`，由新的生成器产出 runtime JSON 与只读 Markdown 文档。前端继续保留 `preview` 作为展示/搜索派生值，但真正执行 payload 改为结构化 request 下发给 Tauri；Tauri 按 `exec` 或 `script.runner` 负责最后一公里组装、终端宿主适配、失败标记与 runner 路由。

**Tech Stack:** YAML, JSON Schema/Ajv standalone validator, Node.js ESM scripts, TypeScript/Vue 3, Vitest, Tauri 2, Rust

---

## Chunk 1: 切换边界与目标文件结构

### 目标文件结构

**Builtin 真源目录（新建）**

```text
commands/catalog/README.md
commands/catalog/_brew.yaml
commands/catalog/_bun.yaml
commands/catalog/_cargo.yaml
commands/catalog/_cert.yaml
commands/catalog/_dev.yaml
commands/catalog/_docker.yaml
commands/catalog/_file.yaml
commands/catalog/_gh.yaml
commands/catalog/_git.yaml
commands/catalog/_kubernetes.yaml
commands/catalog/_mysql.yaml
commands/catalog/_network.yaml
commands/catalog/_npm.yaml
commands/catalog/_pip.yaml
commands/catalog/_pnpm.yaml
commands/catalog/_postgres.yaml
commands/catalog/_redis.yaml
commands/catalog/_service.yaml
commands/catalog/_sqlite.yaml
commands/catalog/_ssh.yaml
commands/catalog/_system.yaml
commands/catalog/_yarn.yaml
```

**生成器实现（拆掉旧 monolith）**

```text
scripts/commands/generate-builtin-commands.mjs
scripts/commands/generate-command-schema-validator.mjs
scripts/commands/check-command-schema-sync.mjs
scripts/commands/migrate-builtin-command-sources.mjs
scripts/commands/catalogGenerator/parseYamlCatalog.mjs
scripts/commands/catalogGenerator/buildRuntimeJson.mjs
scripts/commands/catalogGenerator/buildGeneratedMarkdown.mjs
scripts/commands/catalogGenerator/writeCatalogManifest.mjs
scripts/generate_builtin_commands.ps1
```

**Runtime / 执行链核心文件**

```text
docs/schemas/command-file.schema.json
docs/schemas/examples/command-file.min.json
docs/schemas/examples/command-file.platform-split.json
assets/runtime_templates/commands/my-commands.sample.json
src/features/commands/runtimeTypes.ts
src/features/commands/types.ts
src/features/commands/runtimeMapper.ts
src/features/commands/runtimeLoader.ts
src/features/commands/schemaBusinessRules.ts
src/features/launcher/commandRuntime.ts
src/features/launcher/types.ts
src/features/security/commandSafety.ts
src/services/commandExecutor.ts
src/composables/launcher/useTerminalExecution.ts
src/composables/execution/useCommandExecution/helpers.ts
src/composables/execution/useCommandExecution/actions.ts
src-tauri/src/terminal.rs
src-tauri/src/terminal/windows_routing.rs
src-tauri/src/terminal/windows_launch.rs
src-tauri/src/command_catalog/prerequisites.rs
src-tauri/src/lib.rs
```

**生成产物（最终提交）**

```text
assets/runtime_templates/commands/builtin/_*.json
assets/runtime_templates/commands/builtin/index.json
docs/generated_commands/_*.md
docs/generated_commands/index.md
```

**文档与门禁（必须同步）**

```text
README.md
README.zh-CN.md
CONTRIBUTING.md
CONTRIBUTING.zh-CN.md
docs/README.md
docs/schemas/README.md
assets/runtime_templates/README.md
docs/command_sources/README.md
scripts/precommit-guard.mjs
.github/workflows/ci-gate.yml
package.json
```

**旧实现最终删除**

```text
scripts/commands/builtinCommandGenerator.mjs
docs/command_sources/_*.md
docs/builtin_commands.generated.md
```

**Do Not Modify**

```text
docs/superpowers/specs/**
docs/superpowers/plans/**
plan/**
```

历史 spec/plan 里的旧路径引用保留为历史记录；所有“清理旧引用”的 grep 都要排除这些目录。

### Task 1: 收紧共享 schema，锁定 exec/script 结构契约

**Files:**
- Modify: `docs/schemas/command-file.schema.json`
- Modify: `scripts/commands/generate-command-schema-validator.mjs`
- Modify: `scripts/commands/check-command-schema-sync.mjs`
- Modify: `src/features/commands/__tests__/schemaValidation.test.ts`
- Modify: `src/features/commands/__tests__/schemaGuard.test.ts`
- Modify: `scripts/__tests__/generate-command-schema-validator.test.ts`

- [ ] **Step 1: 先写失败测试，锁定新 schema 形状**

```ts
expect(validateRuntimeCommandFile({
  commands: [{
    id: "echo-text",
    name: "Echo",
    tags: ["echo"],
    category: "dev",
    platform: "all",
    exec: { program: "echo", args: ["{{text}}"] },
    adminRequired: false,
    args: [{ key: "text", label: "Text", type: "text", required: true }]
  }]
}).valid).toBe(true);

expect(validateRuntimeCommandFile({
  commands: [{
    id: "bad-template",
    name: "Bad",
    tags: ["bad"],
    category: "dev",
    platform: "all",
    template: "echo hello",
    adminRequired: false
  }]
}).valid).toBe(false);
```

- [ ] **Step 2: 补 cross-field 失败用例**

```ts
expectInvalidReason(payloadWithScriptRunnerWithoutShellPrerequisite)
  .toContain("matching shell prerequisite");
expectInvalidReason(payloadWithExecAndScriptTogether)
  .toContain("exactly one");
expectInvalidReason(payloadWithUnknownStdinArgKey)
  .toContain("stdinArgKey");
```

- [ ] **Step 3: 修改 schema，删除 `template`，新增 `exec` / `script` 二选一**

```json
"oneOf": [
  { "required": ["exec"], "not": { "required": ["script"] } },
  { "required": ["script"], "not": { "required": ["exec"] } }
]
```

`exec` 至少包含 `program` 与 `args`；`script` 至少包含 `runner` 与 `command`；顶层不再允许 `template`。

- [ ] **Step 4: 重新生成 standalone validator**

Run: `npm run commands:schema:generate`

Expected: `src/features/commands/generated/commandSchemaValidator.ts` 更新，命令退出码为 `0`。

- [ ] **Step 5: 跑 schema 定向测试**

Run: `npm run test -- scripts/__tests__/generate-command-schema-validator.test.ts src/features/commands/__tests__/schemaValidation.test.ts src/features/commands/__tests__/schemaGuard.test.ts`

Expected: PASS；失败信息不再出现旧 `template` 为合法字段。

- [ ] **Step 6: 提交**

```bash
git add docs/schemas/command-file.schema.json \
  scripts/commands/generate-command-schema-validator.mjs \
  scripts/commands/check-command-schema-sync.mjs \
  src/features/commands/generated/commandSchemaValidator.ts \
  src/features/commands/__tests__/schemaValidation.test.ts \
  src/features/commands/__tests__/schemaGuard.test.ts \
  scripts/__tests__/generate-command-schema-validator.test.ts
git commit -m "feat(commands):收紧 exec script schema 契约"
```

### Task 2: 先定义 TS 运行时类型与前端映射 contract

**Files:**
- Modify: `src/features/commands/runtimeTypes.ts`
- Modify: `src/features/commands/types.ts`
- Modify: `src/features/commands/runtimeMapper.ts`
- Modify: `src/features/commands/schemaBusinessRules.ts`
- Modify: `src/features/commands/__tests__/runtimeMapper.test.ts`
- Modify: `src/features/commands/__tests__/commandTemplates.test.ts`
- Modify: `src/features/security/__tests__/commandSafety.test.ts`

- [ ] **Step 1: 先写失败测试，锁定 mapper 输出**

```ts
expect(template.execution.kind).toBe("exec");
expect(template.preview).toBe("python3 -m http.server {{port}}");
expect(template.execution.stdinArgKey).toBe("sql");
expect(scriptTemplate.execution.runner).toBe("powershell");
```

- [ ] **Step 2: 在 TS 类型里引入结构化 execution union，但保留 `preview` 展示字段**

```ts
type CommandExecutionTemplate =
  | { kind: "exec"; program: string; args: string[]; stdinArgKey?: string }
  | { kind: "script"; runner: "powershell" | "pwsh" | "cmd" | "bash" | "sh"; command: string };
```

- [ ] **Step 3: 在 `schemaBusinessRules.ts` 实现本轮强约束**

规则只做这三条：
- `stdinArgKey` 必须引用已定义参数。
- `script.runner=*` 时必须有匹配的 `shell:*` prerequisite。
- `exec` 命令不得继续出现 shell-only 灰区字段。

- [ ] **Step 4: 更新 mapper，把 preview 改成派生值，不再把 source of truth 放在 preview 上**

`preview` 仍供搜索、面板展示、安全提示使用，但执行层后续只能消费 `template.execution`。

- [ ] **Step 5: 跑 mapper / business-rule / safety 测试**

Run: `npm run test -- src/features/commands/__tests__/runtimeMapper.test.ts src/features/commands/__tests__/commandTemplates.test.ts src/features/security/__tests__/commandSafety.test.ts`

Expected: PASS；`commandSafety` 仍基于 preview 工作，但 preview 来自结构化字段派生。

- [ ] **Step 6: 提交**

```bash
git add src/features/commands/runtimeTypes.ts \
  src/features/commands/types.ts \
  src/features/commands/runtimeMapper.ts \
  src/features/commands/schemaBusinessRules.ts \
  src/features/commands/__tests__/runtimeMapper.test.ts \
  src/features/commands/__tests__/commandTemplates.test.ts \
  src/features/security/__tests__/commandSafety.test.ts
git commit -m "feat(commands):定义结构化 execution 运行时类型"
```

### Task 3: 重建 YAML 生成器与严格 CLI

**Files:**
- Create: `scripts/commands/catalogGenerator/parseYamlCatalog.mjs`
- Create: `scripts/commands/catalogGenerator/buildRuntimeJson.mjs`
- Create: `scripts/commands/catalogGenerator/buildGeneratedMarkdown.mjs`
- Create: `scripts/commands/catalogGenerator/writeCatalogManifest.mjs`
- Modify: `scripts/commands/generate-builtin-commands.mjs`
- Modify: `scripts/generate_builtin_commands.ps1`
- Modify: `package.json`
- Modify: `scripts/__tests__/generate-builtin-commands.test.ts`
- Delete: `scripts/commands/builtinCommandGenerator.mjs`

- [ ] **Step 1: 先把旧 Markdown fixture 测试迁成 YAML fixture 测试，并补 CLI fail-fast 用例**

```ts
expect(runNodeBuiltinGeneratorWith("--unknown", "1").status).not.toBe(0);
expect(runNodeBuiltinGeneratorWith("--help").stdout).toContain("Usage");
expect(runNodeBuiltinGeneratorWith("--sourceDir", sourceDir).status).toBe(0);
expect(readFileSync(path.join(outputDir, "_network.json"), "utf8")).toContain("\"exec\"");
```

- [ ] **Step 2: 新建模块化生成器，薄 CLI 只做参数解析与 help**

CLI 只保留：
- `--sourceDir`
- `--sourcePattern`
- `--outputDir`
- `--manifestPath`
- `--generatedDocsDir`
- `--generatedIndexPath`
- `--expectedLogicalCount`
- `--help`

未知 flag、缺值、`NaN` 都必须 `stderr + exit 1`。

- [ ] **Step 3: 生成器默认真源切到 YAML，默认文档输出切到 `docs/generated_commands`**

```yaml
meta:
  name: 网络工具
  moduleSlug: network

commands:
  - id: http-server
    platform: all
    exec:
      program: python3
      args: ["-m", "http.server", "{{port}}"]
```

- [ ] **Step 4: PowerShell wrapper 只做参数透传，默认路径同步改掉**

`scripts/generate_builtin_commands.ps1` 默认改为：
- `SourceDir = "commands/catalog"`
- `GeneratedDocsDir = "docs/generated_commands"`
- `GeneratedIndexPath = "docs/generated_commands/index.md"`

- [ ] **Step 5: 跑生成器定向测试**

Run: `npm run test -- scripts/__tests__/generate-builtin-commands.test.ts`

Expected: PASS；生成 JSON 与 `docs/generated_commands/*.md`，同时未知参数 fail-fast。

- [ ] **Step 6: 提交**

```bash
git add scripts/commands/catalogGenerator \
  scripts/commands/generate-builtin-commands.mjs \
  scripts/generate_builtin_commands.ps1 \
  package.json \
  scripts/__tests__/generate-builtin-commands.test.ts
git rm scripts/commands/builtinCommandGenerator.mjs
git commit -m "feat(commands):重建 yaml 生成器与严格 cli"
```

### Task 4: 补迁移脚本与分类报告，但先只在测试夹具验证

**Files:**
- Create: `scripts/commands/migrate-builtin-command-sources.mjs`
- Create: `scripts/__tests__/migrate-builtin-command-sources.test.ts`
- Modify: `package.json`

- [ ] **Step 1: 写失败测试，锁定三类分类结果**

```ts
expect(report.execIds).toContain("docker-ps");
expect(report.scriptIds).toContain("kill-port-win");
expect(report.stdinIds).toContain("sqlite-query");
```

- [ ] **Step 2: 实现迁移脚本**

脚本输入 `docs/command_sources/_*.md`，输出：
- YAML 文档内容
- 分类报告
- 高风险待人工复核列表

高风险命令至少包括：
- 含 `|` / `>` / `<`
- PowerShell cmdlet
- `cmd` builtin
- 多条语句
- 带 SQL / regex / JSON 大文本参数

- [ ] **Step 3: 暂时只在 temp fixture 跑，不提交 repo 真源**

Run: `npm run test -- scripts/__tests__/migrate-builtin-command-sources.test.ts`

Expected: PASS；先证明分类器可靠，再进入真正仓库迁移。

- [ ] **Step 4: 提交**

```bash
git add scripts/commands/migrate-builtin-command-sources.mjs \
  scripts/__tests__/migrate-builtin-command-sources.test.ts \
  package.json
git commit -m "feat(commands):补 builtin markdown 到 yaml 迁移脚本"
```

## Chunk 2: Runtime / Executor 切换

### Task 5: 前端 runtime loader / preview / staging / safety 切到结构化 execution

**Files:**
- Modify: `src/features/commands/runtimeLoader.ts`
- Modify: `src/features/launcher/commandRuntime.ts`
- Modify: `src/features/launcher/types.ts`
- Modify: `src/features/security/commandSafety.ts`
- Modify: `src/composables/execution/useCommandExecution/helpers.ts`
- Modify: `src/composables/execution/useCommandExecution/actions.ts`
- Modify: `src/composables/launcher/useLauncherSearch.ts`
- Modify: `src/components/launcher/parts/LauncherCommandPanel.vue`
- Modify: `src/composables/__tests__/execution/useCommandExecution.test.ts`
- Modify: `src/composables/__tests__/launcher/useLauncherSearch.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`

- [ ] **Step 1: 先写失败测试，锁定“展示 string 与执行 payload 脱钩”**

```ts
expect(staged.renderedPreview).toContain("sqlite3");
expect(staged.execution.kind).toBe("exec");
expect(staged.execution.stdin).toBe("select 1;");
```

- [ ] **Step 2: 用 `resolveCommandExecution()` 取代 `renderCommand()` 的“返回整句字符串”主职责**

保留两个输出：
- `renderedPreview: string`
- `resolvedExecution: { kind: "exec" | "script"; ... }`

`renderCommand()` 可以保留为 preview helper，但不得再作为执行真源。

- [ ] **Step 3: 更新 staging / queue / safety**

`StagedCommand` 新结构至少包含：

```ts
{
  renderedPreview: string;
  execution: ResolvedCommandExecution;
  prerequisites?: CommandPrerequisite[];
}
```

安全检查仍吃 `renderedPreview`，不要直接拿 raw YAML 或 raw JSON 做字符串正则。

- [ ] **Step 4: 更新搜索与命令面板**

搜索继续使用 `title + description + preview + folder + category`；面板预览对 `script.command` 显示摘要，多行脚本允许折叠展开。

- [ ] **Step 5: 跑前端行为测试**

Run: `npm run test -- src/composables/__tests__/execution/useCommandExecution.test.ts src/composables/__tests__/launcher/useLauncherSearch.test.ts src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`

Expected: PASS；执行前的交互流程不再依赖 `renderedCommand:string`。

- [ ] **Step 6: 提交**

```bash
git add src/features/commands/runtimeLoader.ts \
  src/features/launcher/commandRuntime.ts \
  src/features/launcher/types.ts \
  src/features/security/commandSafety.ts \
  src/composables/execution/useCommandExecution/helpers.ts \
  src/composables/execution/useCommandExecution/actions.ts \
  src/composables/launcher/useLauncherSearch.ts \
  src/components/launcher/parts/LauncherCommandPanel.vue \
  src/composables/__tests__/execution/useCommandExecution.test.ts \
  src/composables/__tests__/launcher/useLauncherSearch.test.ts \
  src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
git commit -m "feat(commands):前端执行状态切到结构化 payload"
```

### Task 6: 把 TS terminal dispatch 从拼 shell 字符串改成结构化 request

**Files:**
- Modify: `src/services/commandExecutor.ts`
- Modify: `src/composables/launcher/useTerminalExecution.ts`
- Modify: `src/services/__tests__/commandExecutor.test.ts`
- Modify: `src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- Modify: `src/__tests__/app.core-path-regression.test.ts`
- Modify: `src/__tests__/app.failure-events.test.ts`

- [ ] **Step 1: 先写失败测试，锁定 invoke payload 形状**

```ts
expect(invokeMock).toHaveBeenCalledWith("run_command_in_terminal", {
  terminalId: "wt",
  steps: [
    {
      summary: "git status",
      execution: { kind: "exec", program: "git", args: ["status"] }
    }
  ],
  requiresElevation: false,
  alwaysElevated: false
});
```

- [ ] **Step 2: 定义新的 TS request**

```ts
interface StructuredTerminalExecutionStep {
  summary: string;
  execution: ResolvedCommandExecution;
}
```

单条命令与队列共用 `steps[]`；前端不再生成 PowerShell/CMD 失败提示片段。

- [ ] **Step 3: 精简 `useTerminalExecution.ts`**

只做三件事：
- 解析最终 terminalId
- 组装 `steps[]`
- 透传 elevation / reuse policy

把 shell-specific payload builder 全部移出 TS。

- [ ] **Step 4: 跑 TS 调度回归**

Run: `npm run test -- src/services/__tests__/commandExecutor.test.ts src/composables/__tests__/launcher/useTerminalExecution.test.ts src/__tests__/app.core-path-regression.test.ts src/__tests__/app.failure-events.test.ts`

Expected: PASS；app 层 mock 的 invoke payload 改成结构化对象。

- [ ] **Step 5: 提交**

```bash
git add src/services/commandExecutor.ts \
  src/composables/launcher/useTerminalExecution.ts \
  src/services/__tests__/commandExecutor.test.ts \
  src/composables/__tests__/launcher/useTerminalExecution.test.ts \
  src/__tests__/app.core-path-regression.test.ts \
  src/__tests__/app.failure-events.test.ts
git commit -m "feat(commands):前端 terminal dispatch 改为结构化请求"
```

### Task 7: Rust executor 按 exec/script 落地，并让 runner 与 prerequisite 闭环

**Files:**
- Modify: `src-tauri/src/terminal.rs`
- Modify: `src-tauri/src/terminal/windows_routing.rs`
- Modify: `src-tauri/src/terminal/windows_launch.rs`
- Modify: `src-tauri/src/terminal/tests_exec.rs`
- Modify: `src-tauri/src/command_catalog/prerequisites.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 先补 Rust 单测，锁定 host terminal builder 行为**

至少覆盖：
- `wt + exec(git status)` 走 program/args
- `wt + script(powershell)` 走 PowerShell runner
- `cmd + script(cmd)` 走 `cmd /K`
- `linux/mac + script(bash/sh)` 保持 runner 对齐
- queue 场景的 summary / failed marker 仍可定位到第 N 步

- [ ] **Step 2: 在 Tauri command payload 中接收 `steps[] + execution` union**

```rust
#[derive(serde::Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
enum ExecutionSpec {
    Exec { program: String, args: Vec<String>, stdin_arg_key: Option<String>, stdin: Option<String> },
    Script { runner: String, command: String },
}
```

- [ ] **Step 3: 在 Rust 端统一做最后一公里适配**

要求：
- `exec` 优先走 argv-safe 路径。
- 宿主 terminal 无法直接接 argv 时，只允许在 Rust 最后一层做受控 quoting。
- `script` 必须显式按 runner 路由。
- failure marker 由 Rust 注入，前端不再拼接。

- [ ] **Step 4: prerequisite probe 与 runner 对齐**

`prerequisites.rs` 至少补这几条：
- `shell:powershell` 对应 `runner=powershell`
- `shell:pwsh` 对应 `runner=pwsh`
- `shell:cmd` / `shell:bash` / `shell:sh` 一致化

probe 通过与最终执行必须是同一 runner 语义，不能再出现“probe 过了但执行落到别的 shell”。

- [ ] **Step 5: 跑 Rust 回归**

Run: `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests_exec command_catalog::prerequisites`

Expected: PASS；Windows/Linux/macOS builder contract 全绿。

- [ ] **Step 6: 提交**

```bash
git add src-tauri/src/terminal.rs \
  src-tauri/src/terminal/windows_routing.rs \
  src-tauri/src/terminal/windows_launch.rs \
  src-tauri/src/terminal/tests_exec.rs \
  src-tauri/src/command_catalog/prerequisites.rs \
  src-tauri/src/lib.rs
git commit -m "feat(commands):rust executor 支持 exec script 路由"
```

## Chunk 3: 迁移、清理与回归门禁

### Task 8: 全量迁移 builtin 到 YAML，并提交 JSON + Markdown 新产物

**Files:**
- Create: `commands/catalog/_*.yaml`
- Create: `docs/generated_commands/_*.md`
- Create: `docs/generated_commands/index.md`
- Modify: `assets/runtime_templates/commands/builtin/_*.json`
- Modify: `assets/runtime_templates/commands/builtin/index.json`
- Delete: `docs/command_sources/_*.md`

- [ ] **Step 1: 运行迁移脚本生成 YAML 候选，并人工复核高风险模块**

优先复核这些模块：
- `commands/catalog/_network.yaml`
- `commands/catalog/_dev.yaml`
- `commands/catalog/_service.yaml`
- `commands/catalog/_sqlite.yaml`
- `commands/catalog/_postgres.yaml`

必须人工点检的代表命令：
- `docker-ps` -> `exec`
- `kill-port-win` -> `script + runner=powershell`
- `sqlite-query` -> `exec + stdinArgKey=sql`
- `regex-test-win` -> `script + runner=powershell`
- `regex-test-linux` -> `script + runner=bash` 或 `sh`

- [ ] **Step 2: 跑新的生成器，产出 JSON 与模块 Markdown**

Run: `npm run commands:builtin:generate`

Expected: `assets/runtime_templates/commands/builtin/_*.json`、`assets/runtime_templates/commands/builtin/index.json`、`docs/generated_commands/_*.md`、`docs/generated_commands/index.md` 一次性刷新。

- [ ] **Step 3: 锁定数量与分类不漂移**

Run: `npm run test -- src/features/commands/__tests__/runtimeLoader.test.ts`

Expected: PASS；builtin 总数、平台拆分、category 稳定。

- [ ] **Step 4: 删除旧 Markdown 真源文件**

只删 `docs/command_sources/_*.md`；`docs/command_sources/README.md` 在 Task 9 改成目录说明/跳转页。

- [ ] **Step 5: 提交**

```bash
git add commands/catalog \
  assets/runtime_templates/commands/builtin \
  docs/generated_commands
git rm docs/command_sources/_*.md
git commit -m "feat(commands):切换 builtin 真源到 yaml"
```

### Task 9: 更新用户文档、CI 门禁，并删除旧主链引用

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `CONTRIBUTING.md`
- Modify: `CONTRIBUTING.zh-CN.md`
- Modify: `docs/README.md`
- Modify: `docs/schemas/README.md`
- Modify: `docs/schemas/examples/command-file.min.json`
- Modify: `docs/schemas/examples/command-file.platform-split.json`
- Modify: `assets/runtime_templates/commands/my-commands.sample.json`
- Modify: `assets/runtime_templates/README.md`
- Modify: `docs/command_sources/README.md`
- Modify: `scripts/precommit-guard.mjs`
- Modify: `.github/workflows/ci-gate.yml`
- Delete: `docs/builtin_commands.generated.md`

- [ ] **Step 1: 更新用户命令示例与 breaking-change 文案**

README 与 sample JSON 一律改成：
- `exec.program + exec.args[]`
- 或 `script.runner + script.command`

明确写出：旧 `template` 用户命令在本次切换后不再被接受。

- [ ] **Step 2: 更新生成链文档与维护入口**

新文案统一到：
- 真源：`commands/catalog/_*.yaml`
- 产物：`assets/runtime_templates/commands/builtin/_*.json`
- 只读说明：`docs/generated_commands/_*.md`

`docs/command_sources/README.md` 只保留“历史目录已退役，请查看新目录”的说明，不再充当 authoring guide。

- [ ] **Step 3: 更新 precommit / CI 监视路径**

CI diff gate 改为检查：
- `commands/catalog/**`
- `assets/runtime_templates/commands/builtin/**`
- `docs/generated_commands/**`

不再检查 `docs/builtin_commands.generated.md`。

- [ ] **Step 4: 做旧引用清扫**

Run: `rg -n "docs/command_sources/_.*\\.md|docs/builtin_commands.generated.md|\\btemplate\\b" README* CONTRIBUTING* docs assets scripts src src-tauri`

Expected: 只允许命中历史说明页、spec/plan 历史文档或非命令语义位置；不得再命中当前实现文档与 runtime 主链。

- [ ] **Step 5: 提交**

```bash
git add README.md README.zh-CN.md CONTRIBUTING.md CONTRIBUTING.zh-CN.md \
  docs/README.md docs/schemas/README.md docs/schemas/examples \
  assets/runtime_templates/commands/my-commands.sample.json \
  assets/runtime_templates/README.md docs/command_sources/README.md \
  scripts/precommit-guard.mjs .github/workflows/ci-gate.yml
git rm docs/builtin_commands.generated.md
git commit -m "docs(commands):更新 yaml 真源与结构化执行文档门禁"
```

### Task 10: 跑完整回归门禁并做一次切换验收

**Files:**
- Test: `scripts/__tests__/generate-builtin-commands.test.ts`
- Test: `scripts/__tests__/migrate-builtin-command-sources.test.ts`
- Test: `src/features/commands/__tests__/schemaValidation.test.ts`
- Test: `src/features/commands/__tests__/schemaGuard.test.ts`
- Test: `src/features/commands/__tests__/runtimeLoader.test.ts`
- Test: `src/features/commands/__tests__/runtimeMapper.test.ts`
- Test: `src/features/security/__tests__/commandSafety.test.ts`
- Test: `src/composables/__tests__/execution/useCommandExecution.test.ts`
- Test: `src/composables/__tests__/launcher/useTerminalExecution.test.ts`
- Test: `src/services/__tests__/commandExecutor.test.ts`
- Test: `src-tauri/src/terminal/tests_exec.rs`
- Test: `src-tauri/src/command_catalog/prerequisites.rs`

- [ ] **Step 1: 先跑生成链定向回归**

Run: `npm run commands:schema:generate && npm run commands:schema:check && npm run commands:builtin:generate`

Expected: 全部退出码 `0`；生成器重复执行后不再产生新的 diff。

- [ ] **Step 2: 跑 JS/TS 定向回归**

Run: `npm run test -- scripts/__tests__/generate-builtin-commands.test.ts scripts/__tests__/migrate-builtin-command-sources.test.ts src/features/commands/__tests__/schemaValidation.test.ts src/features/commands/__tests__/schemaGuard.test.ts src/features/commands/__tests__/runtimeLoader.test.ts src/features/commands/__tests__/runtimeMapper.test.ts src/features/security/__tests__/commandSafety.test.ts src/composables/__tests__/execution/useCommandExecution.test.ts src/composables/__tests__/launcher/useTerminalExecution.test.ts src/services/__tests__/commandExecutor.test.ts`

Expected: PASS。

- [ ] **Step 3: 跑 Rust 定向回归**

Run: `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests_exec command_catalog::prerequisites`

Expected: PASS。

- [ ] **Step 4: 跑仓库 blocking gate**

Run: `npm run check:all`

Expected: 按项目顺序通过 `lint -> typecheck -> check:style-guard -> typecheck:test -> test:coverage -> build -> check:rust -> test:rust`。

- [ ] **Step 5: 做一次代表性行为验收**

至少人工确认这 6 类：
- PowerShell only：`kill-port-win`、`timestamp-now-win`
- argv-safe：`docker-ps`
- `stdinArgKey`：`sqlite-query`
- number/path/select 参数：任选 `postgres-query`、`sqlite-shell`、`docker-image-inspect`
- pipe / redirect script：`regex-test-linux` 或 `regex-test-win`
- queue：单条 `exec` + 单条 `script` 混合入队

- [ ] **Step 6: 最终提交**

```bash
git add commands/catalog docs/generated_commands assets/runtime_templates/commands/builtin \
  docs/schemas src src-tauri scripts package.json README.md README.zh-CN.md \
  CONTRIBUTING.md CONTRIBUTING.zh-CN.md docs/README.md assets/runtime_templates/README.md \
  docs/command_sources/README.md .github/workflows/ci-gate.yml
git commit -m "feat(commands):完成 yaml 真源与结构化执行切换"
```

## Blocking 回归门禁

执行阶段每个 chunk 完成后都要重复以下最小门禁：

1. `npm run test -- <当前 task 涉及的测试文件>`
2. `cargo test --manifest-path src-tauri/Cargo.toml <当前 task 涉及的模块>`（只要改了 Rust）
3. `npm run commands:schema:generate`
4. `npm run commands:schema:check`
5. `npm run commands:builtin:generate`
6. `npm run check:all`（Chunk 3 末尾必须全绿）

## 风险提示

- 不要给用户命令保留长期 `template` 兼容层；这会让 builtin 与 user runtime 再次分叉。
- 不要把 shell-specific payload 拼接留在前端；否则 `runner` 闭环仍然会被默认终端覆盖。
- `sqlite-query` / `postgres-query` 这类文本命令如果不借 `stdinArgKey`，后续还会继续把 quoting 压给作者。
- 清理 grep 时要排除 `docs/superpowers/specs/**`、`docs/superpowers/plans/**`、`plan/**`，这些目录允许保留历史 `template` / `docs/command_sources` 文案。

## 执行顺序

严格按下面顺序，不要并行改：

1. Task 1-4：schema / 类型 / 生成器
2. Task 5-7：runtime / executor
3. Task 8-9：迁移 builtin 与删除旧实现
4. Task 10：全量回归与一次切换验收
