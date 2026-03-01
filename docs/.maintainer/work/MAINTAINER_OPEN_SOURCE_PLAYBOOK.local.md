# ZapCmd 维护者实操手册（个人版）

> 适用对象：仓库维护者（你自己）。
> 目标：第一次做开源时，按这份文档就能完成日常开发、质量把关、问题排查、发布与回滚。

## 0. 先回答你最关心的两个点

1. 现在发布入口是否只有一个？
   - 正式发布入口只有一个：`push vX.Y.Z tag`。
2. 手动构建是什么？
   - 手动构建是 GitHub Actions 里手动点 `Run workflow` 做“预演构建”。
   - 当前手动入口是 dry-run 工作流：`.github/workflows/release-dry-run.yml`（只构建不发布）。

---

## 0.1 私有文档目录约定（统一口径）

统一口径：维护者/Agent 内部资料只放一个目录，方便多机同步与快速定位；不把它当成开源用户入口文档。

1. 目录：`docs/.maintainer/`
2. 目录内分层（约定）：
   - `docs/.maintainer/work/`：发布跑书、人工回归清单、日常 SOP（维护工作流）

项目公共规范/结构/短期记忆（不在 `.maintainer/`）：

1. `docs/project_constitution.md`
2. `docs/project_structure.md`
3. `docs/active_context.md`

项目公共“当前实现口径”设计文档（不在 `.maintainer/`）：

1. `docs/active_context.md`（当前实现快照，含 UI 行为基线）
2. `docs/architecture_plan.md`（架构说明：当前实现 + Roadmap）

需求/计划文档（Docs-first 落地入口）：

1. `docs/plan/`

（可选）从旧命名迁移（Windows PowerShell）：
说明：旧机器上可能存在 `docs/.local/` 或 `docs/.private/`，它们本质都是“维护者私有文档”。

```powershell
New-Item -ItemType Directory -Force docs/.maintainer/work | Out-Null
New-Item -ItemType Directory -Force docs/plan | Out-Null

if (Test-Path docs/.local) {
  Move-Item -Force docs/.local/* docs/.maintainer/work/
}
if (Test-Path docs/.private) {
  Move-Item -Force docs/.private/* docs/.maintainer/work/
}
```

---

## 1. 当前流程总览（大白话）

1. 外部贡献者只能提 `Issue/PR`，不能直接发版。
2. 你审核 PR，合并后再决定是否发布。
3. 发布动作就是：改版本 -> 过门禁 -> 打 tag -> 推 tag。
4. GitHub 自动做多平台构建、产出安装包、计算 `SHA256SUMS`、发布到 Releases。

---

## 2. 你每天怎么开发（个人开发流程）

1. 拉代码、开分支。
2. 本地开发并小步提交。
3. 本地最少跑：
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:run`
4. 准备合并前跑：
   - `npm run check:all`
5. 如果改了终端/窗口/热键行为，再做人工回归：
   - `docs/.maintainer/work/manual_regression_m0_m0a.md`
6. 改了用户可见行为，同步更新：
   - `README.md`
   - `README.zh-CN.md`

---

## 3. 自动检查是怎么卡住坏代码的

1. 本地 commit 前（pre-commit）
   - 自动跑 lint/typecheck/相关测试（按 staged 文件范围）。
   - 入口：`.githooks/pre-commit` -> `scripts/precommit-guard.mjs`
2. GitHub 远端（CI Gate）
   - 每次 push/PR 跑 `npm run check:all`。
   - 入口：`.github/workflows/ci-gate.yml`
3. 发布工作流（仅 tag，正式发布）
   - 只在推 `vX.Y.Z` tag 时跑。
   - 入口：`.github/workflows/release-build.yml`
4. Dry-run 工作流（手动预演，不发布）
   - 手动触发，可选平台（all/windows/macos/linux）。
   - 入口：`.github/workflows/release-dry-run.yml`

---

## 4. 你怎么处理外部贡献（Issue + PR）

### 4.1 看 Issue（每天/隔天）

1. 打开 Issues 列表，先按模板类型分类：
   - Bug
   - Feature
   - Question
2. 先做“是否可复现”判断：
   - 缺版本、平台、步骤：先评论补充信息。
   - 信息完整：进入复现。

### 4.2 Bug 排查（固定动作）

1. 用对方给的版本/平台/步骤复现。
2. 复现后写最小复现步骤（你自己能重复执行）。
3. 定位模块：
   - 前端交互：`src/composables` / `src/components`
   - 桥接调用：`src/services/tauriBridge.ts`
   - 后端能力：`src-tauri/src/*.rs`
4. 修复后补测试：
   - 至少一条对应自动化回归（unit/integration）。
5. 在 PR 里写清：
   - 根因
   - 修复方式
   - 验证命令与结果

### 4.3 审 PR（合并前清单）

1. PR 描述是否完整（按 `.github/pull_request_template.md`）。
2. CI 是否全绿。
3. 是否有对应测试与文档更新。
4. 是否有高风险改动（窗口/终端/热键/发布链路）。
5. 确认后再合并（建议 squash merge，保持历史干净）。

---

## 5. 你怎么发布（正式发布只保留 tag 入口）

### 5.1 标准发版步骤

1. 确认主分支状态正常，且你要发版的提交已合并。
2. 本地执行：`npm run check:all`
3. 更新版本与变更记录：
   - `package.json` -> `version`
   - `CHANGELOG.md` -> 新增对应版本段
4. 执行同步：
   - `npm run version:sync`
5. 打 tag 并推送：
   - `git tag vX.Y.Z`
   - `git push origin vX.Y.Z`
6. 到 GitHub Actions 看 `Release Build Matrix` 是否成功。
7. 到 Releases 检查：
   - 安装包是否齐全
   - `SHA256SUMS` 是否存在

### 5.2 SHA256 是怎么用的

1. 工作流会自动生成 `SHA256SUMS`（发布端自动）。
2. 用户下载后本地自己比对 hash（用户侧手动）。
3. 作用：验证安装包未损坏、未被篡改。

---

### 5.3 版本号三段数字怎么加（SemVer，大白话）

约定：`MAJOR.MINOR.PATCH`（例如 `1.2.3`）。

1. PATCH（第三位）+1：修 bug、改文案、内部重构，不改变用户使用方式或接口。
2. MINOR（第二位）+1：新增功能或增强能力，且对现有用户兼容（旧用法仍能用）。
3. MAJOR（第一位）+1：破坏性变更（例如命令 schema/行为不兼容、配置迁移必需、默认行为大改）。
4. 你不确定时的默认策略：
   - 优先发 PATCH。
   - 只有确定 “需要写迁移说明” 时才升 MAJOR。

---

## 6. Dry-run 有什么用（以及你现在怎么用）

1. 作用：
   - 预演打包链路（不污染正式 Releases）。
   - 验证某个平台是否能成功打包。
   - 排查 CI 机器环境变化导致的构建失败。
2. 你现在的策略：
   - 正式发布只允许 tag 触发（单入口）。
   - 手动只允许 dry-run（不发布）。
3. 建议使用时机：
   - 发布前一天或发布前最后一次检查。
   - 升级依赖、改 Tauri/Rust 构建参数后。
   - 出现“本地能过、CI 失败”时。

---

### 6.1 Dry-run 怎么触发（GitHub 页面操作，按按钮一步步来）

前提条件：

1. 你需要在主仓库有 `Write` 权限（外部贡献者通常没有）。
2. 该工作流文件必须已经在仓库默认分支（一般是 `main`）里存在：
   - `.github/workflows/release-dry-run.yml`
3. 说明一下 `workflow_dispatch`：
   - 这是一种 “手动触发” 的 GitHub Actions 事件类型。
   - 只有工作流声明了 `on: workflow_dispatch`，你才能在 GitHub 页面看到 `Run workflow` 按钮。

操作路径：

1. 打开你的仓库主页（浏览器里进入 GitHub 的仓库页面）。
2. 点击顶部导航：`Actions`。
3. 在左侧工作流列表里，点击：`Release Dry Run Build`。
4. 在页面右上角找到并点击按钮：`Run workflow`。
   - 如果你找不到这个按钮：
     - 先确认你点的是工作流页面（不是 “All workflows” 列表页）。
     - 再确认你账号是否有仓库写权限。
     - 再确认你打开的是主仓库（不是 Fork 仓库的页面）。
     - 再确认该工作流文件已合并到默认分支（如果只存在于某个分支但没合并，默认分支页面不会显示可运行入口）。
5. 在弹出的下拉面板里：
   - Branch 选择：`main`（或你希望测试的分支）
   - `platform` 选择：`all` / `windows` / `macos` / `linux`
6. 点击面板里的绿色按钮：`Run workflow`（会触发一次构建）。
7. 等运行完成后，点进这次 run（运行记录），在页面底部找到 `Artifacts` 区域下载产物。
   - 下载后即可在本机安装/解压验证。

直达链接（更适合新手，复制到浏览器地址栏打开）：

```text
https://github.com/<OWNER>/<REPO>/actions/workflows/release-dry-run.yml
```

你可以把 `<OWNER>/<REPO>` 替换成你的仓库路径，例如：

```text
https://github.com/zhengkanghua/zapcmd/actions/workflows/release-dry-run.yml
```

常见问题：

1. 看不到 `Run workflow` 按钮：
   - 基本原因是权限不够（没有 `Write`），或 Actions 被仓库设置限制。
   - 你可以在仓库 `Settings -> Actions -> General` 检查 Actions 是否启用。
   - 如果你在手机浏览器里看，有时按钮会被折叠到页面右上角的菜单里；建议先用桌面浏览器确认一次。
2. Dry-run 构建成功但你找不到安装包：
   - 这类产物在 run 的 `Artifacts` 里，不会出现在 Releases。
3. 只想验证某个平台：
   - 用 `platform` 选择对应项，避免全平台跑太久。

## 7. 你必须做的 GitHub 权限设置（强烈建议）

1. 主分支保护（Branch protection）
   - 路径：`GitHub -> Settings -> Branches -> Add branch protection rule`
   - Branch name pattern：`main`
   - 勾选：
     - `Require a pull request before merging`
     - `Require status checks to pass before merging`
   - Status checks 里至少加入：
     - `quality-gate`（来自 `ci-gate.yml`）
   - 可选再勾选：
     - `Require branches to be up to date before merging`
     - `Restrict who can push to matching branches`（仅你自己）
2. Tag 保护（保护 `v*` 发布标签）
   - 路径：`GitHub -> Settings -> Rules -> Rulesets -> New ruleset`
   - Target 选择 `Tag`
   - Pattern 填：`v*`
   - 限制创建/更新/删除 tag 的主体为你（或 maintainer 小组）
3. 仓库成员权限
   - 路径：`GitHub -> Settings -> Collaborators and teams`
   - 外部协作者默认给 `Read` 或 `Triage`，不要给 `Write`
4. Actions 权限
   - 路径：`GitHub -> Settings -> Actions -> General`
   - 保持最小权限原则，避免给不必要的 workflow 写权限
5. Workflow 触发权限（dry-run）
   - 无法看到/点击 `Run workflow`，通常是没有 `Write` 权限
   - 只有你和受信任维护者能手动触发 dry-run

---

## 8. 回滚/应急

1. 核心原则
   - 回滚不改写旧 tag，不覆盖已发版本。
   - 用“新补丁版本”修复（例如 `v1.2.3` 出问题，就发 `v1.2.4`）。
2. 标准回滚步骤（推荐）
   - 在 Releases 页面把问题版本标注为 `Known issue`（必要时临时下架说明）。
   - 从 `main` 拉 `hotfix/v1.2.4` 分支修复。
   - 本地验证：`npm run check:all`
   - 更新：
     - `package.json` -> `1.2.4`
     - `CHANGELOG.md` -> 补 `1.2.4`
   - 同步：`npm run version:sync`
   - 合并后打 tag：
     - `git tag v1.2.4`
     - `git push origin v1.2.4`
3. 若需要临时回退代码行为（但不发布）
   - 可以先 revert 某个 commit 到 `main`，再走正常 patch 发版。
4. 不建议做的事
   - 不要强推覆盖旧 tag。
   - 不要删除用户已经下载使用的版本历史记录。

---

## 9. 维护者每周固定动作（建议）

1. 清理未回复 Issue/PR（24-72h 内给首次回应）。
2. 检查是否有文档漂移（README 与行为不一致）。
3. 查看最近 CI 失败趋势，优先修“间歇性失败”。
4. 每个版本后做一次流程复盘，更新本手册。
