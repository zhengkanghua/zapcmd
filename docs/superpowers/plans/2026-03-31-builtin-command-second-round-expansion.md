# Builtin Command Second Round Expansion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不新增分类、不改执行机制的前提下，补齐第二轮 `network / dev / package` builtin 命令，并提交对应生成产物与必要测试。

**Architecture:** 这轮只改三类命令源 markdown 和它们派生出的 builtin JSON / manifest / generated snapshot；运行时 schema、loader、执行链都保持不动。测试策略采用数据驱动红灯：先在 `runtimeLoader` 里锁定新命令 ID 与平台分发，再改命令源并运行 PowerShell 生成器刷新产物，最后用 focused tests 与 `check:all` 收口。

**Tech Stack:** Markdown command source DSL, PowerShell generator, JSON runtime templates, TypeScript, Vitest

---

## File Structure

### Source Of Truth

- Modify: `docs/command_sources/_network.md`
  - 追加第二轮 `network` 命令行；保持现有大类，不新增分类文件。
- Modify: `docs/command_sources/_dev.md`
  - 追加第二轮 `dev` 命令行；优先结构化参数与一次性动作。
- Modify: `docs/command_sources/_package.md`
  - 追加第二轮 `package` 命令行；保持“当前上下文透明”，不做 global/cwd 变体。

### Generated Artifacts

- Modify: `assets/runtime_templates/commands/builtin/_network.json`
- Modify: `assets/runtime_templates/commands/builtin/_dev.json`
- Modify: `assets/runtime_templates/commands/builtin/_package.json`
- Modify: `assets/runtime_templates/commands/builtin/index.json`
- Modify: `docs/builtin_commands.generated.md`
- Reference: `scripts/generate_builtin_commands.ps1`
  - 唯一允许的生成入口；所有 generated 文件都通过它刷新，不手改 JSON。

### Tests

- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`
  - 用运行时加载结果锁定新增命令 ID、平台拆分和类别归属。
- Reference: `scripts/__tests__/generate-builtin-commands.test.ts`
  - 现有 generator 行为护栏；本轮默认不扩写，除非实现时暴露出未覆盖回归。

### Spec Reference

- Reference: `docs/superpowers/specs/2026-03-31-builtin-command-second-round-expansion-design.md`

### Deferred Scope

- Do Not Modify: `docs/schemas/command-file.schema.json`
- Do Not Modify: `src/features/commands/generated/commandSchemaValidator.ts`
- Do Not Modify: `src/features/commands/runtimeTypes.ts`
- Do Not Modify: 任何执行机制 / danger 文案 / project/global 绑定逻辑

---

## Chunk 1: Expand Network Builtins

### Task 1: 为 `network` 补齐 JSON GET / 状态码 / whois

**Files:**
- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`
- Modify: `docs/command_sources/_network.md`
- Modify: `assets/runtime_templates/commands/builtin/_network.json`
- Modify: `assets/runtime_templates/commands/builtin/index.json`
- Modify: `docs/builtin_commands.generated.md`
- Reference: `scripts/generate_builtin_commands.ps1`

- [ ] **Step 1: 先写 `runtimeLoader` 红灯，锁定 network 第二轮命令 ID 与平台拆分**

```ts
it("loads second-round network builtin commands with correct platform split", () => {
  const winTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });
  const macTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "mac" });
  const linuxTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "linux" });

  expect(winTemplates.some((item) => item.id === "curl-json-get")).toBe(true);
  expect(winTemplates.some((item) => item.id === "http-status-only-win")).toBe(true);
  expect(winTemplates.some((item) => item.id === "whois-mac")).toBe(false);

  expect(macTemplates.some((item) => item.id === "http-status-only-mac")).toBe(true);
  expect(macTemplates.some((item) => item.id === "whois-mac")).toBe(true);

  expect(linuxTemplates.some((item) => item.id === "http-status-only-linux")).toBe(true);
  expect(linuxTemplates.some((item) => item.id === "whois-linux")).toBe(true);
});
```

- [ ] **Step 2: 运行 network focused test，确认当前缺少这些命令**

Run: `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts`
Expected: FAIL，失败点包含缺少 `curl-json-get`、`http-status-only-win` 或 `whois-mac`/`whois-linux`。

- [ ] **Step 3: 在 `_network.md` 追加 4 行命令源**

```md
| 27 | `curl-json-get` | HTTP GET 请求 (JSON) | all | `curl -s -H "Accept: application/json" {{url}}` | url(text) | - | false | curl | 网络 network curl http json get 获取 |
| 28 | `http-status-only` | 仅查看 HTTP 状态码 | mac/linux | `curl -s -o /dev/null -w "%{http_code}" {{url}}` | url(text) | - | false | curl | 网络 network curl http status 状态码 code |
| 29 | `http-status-only-win` | 仅查看 HTTP 状态码 | win | `curl -s -o NUL -w "%{http_code}" {{url}}` | url(text) | - | false | curl | 网络 network curl http status 状态码 code |
| 30 | `whois` | WHOIS 查询 | mac/linux | `whois {{domain}}` | domain(text) | - | false | whois | 网络 network whois 域名 domain 查询 query |
```

- [ ] **Step 4: 运行 builtin 生成器刷新 JSON / manifest / snapshot**

Run: `pwsh -File scripts/generate_builtin_commands.ps1`
Expected: PASS，`_network.json`、`index.json`、`docs/builtin_commands.generated.md` 更新；snapshot 中 `_network.md` 的 `Logical` 从 `26` 变为 `30`，`Physical` 从 `33` 变为 `39`。

- [ ] **Step 5: 重新运行 runtimeLoader focused test，确认 network 变绿**

Run: `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts`
Expected: PASS，新增 network 命令在对应平台可见，非目标平台被正确过滤。

- [ ] **Step 6: 提交 network chunk**

```bash
git add src/features/commands/__tests__/runtimeLoader.test.ts \
  docs/command_sources/_network.md \
  assets/runtime_templates/commands/builtin/_network.json \
  assets/runtime_templates/commands/builtin/index.json \
  docs/builtin_commands.generated.md
git commit -m "feat(commands):扩充 network builtin 命令"
```

---

## Chunk 2: Expand Dev Builtins

### Task 2: 为 `dev` 补齐 jq / jwt / epoch-ms 工具

**Files:**
- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`
- Modify: `docs/command_sources/_dev.md`
- Modify: `assets/runtime_templates/commands/builtin/_dev.json`
- Modify: `assets/runtime_templates/commands/builtin/index.json`
- Modify: `docs/builtin_commands.generated.md`
- Reference: `scripts/generate_builtin_commands.ps1`

- [ ] **Step 1: 先写 `runtimeLoader` 红灯，锁定 dev 第二轮命令 ID 与平台拆分**

```ts
it("loads second-round dev builtin commands", () => {
  const winTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });
  const macTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "mac" });
  const linuxTemplates = loadBuiltinCommandTemplates({ runtimePlatform: "linux" });

  expect(winTemplates.some((item) => item.id === "jq-format-json")).toBe(true);
  expect(winTemplates.some((item) => item.id === "jwt-decode")).toBe(true);
  expect(winTemplates.some((item) => item.id === "epoch-ms-now-win")).toBe(true);
  expect(winTemplates.some((item) => item.id === "epoch-ms-convert-win")).toBe(true);

  expect(macTemplates.some((item) => item.id === "epoch-ms-now-mac")).toBe(true);
  expect(macTemplates.some((item) => item.id === "epoch-ms-convert-mac")).toBe(true);

  expect(linuxTemplates.some((item) => item.id === "epoch-ms-now-linux")).toBe(true);
  expect(linuxTemplates.some((item) => item.id === "epoch-ms-convert-linux")).toBe(true);
});
```

- [ ] **Step 2: 运行 dev focused test，确认当前为红灯**

Run: `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts`
Expected: FAIL，失败点包含 `jq-format-json`、`jwt-decode` 或 `epoch-ms-*` 系列 ID 尚不存在。

- [ ] **Step 3: 在 `_dev.md` 追加 6 行命令源**

```md
| 19 | `jq-format-json` | 使用 jq 格式化 JSON 文件 | all | `jq . {{file}}` | file(path) | - | false | jq | 开发 dev jq json 格式化 format 文件 file |
| 20 | `jwt-decode` | 解码 JWT | all | `python3 -c "import base64, json, sys; parts=sys.argv[1].split('.'); dec=lambda s: json.loads(base64.urlsafe_b64decode(s + '=' * (-len(s) % 4)).decode()); print(json.dumps({'header': dec(parts[0]), 'payload': dec(parts[1])}, ensure_ascii=False, indent=2))" "{{token}}"` | token(text) | - | false | python3 | 开发 dev jwt decode 解码 token |
| 21 | `epoch-ms-now` | 当前 Unix 毫秒时间戳 | mac/linux | `python3 -c "import time; print(int(time.time() * 1000))"` | - | - | false | python3 | 开发 dev epoch 毫秒 milliseconds timestamp now |
| 22 | `epoch-ms-now-win` | 当前 Unix 毫秒时间戳 | win | `[DateTimeOffset]::Now.ToUnixTimeMilliseconds()` | - | - | false | powershell | 开发 dev epoch 毫秒 milliseconds timestamp now |
| 23 | `epoch-ms-convert` | 毫秒时间戳转日期 | mac/linux | `python3 -c "import datetime; print(datetime.datetime.fromtimestamp({{timestamp}} / 1000, datetime.timezone.utc).astimezone().isoformat())"` | timestamp(number, min:0) | - | false | python3 | 开发 dev epoch 毫秒 milliseconds timestamp convert 转换 日期 |
| 24 | `epoch-ms-convert-win` | 毫秒时间戳转日期 | win | `[DateTimeOffset]::FromUnixTimeMilliseconds({{timestamp}}).ToString("o")` | timestamp(number, min:0) | - | false | powershell | 开发 dev epoch 毫秒 milliseconds timestamp convert 转换 日期 |
```

- [ ] **Step 4: 运行 builtin 生成器刷新 dev 产物**

Run: `pwsh -File scripts/generate_builtin_commands.ps1`
Expected: PASS，`_dev.json`、`index.json`、`docs/builtin_commands.generated.md` 更新；snapshot 中 `_dev.md` 的 `Logical` 从 `18` 变为 `24`，`Physical` 从 `23` 变为 `31`。

- [ ] **Step 5: 重新运行 runtimeLoader focused test，确认 dev 变绿**

Run: `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts`
Expected: PASS，`jq-format-json`、`jwt-decode` 和三平台 `epoch-ms-*` 均按预期加载。

- [ ] **Step 6: 提交 dev chunk**

```bash
git add src/features/commands/__tests__/runtimeLoader.test.ts \
  docs/command_sources/_dev.md \
  assets/runtime_templates/commands/builtin/_dev.json \
  assets/runtime_templates/commands/builtin/index.json \
  docs/builtin_commands.generated.md
git commit -m "feat(commands):扩充 dev builtin 命令"
```

---

## Chunk 3: Expand Package Builtins

### Task 3: 为 `package` 补齐 pnpm / bun 当前目录命令

**Files:**
- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`
- Modify: `docs/command_sources/_package.md`
- Modify: `assets/runtime_templates/commands/builtin/_package.json`
- Modify: `assets/runtime_templates/commands/builtin/index.json`
- Modify: `docs/builtin_commands.generated.md`
- Reference: `scripts/generate_builtin_commands.ps1`

- [ ] **Step 1: 先写 `runtimeLoader` 红灯，锁定 package 第二轮命令 ID**

```ts
it("loads second-round package builtin commands without introducing new categories", () => {
  const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });

  expect(templates.some((item) => item.id === "pnpm-run")).toBe(true);
  expect(templates.some((item) => item.id === "pnpm-up")).toBe(true);
  expect(templates.some((item) => item.id === "bun-install")).toBe(true);
  expect(templates.some((item) => item.id === "bun-run")).toBe(true);

  expect(templates.some((item) => item.category === "pnpm")).toBe(false);
  expect(templates.some((item) => item.category === "bun")).toBe(false);
});
```

- [ ] **Step 2: 运行 package focused test，确认当前为红灯**

Run: `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts`
Expected: FAIL，失败点包含新增 package 命令 ID 尚不存在。

- [ ] **Step 3: 在 `_package.md` 追加 4 行命令源**

```md
| 24 | `pnpm-run` | PNPM 运行脚本 | all | `pnpm run {{script}}` | script(text) | - | false | pnpm | 包管理 package pnpm run 运行 script 脚本 |
| 25 | `pnpm-up` | PNPM 升级依赖 | all | `pnpm up` | - | - | false | pnpm | 包管理 package pnpm up update upgrade 升级 依赖 |
| 26 | `bun-install` | Bun 安装依赖 | all | `bun install` | - | - | false | bun | 包管理 package bun install 安装 依赖 |
| 27 | `bun-run` | Bun 运行脚本 | all | `bun run {{script}}` | script(text) | - | false | bun | 包管理 package bun run 运行 script 脚本 |
```

- [ ] **Step 4: 运行 builtin 生成器刷新 package 产物**

Run: `pwsh -File scripts/generate_builtin_commands.ps1`
Expected: PASS，`_package.json`、`index.json`、`docs/builtin_commands.generated.md` 更新；snapshot 中 `_package.md` 的 `Logical` 从 `23` 变为 `27`，`Physical` 从 `23` 变为 `27`。

- [ ] **Step 5: 重新运行 runtimeLoader focused test，确认 package 变绿**

Run: `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts`
Expected: PASS，新增 package 命令被加载，但分类仍只落在 `package`。

- [ ] **Step 6: 提交 package chunk**

```bash
git add src/features/commands/__tests__/runtimeLoader.test.ts \
  docs/command_sources/_package.md \
  assets/runtime_templates/commands/builtin/_package.json \
  assets/runtime_templates/commands/builtin/index.json \
  docs/builtin_commands.generated.md
git commit -m "feat(commands):扩充 package builtin 命令"
```

---

## Chunk 4: Final Verification And Handoff

### Task 4: 收口 snapshot、验证 totals，并明确 deferred scope

**Files:**
- Modify: `assets/runtime_templates/commands/builtin/index.json`
- Modify: `docs/builtin_commands.generated.md`
- Reference: `docs/superpowers/specs/2026-03-31-builtin-command-second-round-expansion-design.md`
- Reference: `src/features/commands/__tests__/runtimeLoader.test.ts`
- Reference: `scripts/generate_builtin_commands.ps1`
- Reference: `scripts/__tests__/generate-builtin-commands.test.ts`

- [ ] **Step 1: 检查 `runtimeLoader` 测试命名与断言，确认三类新增命令都被覆盖**

```ts
// 保留新增的 3 个 focused 场景：
// - network second-round builtin commands
// - dev second-round builtin commands
// - package second-round builtin commands
```

- [ ] **Step 2: 最后再运行一次生成器，确保 generated 文件完全同步**

Run: `pwsh -File scripts/generate_builtin_commands.ps1`
Expected: PASS，`docs/builtin_commands.generated.md` 中 totals 变为：

```md
- Logical commands: 255
- Physical commands (after platform split): 300
```

- [ ] **Step 3: 运行 focused tests，确认 builtin 二轮回归稳定**

Run: `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts scripts/__tests__/generate-builtin-commands.test.ts`
Expected: PASS

- [ ] **Step 4: 运行 schema sync 检查，确认本轮未引入 schema 漂移**

Run: `npm run commands:schema:check`
Expected: PASS，输出包含 `[commands:schema:check] generated validator is in sync.`

- [ ] **Step 5: 运行完整工程门禁**

Run: `npm run check:all`
Expected: PASS，至少经过 `lint -> typecheck -> typecheck:test -> test:coverage -> build -> check:rust -> test:rust` 全绿。

- [ ] **Step 6: 确认 worktree 干净；若 final verify 触发额外修正，再补一次收口提交**

```bash
git status --short
```

Expected: 若前三个 chunk 已各自提交且 Step 2-5 未引入新修改，则 worktree 应为空。

如果 final verify 暴露出需要额外修正的差异，再执行：

```bash
git add src/features/commands/__tests__/runtimeLoader.test.ts \
  docs/command_sources/_network.md \
  docs/command_sources/_dev.md \
  docs/command_sources/_package.md \
  assets/runtime_templates/commands/builtin/_network.json \
  assets/runtime_templates/commands/builtin/_dev.json \
  assets/runtime_templates/commands/builtin/_package.json \
  assets/runtime_templates/commands/builtin/index.json \
  docs/builtin_commands.generated.md
git commit -m "test(commands):收口 builtin 二轮扩充回归"
```

---

## Deferred TODO

- [ ] `curl-json-post` 继续暂缓，不在本计划内实现。
- [ ] `pnpm up -g`、`pnpm -r`、`bun` 额外交互变体不在本计划内实现。
- [ ] 不新增 `pnpm` / `bun` 分类文件，不拆 `_package.md`。

---

Plan complete and saved to `docs/superpowers/plans/2026-03-31-builtin-command-second-round-expansion.md`. Ready to execute?
