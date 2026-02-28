# ZapCmd 文档治理规则（Current）

> 目标：保证“文档先行带动需求”，并避免多文档互相打架。

---

## 1. 核心原则（大白话）

1. 先改文档，再改代码。
2. 代码改了，必须在同一轮把相关文档补齐。
3. 文档里必须区分两件事：
   - 当前已实现（现在就这样）
   - 未来计划（Roadmap，不是现状）
4. 禁止把“还没做”的能力写成“已经有”。

---

## 2. 文档优先级

1. `README.md` / `README.zh-CN.md`
对外入口（安装/运行/使用方式），优先级最高。
2. `docs/` 下的实现与规范文档
解释“当前实现”和“Roadmap”，用于贡献者理解与协作。
3. `CHANGELOG.md`
版本变更记录，以发布为准。
4. `docs/.maintainer/work/dev_engineering_constraints.md`
工程约束与质量基线。
5. `docs/.maintainer/work/change_checklist.md`
提交前收口动作。

说明：
1. 维护者如需个人工作文档（草稿、跑书、排障记录），请保存在本地，不要把它作为公开口径的一部分。

---

## 3. 变更同步矩阵（必须执行）

| 改动类型 | 必须同步文档 |
|---|---|
| 主界面交互变化（搜索/抽屉/暂存） | `README.md` + `README.zh-CN.md`（如影响使用方式） + `docs/` 下对应主题文档 + 自动化测试 |
| 快捷键变化 | `README.md` + `README.zh-CN.md`（如影响使用方式） + `docs/` 下对应主题文档 + `docs/.maintainer/work/manual_regression_m0_m0a.md`（如需） |
| 执行语义变化（执行方式、成功/失败行为） | `README.md` + `README.zh-CN.md` + `docs/` 下对应主题文档 + 自动化测试 |
| 窗口行为变化（失焦、拖拽、位置恢复） | `docs/` 下对应主题文档 + `docs/.maintainer/work/manual_regression_m0_m0a.md`（如需） |
| 工程规则变化（lint/test/结构约束） | `docs/.maintainer/work/dev_engineering_constraints.md` + `docs/.maintainer/work/change_checklist.md` + `AGENTS.md` |
| 测试策略变化（自动化/人工边界） | `docs/.maintainer/work/dev_engineering_constraints.md` + `docs/.maintainer/work/manual_regression_m0_m0a.md`（如需） |
| 交付流程变化（提交前检查项） | `change_checklist.md` + `doc_governance.md` + `AGENTS.md` |
| 里程碑/优先级变化 | `CHANGELOG.md`（如涉及版本计划） + `docs/` 下对应主题文档 |
| 文档新增或重命名 | `docs/README.md` |
| 开源用户使用入口变化（安装/运行/用户命令目录/配置） | `README.md` + `README.zh-CN.md` + `docs/README.md` |
| 任意代码功能改动（同一轮收尾） | `README.md` / `README.zh-CN.md`（如影响用户） + 自动化测试 + `docs/.maintainer/work/change_checklist.md`（收尾） |

---

## 4. 提交前检查（Doc QA）

每次提交前确认：

1. README 里的用户入口是否与代码行为一致。
2. `docs/` 下“当前实现”段落是否与代码一致。
3. Roadmap 是否明确标注为未来计划（不要写成已实现）。
4. README 导航有没有漏掉新文档。
5. 开源入口文档双语是否同步（`README.md` / `README.zh-CN.md`）。
6. 有没有把 roadmap 写成“已实现”。
7. `change_checklist` 是否覆盖当前门禁流程。

---

## 5. 术语统一（当前口径）

- 主界面：`Search Capsule + Result Drawer + Floating Staging`
- 暂存入口：`Staging Toggle Button`
- 命令输出：`Terminal Output`（在系统终端查看）
- 皮肤字段：`uiSkin`

---

## 6. 当前产品固定决策（写死，避免反复）

1. 命令执行调用系统终端。
2. 命令输出在终端中查看。
3. 应用内不做输出浮层/输出面板。

如未来要恢复应用内输出展示，必须先改 contract，再进入开发。

