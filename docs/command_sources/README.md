# Command Sources

该目录存放内置命令的可维护 Markdown 源文件。  
规则：一个 markdown 文件对应一个输出 json 文件（同名，后缀 `.json`）。

示例：

- `_network.md` -> `assets/runtime_templates/commands/builtin/_network.json`
- `_git.md` -> `assets/runtime_templates/commands/builtin/_git.json`

统一表头（生成器兼容两种格式；仓库内 builtin 源默认使用第 2 种）：

`# | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags`

或：

`# | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags`

生成命令：

```powershell
npm run commands:builtin:generate
```

## 如何维护内置命令（贡献者）

最小流程：**改 `docs/command_sources/_*.md` → 运行生成脚本 → 提交生成产物**。

CI 会阻断未提交的生成产物漂移；除 JSON 资产外，`docs/builtin_commands.generated.md` 也属于必须提交的生成快照。

1. 修改源文件：`docs/command_sources/_*.md`
2. 运行生成：`npm run commands:builtin:generate`
3. 检查并提交生成产物：
   - `assets/runtime_templates/commands/builtin/_*.json`
   - `assets/runtime_templates/commands/builtin/index.json`
   - `docs/builtin_commands.generated.md`
4. 本地门禁：`npm run check:all`

## 源文件规范（必须）

1. 文件命名必须满足 `_` + slug：例如 `_git.md`、`_docker.md`、`_postgres-tools.md`。
2. 每个源文件都必须先写头部，再写 Markdown 表格：
   - 第一个非空行必须是一级标题：`# _slug`
   - 一级标题之后允许空行
   - 之后只解析首个连续 blockquote 元数据区
   - `> 分类：...` 必填，用于生成 `_meta.name`
   - `> 运行时分类：...` 可选；若出现必须是合法 slug
   - `> 说明：...` 可保留供维护者阅读，但不进入 JSON 结构
3. 表格表头必须使用以下两种格式之一：

   `# | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags`

   `# | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags`

   当前仓库内置命令源应统一使用第二种 11 列格式，让每条命令显式声明最终运行时分类；旧 10 列格式仅作为生成器兼容能力保留，不再作为仓库内新写法。

4. 命令运行时 `category` 的回退顺序为：表格行 `运行时分类` 列 -> 文件头 `> 运行时分类：...` -> 文件 slug。行级列写 `-` 或留空时，按默认回退继续计算。builtin 与用户命令共用同一套 slug 规则：`^[a-z0-9]+(?:-[a-z0-9]+)*$`。
5. 一个源文件对应一个输出文件（同名）：
   - `_network.md` → `assets/runtime_templates/commands/builtin/_network.json`
   - `_git.md` → `assets/runtime_templates/commands/builtin/_git.json`
6. `assets/runtime_templates/commands/builtin/index.json` 的 `generatedFiles[]` 现在显式记录 `moduleSlug` 与 `runtimeCategories`；`docs/builtin_commands.generated.md` 也会同步输出 `Module / Runtime Categories`，便于区分“模块文件名”和“实际运行时分类集合”。
7. 非法示例：`_Redis.md`、`_postgres_tools.md`、`_my tools.md`；这些文件名会被生成器直接拒绝。

## 常见字段约定（简版）

1. `平台`：支持旧标量写法 `all / win / mac / linux / mac/linux`，也支持 JSON 数组写法 `["win"] / ["mac","linux"] / ["win","mac","linux"]`。`all` 仍保留为全平台命令的首选写法，`["win","mac","linux"]` 会归一化为 `all`，`mac/linux` 仍会拆成两条物理命令。数组内部只能写基础平台值 `win / mac / linux`；非法示例：`["all"]`、`["mac/linux"]`、`[]`、`[win,mac]`、`["win","win"]`。
2. `高危`：用 `⚠️` 标记高危命令（会触发更严格的安全提示/确认流程）。
3. `adminRequired`：需要管理员权限时标记为 `true`（Windows 会按需拉起管理员终端；若执行流中任一步为 `true`，则整队整体升权，ZapCmd 主进程本身不提权）。
4. `prerequisites`：只接受显式 typed token，逗号分隔并按声明顺序输出到 JSON，例如 `binary:git, shell:powershell`。
   - 合法类型只有：`binary`、`shell`、`env`
   - 合法示例：`binary:git`、`binary:docker`、`binary:python3`、`shell:powershell`、`env:GITHUB_TOKEN`
   - 非法示例：`git`、`docker,powershell`、`binary:`、`foo:bar`
   - `-` 表示不做任何前置检测。不是每条命令都需要 prerequisite。
   - prerequisite 只表达“执行前要额外确认的外部条件”，不要把命令正文里的系统常驻工具、shell builtin、PowerShell cmdlet 再写成 prerequisite。
   - 应该写 prerequisite 的典型场景：`git`、`docker`、`kubectl`、`python3`、`jq`、`psql`、`redis-cli`、特定 shell（如 `powershell`）。
   - 不该写 prerequisite 的典型场景：`ipconfig`、`systeminfo`、`ls`、`cat`、`grep`、`find`、`ps`、`head`、`tail`、`date`、`tasklist`。
   - generic shell 不需要写成 prerequisite；只有命令明确依赖某个特定 shell（如 `powershell`）时才写 `shell:powershell`。
5. `tags`：空格分隔，用于搜索与分类。
6. `参数`：使用 `key(type, ...)` 形式描述（例如 `path(path)`、`count(number, default:10, min:1, max:200)`、`mode(select:a/b/c)`）。
7. 本轮 builtin Markdown DSL 只新增 `min/max`，不支持在这里继续扩 `pattern/errorMessage` 等更复杂语法。
8. `min/max` 主要用于 number 参数；若同时写了 `default` 与 `min/max`，生成器会保留 `default` 并合并到同一个 `validation` 对象。
