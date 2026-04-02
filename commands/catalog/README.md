# Builtin Command Catalog

`commands/catalog/_*.yaml` 是 builtin 命令的唯一真源。

生成链：

1. 编辑 `commands/catalog/_*.yaml`
2. 运行 `npm run commands:builtin:generate`
3. 提交以下产物：
   - `assets/runtime_templates/commands/builtin/_*.json`
   - `assets/runtime_templates/commands/builtin/index.json`
   - `docs/generated_commands/_*.md`
   - `docs/generated_commands/index.md`

执行模型：

- `exec.program + exec.args[]`：适合 argv-safe 命令
- `exec.stdinArgKey`：适合把参数注入 stdin
- `script.runner + script.command`：适合 pipe / redirect / shell-only 语法

约束：

- `template` 与顶层 `shell` 已删除，不再接受。
- `script.runner` 必须与 `prerequisites` 中的 `shell:*` 对齐。
- 最终运行时契约以 `docs/schemas/command-file.schema.json` 为准。
