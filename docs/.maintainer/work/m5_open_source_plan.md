# ZapCmd 开源化计划（M5，文档先行）

> 状态：Completed  
> 基线日期：2026-02-23  
> 目标：在 M0-M4 完成后，把项目从“可开发”升级到“可被开源用户稳定使用和贡献”。

---

## 1. 结论先说

1. 基于 `docs/m0_m4_task_breakdown.md`，M0-M4 已完成。
2. 当前已经具备“开源发布基础能力”（CI 门禁、三平台构建、Release 下载产物）。
3. 下一阶段重点不是继续堆功能，而是补齐“开源治理与分发体系”。

## 1.1 当前进度快照（2026-02-23）

1. M5-A（治理基础）：已完成。
2. M5-B（协作模板）：已完成。
3. M5-C（发布体验补强）：已完成。
4. M5-D（口径收口）：已完成。
5. M5 总体状态：已完成。
6. 最小双语治理入口已完成：`CONTRIBUTING/SECURITY/SUPPORT/CODE_OF_CONDUCT` 增加中文版本。

---

## 2. 当前已具备（可直接复用）

1. 双语入口文档：`README.md`、`README.zh-CN.md`。
2. 工程门禁：`npm run check:all` + CI 工作流 `ci-gate.yml`。
3. 三平台构建矩阵：`release-build.yml`（Windows/macOS/Linux）。
4. 标签发布可写入 Releases 下载区（`vX.Y.Z`）。
5. 发布/回滚流程文档：`docs/release_runbook.md`。
6. 发布前人工回归清单：`docs/manual_regression_m4_release.md`。

---

## 3. 开源化缺口（历史项与后续项）

### 3.1 法务与治理

1. `LICENSE`：已补齐（MIT）。
2. `CONTRIBUTING.md`：已补齐。
3. `CODE_OF_CONDUCT.md`：已补齐。
4. `SECURITY.md`：已补齐。
5. `SUPPORT.md`：已补齐。

### 3.2 协作入口

1. GitHub Issue 模板（Bug/Feature/Question）：已补齐。
2. Pull Request 模板（变更说明、测试证据、文档同步项）：已补齐。
3. 公开路线图页：已补齐（`docs/m0_m4_task_breakdown.md`）。

### 3.3 发布分发

1. 发布校验文件（SHA256 汇总）：已补齐（`SHA256SUMS`）。
2. macOS 签名/公证链路：仍为后续项（当前通过文档说明 Gatekeeper 放行步骤）。
3. 多架构策略：第一版已定，扩展架构仍为后续项（macOS x64 / Linux arm64 / Windows arm64）。
4. 包管理器分发：仍为后续项（winget/homebrew/apt 仓库等）。

### 3.4 版本与兼容口径

1. `CHANGELOG.md`：已补齐。
2. 兼容矩阵（OS/架构/终端支持范围）：已补齐（README 双语）。
3. “已知限制”集中口径：已补齐（README 双语 + 发布文档）。

---

## 4. 协议（License）建议

> 先给可执行建议，再给备选，避免卡在“选型讨论”。

### 已定方案

1. 采用 `MIT`：最简洁，生态兼容性高，个人/小团队上手成本最低。

### 备选方案

1. `Apache-2.0`：如果你希望有更明确的专利授权条款。
2. `GPL-3.0`：如果你希望强 copyleft（下游分发必须开源），但商业接入门槛更高。

### 决策 Gate

1. 若目标是“尽快扩大使用者与贡献者”，优先 MIT。
2. 若目标是“专利条款更清晰”，优先 Apache-2.0。

---

## 5. 分发机制建议（第一版）

### 5.1 当前可用机制（立即可用）

1. 发布标签 `vX.Y.Z` -> 自动构建三平台产物 -> 自动上传到 GitHub Releases。

### 5.2 M5 已完成补强机制

1. 在 Release 中自动附带 `SHA256SUMS` 文件。
2. README 增加“如何校验安装包”步骤。
3. 补充 macOS 未签名/未公证时的放行说明（直到签名链路接入）。

### 5.3 后续机制（M6+）

1. 接入包管理器：
   - Windows：winget
   - macOS：Homebrew cask
   - Linux：至少提供 `.deb/.rpm` 安装指引，后续考虑仓库化分发
2. 评估自动更新通道（stable/beta）。

---

## 6. 多架构策略（建议先定口径）

### 6.1 第一版支持矩阵（已锁定）

1. Windows：x64（已支持）。
2. macOS：arm64（已支持）。
3. Linux：x64（已支持）。

### 6.2 第二版扩展矩阵（按需求）

1. macOS x64（Intel）。
2. Linux arm64。
3. Windows arm64（若有明确用户需求再上）。

### 6.3 Gate

1. 未纳入支持矩阵的架构，在 README 明确“暂不保证”。

---

## 7. M5 执行记录

## 7.1 M5-A（治理基础）

1. 新增：`LICENSE`（MIT 或 Apache-2.0）。
2. 新增：`CONTRIBUTING.md`。
3. 新增：`CODE_OF_CONDUCT.md`。
4. 新增：`SECURITY.md`。
5. 新增：`SUPPORT.md`。

验收：
1. 仓库首页可直接看到治理文件入口。
2. 新贡献者可按文档完成一次 PR。

## 7.2 M5-B（协作模板）

1. 新增 `.github/ISSUE_TEMPLATE/bug_report.yml`。
2. 新增 `.github/ISSUE_TEMPLATE/feature_request.yml`。
3. 新增 `.github/ISSUE_TEMPLATE/question.yml`。
4. 新增 `.github/pull_request_template.md`。
5. 新增 `.github/ISSUE_TEMPLATE/config.yml`（禁用空白 issue，统一走模板）。

验收：
1. 新建 Issue/PR 时自动加载结构化模板。

## 7.3 M5-C（发布体验）

1. 自动生成并上传 `SHA256SUMS` 到 Release。
2. README 增加“下载校验”示例。
3. 发布文档补“手动回滚操作截图/步骤”。

验收：
1. 任意 Release 页面都能看到二进制 + 校验文件。
2. 用户可按文档完成一次校验。

## 7.4 M5-D（口径收口）

1. 新增 `CHANGELOG.md`，按版本记录变化。
2. README 增加“支持矩阵”和“已知限制”。
3. `docs/m0_m4_task_breakdown.md` 增加 M5 状态栏。

验收：
1. 用户能快速判断版本变化与兼容性范围。

---

## 8. 已确认决策（2026-02-23）

1. 许可证：`MIT`。
2. 第一版支持矩阵：Windows x64 / macOS arm64 / Linux x64。
3. 执行顺序：M5-A -> M5-B -> M5-C -> M5-D。

## 9. 国际化（中英文）规划

1. 用户侧与项目侧文档统一中英文双语。
2. M5-A~M5-D 已完成，国际化进入下一阶段推进。
3. 后续落地建议：
   - 首先覆盖用户入口与安装使用文档（已完成）
   - 再覆盖贡献与治理文档（最小集已完成）
   - 最后评估应用内 UI 中英文切换
---

## 10. 风险提示

1. 不补 `LICENSE`，严格意义上别人无法合法复用代码。
2. 不补 `SECURITY.md`，安全漏洞上报路径不清晰，风险高。
3. 不补 Release 校验文件，公开分发可信度不足。
4. macOS 未签名/公证会影响普通用户安装体验（可用但门槛高）。
