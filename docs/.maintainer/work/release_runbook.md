# ZapCmd 维护者发版跑书（Windows x64 官方发布）

> 目标：保持“Windows x64 自动化阻断 + 官方发布口径收敛”。
> 口径：官方 GitHub Release 仅发布 Windows x64 资产。

## 0. 文档分层（避免重复）

1. 贡献者共用流程：`CONTRIBUTING.md` / `CONTRIBUTING.zh-CN.md`
2. 维护者发版细节：本文件
3. CI/CD 设置核对：`docs/.maintainer/work/ci_cd_verification.md`

## 1. 当前门禁策略（项目现状）

### 1.1 CI Gate（PR / push main）

1. Windows `quality-gate`：`npm run check:all`
2. Windows `desktop-e2e-smoke`：`npm run e2e:desktop:smoke`
3. `cross-platform-smoke`（macOS + Linux）：`typecheck + test + build + rust test`

### 1.2 Release Build（push tag `v*.*.*`）

1. 先跑 Windows `quality-gate + desktop smoke`
2. 再构建 Windows x64 安装包
3. 自动发布 GitHub Release（包含 `SHA256SUMS`）

## 2. 日常开发节奏（维护者）

1. 从 `main` 拉分支开发：
   - `git fetch origin`
   - `git switch main`
   - `git pull --rebase origin main`
   - `git switch -c feat/<topic>`
2. 本地增量检查：`npm run precommit:guard`
3. 提交前全量检查（Windows 主力机）：`npm run verify:local`
4. 提 PR 到 `main`，等待 `CI Gate` 全绿后合并

## 3. 发版节奏（推荐）

### 3.1 准备发版 PR（main 前置）

1. 更新版本与变更：
   - `package.json`（唯一版本源）
   - `CHANGELOG.md`（必须有 `## [X.Y.Z] - YYYY-MM-DD`）
2. 如有用户可见变化，同步：
   - `README.md`
   - `README.zh-CN.md`
3. 在 Windows 跑：
   - `npm run verify:local`
4. 提交 release PR 并合并到 `main`

### 3.2 发布前预演（可选）

1. 在 GitHub Actions 手动运行 `Release Dry Run Build (Windows x64)`
2. 下载 Windows x64 构建产物（`.msi` / `.exe`）
3. 在 Windows 主力机执行最小人工确认：
   - 应用可启动
   - 搜索输入有结果
   - Esc 可关闭抽屉/恢复基础状态
   - 执行 1~2 条基础命令确认终端链路

### 3.3 正式发布（打 tag）

1. 确认 `main` 已是待发布提交：
   - `git switch main`
   - `git pull --rebase origin main`
2. 推送主分支：
   - `git push origin main`
3. 创建并推送 tag：
   - `git tag -a vX.Y.Z -m "vX.Y.Z"`
   - `git push origin vX.Y.Z`

> 注意：当前 workflow 是“tag 即正式发布”，不是 Draft Release。

### 3.4 发版后确认

1. `Release Build (Windows x64)` 全部成功
2. GitHub Release 资产完整（Windows x64）
3. `SHA256SUMS` 存在且可校验
4. Release 正文与 `CHANGELOG` 版本一致

## 4. 常用命令速查（维护者）

1. 全量质量门禁：`npm run check:all`
2. 本地发布前门禁（Windows）：`npm run verify:local`
3. 手动触发构建验收：GitHub Actions → `Release Dry Run Build (Windows x64)`

## 5. 如果未来要改成 Draft Release

若后续想采用“先自动发布 Draft，再人工点击 Publish”模式，可在 `release-build.yml` 的发布步骤增加 `draft: true`。当前仓库尚未启用该模式。
