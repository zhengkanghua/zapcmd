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
9. `docs/doc_visibility_policy.md`（仓库文档范围说明）

## 命令资产维护

1. 人维护：`docs/command_sources/_*.md`
2. 机器生成：`assets/runtime_templates/commands/builtin/_*.json`
3. 生成清单：`assets/runtime_templates/commands/builtin/index.json`
4. （可选）生成 Markdown 快照用于 Review（不要求提交到仓库）
5. 生成命令：`./scripts/generate_builtin_commands.ps1`

## 其他文档

1. `docs/builtin_commands.md`：命令资产生成与维护口径
2. `docs/schemas/command-file.schema.json`：命令 JSON schema
3. `docs/runtime_templates/README.md`：运行时模板说明（文档）
4. `assets/runtime_templates/`：运行时模板资产目录
5. `.github/release-template.md`：发布说明模板
