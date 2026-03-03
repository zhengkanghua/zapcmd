# Phase 01 Runbook：本地门禁 + Windows 桌面端最小 E2E

**适用范围：** Phase 1（回归链路与最小桌面 E2E 基线）相关改动后的验证与日常操作  
**更新时间：** 2026-03-03  

## 1. Git Hooks（pre-commit）启用确认

本仓库的 pre-commit hook 位于 `.githooks/`，需要确保 git 配置已指向该目录。

### 1.1 检查当前 hooksPath

运行：

`git config core.hooksPath`

期望输出：

`.githooks`

### 1.2 如果未设置，执行一次安装

任选其一：

1) 直接设置：

`git config core.hooksPath .githooks`

2) 运行仓库脚本（会自动设置）：

`node scripts/setup-githooks.mjs`

## 2. 本地 pre-commit 门禁（双通道）怎么工作

入口：

`.githooks/pre-commit` → `npm run precommit:guard` → `scripts/precommit-guard.mjs`

### 2.1 纯文档改动：直通（不跑门禁）

当 staged 变更全部为“文档/说明类”时，pre-commit 会直接退出 0，不运行 lint/typecheck/测试。

建议快速自验：
1) 只改 `README.md` 并 stage  
2) 运行 `npm run precommit:guard`  
3) 期望：提示“仅文档/说明类改动：跳过本地门禁检查。”并退出 0

### 2.2 功能/行为改动：快路径 + 条件触发 coverage

默认会运行快路径（lint/typecheck/related/typecheck:test/cargo check 等），当命中触发规则时追加运行：

`npm run test:coverage`

触发时会打印：触发原因、命中文件、将运行的命令清单。

## 3. 内置命令源变更：本地提示 + CI 阻断

### 3.1 什么时候算“内置命令源变更”

- `docs/command_sources/_*.md`
- `scripts/generate_builtin_commands.ps1`

### 3.2 你需要做什么（本地）

当你修改上述文件之一时：

1) 运行生成脚本（Windows）：

`pwsh -File scripts/generate_builtin_commands.ps1`

2) 添加并提交生成产物：

`git add assets/runtime_templates/commands/builtin docs/builtin_commands.generated.md`

> 注意：本地 pre-commit 只提示，不阻断；但 CI（Windows Gate）会在 `check:all` 前执行生成并 `git diff --exit-code`，若产物不同步提交会直接失败。

## 4. Windows 桌面端最小 E2E 冒烟（本机）

### 4.1 依赖安装（仅 Windows）

1) 安装 WebDriver 依赖（Rust 安装）：

`cargo install tauri-driver --locked`

2) 安装 Edge WebDriver：

`cargo install msedgedriver-tool --locked`

`msedgedriver-tool install`

### 4.2 执行 E2E

执行：

`npm run e2e:desktop:smoke`

该用例覆盖：启动 → 搜索输入 → 抽屉出现/关闭。失败会以非 0 退出码返回（用于 CI/Release 阻断）。

### 4.3 失败产物位置

失败或成功都会在以下目录写入日志/截图（CI 也会上传该目录为 artifact）：

`.tmp/e2e/desktop-smoke/`

常见文件：
- `e2e.log`
- `tauri-driver.log`
- `screenshot.png`（仅失败时尝试写入）

### 4.4 常用环境变量

- `ZAPCMD_E2E_APP_PATH`：指定已构建的 `zapcmd.exe` 路径（避免每次都 build）
- `ZAPCMD_E2E_QUERY`：指定搜索关键词（默认 `git`）

## 5. GitHub Actions（CI/Release）验证建议

### 5.1 CI Gate（PR/Push）

工作流：`.github/workflows/ci-gate.yml`

- `quality-gate`（Windows）：会在 `npm run check:all` 前做“内置命令生成一致性”阻断检查
- `desktop-e2e-smoke`（Windows）：运行 `npm run e2e:desktop:smoke` 并上传 `.tmp/e2e/desktop-smoke/`

建议验证方式：
1) 在 PR 中只改 `docs/command_sources/_git.md`，不提交生成产物：应被 Windows `quality-gate` 阻断  
2) 修复后再次 push：应通过

### 5.2 Release Build（Tag）

工作流：`.github/workflows/release-build.yml`

Windows `quality-gate` 在 `npm run check:all` 后追加运行 `npm run e2e:desktop:smoke`；失败会阻断后续 `bundle/publish-release`。

