# Command Category Slug And Builtin Command Expansion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将命令分类 contract 从固定枚举升级为开放 slug，并落地首批 `redis/mysql/postgres/sqlite/kubernetes` builtin 命令源。

**Architecture:** 先收口结构 contract，再收口生成器 guard，最后拆分 builtin 命令源并刷新生成产物。保持 override、运行时加载和现有 UI 动态分类逻辑不变，只改 schema / generator / builtin source 这条链路。

**Tech Stack:** TypeScript, Vitest, JSON Schema (Ajv standalone), PowerShell generator, Vue runtime command loader

---

## File Structure

### Contract / Validation

- Modify: `docs/schemas/command-file.schema.json`
  - 将 `category` 从固定 enum 改为 slug pattern。
- Modify: `src/features/commands/runtimeTypes.ts`
  - 将 `RuntimeCategory` 从联合字面量改为 `string`。
- Modify: `src/features/commands/generated/commandSchemaValidator.ts`
  - 通过脚本重新生成，不手改。
- Modify: `src/features/commands/__tests__/schemaGuard.test.ts`
  - 把旧的“invalid enum”断言改成“invalid slug”，并补“合法自定义 slug”正例。
- Modify: `src/features/commands/__tests__/schemaValidation.test.ts`
  - 锁定 `redis` / `mysql-tools` 这类合法 slug 不会被业务规则层误杀。
- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`
  - 锁定用户命令使用新 slug 分类时仍可正常加载。
- Reference: `scripts/commands/generate-command-schema-validator.mjs`
  - 生成 standalone validator 的唯一入口。

### Generator / Docs

- Modify: `scripts/generate_builtin_commands.ps1`
  - 让 builtin 文件名约束与 slug contract 对齐。
- Modify: `scripts/__tests__/generate-builtin-commands.test.ts`
  - 补 generator 非法文件名回归。
- Modify: `docs/command_sources/README.md`
  - 更新源文件命名和分类规则。
- Modify: `docs/schemas/README.md`
  - 更新 category 从 enum 变为 slug 的文档口径。
- Modify: `README.md`
  - 更新用户命令示例中 `category` 的说明。
- Modify: `README.zh-CN.md`
  - 同步中文说明。

### Builtin Sources / Generated Assets

- Delete: `docs/command_sources/_database.md`
- Create: `docs/command_sources/_redis.md`
- Create: `docs/command_sources/_mysql.md`
- Create: `docs/command_sources/_postgres.md`
- Create: `docs/command_sources/_sqlite.md`
- Create: `docs/command_sources/_kubernetes.md`
- Modify: `assets/runtime_templates/commands/builtin/index.json`
- Create: `assets/runtime_templates/commands/builtin/_redis.json`
- Create: `assets/runtime_templates/commands/builtin/_mysql.json`
- Create: `assets/runtime_templates/commands/builtin/_postgres.json`
- Create: `assets/runtime_templates/commands/builtin/_sqlite.json`
- Create: `assets/runtime_templates/commands/builtin/_kubernetes.json`
- Delete: `assets/runtime_templates/commands/builtin/_database.json`
- Modify: `docs/builtin_commands.generated.md`

---

## Chunk 1: Open Category Contract

### Task 1: 将 category 从固定枚举改成 slug contract

**Files:**
- Modify: `docs/schemas/command-file.schema.json`
- Modify: `src/features/commands/runtimeTypes.ts`
- Modify: `src/features/commands/__tests__/schemaGuard.test.ts`
- Modify: `src/features/commands/__tests__/schemaValidation.test.ts`
- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`
- Modify: `src/features/commands/generated/commandSchemaValidator.ts`
- Reference: `scripts/commands/generate-command-schema-validator.mjs`

- [ ] **Step 1: 先写 schema guard 红灯，锁定“合法 slug / 非法 slug”**

```ts
it("accepts a command file with custom slug category", () => {
  const payload = createValidPayload();
  payload.commands[0].category = "redis";
  expect(isRuntimeCommandFile(payload)).toBe(true);
});

it("rejects command categories with uppercase / spaces / underscore", () => {
  const invalidCategories = ["Redis", "mysql tools", "postgres_tools"];
  for (const category of invalidCategories) {
    const payload = createValidPayload();
    payload.commands[0].category = category as never;
    expect(isRuntimeCommandFile(payload)).toBe(false);
  }
});
```

- [ ] **Step 2: 运行 schema guard 定向测试，确认当前会失败**

Run: `npm run test:run -- src/features/commands/__tests__/schemaGuard.test.ts`
Expected: FAIL，失败点包含 `category is invalid enum` 或新加正例 `redis` 被拒绝。

- [ ] **Step 3: 再写 runtime loader / schemaValidation 红灯，锁定运行时接受新分类**

```ts
it("loads user commands with custom slug category", () => {
  const loaded = loadUserCommandTemplatesWithReport(
    [
      {
        path: "C:/Users/test/.zapcmd/commands/redis.json",
        content: JSON.stringify({
          commands: [
            {
              id: "redis-shell",
              name: "Redis Shell",
              tags: ["redis"],
              category: "redis",
              platform: "win",
              template: "redis-cli",
              adminRequired: false
            }
          ]
        }),
        modifiedMs: 1
      }
    ],
    { runtimePlatform: "win" }
  );

  expect(loaded.templates[0]?.category).toBe("redis");
});
```

- [ ] **Step 4: 运行 loader / validation 测试，确认当前会失败**

Run: `npm run test:run -- src/features/commands/__tests__/schemaValidation.test.ts src/features/commands/__tests__/runtimeLoader.test.ts`
Expected: FAIL，失败点包含 schema enum 拒绝 `redis`。

- [ ] **Step 5: 最小实现 category slug contract**

```json
{
  "$defs": {
    "category": {
      "type": "string",
      "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
    }
  }
}
```

```ts
export type RuntimeCategory = string;
```

- [ ] **Step 6: 重新生成 standalone validator**

Run: `npm run commands:schema:generate`
Expected: PASS，并更新 `src/features/commands/generated/commandSchemaValidator.ts`

- [ ] **Step 7: 跑定向测试确认 contract 打通**

Run: `npm run test:run -- src/features/commands/__tests__/schemaGuard.test.ts src/features/commands/__tests__/schemaValidation.test.ts src/features/commands/__tests__/runtimeLoader.test.ts scripts/__tests__/generate-command-schema-validator.test.ts`
Expected: PASS

- [ ] **Step 8: 提交 contract 变更**

```bash
git add docs/schemas/command-file.schema.json \
  src/features/commands/runtimeTypes.ts \
  src/features/commands/generated/commandSchemaValidator.ts \
  src/features/commands/__tests__/schemaGuard.test.ts \
  src/features/commands/__tests__/schemaValidation.test.ts \
  src/features/commands/__tests__/runtimeLoader.test.ts
git commit -m "feat(commands):开放命令分类 slug contract"
```

---

## Chunk 2: Align Generator And Docs

### Task 2: 让 builtin 文件名约束与 slug contract 对齐

**Files:**
- Modify: `scripts/generate_builtin_commands.ps1`
- Modify: `scripts/__tests__/generate-builtin-commands.test.ts`
- Modify: `docs/command_sources/README.md`
- Modify: `docs/schemas/README.md`
- Modify: `README.md`
- Modify: `README.zh-CN.md`

- [ ] **Step 1: 为 generator 写非法文件名红灯**

```ts
it("rejects builtin source files whose filename is not a slug", () => {
  writeFileSync(
    path.join(sourceDir, "_postgres_tools.md"),
    validMarkdownTable,
    "utf8"
  );

  const result = spawnSync(pwshExecutable, [...args], { encoding: "utf8" });

  expect(result.status).not.toBe(0);
  expect(`${result.stderr}\n${result.stdout}`).toContain("slug");
});
```

- [ ] **Step 2: 运行 generator 定向测试，确认当前会失败**

Run: `npm run test:run -- scripts/__tests__/generate-builtin-commands.test.ts`
Expected: FAIL，当前生成器只拦 `_` 前缀和字符集，不会拒绝下划线型分类。

- [ ] **Step 3: 在生成器中把文件名校验收紧到 slug-compatible**

```powershell
if ($fileId -notmatch '^_[a-z0-9]+(?:-[a-z0-9]+)*$') {
  throw "Source filename must be _<slug>.md and category slug must match ^[a-z0-9]+(?:-[a-z0-9]+)*$"
}
```

- [ ] **Step 4: 更新命令源与 schema 文档**

```md
1. 文件命名必须满足 `_` + slug，例如 `_redis.md`、`_postgres-tools.md`
2. 文件名去掉前缀 `_` 后直接成为 `category`
3. `category` 对 builtin 与用户命令统一遵循 slug 规则
```

- [ ] **Step 5: 更新 README / README.zh-CN 里的命令示例说明**

```json
{
  "id": "redis-shell",
  "category": "redis"
}
```

```md
- `category`：合法 slug 字符串，例如 `custom`、`redis`、`mysql-tools`
```

- [ ] **Step 6: 跑 generator / schema 同步测试**

Run: `npm run test:run -- scripts/__tests__/generate-builtin-commands.test.ts scripts/__tests__/generate-command-schema-validator.test.ts`
Expected: PASS

- [ ] **Step 7: 提交 generator 和文档对齐**

```bash
git add scripts/generate_builtin_commands.ps1 \
  scripts/__tests__/generate-builtin-commands.test.ts \
  docs/command_sources/README.md \
  docs/schemas/README.md \
  README.md README.zh-CN.md
git commit -m "docs(commands):对齐命令分类与文件名规范"
```

---

## Chunk 3: Split Builtin Sources

### Task 3: 用 `_redis.md` 替换 `_database.md`

**Files:**
- Delete: `docs/command_sources/_database.md`
- Create: `docs/command_sources/_redis.md`
- Delete: `assets/runtime_templates/commands/builtin/_database.json`
- Create: `assets/runtime_templates/commands/builtin/_redis.json`
- Modify: `assets/runtime_templates/commands/builtin/index.json`
- Modify: `docs/builtin_commands.generated.md`
- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`

- [ ] **Step 1: 先写 builtin loader 红灯，锁定 redis 分类和旧 database 文件退场**

```ts
it("exposes redis builtin category after source split", () => {
  const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });
  expect(templates.some((item) => item.category === "redis")).toBe(true);
  expect(templates.some((item) => item.category === "database")).toBe(false);
});
```

- [ ] **Step 2: 运行 runtimeLoader 定向测试，确认当前失败**

Run: `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts`
Expected: FAIL，当前 builtin 只有 `_database.json`

- [ ] **Step 3: 创建 `_redis.md`，把现有 Redis 命令迁出，并补入口类**

```md
# _redis

> 分类：Redis
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `redis-shell` | Redis Shell | all | `redis-cli` | - | - | false | redis-cli | redis shell cli 入口 |
| 2 | `redis-ping` | Redis PING | all | `redis-cli ping` | - | - | false | redis-cli | redis ping |
| 3 | `redis-info` | Redis INFO | all | `redis-cli info` | - | - | false | redis-cli | redis info |
```

- [ ] **Step 4: 继续补齐 Redis 动作类到 spec 列表**

按 spec 第 7.1 节补齐：

- `redis-get`
- `redis-set`
- `redis-del`
- `redis-exists`
- `redis-expire`
- `redis-ttl`
- `redis-scan`
- `redis-keys`
- `redis-hget`
- `redis-hset`
- `redis-hgetall`
- `redis-lpush`
- `redis-lrange`
- `redis-sadd`
- `redis-smembers`
- `redis-zrange`
- `redis-flushdb`

- [ ] **Step 5: 运行生成脚本，刷新产物**

Run: `pwsh -File scripts/generate_builtin_commands.ps1`
Expected: PASS，并产出 `_redis.json`、删除 `_database.json`、刷新 `index.json` 和 `docs/builtin_commands.generated.md`

- [ ] **Step 6: 运行 Redis 拆分后的定向测试**

Run: `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts`
Expected: PASS

- [ ] **Step 7: 提交 Redis 源拆分**

```bash
git add docs/command_sources/_redis.md \
  docs/command_sources/_database.md \
  assets/runtime_templates/commands/builtin/_redis.json \
  assets/runtime_templates/commands/builtin/_database.json \
  assets/runtime_templates/commands/builtin/index.json \
  docs/builtin_commands.generated.md \
  src/features/commands/__tests__/runtimeLoader.test.ts
git commit -m "feat(commands):拆分 redis 内置命令源"
```

### Task 4: 新增 `_mysql.md`、`_postgres.md`、`_sqlite.md`

**Files:**
- Create: `docs/command_sources/_mysql.md`
- Create: `docs/command_sources/_postgres.md`
- Create: `docs/command_sources/_sqlite.md`
- Create: `assets/runtime_templates/commands/builtin/_mysql.json`
- Create: `assets/runtime_templates/commands/builtin/_postgres.json`
- Create: `assets/runtime_templates/commands/builtin/_sqlite.json`
- Modify: `assets/runtime_templates/commands/builtin/index.json`
- Modify: `docs/builtin_commands.generated.md`
- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`

- [ ] **Step 1: 先写 builtin loader 红灯，锁定三个新分类存在**

```ts
it("loads mysql/postgres/sqlite builtin categories", () => {
  const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });
  expect(templates.some((item) => item.category === "mysql")).toBe(true);
  expect(templates.some((item) => item.category === "postgres")).toBe(true);
  expect(templates.some((item) => item.category === "sqlite")).toBe(true);
});
```

- [ ] **Step 2: 运行 runtimeLoader 定向测试，确认当前失败**

Run: `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts`
Expected: FAIL，当前 builtin 中不存在上述分类。

- [ ] **Step 3: 创建 `_mysql.md`**

```md
| 1 | `mysql-shell` | MySQL Shell | all | `mysql -h {{host}} -P {{port}} -u {{user}} -p` | host(text, default:127.0.0.1), port(number, default:3306, min:1, max:65535), user(text, default:root) | - | false | mysql | mysql shell cli |
| 2 | `mysql-ping` | MySQL PING | all | `mysqladmin -h {{host}} -P {{port}} -u {{user}} ping -p` | host(text, default:127.0.0.1), port(number, default:3306, min:1, max:65535), user(text, default:root) | - | false | mysqladmin | mysql ping |
```

然后按 spec 第 7.2 节补齐：

- `mysql-show-databases`
- `mysql-show-tables`
- `mysql-describe-table`
- `mysql-query`
- `mysql-dump`
- `mysql-import`
- `mysql-create-database`
- `mysql-drop-database`

- [ ] **Step 4: 创建 `_postgres.md`**

```md
| 1 | `psql-shell` | Postgres Shell | all | `psql -h {{host}} -p {{port}} -U {{user}} -d {{database}}` | host(text, default:127.0.0.1), port(number, default:5432, min:1, max:65535), user(text, default:postgres), database(text, default:postgres) | - | false | psql | postgres psql shell |
| 2 | `postgres-is-ready` | Postgres 就绪检查 | all | `pg_isready -h {{host}} -p {{port}}` | host(text, default:127.0.0.1), port(number, default:5432, min:1, max:65535) | - | false | pg_isready | postgres ready |
```

然后按 spec 第 7.3 节补齐其余命令。

- [ ] **Step 5: 创建 `_sqlite.md`**

```md
| 1 | `sqlite-shell` | SQLite Shell | all | `sqlite3 {{file}}` | file(path) | - | false | sqlite3 | sqlite shell |
| 2 | `sqlite-tables` | SQLite 列出数据表 | all | `sqlite3 {{file}} ".tables"` | file(path) | - | false | sqlite3 | sqlite tables |
```

然后按 spec 第 7.4 节补齐其余命令。

- [ ] **Step 6: 运行生成脚本并刷新产物**

Run: `pwsh -File scripts/generate_builtin_commands.ps1`
Expected: PASS，新增三个 builtin JSON，并刷新 `index.json` 和 `docs/builtin_commands.generated.md`

- [ ] **Step 7: 跑 loader 定向测试**

Run: `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts`
Expected: PASS

- [ ] **Step 8: 提交数据库命令扩充**

```bash
git add docs/command_sources/_mysql.md \
  docs/command_sources/_postgres.md \
  docs/command_sources/_sqlite.md \
  assets/runtime_templates/commands/builtin/_mysql.json \
  assets/runtime_templates/commands/builtin/_postgres.json \
  assets/runtime_templates/commands/builtin/_sqlite.json \
  assets/runtime_templates/commands/builtin/index.json \
  docs/builtin_commands.generated.md \
  src/features/commands/__tests__/runtimeLoader.test.ts
git commit -m "feat(commands):新增数据库内置命令分类"
```

### Task 5: 新增 `_kubernetes.md`

**Files:**
- Create: `docs/command_sources/_kubernetes.md`
- Create: `assets/runtime_templates/commands/builtin/_kubernetes.json`
- Modify: `assets/runtime_templates/commands/builtin/index.json`
- Modify: `docs/builtin_commands.generated.md`
- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`

- [ ] **Step 1: 先写 builtin loader 红灯，锁定 kubernetes 分类存在**

```ts
it("loads kubernetes builtin category", () => {
  const templates = loadBuiltinCommandTemplates({ runtimePlatform: "win" });
  expect(templates.some((item) => item.category === "kubernetes")).toBe(true);
});
```

- [ ] **Step 2: 运行 runtimeLoader 定向测试，确认当前失败**

Run: `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts`
Expected: FAIL，当前没有 `_kubernetes.json`

- [ ] **Step 3: 创建 `_kubernetes.md`，只放一次性动作类**

```md
| 1 | `kubectl-current-context` | kubectl 当前上下文 | all | `kubectl config current-context` | - | - | false | kubectl | kubernetes kubectl context |
| 2 | `kubectl-get-contexts` | kubectl 列出上下文 | all | `kubectl config get-contexts` | - | - | false | kubectl | kubernetes kubectl context list |
| 3 | `kubectl-get-pods` | kubectl 查看 Pods | all | `kubectl get pods -n {{namespace}}` | namespace(text, default:default) | - | false | kubectl | kubernetes kubectl pods |
```

继续按 spec 第 7.5 节补齐：

- `kubectl-get-namespaces`
- `kubectl-get-services`
- `kubectl-describe-pod`
- `kubectl-logs`
- `kubectl-logs-follow`
- `kubectl-exec-sh`
- `kubectl-port-forward`
- `kubectl-rollout-restart`
- `kubectl-rollout-status`
- `kubectl-apply-file`
- `kubectl-delete-file`
- `kubectl-delete-pod`

- [ ] **Step 4: 运行生成脚本并刷新产物**

Run: `pwsh -File scripts/generate_builtin_commands.ps1`
Expected: PASS，新增 `_kubernetes.json` 并刷新快照文件

- [ ] **Step 5: 跑 loader 定向测试**

Run: `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts`
Expected: PASS

- [ ] **Step 6: 提交 kubernetes 命令源**

```bash
git add docs/command_sources/_kubernetes.md \
  assets/runtime_templates/commands/builtin/_kubernetes.json \
  assets/runtime_templates/commands/builtin/index.json \
  docs/builtin_commands.generated.md \
  src/features/commands/__tests__/runtimeLoader.test.ts
git commit -m "feat(commands):新增 kubernetes 内置命令源"
```

---

## Chunk 4: Final Verification

### Task 6: 做一次集成验证并更新上下文

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 运行 schema 同步检查**

Run: `npm run commands:schema:check`
Expected: PASS

- [ ] **Step 2: 运行命令链路相关定向测试**

Run: `npm run test:run -- src/features/commands/__tests__/schemaGuard.test.ts src/features/commands/__tests__/schemaValidation.test.ts src/features/commands/__tests__/runtimeLoader.test.ts scripts/__tests__/generate-builtin-commands.test.ts scripts/__tests__/generate-command-schema-validator.test.ts`
Expected: PASS

- [ ] **Step 3: 跑全量门禁**

Run: `npm run check:all`
Expected: PASS

- [ ] **Step 4: 更新短期记忆**

```md
## 补充（2026-03-31｜命令分类 slug 与 builtin 扩充已落地）
- 已将 `category` 改为 slug contract，builtin 与用户命令共用开放分类；builtin 首批新增 `redis/mysql/postgres/sqlite/kubernetes`，并保留通用能力大类。
```

- [ ] **Step 5: 提交最终验证与上下文**

```bash
git add docs/active_context.md
git commit -m "docs(context):更新命令分类扩充进度"
```

---

## Local Plan Review

### Self-Review Checklist

- [ ] 计划中的每个文件路径都是真实存在或将被创建的路径
- [ ] category contract、generator guard、builtin source 三条链路都有测试覆盖
- [ ] `_database.md` 删除与 `_redis.md` 创建在计划中明确体现
- [ ] 没有把高危文案强化或交互式 REPL 这种未确认范围混进任务
- [ ] 每个任务都包含 TDD、验证命令和独立提交边界

---

Plan complete and saved to `docs/superpowers/plans/2026-03-31-command-category-slug-and-builtin-command-expansion.md`. Ready to execute?
