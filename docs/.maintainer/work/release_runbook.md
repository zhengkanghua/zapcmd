# ZapCmd 发版流程（main + tags）

> 目标：你只维护一个版本源（`package.json`）+ 一个变更入口（`CHANGELOG.md`）。

## TL;DR（最短发版命令流程）

1) 在一个 release 分支完成版本变更并走完门禁：
- `git checkout -b release/vX.Y.Z`
- 修改：`package.json`、`CHANGELOG.md`（以及必要的 `README*`）
- `npm install`
- `npm run check:all`
- `git add -A`
- `git commit -m "release: vX.Y.Z"`
- `git push -u origin release/vX.Y.Z`
- 开 PR 合并到 `main`（Required checks 全绿）

2) 合并后基于最新 `main` 打 tag 并推送（触发正式发版）：
- `git checkout main`
- `git pull --rebase`
- `git tag vX.Y.Z`
- `git push origin vX.Y.Z`

3) 观察 GitHub Actions：
- `Actions` → `Release Build Matrix` 运行成功
- `Releases` 出现对应版本资产 + `SHA256SUMS`

> 说明：如果你开启了 `main` 分支保护（推荐），通常不能直接 push 到 `main`，上述流程天然适配（release 分支 → PR 合并 → main 打 tag）。

## 0. 分支约定（推荐）

1. `main`：默认开发分支，所有贡献通过 PR 合并到 `main`。
2. 发布以 tag 为准：`vX.Y.Z` 指向的提交即为已发布版本；`main` 可能包含未发布提交。
3. 推荐开启主分支保护（Branch protection / Rulesets）：
   - Require PR
   - Required status checks（至少 `CI Gate`）
   - 禁止 force-push / 删除分支

## 0.1 仓库设置（一次性）

1. 确认默认分支为 `main`。
2. GitHub Actions 已启用（Settings → Actions）。
3. 分支保护（Branch protection / Rulesets）建议对 `main` 启用：
   - Require PR + Required status checks（至少 `CI Gate`）
   - Restrict who can push（仅维护者，可选）

## 0.2 CodeQL 设置（避免冲突）

如果你使用仓库内的 `.github/workflows/codeql.yml`（Advanced configuration），请确保在 GitHub 的 Code scanning 设置中 **关闭 Default setup**，否则会出现：

> `CodeQL analyses from advanced configurations cannot be processed when the default setup is enabled`

处理方式（二选一）：
1. 保留 Advanced：关闭 Default setup（推荐，触发规则可控）。
2. 使用 Default setup：删除/禁用仓库内的 CodeQL workflow。

自动化检测确认清单：`docs/.maintainer/work/ci_cd_verification.md`

## 1. 发版前准备

1. 在 `package.json` 更新版本号（例如 `0.1.3`）。
2. 在 `CHANGELOG.md` 新增同版本条目：
   - 标题必须是：`## [0.1.3] - YYYY-MM-DD`
   - 内容建议按双语写法：`中文 / English`
3. 同步用户入口文档（如有用户可见变更）：
   - `README.md`
   - `README.zh-CN.md`

## 2. 本地校验

1. 执行：`npm run check:all`
2. 需要桌面验证时执行：
   - `npm run tauri:build`（本地 Windows MSI）
3. 发布候选手工回归：
   - `docs/.maintainer/work/manual_regression_m0_m0a.md`
   - `docs/.maintainer/work/manual_regression_m4_release.md`

## 3. 正式发版（手动打 Tag）

1. 确认本轮改动已合并到 `main`（PR 已通过 `CI Gate` 并合并）。
2. 推送主分支改动：
   - `git push origin main`
3. 在 `main` 上创建并推送版本 tag：
   - `git tag v0.1.3`
   - `git push origin v0.1.3`

也可用 PowerShell 自动读取版本创建 tag：

```powershell
$ver = (Get-Content package.json -Raw | ConvertFrom-Json).version
git tag "v$ver"
git push origin "v$ver"
```

## 4. 工作流自动做什么

触发 `.github/workflows/release-build.yml` 后，自动执行：

1. 校验 `tag 版本 == package.json 版本`（不一致直接失败）。
2. 抽取 `CHANGELOG.md` 对应版本条目作为 Release 正文。
3. 构建三平台安装包并上传到 GitHub Releases。
4. 生成并上传 `SHA256SUMS` 校验文件。

## 5. 发版后确认

1. 在 GitHub Releases 确认：
   - 资产完整（Windows/macOS/Linux）
   - 有 `SHA256SUMS`
   - 正文包含对应版本的 changelog 条目
2. 抽样校验一个安装包哈希是否匹配 `SHA256SUMS`。

## 6. 回滚简版

1. 选择最近稳定 tag（例如 `v0.1.2`）。
2. 必要时将该版本重新标记为推荐下载版本。
3. 修复后发布补丁版本（例如 `v0.1.4`）。
