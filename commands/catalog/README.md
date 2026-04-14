# Builtin Command Catalog

`commands/catalog/_*.yaml` 是 builtin 命令的唯一真源。

最终目录结构：

- `commands/catalog/_*.yaml` 只保留结构字段：`moduleSlug`、`id`、`category`、`platform`、`exec/script`、`args.key/type/default/validation`、`prerequisites`、`tags` 等。
- 所有文案都必须放在 `commands/catalog/locales/<locale>/_*.yaml`。
- 语言配置统一放在 `commands/catalog/locales/config.yaml`，其中 `requiredBuiltinLocales` 是 blocking gate。

生成链：

1. 编辑 `commands/catalog/_*.yaml` 与 `commands/catalog/locales/<locale>/_*.yaml`
2. 运行 `npm run commands:builtin:generate`
3. 提交以下产物：
   - `assets/runtime_templates/commands/builtin/_*.json`
   - `assets/runtime_templates/commands/builtin/index.json`
   - `docs/generated_commands/_*.md`
   - `docs/generated_commands/index.md`

约束：

- base YAML 中禁止再出现 `meta.name`、`command.name`、`arg.label`、`arg.placeholder`、`prerequisite.displayName` 等本地化文案字段。
- 缺少 `requiredBuiltinLocales` 中任一 overlay 文件时，generator 会直接失败。
- overlay 采用 key-based 结构：`commands.<commandId>.args.<argKey>` / `commands.<commandId>.prerequisites.<prereqId>`。

执行模型：

- `exec.program + exec.args[]`：适合 argv-safe 命令
- `exec.stdinArgKey`：适合把参数注入 stdin
- `script.runner + script.command`：适合 pipe / redirect / shell-only 语法

- `template` 与顶层 `shell` 已删除，不再接受。
- `script.runner` 必须与 `prerequisites` 中的 `shell:*` 对齐。
- 最终运行时契约以 `docs/schemas/command-file.schema.json` 为准。
