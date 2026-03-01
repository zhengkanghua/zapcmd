# Docs 导航（当前实现口径）

## 对外公开入口（给开源用户）

1. `README.md`（English）
2. `README.zh-CN.md`（简体中文）
3. `CHANGELOG.md`（版本变更记录）
4. `LICENSE`（MIT）
5. `CONTRIBUTING.md` / `CONTRIBUTING.zh-CN.md`（贡献流程）
6. `SECURITY.md` / `SECURITY.zh-CN.md`（漏洞报告）
7. `SUPPORT.md` / `SUPPORT.zh-CN.md`（使用支持）
8. `CODE_OF_CONDUCT.md` / `CODE_OF_CONDUCT.zh-CN.md`（社区行为规则）

## 命令资产维护

1. 人维护：`docs/command_sources/_*.md`
2. 机器生成：`assets/runtime_templates/commands/builtin/_*.json`
3. 生成清单：`assets/runtime_templates/commands/builtin/index.json`
4. （可选）生成 Markdown 快照用于 Review（不要求提交到仓库）
5. 生成命令：`./scripts/generate_builtin_commands.ps1`

## 其他文档

1. `docs/active_context.md`：短期记忆（当前实现快照）
2. `docs/project_constitution.md`：项目规范/约束/门禁/文档治理/测试策略
3. `docs/project_structure.md`：项目结构与技术栈说明（快速上手入口）
4. `docs/plan/README.md`：需求/计划文档（Docs-first 落地入口）
5. `docs/architecture_plan.md`：架构说明（当前实现 + Roadmap）
6. `docs/command_sources/README.md`：内置命令源文件维护入口（含生成说明）
7. `docs/schemas/README.md`：命令文件 schema 说明
8. `docs/schemas/command-file.schema.json`：命令 JSON schema
9. `assets/runtime_templates/README.md`：运行时模板资产说明与维护口径
10. `.github/README*.md`：CI/CD 与协作模板说明
