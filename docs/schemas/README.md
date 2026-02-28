# Command Schema 说明

## 这个文件是做什么的

`docs/schemas/command-file.schema.json` 是命令文件的结构契约（Contract），用于统一：

- 命令 JSON 必须有哪些字段、字段类型是什么。
- 导入社区命令时如何做格式校验。
- 内置命令/用户命令是否可被同一套加载器稳定解析。

一句话：**schema 负责“格式正确性”，不负责“命令语义是否合理”。**

## 在项目中的作用

1. 导入前校验：不符合 schema 的命令文件直接拒绝。
2. 启动加载校验：发现结构损坏的文件时给出错误并跳过。
3. 作为 `docs/command_sources/*.md` 生成产物的最终落地格式依据（唯一 JSON 结构）。

## 与命令源的关系

- `docs/command_sources/*.md` 是命令内容清单（人维护源）。
- `command-file.schema.json` 是最终结构规则。
- 生成时按规则转换后，产出的每条命令对象必须满足 schema。
- 自动合并与生成由 `scripts/generate_builtin_commands.ps1` 完成（见 `docs/builtin_commands.md`）。

## 首次启动写入建议

建议首次启动时将 schema 写入用户目录：

- 源：`docs/schemas/command-file.schema.json`
- 目标：`~/.zapcmd/schemas/command-file.schema.json`

这样运行时和导入流程都可使用同一份校验规则。

## 最小可通过示例

- `docs/schemas/examples/command-file.min.json`
- `docs/schemas/examples/command-file.platform-split.json`

这两个文件可直接作为测试夹具（fixture）使用。
