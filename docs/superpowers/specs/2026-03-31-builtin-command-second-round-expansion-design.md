# builtin 命令源第二轮扩充设计

> 日期：2026-03-31
> 状态：for-review
> 范围：在不新增分类、不改执行机制的前提下，继续扩充 builtin 命令源；本轮只覆盖 `network / dev / package`

---

## 1. 背景

上一轮已经完成 builtin 分类 slug contract 收口，并明确：

1. 分类继续按 `docs/command_sources/_*.md` 文件名直出。
2. `network / dev / package` 这类通用能力分类继续保留大类。
3. builtin 命令优先采用“一次性动作类”，避免依赖前序 REPL 状态。

在这个前提下，第二轮不再讨论分类结构，也不讨论执行链改造，而是只补一批仍缺失、但能在现有 Markdown DSL 与安全边界内稳定表达的高频命令。

---

## 2. 已确认范围

### 2.1 本轮要做

1. 继续补 builtin 命令，但不新增分类。
2. 命令分别追加到：
   - `docs/command_sources/_network.md`
   - `docs/command_sources/_dev.md`
   - `docs/command_sources/_package.md`
3. 后续实现阶段只允许提交：
   - 命令源 markdown
   - 生成器产物 json/index/generated snapshot
   - 必要测试

### 2.2 本轮明确不做

1. 不把 `package` 拆成 `pnpm / npm / bun` 新分类。
2. 不新增 `_pnpm.md`、`_bun.md`、`_npm.md` 之类文件。
3. 不改终端执行机制。
4. 不新增项目绑定、目录切换或工作区自动识别能力。
5. 不扩高危文案系统。
6. 不补依赖复杂 shell quoting 的命令形态。

---

## 3. 文件组织决策

第二轮只往现有大类文件追加命令，不重组分类树。

| 大类 | 维护文件 | 说明 |
|---|---|---|
| network | `docs/command_sources/_network.md` | 网络请求、状态探测、域名查询 |
| dev | `docs/command_sources/_dev.md` | 格式化、解码、时间转换等开发工具 |
| package | `docs/command_sources/_package.md` | 包管理器脚本与依赖操作 |

原因：

1. 当前 contract 是“一个 markdown 文件对应一个分类”，文件名直接成为 builtin `category`。
2. 用户已经确认本轮“不做重组”。
3. 如果拆成 `_pnpm.md`、`_bun.md`，就等于新增了 `pnpm`、`bun` 分类，和本轮目标冲突。

---

## 4. 设计原则

### 4.1 一次性动作优先

本轮命令必须能在一次终端调用里完成，不依赖“上一条命令已经进入某个交互 shell”。

### 4.2 上下文透明，不做 builtin 层项目绑定

对 `package` 类命令，builtin 只表达原生命令模板本身，不额外引入：

1. `cwd/path` 参数
2. `cd {{dir}} && ...` 这种目录切换拼接
3. `project/global` 双命令设计

也就是说：

- `pnpm run {{script}}`
- `pnpm up`
- `bun install`
- `bun run {{script}}`

这些命令仍然受“当前终端所在目录/环境”影响，但这个上下文由用户自己控制，而不是由 builtin contract 负责托管。

### 4.3 优先结构化参数，减少自由文本

本轮尽量使用：

- `url(text)`
- `domain(text)`
- `file(path)`
- `timestamp(number)`
- `script(text)`

对自由文本大 payload 保持克制，因为当前模板替换不提供复杂 escaping 语义。

### 4.4 prerequisites 只表达外部依赖

`prerequisites` 继续只写工具存在性，例如：

- `curl`
- `jq`
- `python3`
- `pnpm`
- `bun`
- `whois`

不表达“当前已进入项目目录”或“当前已处于登录态”这类运行上下文。

---

## 5. 本轮纳入与暂缓清单

### 5.1 建议纳入

#### `network`

1. `curl-json-get`
2. `http-status-only`
3. `whois`

#### `dev`

1. `jq-format-json`
2. `jwt-decode`
3. `epoch-ms-now`
4. `epoch-ms-convert`

#### `package`

1. `pnpm-run`
2. `pnpm-up`
3. `bun-install`
4. `bun-run`

### 5.2 暂缓

1. `curl-json-post`

暂缓原因：

`curl-json-post` 需要 `body(text)` 一类自由文本参数；在 `bash / zsh / PowerShell / cmd` 下都容易出现引号、转义与换行不一致问题，而本轮明确不扩 DSL、不补 escaping 机制，因此暂不纳入。

---

## 6. 参数与 prerequisites 设计

### 6.1 `network`

| ID | 模板方向 | 参数建议 | 平台 | prerequisites | 设计说明 |
|---|---|---|---|---|---|
| `curl-json-get` | `curl -s -H "Accept: application/json" {{url}}` | `url(text)` | `all` | `curl` | 只做 JSON 偏好的 GET，不补自定义 header |
| `http-status-only` | Unix: `curl -s -o /dev/null -w "%{http_code}" {{url}}`；Win: `curl -s -o NUL -w "%{http_code}" {{url}}` | `url(text)` | `win` + `mac/linux` 拆分 | `curl` | 空设备路径不同，需按平台拆分 |
| `whois` | `whois {{domain}}` | `domain(text)` | `mac/linux` | `whois` | 当前先不做 Windows 伪等价命令 |

### 6.2 `dev`

| ID | 模板方向 | 参数建议 | 平台 | prerequisites | 设计说明 |
|---|---|---|---|---|---|
| `jq-format-json` | `jq . {{file}}` | `file(path)` | `all` | `jq` | 只格式化文件，避免 `json(text)` 带来的 quoting 问题 |
| `jwt-decode` | 使用 `python3` 解码 JWT header/payload | `token(text)` | `all` | `python3` | 只做 decode，不做验签 |
| `epoch-ms-now` | Unix 与 Win 分别产出毫秒级时间戳 | `-` | `win` + `mac/linux` 拆分 | `powershell` / `python3` / `date` | 保持与现有 timestamp 类命令的分平台策略一致 |
| `epoch-ms-convert` | Unix 与 Win 分别把毫秒时间戳转为可读时间 | `timestamp(number, min:0)` | `win` + `mac/linux` 拆分 | `powershell` / `python3` / `date` | 只做基础转换，不新增时区参数 |

### 6.3 `package`

| ID | 模板方向 | 参数建议 | 平台 | prerequisites | 设计说明 |
|---|---|---|---|---|---|
| `pnpm-run` | `pnpm run {{script}}` | `script(text)` | `all` | `pnpm` | 当前目录上下文决定作用范围 |
| `pnpm-up` | `pnpm up` | `-` | `all` | `pnpm` | 只做基础升级，不加 `-g / -r / --latest` |
| `bun-install` | `bun install` | `-` | `all` | `bun` | 当前目录上下文决定作用范围 |
| `bun-run` | `bun run {{script}}` | `script(text)` | `all` | `bun` | 只做 script 运行，不扩 node_modules executable 变体 |

---

## 7. package 类命令的上下文边界

这一轮对 `pnpm` / `bun` 的设计结论是：

1. builtin 命令不负责决定“项目内”还是“全局”。
2. builtin 命令也不负责决定“具体哪个目录”。
3. builtin 只提供最稳定、最通用的固定模板。

因此：

- `pnpm-up` 表达的是 `pnpm up`
- 不是 `pnpm up -g`
- 也不是 `cd {{dir}} && pnpm up`

如果未来需要：

1. 全局变体
2. workspace/recursive 变体
3. 显式目录参数

应作为后续独立设计处理，而不是在第二轮扩充里混入。

---

## 8. 高危命令边界

### 8.1 本轮不新增 `dangerous: true`

第二轮纳入的 11 个命令里，不单独新增 `dangerous: true`。

原因：

1. 现有 `package` 类已经存在 `npm install`、`npm run`、`npm update` 等有副作用命令，但并未按高危单独提级。
2. 本轮目标不是重做危险等级体系。
3. 如果未来要把“包管理命令需要额外确认”作为统一安全策略，应整类收口 `npm/pnpm/yarn/bun`，而不是只给本轮新增命令单点提级。

### 8.2 本轮明确排除的高风险/高不稳定形态

1. `curl-json-post`
2. 带认证头、token、cookie 的 HTTP 模板
3. `pnpm up -g`
4. `pnpm -r`
5. 需要交互确认的命令变体
6. 需要管理员权限的命令

---

## 9. 后续实现范围

本 spec 批准后，实施阶段只需要修改：

1. `docs/command_sources/_network.md`
2. `docs/command_sources/_dev.md`
3. `docs/command_sources/_package.md`
4. `assets/runtime_templates/commands/builtin/_network.json`
5. `assets/runtime_templates/commands/builtin/_dev.json`
6. `assets/runtime_templates/commands/builtin/_package.json`
7. `assets/runtime_templates/commands/builtin/index.json`
8. `docs/builtin_commands.generated.md`
9. 必要测试

不需要修改：

1. 执行机制
2. 运行时命令模型
3. 高危文案系统
4. 分类 contract

---

## 10. 测试建议

本轮测试只做最小必要覆盖：

1. 生成器快照/计数更新
2. 新增命令 schema 能通过
3. 分平台命令产物正确拆分：
   - `http-status-only`
   - `epoch-ms-now`
   - `epoch-ms-convert`
4. 不为 `curl-json-post` 增加实现与测试

如果现有测试已能通过生成产物间接覆盖上述点，则不额外扩写无价值测试。

---

## 11. 外部事实参考

以下结论参考官方文档：

1. `pnpm run` / `pnpm up` 语义应保持为项目/当前上下文导向，不在 builtin 层混入 global 变体。
2. `bun install` 会在项目根写 lockfile 并处理依赖，天然是当前目录上下文命令。
3. `bun run` 用于运行 `package.json` script 或可执行入口，本轮只收 script 形态。

参考链接：

1. `https://pnpm.io/cli/run`
2. `https://pnpm.io/cli/update`
3. `https://bun.sh/docs/pm/cli/install`
4. `https://bun.sh/docs/cli/run`
5. `https://bun.sh/docs/installation`

---

## 12. 交付结论

第二轮 builtin 命令扩充不做分类重组，也不试图在 builtin 层解决目录绑定、global 变体或复杂 quoting。

本轮只做一件事：

在现有 `network / dev / package` 三个大类中，补一批能稳定落在当前 DSL 与执行模型内的高频命令，并明确把 `curl-json-post` 等高不确定项留到后续单独设计。
