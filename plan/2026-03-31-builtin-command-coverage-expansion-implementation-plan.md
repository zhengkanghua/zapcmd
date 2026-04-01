# Builtin Command Coverage Expansion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不新增分类、不改执行链的前提下，补齐一批高频 builtin 命令，优先覆盖 package、docker、kubernetes 的明显缺口。

**Architecture:** 先用 runtime loader 测试锁定新增命令必须能被运行时读取、且 package 家族仍归到 `package` 分类；再只修改对应 Markdown 命令源，运行生成脚本刷新 JSON 产物、manifest 与 generated snapshot；最后跑定向测试验证新增 contract。

**Tech Stack:** Markdown command source DSL, PowerShell generator, TypeScript, Vitest

**Plan Path Note:** 仓库规则要求 implementation plan 落到 `/plan`，因此本计划保存在 `plan/2026-03-31-builtin-command-coverage-expansion-implementation-plan.md`。

---

## Task 1: 先锁 runtime contract

**Files:**
- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`

- [ ] **Step 1: 写失败测试，锁定新增 package / docker / kubernetes 命令**
- [ ] **Step 2: 运行定向测试，确认当前为 RED**

Run: `npm run test -- src/features/commands/__tests__/runtimeLoader.test.ts`

Expected:
- FAIL
- 新增命令 ID 当前不存在

## Task 2: 只补命令源，不动执行机制

**Files:**
- Modify: `docs/command_sources/_yarn.md`
- Modify: `docs/command_sources/_pnpm.md`
- Modify: `docs/command_sources/_bun.md`
- Modify: `docs/command_sources/_docker.md`
- Modify: `docs/command_sources/_kubernetes.md`

- [ ] **Step 1: 补 package 缺口**
  - `yarn-run`
  - `yarn-remove`
  - `yarn-upgrade`
  - `pnpm-remove`
  - `pnpm-list`
  - `bun-add`
  - `bun-remove`
- [ ] **Step 2: 补 docker 缺口**
  - `docker-compose-ps`
  - `docker-system-df`
- [ ] **Step 3: 补 kubernetes 缺口**
  - `kubectl-get-deployments`
  - `kubectl-get-events`

## Task 3: 刷新生成产物并验证

**Files:**
- Modify: `assets/runtime_templates/commands/builtin/_yarn.json`
- Modify: `assets/runtime_templates/commands/builtin/_pnpm.json`
- Modify: `assets/runtime_templates/commands/builtin/_bun.json`
- Modify: `assets/runtime_templates/commands/builtin/_docker.json`
- Modify: `assets/runtime_templates/commands/builtin/_kubernetes.json`
- Modify: `assets/runtime_templates/commands/builtin/index.json`
- Modify: `docs/builtin_commands.generated.md`

- [ ] **Step 1: 运行生成脚本刷新产物**

Run: `pwsh -File scripts/generate_builtin_commands.ps1`

- [ ] **Step 2: 重新运行 runtime loader 定向测试，确认 GREEN**

Run: `npm run test -- src/features/commands/__tests__/runtimeLoader.test.ts`

Expected:
- PASS
- package 新命令仍归类为 `package`
- docker / kubernetes 新命令可被 runtime 读到

- [ ] **Step 3: 记录 active_context 简要摘要**
