# Phase 01 Runbook：本地门禁 + Windows 桌面端最小 E2E

**适用范围：** Phase 1（回归链路与最小桌面 E2E 基线）相关改动后的验证与日常操作  
**更新时间：** 2026-03-03  

## 0. 你关心的问题：`commit` / `push` / `PR` 分别会触发什么？

先说结论：**只要 Git Hooks 已启用，`git commit` 就会触发本地门禁（pre-commit）。**  
`git push` 本身不会在你本机“自动跑测试”；远端 CI 是否跑取决于 GitHub Actions 的触发条件（本仓库为 PR / main / tag）。

| 你做的动作 | 本地 pre-commit（在你电脑上） | CI Gate（GitHub Actions） | Release Build（GitHub Actions） |
|---|---|---|---|
| `git commit` | ✅ 会触发（前提：已设置 `core.hooksPath=.githooks`） | ❌ 不会 | ❌ 不会 |
| `git commit --no-verify` | ❌ 不会（被你显式跳过） | ❌ 不会 | ❌ 不会 |
| `git push` 到你自己的分支 | ✅/❌（取决于你 commit 时是否触发过 hooks；push 不会额外触发本地门禁） | ✅ 仅当你开 PR（触发 `pull_request`） | ❌ 不会 |
| `git push` 到 `main` | ✅/❌ 同上 | ✅ 会触发（workflow `push` 到 `main`） | ❌ 不会 |
| `git push` 一个 `vX.Y.Z` tag | ✅/❌ 同上 | ❌ 不会 | ✅ 会触发（workflow `push.tags: v*.*.*`） |

> 建议：通过 **PR 合并**进入 `main`，并在 GitHub 侧开启 branch protection 强制 CI 绿灯（见临时配置文档）。

## 0.1 常用命令速查（复制即用）

| 你想做什么 | 命令 |
|---|---|
| 安装依赖（会尝试自动启用 git hooks） | `npm install` |
| 启用 git hooks（推荐显式执行一次） | `node scripts/setup-githooks.mjs` |
| 查看 hooks 是否已启用 | `git config core.hooksPath` |
| 手动跑 pre-commit 同口径逻辑（读取 staged 文件） | `npm run precommit:guard` |
| 跑“合并前全量门禁”（与 CI 合并门禁同口径） | `npm run check:all` |
| 只跑覆盖率 | `npm run test:coverage` |
| 修改内置命令源后生成并检查差异 | `pwsh -File scripts/generate_builtin_commands.ps1` |
| Windows 桌面端最小 E2E 冒烟（CI 同口径） | `npm run e2e:desktop:smoke` |

> 说明：`npm install` 会运行 `package.json#prepare`，尝试自动执行 `scripts/setup-githooks.mjs`。如果你使用了 `npm install --ignore-scripts`，需要手动执行一次上面的 hooks 安装命令。

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

### 1.3 如果你想关闭 Git hooks（不推荐）

说明：本仓库的 hooks 依赖 `core.hooksPath=.githooks`。关闭后 `git commit` 将不再自动运行本地门禁（你仍可手动跑 `npm run precommit:guard` / `npm run check:all`）。

1) 先看当前 hooksPath 来自哪里（建议）：

`git config --show-origin --get core.hooksPath`

2) 仅对“当前仓库”关闭（最常见）：

`git config --unset core.hooksPath`

3) 如果你发现是全局配置导致（输出里有 `--global` 的配置文件路径），则关闭全局：

`git config --global --unset core.hooksPath`

4) 验证关闭成功（期望无输出）：

`git config --get core.hooksPath`

> 注意：`npm install` 会运行 `package.json#prepare`，其中会执行 `scripts/setup-githooks.mjs` 尝试重新启用 hooks。你如果要“长期保持关闭”，需要接受每次 `npm install` 后重新关闭，或使用 `npm install --ignore-scripts`（不推荐常态使用）。

### 1.4 如果你发现 `git commit` 没有触发门禁，如何排查？

1) 先确认 hooksPath 是否已生效：

`git config core.hooksPath`

必须是：

`.githooks`

2) 确认 hook 文件存在：

`.githooks/pre-commit`

3) 确认你没有使用跳过参数（最常见）：

- 命令行：`git commit --no-verify`
- 某些 GUI 客户端可能提供“跳过钩子/跳过校验”的选项

4) 直接手动跑一次（排除 hook 没安装的情况）：

`npm run precommit:guard`

如果这条命令能正常执行，说明脚本本身没问题，问题通常在 hooksPath/提交方式。

## 2. 本地 pre-commit 门禁（双通道）怎么工作

入口：

`.githooks/pre-commit` → `npm run precommit:guard` → `scripts/precommit-guard.mjs`

### 2.0 手动触发（不想 commit 也能先跑一遍）

你可以直接运行：

`npm run precommit:guard`

这会读取 **当前 staged 的文件** 并执行同一套逻辑（等价于 pre-commit hook）。

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

### 2.3 我想“手动跑全量门禁”，应该用哪个命令？

全量门禁（CI 与维护者合并前的同口径）：

`npm run check:all`

其中包含：
- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:test`
- `npm run test:coverage`
- `npm run build`
- `npm run check:rust`

如果你只想跑覆盖率门禁：

`npm run test:coverage`

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

### 4.0 手动触发（CI 也会跑的同一条命令）

`npm run e2e:desktop:smoke`

> 说明：该脚本 **仅支持 Windows**。在非 Windows 平台会直接以非 0 退出（避免把 skip 当 pass）。

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

#### 5.1.1 常见误解：为什么“push 到分支”看不到 CI？

本仓库 `ci-gate.yml` 的触发条件是：
- `pull_request` → 只要你开 PR，就会跑
- `push` 但仅限 `main` 分支

因此：
- 你 push 到 feature 分支：**不会自动跑 CI**（除非你开 PR）
- 你开 PR：**会跑 CI**
 - 维护者如果想“不走 PR 也先跑一遍”：可以在 `Actions` 里手动 `Run workflow`（需要写权限）

### 5.2 Release Build（Tag）

工作流：`.github/workflows/release-build.yml`

Windows `quality-gate` 在 `npm run check:all` 后追加运行 `npm run e2e:desktop:smoke`；失败会阻断后续 `bundle/publish-release`。
