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

1. 真源：`commands/catalog/_*.yaml`
2. 运行时产物：`assets/runtime_templates/commands/builtin/_*.json`
3. 生成清单：`assets/runtime_templates/commands/builtin/index.json`
4. 只读文档：`docs/generated_commands/_*.md` 与 `docs/generated_commands/index.md`
5. 生成命令：`npm run commands:builtin:generate`
6. schema 同步检查：`npm run commands:schema:check`
7. CI 会阻断 `assets/runtime_templates/commands/builtin/**` 与 `docs/generated_commands/**` 的未提交漂移

## 其他文档

1. `AGENTS.md`：Agent 协作规则与文档导航（Agent 会话的最高入口）
2. `docs/project_constitution.md`：项目规范/约束/门禁/文档治理/测试策略
3. `docs/project_structure.md`：项目结构与技术栈说明（快速上手入口）
4. `docs/architecture_plan.md`：架构说明（当前实现 + Roadmap）
5. `CONTEXT.md` / `docs/adr/` / `docs/specs/`：由 `/grill-with-docs`、`/to-spec` 按需懒创建——术语表、决策记录（`NNNN-slug.md`）与实现 spec（完成即删），不存在时不要预建
6. `docs/.maintainer/work/README.md`：维护者内部跑书入口（发布/CI 核对/人工回归）
7. `commands/catalog/README.md`：内置命令 YAML 真源维护入口
8. `docs/command_sources/README.md`：历史目录退役说明
9. `docs/schemas/README.md`：命令文件 schema 说明
10. `docs/schemas/command-file.schema.json`：命令 JSON schema
11. `assets/runtime_templates/README.md`：运行时模板资产说明与维护口径
12. `.github/workflows/ci-gate.yml` / `.github/pull_request_template.md`：CI/CD 与协作模板说明
