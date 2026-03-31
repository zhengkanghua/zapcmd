# 内置命令分类开放化与首批命令扩充设计

> 日期：2026-03-31
> 状态：approved
> 范围：命令分类 contract 开放为 slug、builtin 命令源按文件名直接分类、首批 Redis/MySQL/Postgres/SQLite/Kubernetes 命令源扩充

---

## 1. 背景

当前 builtin 命令已经切到 `docs/command_sources/_*.md -> json` 的人维护工作流，但分类体系仍停留在固定枚举阶段。

这带来两个直接问题：

1. 官方内置命令一旦想从 `database` 细分到 `redis / mysql / postgres`，生成出的 JSON 会被现有 schema 拦掉。
2. 用户自定义命令虽然允许覆盖 builtin，但分类仍受固定 enum 约束，不利于长期扩展。

同时，当前数据库类命令只有 Redis，且仍挂在 `_database.md` 下，语义过泛；而 `kubernetes` 在 schema 中已存在，但 builtin 侧还没有对应命令源。

本轮目标不是重做命令执行链，也不是扩展高危文案系统，而是先把“分类 contract + 首批命令源组织”收口到可持续维护的状态。

---

## 2. 已确认范围

### 2.1 本轮要做

1. 将 `category` 从固定 enum 改为受约束的 slug 字符串。
2. 让 builtin 命令继续使用“文件名直接成为分类”：
   - `_redis.md -> category=redis`
   - `_mysql.md -> category=mysql`
3. 拆掉 `_database.md`，首批新增：
   - `_redis.md`
   - `_mysql.md`
   - `_postgres.md`
   - `_sqlite.md`
   - `_kubernetes.md`
4. 生成并提交新的 builtin JSON、index 与 generated markdown 快照。
5. 保持现有 override 逻辑继续只按 `id` 生效。

### 2.2 本轮明确不做

1. 不修改终端执行机制。
2. 不新增“持续交互式 REPL 会话”能力。
3. 不扩展高危命令强化文案或新的危险说明 DSL。
4. 不引入密码明文输入流程。
5. 不把所有通用大类都强行拆碎。

---

## 3. 设计决策汇总

| 决策项 | 结论 |
|--------|------|
| 分类 contract | `category` 改为 slug 字符串，不再维护固定 enum |
| slug 规范 | `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| builtin 分类来源 | 文件名去掉前缀 `_` 后直接作为 `category` |
| builtin 文件名约束 | 生成器必须同步校验文件名 slug，避免“生成成功但运行时 schema 拒绝” |
| user command 分类 | 与 builtin 共用同一套 slug contract |
| 覆盖规则 | 仍只按 `id` 覆盖，与 `category` 解耦 |
| 通用能力分类 | `network/system/file/git/docker/ssh/dev/package` 暂保留大类 |
| 工具生态分类 | `redis/mysql/postgres/sqlite/kubernetes` 采用具体类名 |
| CLI 设计模型 | 入口类 + 一次性动作类并存，不依赖前序 REPL 状态 |
| `shell` 字段 | 维持现状；运行时仍忽略，不作为本轮设计能力 |
| 高危命令 | 可继续使用既有 `dangerous` 标志，但本轮不扩文案系统 |

---

## 4. 分类 contract 重构

### 4.1 当前问题

当前运行时 schema 把 `category` 限定为固定枚举，例如：

- `network`
- `docker`
- `database`
- `kubernetes`

这会导致两个结构性问题：

1. 官方 builtin 新增 `_redis.md` 时，生成器会自然产出 `category=redis`，但加载时会被 schema 视为非法分类。
2. 用户命令想表达新的工具生态分类时，也必须等待官方先把 enum 补进去，扩展路径与产品定位不匹配。

### 4.2 新 contract

`category` 改为受约束的 slug 字符串，规则为：

```text
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

允许示例：

- `redis`
- `mysql`
- `postgres`
- `postgres-tools`
- `kubernetes`

禁止示例：

- `Redis`
- `mysql tools`
- `数据库`
- `postgres_1`

### 4.3 兼容性

这是向后兼容的，因为现有分类：

- `network`
- `docker`
- `database`

本身仍然是合法 slug，不需要为了引入新分类而让旧文件失效。

### 4.4 builtin 文件名约束

既然 builtin 继续采用“文件名直接成为分类”，那么文件名 contract 必须与 `category` slug contract 完全一致。

也就是说：

- 允许：`_redis.md`
- 允许：`_postgres-tools.md`
- 禁止：`_postgres_tools.md`
- 禁止：`_Redis.md`

生成器应在 Markdown 源阶段直接拦截非法文件名，而不是先生成 JSON、再由运行时 schema 把 builtin 文件拒掉。

### 4.5 builtin 与 user command 的统一性

builtin 和用户自定义命令都走同一条规则：

1. 只要分类是合法 slug，就允许进入运行时。
2. 官方不再扮演“分类白名单管理员”。
3. 覆盖逻辑继续只按 `id`；分类只影响展示、筛选与搜索。

---

## 5. 文件组织策略

### 5.1 原则

分类不追求“所有文件都越细越好”，而是遵循两条原则：

1. 通用能力保留大类。
2. 工具生态使用具体分类。

### 5.2 保留大类的范围

以下文件继续保留通用大类，不因为本轮引入 slug 就强行拆细：

- `_network.md`
- `_system.md`
- `_file.md`
- `_git.md`
- `_docker.md`
- `_ssh.md`
- `_dev.md`
- `_package.md`

原因是这些类别本身表达的是跨工具的通用操作能力，不是单一生态。

### 5.3 改为具体分类的范围

数据库/平台工具属于明确生态，适合直接按文件名分类：

- `_redis.md`
- `_mysql.md`
- `_postgres.md`
- `_sqlite.md`
- `_kubernetes.md`

### 5.4 `_database.md` 的处理

本轮不再继续维护 `_database.md`。

原因不是“数据库类不重要”，而是当前文件内容已经事实性地等同于“Redis 命令源”，再挂在 `database` 这个泛类下会导致：

1. 用户误以为这里涵盖 MySQL/Postgres/SQLite。
2. 后续继续往里面加不同数据库命令，会快速失去可扫描性。

---

## 6. CLI 命令模型

### 6.1 当前执行模型约束

当前 ZapCmd 的执行链是“渲染完整命令字符串后交给本地终端执行”，而不是应用自己维护一个可持续喂输入的 REPL 会话。

这意味着：

1. 可以打开终端并执行 `redis-cli`。
2. 但不能把“上一条命令已经进入 redis-cli”当成下一条命令的运行前提。

### 6.2 设计结论

对有自然交互入口的 CLI，统一采用“两层命令模型”：

1. **入口类**
   - 作用：进入工具自己的交互控制台
   - 示例：`redis-shell`、`mysql-shell`、`psql-shell`、`sqlite-shell`
2. **一次性动作类**
   - 作用：直接执行完整动作
   - 示例：`redis-get`、`mysql-show-tables`、`postgres-query`

### 6.3 非 REPL 工具的处理

像 `kubectl` 这类命令，不强行为了形式统一而设计伪入口类。

因此：

- `kubernetes` 文件只保留一次性动作类
- 不设计无意义的 `kubectl-shell`

---

## 7. 首批文件与命令覆盖

### 7.1 `_redis.md`

#### 入口类

- `redis-shell`

#### 一次性动作类

- `redis-ping`
- `redis-info`
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

### 7.2 `_mysql.md`

#### 入口类

- `mysql-shell`

#### 一次性动作类

- `mysql-ping`
- `mysql-show-databases`
- `mysql-show-tables`
- `mysql-describe-table`
- `mysql-query`
- `mysql-dump`
- `mysql-import`
- `mysql-create-database`
- `mysql-drop-database`

### 7.3 `_postgres.md`

#### 入口类

- `psql-shell`

#### 一次性动作类

- `postgres-is-ready`
- `postgres-list-databases`
- `postgres-list-tables`
- `postgres-describe-table`
- `postgres-query`
- `postgres-dump`
- `postgres-restore`
- `postgres-create-database`
- `postgres-drop-database`

### 7.4 `_sqlite.md`

#### 入口类

- `sqlite-shell`

#### 一次性动作类

- `sqlite-tables`
- `sqlite-schema`
- `sqlite-query`
- `sqlite-import`
- `sqlite-integrity-check`
- `sqlite-vacuum`

### 7.5 `_kubernetes.md`

#### 一次性动作类

- `kubectl-current-context`
- `kubectl-get-contexts`
- `kubectl-get-namespaces`
- `kubectl-get-pods`
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

### 7.6 保留大类但建议顺手补强

本轮如果时间允许，可在不改变大类定位的前提下顺手补以下高频项：

- `_package.md`
  - `pnpm-run`
  - `pnpm-up`
  - `bun-install`
  - `bun-run`
- `_dev.md`
  - `jq-format-json`
  - `jwt-decode`
  - `epoch-ms-now`
  - `epoch-ms-convert`
- `_network.md`
  - `curl-json-get`
  - `curl-json-post`
  - `http-status-only`
  - `whois`

这些属于“可选增强”，不是本轮 contract 变更的阻断项。

---

## 8. 命令字段与参数规范

### 8.1 ID 规则

每个文件内部的命令 ID 必须使用统一前缀：

- `_redis.md` 内全部使用 `redis-*`
- `_mysql.md` 内全部使用 `mysql-*`
- `_postgres.md` 内全部使用 `postgres-*`
- `_kubernetes.md` 内全部使用 `kubectl-*` 或统一的 `k8s-*`

本轮建议优先统一为：

- Redis：`redis-*`
- MySQL：`mysql-*`
- Postgres：`postgres-*`
- SQLite：`sqlite-*`
- Kubernetes：`kubectl-*`

### 8.2 名称规则

当前 Markdown DSL 没有单独的描述列，因此命令名称必须足够直接，避免抽象命名。

推荐形式：

- `Redis GET`
- `MySQL 显示数据表`
- `Postgres 执行 SQL`
- `kubectl 查看 Pod 日志`

### 8.3 参数优先级

优先使用结构化参数：

- `host`
- `port`
- `database`
- `table`
- `key`
- `pattern`
- `file`

谨慎引入大段自由文本：

- `sql(text)`
- `body(text)`

因为当前参数渲染只是简单 token 替换，不做 shell escaping；自由文本越多，越容易让命令在不同终端下表现不稳定。

### 8.4 密码与敏感参数

本轮不把密码作为普通文本参数直接纳入 builtin 设计。

推荐策略：

1. MySQL / Postgres 入口命令保留 `-p` 或依赖本地环境变量/默认配置。
2. Redis 优先走默认连接、环境变量或用户本地 CLI 配置。

### 8.5 prerequisites 原则

`prerequisites` 只表达外部工具存在性，不表达会话状态。

允许：

- `redis-cli`
- `mysql`
- `psql`
- `sqlite3`
- `kubectl`

不允许：

- “已经进入 redis shell”
- “当前终端已经登录数据库”

### 8.6 平台拆分原则

只要命令语法在不同平台下不一致，就拆分 `win / mac / linux / all`，不要为了减少条目数而把不兼容命令硬塞到 `all`。

---

## 9. 本轮最小实现范围

### 9.1 必须修改

1. `docs/schemas/command-file.schema.json`
   - `category` 从 enum 改成 slug pattern
2. `scripts/generate_builtin_commands.ps1`
   - 文件名校验与 slug contract 对齐
3. `src/features/commands/generated/commandSchemaValidator.ts`
   - 重新生成
4. `src/features/commands/runtimeTypes.ts`
   - `RuntimeCategory` 改成 `string`
5. schema / loader / generator 相关测试
   - 把“非法 enum”测试改成“非法 slug”测试
   - 补一条非法 builtin 文件名的生成器测试
6. `docs/command_sources/_*.md`
   - 新增首批命令源
7. `docs/command_sources/README.md`
   - 更新文件命名与分类 slug 规则
8. 生成产物
   - `assets/runtime_templates/commands/builtin/_*.json`
   - `assets/runtime_templates/commands/builtin/index.json`
   - `docs/builtin_commands.generated.md`

### 9.2 不要求修改

1. 不修改命令执行流程。
2. 不修改 Queue / Launcher 行为。
3. 不新增新的危险提示体系。
4. 不修改 UI 分类筛选逻辑。

原因是当前 UI 筛选本身已经基于实际命令数据动态收集分类；真正限制扩展的是 schema contract，而不是前端展示逻辑。

---

## 10. 验证与验收

### 10.1 生成与 contract 验证

1. 运行：

```powershell
./scripts/generate_builtin_commands.ps1
```

2. 运行：

```bash
npm run commands:schema:generate
npm run commands:schema:check
```

### 10.2 运行时验证

1. builtin 命令加载结果中不应出现新增文件的 `invalid-schema`。
2. 设置页分类筛选应能直接出现：
   - `redis`
   - `mysql`
   - `postgres`
   - `sqlite`
   - `kubernetes`
3. 用户自定义命令文件中若使用新的合法 slug 分类，也应被正常加载。

### 10.3 最终门禁

```bash
npm run check:all
```

---

## 11. 风险与缓解

### 11.1 分类过度碎片化

如果把所有类别都按工具继续拆细，设置页和搜索结果中的分类会快速失去可扫描性。

缓解：

1. 通用能力保留大类。
2. 只对单一生态明确、用户直觉强的工具采用具体分类。

### 11.2 自由文本参数在不同终端下不稳定

像 `sql(text)`、`body(text)` 这种参数在 PowerShell / cmd / bash 下都可能遇到引号、转义和换行问题。

缓解：

1. 本轮优先提供常用结构化命令。
2. 复杂自由文本命令只保留少量必要入口，不追求一次做全。

### 11.3 旧测试仍默认枚举分类

schema / runtime 测试可能仍然假设 `category` 必须来自固定 enum。

缓解：

1. 明确把测试目标从“固定枚举”改为“合法 slug”。
2. 保留对非法分类格式的负例测试，例如空格、大写、中文。

---

## 12. 交付结论

本轮不把“扩更多命令”当成孤立内容维护，而是先修正命令分类的结构 contract：

1. 让分类从固定枚举升级为开放 slug。
2. 让 builtin 与用户自定义命令共用同一套扩展路径。
3. 在这个 contract 基础上，首批把数据库与 Kubernetes 相关命令从泛类拆到具体工具分类。

这能同时解决：

1. `database` 过泛的问题。
2. 用户自定义分类扩展成本过高的问题。
3. 后续每新增一个命令文件都要同步改 enum 的维护噪音。
