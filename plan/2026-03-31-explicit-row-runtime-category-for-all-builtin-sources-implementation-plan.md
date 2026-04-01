# Explicit Row Runtime Category For All Builtin Sources Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把所有 builtin Markdown 命令源统一迁移为“每条命令显式写运行时分类”的 11 列格式，并刷新生成产物与验证。

**Architecture:** 先用仓库级测试锁住“所有 `_*.md` 都必须逐行声明运行时分类”的 contract，再批量把仍为 10 列的源文件迁移为 11 列。生成器继续保留回退兼容能力，但仓库内置命令源统一以行级显式写法作为规范真源。

**Tech Stack:** Markdown command source DSL, PowerShell generator, TypeScript, Vitest

---

## Task 1: 锁定仓库级规范红灯

**Files:**
- Modify: `scripts/__tests__/generate-builtin-commands.test.ts`

- [ ] **Step 1: 增加仓库级断言，要求全部 builtin 源文件使用 11 列表头**
- [ ] **Step 2: 增加仓库级断言，要求每条命令行显式填写非空运行时分类**
- [ ] **Step 3: 运行 focused test，确认 RED**

Run:
- `npm test -- scripts/__tests__/generate-builtin-commands.test.ts`

## Task 2: 批量迁移 builtin 源文件

**Files:**
- Modify: `docs/command_sources/_dev.md`
- Modify: `docs/command_sources/_docker.md`
- Modify: `docs/command_sources/_file.md`
- Modify: `docs/command_sources/_gh.md`
- Modify: `docs/command_sources/_git.md`
- Modify: `docs/command_sources/_kubernetes.md`
- Modify: `docs/command_sources/_mysql.md`
- Modify: `docs/command_sources/_network.md`
- Modify: `docs/command_sources/_postgres.md`
- Modify: `docs/command_sources/_redis.md`
- Modify: `docs/command_sources/_service.md`
- Modify: `docs/command_sources/_sqlite.md`
- Modify: `docs/command_sources/_ssh.md`
- Modify: `docs/command_sources/_system.md`

- [ ] **Step 1: 将旧 10 列表头统一改为 11 列表头**
- [ ] **Step 2: 为每条命令插入最终运行时分类值**
- [ ] **Step 3: 抽查高危命令、平台拆分命令与含管道模板命令，确认列位未错位**

## Task 3: 同步文档和生成产物

**Files:**
- Modify: `docs/command_sources/README.md`
- Modify: `assets/runtime_templates/commands/builtin/_*.json`
- Modify: `assets/runtime_templates/commands/builtin/index.json`
- Modify: `docs/builtin_commands.generated.md`

- [ ] **Step 1: README 明确“仓库内 builtin 源默认逐行显式写运行时分类”**
- [ ] **Step 2: 运行生成脚本刷新 JSON、manifest 与 snapshot**
- [ ] **Step 3: 抽查 `package / git / docker / gh / service` 等分类输出**

## Task 4: 验证与短期记忆

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 运行 `npm test -- scripts/__tests__/generate-builtin-commands.test.ts`**
- [ ] **Step 2: 运行 `npm test -- src/features/commands/__tests__/runtimeLoader.test.ts`**
- [ ] **Step 3: 追加 `docs/active_context.md`，记录“所有 builtin 源已逐行显式写运行时分类”**
