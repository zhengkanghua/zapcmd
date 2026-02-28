# ZapCmd 私有发版流程（当前可执行）

> 目标：你只维护一个版本源（`package.json`）+ 一个变更入口（`CHANGELOG.md`）。

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

1. 推送主分支改动：
   - `git push origin main`
2. 创建并推送版本 tag：
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
2. 读取 `.github/release-template.md` 作为发布说明模板。
3. 抽取 `CHANGELOG.md` 对应版本条目并追加到 Release 正文。
4. 构建三平台安装包并上传到 GitHub Releases。
5. 生成并上传 `SHA256SUMS` 校验文件。

## 5. 发版后确认

1. 在 GitHub Releases 确认：
   - 资产完整（Windows/macOS/Linux）
   - 有 `SHA256SUMS`
   - 正文包含模板内容 + changelog 条目
2. 抽样校验一个安装包哈希是否匹配 `SHA256SUMS`。

## 6. 回滚简版

1. 选择最近稳定 tag（例如 `v0.1.2`）。
2. 必要时将该版本重新标记为推荐下载版本。
3. 修复后发布补丁版本（例如 `v0.1.4`）。
