# Command Sources

该目录存放内置命令的可维护 Markdown 源文件。  
规则：一个 markdown 文件对应一个输出 json 文件（同名，后缀 `.json`）。

示例：

- `_network.md` -> `assets/runtime_templates/commands/builtin/_network.json`
- `_git.md` -> `assets/runtime_templates/commands/builtin/_git.json`

统一表头：

`# | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags`

生成命令：

```powershell
./scripts/generate_builtin_commands.ps1
```

## 如何维护内置命令（贡献者）

最小流程：**改 `docs/command_sources/_*.md` → 运行生成脚本 → 提交生成产物**。

CI 会阻断未提交的生成产物漂移；除 JSON 资产外，`docs/builtin_commands.generated.md` 也属于必须提交的生成快照。

1. 修改源文件：`docs/command_sources/_*.md`
2. 运行生成：`./scripts/generate_builtin_commands.ps1`
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
3. 表格表头必须保持一致：

   `# | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags`

4. 文件 slug 决定模块名与输出文件名；命令运行时 `category` 默认回退到文件 slug，也可由 `> 运行时分类：...` 覆盖。builtin 与用户命令共用同一套 slug 规则：`^[a-z0-9]+(?:-[a-z0-9]+)*$`。
5. 一个源文件对应一个输出文件（同名）：
   - `_network.md` → `assets/runtime_templates/commands/builtin/_network.json`
   - `_git.md` → `assets/runtime_templates/commands/builtin/_git.json`
6. `assets/runtime_templates/commands/builtin/index.json` 的 `generatedFiles[]` 现在显式记录 `moduleSlug` 与 `runtimeCategory`；`docs/builtin_commands.generated.md` 也会同步输出 `Module / Runtime Category` 两列，便于区分“模块文件名”和“运行时分类”。
7. 非法示例：`_Redis.md`、`_postgres_tools.md`、`_my tools.md`；这些文件名会被生成器直接拒绝。

## 常见字段约定（简版）

1. `平台`：支持 `all / win / mac / linux / mac/linux`（其中 `mac/linux` 会拆成两条）。
2. `高危`：用 `⚠️` 标记高危命令（会触发更严格的安全提示/确认流程）。
3. `adminRequired`：需要管理员权限时标记为 `true`（Windows 会按需拉起管理员终端；若执行流中任一步为 `true`，则整队整体升权，ZapCmd 主进程本身不提权）。
4. `prerequisites`：逗号分隔，例如 `git,docker,powershell`。
5. `tags`：空格分隔，用于搜索与分类。
6. `参数`：使用 `key(type, ...)` 形式描述（例如 `path(path)`、`count(number, default:10, min:1, max:200)`、`mode(select:a/b/c)`）。
7. 本轮 builtin Markdown DSL 只新增 `min/max`，不支持在这里继续扩 `pattern/errorMessage` 等更复杂语法。
8. `min/max` 主要用于 number 参数；若同时写了 `default` 与 `min/max`，生成器会保留 `default` 并合并到同一个 `validation` 对象。
