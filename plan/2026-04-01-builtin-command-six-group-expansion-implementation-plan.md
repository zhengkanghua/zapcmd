# Builtin Command Six Group Expansion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按已确认的 6 组范围补齐本地终端可直接运行的 builtin 命令，保持“1 个 md 源生成 1 个 json 模块”的生成链不变，并继续使用逐命令运行时分类。

**Architecture:** 先用 runtime loader 测试锁定 6 组新增命令的 ID、分类与平台分流，再只改对应 Markdown 命令源，其中数据库/gh/kubernetes/docker/service 复用现有模块，证书命令新增 `_cert.md` 模块。随后运行生成器刷新 builtin JSON、manifest 与 generated snapshot，最后补 active_context 并跑 focused tests 与全量门禁。

**Tech Stack:** Markdown command source DSL, PowerShell generator, TypeScript, Vitest

**Plan Path Note:** 仓库规则要求 implementation plan 落到 `/plan`，因此本计划保存为 `plan/2026-04-01-builtin-command-six-group-expansion-implementation-plan.md`。

---

## Task 1: 先锁运行时红灯

**Files:**
- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`

- [ ] **Step 1: 为数据库只读观测补失败断言**
  - `postgres-version`
  - `postgres-current-db`
  - `postgres-current-user`
  - `postgres-list-extensions`
  - `postgres-db-size`
  - `postgres-active-queries`
  - `mysql-version`
  - `mysql-processlist`
  - `mysql-show-status`
  - `mysql-show-variables`
  - `redis-dbsize`
  - `redis-memory`
  - `redis-client-list`
  - `redis-slowlog-get`
  - `redis-config-get`
  - `sqlite-table-info`
  - `sqlite-index-list`
  - `sqlite-pragma-journal-mode`
  - `sqlite-foreign-key-check`
- [ ] **Step 2: 为 `gh / kubernetes / docker / service / cert` 补失败断言**
  - `gh-run-list`
  - `gh-run-view`
  - `gh-run-watch`
  - `gh-pr-checks`
  - `gh-release-list`
  - `gh-workflow-list`
  - `kubectl-get-all`
  - `kubectl-top-pods`
  - `kubectl-top-nodes`
  - `kubectl-describe-service`
  - `kubectl-get-pvc`
  - `kubectl-get-statefulsets`
  - `kubectl-get-jobs`
  - `kubectl-get-cronjobs`
  - `docker-info`
  - `docker-image-inspect`
  - `docker-volume-inspect`
  - `docker-network-inspect`
  - `docker-compose-images`
  - `docker-compose-top`
  - `docker-compose-exec-sh`
  - `service-list-all-linux`
  - `service-list-failed-linux`
  - `service-enabled-linux`
  - `service-cat-linux`
  - `service-list-mac`
  - `service-status-mac`
  - `openssl-x509-text`
  - `openssl-cert-dates`
  - `openssl-cert-fingerprint`
  - `openssl-s-client`
  - `openssl-pkey-text`
- [ ] **Step 3: 运行定向测试，确认 RED**

Run: `npm run test -- src/features/commands/__tests__/runtimeLoader.test.ts`

Expected:
- FAIL
- 新增命令 ID 当前不存在
- `cert` 分类当前不存在
- mac / linux 的 service 平台分流断言失败

## Task 2: 只改命令源，补齐 6 组范围

**Files:**
- Modify: `docs/command_sources/_postgres.md`
- Modify: `docs/command_sources/_mysql.md`
- Modify: `docs/command_sources/_redis.md`
- Modify: `docs/command_sources/_sqlite.md`
- Modify: `docs/command_sources/_gh.md`
- Modify: `docs/command_sources/_kubernetes.md`
- Modify: `docs/command_sources/_docker.md`
- Modify: `docs/command_sources/_service.md`
- Create: `docs/command_sources/_cert.md`

- [ ] **Step 1: 在现有数据库模块中只补只读观测命令**
- [ ] **Step 2: 在 `_gh.md` 中补 CI / release / workflow 只读命令**
- [ ] **Step 3: 在 `_kubernetes.md` 中补 read-only v2 命令**
- [ ] **Step 4: 在 `_docker.md` 中补 diagnostics 与 compose 诊断命令**
- [ ] **Step 5: 在 `_service.md` 中补 linux / mac 只读服务命令**
- [ ] **Step 6: 新建 `_cert.md`，用 `openssl` 补证书与密钥查看命令**

## Task 3: 刷新 builtin 生成产物

**Files:**
- Modify: `assets/runtime_templates/commands/builtin/_postgres.json`
- Modify: `assets/runtime_templates/commands/builtin/_mysql.json`
- Modify: `assets/runtime_templates/commands/builtin/_redis.json`
- Modify: `assets/runtime_templates/commands/builtin/_sqlite.json`
- Modify: `assets/runtime_templates/commands/builtin/_gh.json`
- Modify: `assets/runtime_templates/commands/builtin/_kubernetes.json`
- Modify: `assets/runtime_templates/commands/builtin/_docker.json`
- Modify: `assets/runtime_templates/commands/builtin/_service.json`
- Create: `assets/runtime_templates/commands/builtin/_cert.json`
- Modify: `assets/runtime_templates/commands/builtin/index.json`
- Modify: `docs/builtin_commands.generated.md`

- [ ] **Step 1: 运行生成脚本刷新 builtin 产物**

Run: `pwsh -File scripts/generate_builtin_commands.ps1`

- [ ] **Step 2: 检查 manifest / generated markdown 已包含新模块与命令**

## Task 4: 绿灯验证与短期记忆补充

**Files:**
- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`
- Modify: `docs/active_context.md`

- [ ] **Step 1: 重新运行 runtime loader 定向测试，确认 GREEN**

Run: `npm run test -- src/features/commands/__tests__/runtimeLoader.test.ts`

Expected:
- PASS
- 新增 `cert` 分类可被 loader 正常识别
- `service` 的 mac / linux / win 平台差异符合断言
- 6 组命令均能被 runtime 读到

- [ ] **Step 2: 运行生成器 focused tests**

Run: `npm run test -- scripts/__tests__/generate-builtin-commands.test.ts`

Expected:
- PASS
- 新增 `_cert.md` 可被生成器正常纳入 manifest

- [ ] **Step 3: 追加 `docs/active_context.md`**
  - 控制在 200 字以内
  - 只补充，不覆盖旧内容

## Task 5: 全量门禁、提交与推送

**Files:**
- Modify: `docs/active_context.md`
- Modify: `plan/2026-04-01-builtin-command-six-group-expansion-implementation-plan.md`

- [ ] **Step 1: 运行全量门禁**

Run: `npm run check:all`

- [ ] **Step 2: 查看 git diff / git status，确认只包含本任务相关改动**
- [ ] **Step 3: 提交中文 commit**
- [ ] **Step 4: push 到 `origin/main`**
