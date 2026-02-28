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

