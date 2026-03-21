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

1. 修改源文件：`docs/command_sources/_*.md`
2. 运行生成：`./scripts/generate_builtin_commands.ps1`
3. 检查并提交生成产物：
   - `assets/runtime_templates/commands/builtin/_*.json`
   - `assets/runtime_templates/commands/builtin/index.json`
4. 本地门禁：`npm run check:all`

## 源文件规范（必须）

1. 文件命名建议使用模块化前缀：`_git.md`、`_docker.md`、`_system.md` 等。
2. 每个源文件的命令以 Markdown 表格维护，表头必须保持一致：

   `# | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags`

3. 一个源文件对应一个输出文件（同名）：
   - `_network.md` → `assets/runtime_templates/commands/builtin/_network.json`
   - `_git.md` → `assets/runtime_templates/commands/builtin/_git.json`

## 常见字段约定（简版）

1. `平台`：支持 `all / win / mac / linux / mac/linux`（其中 `mac/linux` 会拆成两条）。
2. `高危`：用 `⚠️` 标记高危命令（会触发更严格的安全提示/确认流程）。
3. `adminRequired`：需要管理员权限时标记为 `true`（Windows 会按需拉起管理员终端；若执行流中任一步为 `true`，则整队整体升权，ZapCmd 主进程本身不提权）。
4. `prerequisites`：逗号分隔，例如 `git,docker,powershell`。
5. `tags`：空格分隔，用于搜索与分类。
6. `参数`：使用 `key(type, ...)` 形式描述（例如 `path(path)`、`count(number, default:10)`、`mode(select:a/b/c)`）。
