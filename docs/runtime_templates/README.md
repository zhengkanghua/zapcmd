# Runtime Templates 文档

本目录用于说明 `assets/runtime_templates/` 下运行时模板资产的用途与维护方式。

## 1. 目录关系

1. 运行时资产（代码读取）：
   - `assets/runtime_templates/`
2. 说明文档（给维护者/贡献者）：
   - `docs/runtime_templates/README.md`（本文件）

## 2. 主要资产说明

1. `assets/runtime_templates/config.json`
   - 默认配置样例。
2. `assets/runtime_templates/state.json`
   - 状态数据样例。
3. `assets/runtime_templates/stats.json`
   - 统计数据样例。
4. `assets/runtime_templates/combos.json`
   - 组合数据样例。
5. `assets/runtime_templates/commands/`
   - 命令模板资产目录（含 builtin 生成产物与示例文件）。

## 3. 命令模板维护入口

1. 人工维护源：`docs/command_sources/_*.md`
2. 生成脚本：`scripts/generate_builtin_commands.ps1`
3. 生成输出：`assets/runtime_templates/commands/builtin/_*.json`
4. 生成清单：`assets/runtime_templates/commands/builtin/index.json`
5. （可选）生成 Markdown 快照用于 Review（不要求提交到仓库）

## 4. 变更建议

1. 若改动了命令源 markdown，请同一轮更新生成产物和快照文档。
2. 若改动了模板资产结构，请同步更新本文件与相关 schema/加载逻辑文档。
