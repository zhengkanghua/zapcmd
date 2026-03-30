# ZapCmd

[English](./README.md) | [简体中文](./README.zh-CN.md)

[![License: MIT](https://img.shields.io/badge/license-MIT-22c55e.svg)](./LICENSE)
[![Desktop](https://img.shields.io/badge/desktop-Tauri%20%2B%20Vue-2563eb.svg)](https://tauri.app/)
[![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-475569.svg)](./README.zh-CN.md#支持矩阵-v1)

<p align="center">
  <img src="./docs/img/logo.png?raw=1" alt="ZapCmd 标志" width="160" />
</p>

ZapCmd 是一款强调速度、安全基线和可重复工作流的桌面命令启动器。

## 为什么用 ZapCmd

- 快速搜索和执行命令，减少记忆负担。
- 执行前在 UI 填参数，降低误操作。
- 支持命令暂存队列，批量在系统终端执行。
- 运行时加载内置命令和用户命令文件。
- 行为可追踪、可测试（高覆盖率 + 严格门禁）。

## 功能亮点

- 主流程：`搜索 -> 参数 -> 暂存 -> 执行`
- 设置：热键、默认终端、界面语言、更新、开机自启、关于页
- 命令管理：启停、来源文件筛选、排序、覆盖标记
- 多语言：`zh-CN` + `en-US`（运行时切换 + 持久化）
- 安全基线：高危命令确认 + 参数注入拦截
- 会话恢复：重启后恢复暂存队列

## 产品展示

标志与图标资产：`docs/img/logo.png`

## 下载

- GitHub Releases：https://github.com/zhengkanghua/zapcmd/releases
- 推送 `vX.Y.Z` 标签后，会自动生成 Windows x64 构建产物并上传到 Releases。

安装提示：

1. 下载 Windows x64 安装包。
2. 使用 `SHA256SUMS` 校验完整性（每个 Release 会附带）。
3. macOS/Linux 当前仅保留源码构建，不提供官方 GitHub Release 安装包。

## 从源码运行（开发者）

环境要求（从源码构建）：

- Node.js（npm）
- Rust 工具链
- 当前系统对应的 Tauri 依赖

本地运行：

```bash
npm install
npm run tauri:dev
```

提示：`npm run dev` 是 Web 预览模式（无法执行命令）；需要完整桌面能力请使用 `npm run tauri:dev`。

在 Windows 上，命令执行始终跟随 Settings 中选择的默认终端。
ZapCmd 主进程本身不会提权；只有命令或执行流需要管理员权限时，Windows 才会对被拉起的终端发起 UAC。
`wt` 会通过两套固定窗口 ID 复用 ZapCmd 管理的终端窗口：普通会话使用 `zapcmd-main-terminal`，管理员会话使用 `zapcmd-main-terminal-admin`。
`powershell`、`pwsh`、`cmd` 会始终新开独立控制台窗口。
执行流仍保持“一次投递”；只要队列里任一步 `adminRequired=true`，整队都会在管理员终端中运行。
该行为在 `tauri:dev` 与打包后的桌面运行中保持一致。

说明：更新密钥/端点集中在 `.env.keys`，由 `npm run keys:sync` 同步（已集成到 `tauri:dev` / `tauri:build`）。

工程门禁：

```bash
npm run check:all
```

前端 JS coverage 门禁覆盖 `src/App.vue`、`src/components/**/*.vue`、`src/composables/**/*.ts`、`src/features/**/*.ts`、`src/services/**/*.ts`、`src/stores/**/*.ts`。
Rust 验证继续独立走 `check:rust`、`cargo test` 与桌面 smoke gate，不再表述为“全仓单一覆盖率百分比”。

一键本地全量验证（同口径质量门禁 + Windows 桌面冒烟；Windows 缺失驱动会自动补装）：

```bash
npm run verify:local
```

推荐本地开发流程（贡献者 + 维护者）：

```bash
# 启用仓库 git hooks（pre-commit）
node scripts/setup-githooks.mjs

# 手动运行与 pre-commit 相同的逻辑（读取 staged 文件）
npm run precommit:guard
```

当你修改内置命令源（`docs/command_sources/_*.md`）时，需要生成并提交产物：

CI 会阻断 `assets/runtime_templates/commands/builtin` 和 `docs/builtin_commands.generated.md` 的未提交漂移。

```bash
pwsh -File scripts/generate_builtin_commands.ps1
git add assets/runtime_templates/commands/builtin docs/builtin_commands.generated.md
```

Windows 桌面端最小 E2E 冒烟（CI 同口径）：

```bash
npm run e2e:desktop:smoke
```

Windows 强制预装模式（每次都先执行驱动安装再验证）：

```bash
npm run verify:local -- --install-webdriver
```

macOS 本地桌面冒烟前置：

```bash
cargo install tauri-driver --locked
safaridriver --enable
```

说明：由于 Tauri 在 WKWebView 上的 WebDriver 支持尚不稳定，macOS 桌面冒烟保持实验性 / 非阻断，默认关闭。
若需手动试验，可执行：

```bash
npm run verify:local -- --macos-desktop-e2e-experimental
```

当前远端门禁与 `.github/workflows/ci-gate.yml` 一致：CI 中只有 Windows desktop smoke 是阻断桌面门禁；macOS/Linux 仅保留 cross-platform smoke（构建/测试）。
Release 标签沿用同一边界：Windows x64 release quality gate 包含 desktop smoke，并产出官方发布资产。

更详细说明见：`CONTRIBUTING.zh-CN.md`。

构建：

```bash
# 本地默认构建
npm run tauri:build

# 官方发布包（Windows x64）
npm run tauri:build:windows:x64
```

## 用户命令目录（`~/.zapcmd/commands`）

ZapCmd 会递归读取用户 JSON 文件：

- Windows：`%USERPROFILE%\\.zapcmd\\commands`
- macOS/Linux：`~/.zapcmd/commands`

用户命令会和内置命令合并；若 `id` 冲突，用户命令覆盖内置命令。

最小示例：

```json
{
  "commands": [
    {
      "id": "custom-hello-win",
      "name": "自定义问候",
      "tags": ["custom", "hello"],
      "category": "custom",
      "platform": "win",
      "template": "Write-Output \"hello from user commands\"",
      "adminRequired": false
    }
  ]
}
```

Schema：

- `docs/schemas/command-file.schema.json`
- `docs/schemas/README.md`

说明：

- `shell` 字段当前仅做 schema 校验，运行时会忽略（不会影响执行）。ZapCmd 会在 `设置 -> 命令管理` 显示校验提示。
- 在 Windows 上，`adminRequired=true` 表示“执行时按需拉起对应管理员终端”，并不会提升 ZapCmd 主进程权限。

## 搜索机制（当前实现）

- 不区分大小写的 contains 匹配字段：
  - `title`
  - `description`
  - `preview`
  - `folder`
  - `category`
- 输入包含空格时使用分词 AND（所有词都要命中）。
- 结果按相关性分数排序。
- 高亮为分词级别，词序无关。

## 多语言

- 支持：`zh-CN`、`en-US`
- 切换路径：`设置 -> 通用 -> 界面语言`
- 偏好保存到 `zapcmd.settings`

## 更新

- 启动自动检查更新：`设置 -> 通用 -> 自动检查更新`（成功检查后 24 小时节流；失败会在下次启动重试）。
- 手动检查/下载安装：`设置 -> 关于`。
- 更新使用 GitHub Releases 签名产物（`latest.json` + `.sig`）。

## 当前实现与 Roadmap

当前实现：

- 主窗口、设置页、命令管理完整可用
- 内置与用户命令运行时加载
- 用户命令在应用启动时加载（修改后需重启）
- 安全基线与队列会话恢复

Roadmap：

- 高级安全治理（策略/白名单/团队规则）
- 更完整的桌面壳层 E2E 自动化（跨平台 + 更多流程）

## 支持矩阵（v1）

1. Windows x64：官方发布并支持
2. macOS arm64（Apple Silicon）：仅支持源码构建，不提供官方 GitHub Release 安装包
3. Linux x64：仅支持源码构建，不提供官方 GitHub Release 安装包
4. 其他架构：当前版本不保证

## 已知限制

1. 当前 GitHub Release 仅提供 Windows x64 官方安装包。
2. 用户命令 JSON 修改后需重启应用生效。
3. 当前桌面端 E2E 阻断门禁仅覆盖 Windows。

## 提交问题与参与贡献

Issue 入口：

- 打开：https://github.com/zhengkanghua/zapcmd/issues/new/choose
- 选择对应模板：
  - `Bug Report`
  - `Feature Request`
  - `Usage Question`

PR 流程：

1. Fork 仓库并创建分支。
2. 做小步且可验证的改动，并本地执行 `npm run check:all`。
3. 提交 PR，并填写 `.github/pull_request_template.md`。

完整贡献指南：

- `CONTRIBUTING.zh-CN.md`

审核与合并规则：

- 外部改动统一通过 PR 审核后合并。
- 是否接受与何时合并由维护者决定。

## 发布权限说明

- 社区贡献者通过 PR 提交改动，不直接发布版本。

## 文档导航

- 文档入口：`docs/README.md`
- 内置命令维护说明：`docs/command_sources/README.md`
- 运行时模板资产说明：`assets/runtime_templates/README.md`
- 命令文件 Schema：`docs/schemas/README.md`
- GitHub 自动化说明：`.github/workflows/ci-gate.yml`
- 仅仓库维护者（具备写入/发布权限）应推送 `v*.*.*` 标签。
- 推送 `vX.Y.Z` 标签后，会触发 Windows x64 构建并发布 GitHub Release。

## 文档

公开文档入口：

- `docs/README.md`

开源治理文件：

- `LICENSE`
- `CHANGELOG.md`
- `CONTRIBUTING.zh-CN.md`
- `CODE_OF_CONDUCT.zh-CN.md`
- `SECURITY.zh-CN.md`
- `SUPPORT.zh-CN.md`
