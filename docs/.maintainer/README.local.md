# 维护者索引（Maintainer Index）

> 说明：`docs/.maintainer/` 存放维护者/Agent 内部资料（跑书、人工回归清单、个人手册等），不把它当成开源用户入口文档。
> 项目公共规范、结构说明与“当前实现快照”已收敛到 `docs/` 根目录下。

## 目录结构

- `work/`：发布跑书、CI 检查清单、人工回归清单、维护者 SOP

## 推荐入口（优先看这些）

### 项目公共文档（所有人共用）

- `docs/project_constitution.md`：项目宪法（开发规范/约束/门禁/Docs-first）
- `docs/project_structure.md`：项目结构与技术栈说明
- `docs/active_context.md`：短期记忆（当前实现快照）
- `docs/plan/README.md`：需求/计划文档（Docs-first 落地入口）
- `docs/architecture_plan.md`：架构说明（当前实现 + Roadmap）

### 维护者工作文档（仅维护者/Agent）

- `work/README.md`
- `work/MAINTAINER_OPEN_SOURCE_PLAYBOOK.local.md`
- `work/release_runbook.md`
- `work/ci_cd_verification.md`
- `work/manual_regression_m0_m0a.md`
- `work/manual_regression_m4_release.md`

## 规则

1. 公开入口文档只放在仓库公共位置（`README*`、`docs/`、`.github/` 等）。
2. 本目录为维护者/Agent 内部资料，尽量不要从开源用户入口文档引用它。
