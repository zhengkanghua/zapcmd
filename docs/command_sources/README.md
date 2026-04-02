# Command Sources（已退役）

`docs/command_sources/_*.md` 已不再作为 builtin 命令真源。

当前维护入口：

- 真源：`commands/catalog/_*.yaml`
- 运行时产物：`assets/runtime_templates/commands/builtin/_*.json`
- 只读文档：`docs/generated_commands/_*.md`

常用命令：

```bash
npm run commands:builtin:generate
```

更多说明请查看：

- `commands/catalog/README.md`
- `docs/generated_commands/index.md`
