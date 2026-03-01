# Runtime Templates Assets / 运行时模板资产

本目录存放 **应用运行时会读取/打包** 的模板资产（不是“截图/介绍文档”）。

## 1. 主要资产

- `config.json`：默认配置样例
- `state.json`：状态文件样例
- `stats.json`：统计文件样例
- `combos.json`：组合文件样例
- `commands/`：命令模板资产目录（含 builtin 生成产物与示例文件）

## 2. 内置命令（builtin）如何维护

内置命令的产物文件在：

- `assets/runtime_templates/commands/builtin/_*.json`
- `assets/runtime_templates/commands/builtin/index.json`

其“人维护源”（SSOT）在：

- `docs/command_sources/_*.md`

生成脚本：

```powershell
./scripts/generate_builtin_commands.ps1
```

维护流程（最小闭环）：

1. 修改 `docs/command_sources/_*.md`
2. 运行 `./scripts/generate_builtin_commands.ps1`
3. 提交生成产物（`assets/runtime_templates/commands/builtin/**`）
4. 本地门禁：`npm run check:all`

更多说明：`docs/command_sources/README.md`
