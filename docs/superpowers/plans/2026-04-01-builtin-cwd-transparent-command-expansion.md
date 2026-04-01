# Builtin Cwd-Transparent Command Expansion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保持 builtin 不托管工作目录的前提下，补齐一批 cwd-transparent 高频命令，并修正 `pnpm/yarn` 两个现有命令的语义命名。

**Architecture:** 这轮只改 command source markdown、对应生成产物和 `runtimeLoader` 测试；schema、运行时执行链与预检链保持不动。实现顺序遵循 TDD：先在 `runtimeLoader` 中写失败断言，再修改 source，最后运行生成器和 focused tests 收口。

**Tech Stack:** Markdown command source DSL, PowerShell generator, JSON runtime templates, TypeScript, Vitest

---

## File Structure

- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`
  - 锁定新增命令 ID、平台拆分、category 不漂移以及 `pnpm/yarn` 语义改名。
- Modify: `docs/command_sources/_npm.md`
- Modify: `docs/command_sources/_pnpm.md`
- Modify: `docs/command_sources/_yarn.md`
- Modify: `docs/command_sources/_network.md`
- Modify: `docs/command_sources/_gh.md`
- Modify: `docs/command_sources/_dev.md`
- Modify: `assets/runtime_templates/commands/builtin/_npm.json`
- Modify: `assets/runtime_templates/commands/builtin/_pnpm.json`
- Modify: `assets/runtime_templates/commands/builtin/_yarn.json`
- Modify: `assets/runtime_templates/commands/builtin/_network.json`
- Modify: `assets/runtime_templates/commands/builtin/_gh.json`
- Modify: `assets/runtime_templates/commands/builtin/_dev.json`
- Modify: `assets/runtime_templates/commands/builtin/index.json`
- Modify: `docs/builtin_commands.generated.md`
- Reference: `scripts/generate_builtin_commands.ps1`
- Reference: `docs/superpowers/specs/2026-04-01-builtin-cwd-transparent-command-expansion-design.md`

## Chunk 1: Lock The Loader Contract

### Task 1: 在 `runtimeLoader` 里先写红灯

**Files:**
- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`

- [ ] **Step 1: 扩展 network / dev / gh / package 的 builtin 加载断言**

```ts
expect(winTemplates.some((item) => item.id === "curl-json-post")).toBe(true);
expect(macTemplates.some((item) => item.id === "dig-short-mac")).toBe(true);
expect(winTemplates.some((item) => item.id === "uuid-gen-win")).toBe(true);
expect(templates.some((item) => item.id === "gh-pr-diff")).toBe(true);
expect(templates.some((item) => item.id === "npm-ci")).toBe(true);
expect(templates.some((item) => item.id === "pnpm-install-project")).toBe(true);
expect(templates.some((item) => item.id === "yarn-install-project")).toBe(true);
```

- [ ] **Step 2: 增加语义改名断言**

```ts
expect(loaded.templates.some((item) => item.id === "pnpm-add")).toBe(true);
expect(loaded.templates.some((item) => item.id === "pnpm-install")).toBe(false);
expect(loaded.templates.some((item) => item.id === "yarn-add")).toBe(true);
expect(loaded.templates.some((item) => item.id === "yarn-install")).toBe(false);
```

- [ ] **Step 3: 运行 focused test，确认当前为红灯**

Run: `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts`
Expected: FAIL，失败点包含上述新增命令尚不存在，以及旧 ID 仍存在。

## Chunk 2: Expand Command Sources

### Task 2: 补 package / network / gh / dev 命令源

**Files:**
- Modify: `docs/command_sources/_npm.md`
- Modify: `docs/command_sources/_pnpm.md`
- Modify: `docs/command_sources/_yarn.md`
- Modify: `docs/command_sources/_network.md`
- Modify: `docs/command_sources/_gh.md`
- Modify: `docs/command_sources/_dev.md`

- [ ] **Step 1: 修改 `_npm.md`**

追加：

```md
| ... | `npm-install-project` | NPM 安装项目依赖 | package | all | `npm install` | - | - | false | binary:npm | ... |
| ... | `npm-ci` | NPM 基于 lockfile 安装依赖 | package | all | `npm ci` | - | - | false | binary:npm | ... |
| ... | `npx-run` | NPX 运行临时包命令 | package | all | `npx {{package}}` | package(text) | - | false | binary:npx | ... |
```

- [ ] **Step 2: 修改 `_pnpm.md`**

把首条命令改名为 `pnpm-add`，并追加：

```md
| ... | `pnpm-install-project` | PNPM 安装项目依赖 | package | all | `pnpm install` | - | - | false | binary:pnpm | ... |
| ... | `pnpm-add-dev` | PNPM 安装开发依赖 | package | all | `pnpm add -D {{package}}` | package(text) | - | false | binary:pnpm | ... |
| ... | `pnpm-dlx` | PNPM 运行临时包命令 | package | all | `pnpm dlx {{package}}` | package(text) | - | false | binary:pnpm | ... |
```

- [ ] **Step 3: 修改 `_yarn.md`**

把首条命令改名为 `yarn-add`，并追加：

```md
| ... | `yarn-install-project` | Yarn 安装项目依赖 | package | all | `yarn install` | - | - | false | binary:yarn | ... |
| ... | `yarn-add-dev` | Yarn 安装开发依赖 | package | all | `yarn add -D {{package}}` | package(text) | - | false | binary:yarn | ... |
| ... | `yarn-dlx` | Yarn 运行临时包命令 | package | all | `yarn dlx {{package}}` | package(text) | - | false | binary:yarn | ... |
```

- [ ] **Step 4: 修改 `_network.md`**

追加：

```md
| ... | `curl-json-post` | HTTP POST 请求 (JSON) | network | all | `curl -s -X POST -H "Content-Type: application/json" -H "Accept: application/json" -d '{{body}}' {{url}}` | url(text), body(text) | - | false | binary:curl | ... |
| ... | `curl-json-put` | HTTP PUT 请求 (JSON) | network | all | `curl -s -X PUT -H "Content-Type: application/json" -H "Accept: application/json" -d '{{body}}' {{url}}` | url(text), body(text) | - | false | binary:curl | ... |
| ... | `curl-json-delete` | HTTP DELETE 请求 (JSON) | network | all | `curl -s -X DELETE -H "Accept: application/json" {{url}}` | url(text) | - | false | binary:curl | ... |
| ... | `curl-form-post` | HTTP POST 请求 (Form) | network | all | `curl -s -X POST -F "{{field}}={{value}}" {{url}}` | url(text), field(text), value(text) | - | false | binary:curl | ... |
| ... | `dig-short` | DNS 简洁查询 (dig +short) | network | mac/linux | `dig +short {{domain}} {{type}}` | domain(text), type(select:A/AAAA/CNAME/MX/TXT/NS) | - | false | binary:dig | ... |
```

- [ ] **Step 5: 修改 `_gh.md`**

追加：

```md
| ... | `gh-pr-diff` | GH 查看 PR 差异 | gh | all | `gh pr diff {{pr}}` | pr(text) | - | false | binary:gh | ... |
| ... | `gh-workflow-run` | GH 触发 Workflow | gh | all | `gh workflow run "{{workflow}}"` | workflow(text) | - | false | binary:gh | ... |
| ... | `gh-run-rerun` | GH 重新运行 Actions Run | gh | all | `gh run rerun {{runId}}` | runId(text) | - | false | binary:gh | ... |
| ... | `gh-run-download` | GH 下载 Run 产物 | gh | all | `gh run download {{runId}} -D "{{dir}}"` | runId(text), dir(path, default:.) | - | false | binary:gh | ... |
```

- [ ] **Step 6: 修改 `_dev.md`**

追加：

```md
| ... | `uuid-gen-win` | 生成 UUID | dev | win | `[guid]::NewGuid().ToString()` | - | - | false | shell:powershell | ... |
| ... | `base64-encode-win` | Base64 编码 | dev | win | `[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("{{text}}"))` | text(text) | - | false | shell:powershell | ... |
| ... | `base64-decode-win` | Base64 解码 | dev | win | `[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String("{{text}}"))` | text(text) | - | false | shell:powershell | ... |
| ... | `sha256-hash-win` | 计算 SHA256 哈希 | dev | win | `([System.BitConverter]::ToString((New-Object System.Security.Cryptography.SHA256Managed).ComputeHash([Text.Encoding]::UTF8.GetBytes("{{text}}")))).Replace("-", "").ToLower()` | text(text) | - | false | shell:powershell | ... |
| ... | `regex-test-win` | 正则表达式测试 | dev | win | `[regex]::Matches("{{text}}", "{{pattern}}") | ForEach-Object { $_.Value }` | text(text), pattern(text) | - | false | shell:powershell | ... |
```

## Chunk 3: Refresh Generated Artifacts

### Task 3: 运行生成器并检查产物

**Files:**
- Modify: `assets/runtime_templates/commands/builtin/_npm.json`
- Modify: `assets/runtime_templates/commands/builtin/_pnpm.json`
- Modify: `assets/runtime_templates/commands/builtin/_yarn.json`
- Modify: `assets/runtime_templates/commands/builtin/_network.json`
- Modify: `assets/runtime_templates/commands/builtin/_gh.json`
- Modify: `assets/runtime_templates/commands/builtin/_dev.json`
- Modify: `assets/runtime_templates/commands/builtin/index.json`
- Modify: `docs/builtin_commands.generated.md`

- [ ] **Step 1: 运行生成器刷新全部 builtin 产物**

Run: `pwsh -File scripts/generate_builtin_commands.ps1`
Expected: PASS，所有受影响模块 JSON、manifest 和 generated markdown 同步更新。

- [ ] **Step 2: 检查 manifest totals 与模块映射**

Run: `git diff -- assets/runtime_templates/commands/builtin/index.json`
Expected: `logicalCommandCount / physicalCommandCount` 增长，`generatedFiles` 中 `_npm/_pnpm/_yarn/_network/_gh/_dev` 的 count 随新增命令同步变化。

## Chunk 4: Verify Green

### Task 4: 跑 focused tests 与必要门禁

**Files:**
- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`

- [ ] **Step 1: 重新运行 runtime loader focused test**

Run: `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts`
Expected: PASS，新增命令全部可加载，旧误导 ID 消失，category 仍维持 `package`。

- [ ] **Step 2: 运行 schema sync 检查**

Run: `npm run commands:schema:check`
Expected: PASS，确认未误改 schema 生成物。

- [ ] **Step 3: 运行本轮最小门禁**

Run: `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts`
Expected: PASS

## Chunk 5: Context And Handoff

### Task 5: 更新短期记忆并准备交付

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 在 `docs/active_context.md` 顶部补一条 200 字内摘要**

```md
- 已补 cwd-transparent builtin 扩充：新增 npm/pnpm/yarn 项目安装与临时执行、network JSON 写请求、GH workflow/PR diff、Windows dev parity，并将 `pnpm-install/yarn-install` 收正为 `pnpm-add/yarn-add`。
```

- [ ] **Step 2: 整理变更、验证结果与未执行项**

Expected: 最终交付说明包含改动范围、验证命令与是否未执行 `check:all`。
