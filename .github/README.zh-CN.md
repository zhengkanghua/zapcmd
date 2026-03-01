# GitHub 自动化与协作模板

[English](./README.md) | [简体中文](./README.zh-CN.md)

本目录用于存放 GitHub 相关的协作文件与自动化配置（Actions、Issue/PR 模板、Dependabot 等）。

## 内容清单

- `ISSUE_TEMPLATE/`：Issue 表单（Bug / Feature / Question）
- `pull_request_template.md`：PR 提交清单模板
- `workflows/`：GitHub Actions 工作流
- `dependabot.yml`：Dependabot 依赖更新规则

## 工作流说明

### CI Gate（`workflows/ci-gate.yml`）

触发：`push(main)` + `pull_request(main)`。

做什么：

- Windows 任务跑 `npm run check:all`（lint → typecheck → tests → build → rust check）
- macOS/Linux 任务跑跨平台烟测门禁（`typecheck`、测试、构建）

### CodeQL（`workflows/codeql.yml`）

触发：`push(main)` + 每周 `schedule`。

说明：

- 仅在仓库为 public 时运行。
- 本仓库采用 **Advanced** CodeQL workflow；如果你在 GitHub 设置中开启了 Code scanning 的 **Default setup**，
  会与该 workflow 冲突，导致上传扫描结果失败（两者不可同时启用）。

结果查看：

- GitHub → `Security` → `Code scanning`（告警/覆盖率/状态页）

### Release Build Matrix（`workflows/release-build.yml`）

触发：推送版本 tag：`vX.Y.Z`。

做什么：

- 校验：`tag 版本 == package.json 版本`
- Windows/macOS/Linux 三平台构建安装包
- 自动发布 GitHub Release，并附带产物与 `SHA256SUMS`
- Release 正文直接使用 `CHANGELOG.md` 中对应版本条目

所需 Secrets（用于签名）：

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

### Release Dry Run Build（`workflows/release-dry-run.yml`）

触发：手动运行（`workflow_dispatch`）。

做什么：

- 构建指定平台的安装包并上传 artifacts（不会发布 GitHub Release）
