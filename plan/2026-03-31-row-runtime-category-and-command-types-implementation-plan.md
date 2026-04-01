# Row Runtime Category And Command Types Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 builtin Markdown DSL 从“文件级运行时分类”扩成“文件级默认 + 行级覆盖”，并补齐 `service / gh / docker-compose / kubernetes read-only` 常用命令。

**Architecture:** 先用生成器测试锁定新 DSL contract，再改 PowerShell 生成器与 README，使旧 10 列表格保持兼容、新 11 列表格支持行级 `运行时分类` 覆盖。随后迁移 package 源文件到行级 runtime category，并新增 `service` 与 `gh` 命令源、扩充 `docker` 与 `kubernetes` 只读命令，最后刷新生成产物并跑 focused tests。

**Tech Stack:** Markdown command source DSL, PowerShell generator, TypeScript, Vitest

**Plan Path Note:** 仓库规则要求 implementation plan 落到 `/plan`，因此本计划保存为 `plan/2026-03-31-row-runtime-category-and-command-types-implementation-plan.md`。

---

## Task 1: 先锁 DSL 红灯

**Files:**
- Modify: `scripts/__tests__/generate-builtin-commands.test.ts`
- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`

- [ ] **Step 1: 写失败测试，锁定行级 `运行时分类` 覆盖 contract**
- [ ] **Step 2: 写失败测试，锁定新增 `service / gh / docker-compose / kubernetes read-only` 命令 ID**
- [ ] **Step 3: 运行 focused tests，确认 RED**

Run:
- `npm run test -- scripts/__tests__/generate-builtin-commands.test.ts`
- `npm run test -- src/features/commands/__tests__/runtimeLoader.test.ts`

## Task 2: 改生成器与文档

**Files:**
- Modify: `scripts/generate_builtin_commands.ps1`
- Modify: `docs/command_sources/README.md`

- [ ] **Step 1: 支持新表头列 `运行时分类`**
- [ ] **Step 2: 兼容旧 10 列行格式**
- [ ] **Step 3: 支持回退顺序：行级 > 文件级 > 文件 slug**
- [ ] **Step 4: manifest / generated snapshot 改为可表达多 runtime categories**

## Task 3: 迁移命令源并扩充类型

**Files:**
- Modify: `docs/command_sources/_npm.md`
- Modify: `docs/command_sources/_pnpm.md`
- Modify: `docs/command_sources/_yarn.md`
- Modify: `docs/command_sources/_bun.md`
- Modify: `docs/command_sources/_pip.md`
- Modify: `docs/command_sources/_brew.md`
- Modify: `docs/command_sources/_cargo.md`
- Create: `docs/command_sources/_service.md`
- Create: `docs/command_sources/_gh.md`
- Modify: `docs/command_sources/_docker.md`
- Modify: `docs/command_sources/_kubernetes.md`

- [ ] **Step 1: 将 package 系列迁移为行级 `运行时分类=package`**
- [ ] **Step 2: 新增 `service` 常用只读命令**
- [ ] **Step 3: 新增 `gh` 常用命令**
- [ ] **Step 4: 扩充 `docker-compose` 常用命令**
- [ ] **Step 5: 扩充 `kubernetes` read-only 命令**

## Task 4: 刷新产物并验证

**Files:**
- Modify: `assets/runtime_templates/commands/builtin/_*.json`
- Modify: `assets/runtime_templates/commands/builtin/index.json`
- Modify: `docs/builtin_commands.generated.md`
- Modify: `docs/active_context.md`

- [ ] **Step 1: 运行生成脚本刷新产物**
- [ ] **Step 2: 重新运行 focused tests，确认 GREEN**
- [ ] **Step 3: 追加 active_context 摘要**
