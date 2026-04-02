# 参与贡献（Contributing）

感谢你愿意参与 ZapCmd 的改进。本文件面向贡献者，说明如何在本地与 CI 门禁下提交可验证的改动。

## 0. TL;DR（最短路径）

1) 安装依赖并启动开发：

`npm install`

`npm run tauri:dev`

2) 启用本仓库 Git Hooks（强烈建议）：

`node scripts/setup-githooks.mjs`

3) 提交前跑一遍全量门禁：

`npm run check:all`

4) 开 PR，让 GitHub Actions 跑完 `CI Gate`（Windows + macOS + Linux）。

## 0.2 日常开发节奏（贡献者共用）

1) 从 `main` 拉功能分支，小步提交：

`git switch -c feat/<topic>`

2) 提交前先跑本地增量门禁：

`npm run precommit:guard`

3) 提 PR 前跑一键全量验证：

`npm run verify:local`

说明：
- Windows：默认执行质量门禁 + 阻断级桌面冒烟（缺驱动会自动补装）。
- macOS：默认只跑质量门禁；桌面冒烟保持实验性 / 非阻断（`--macos-desktop-e2e-experimental`）。

4) 开 PR 到 `main`，等待 `CI Gate` 全绿后再合并。


---

## 0.1 常用命令速查

| 你想做什么 | 命令 |
|---|---|
| 安装依赖 | `npm install` |
| 启用 git hooks（推荐显式执行一次） | `node scripts/setup-githooks.mjs` |
| 查看 hooks 是否已启用 | `git config core.hooksPath` |
| 手动跑 pre-commit 同口径逻辑（读取 staged 文件） | `npm run precommit:guard` |
| 合并前全量门禁（与 CI 同口径） | `npm run check:all` |
| 一键本地全量验证（质量门禁 + Windows 桌面冒烟；Windows 缺失驱动会自动补装） | `npm run verify:local` |
| 开发启动桌面应用 | `npm run tauri:dev` |
| 仅跑测试（不带覆盖率） | `npm run test:run` |
| 跑覆盖率（门禁同口径） | `npm run test:coverage` |
| 修改内置命令源后生成并检查差异 | `pwsh -File scripts/generate_builtin_commands.ps1` |
| Windows 桌面端最小 E2E 冒烟（CI 同口径） | `npm run e2e:desktop:smoke` |

> 提示：`npm install` 会运行 `package.json#prepare`，尝试自动启用 hooks；如果你使用了 `--ignore-scripts`，需要手动运行 `node scripts/setup-githooks.mjs`。

## 1. 本地门禁：pre-commit（提交时触发）

### 1.1 pre-commit 会在什么时候触发？

只要你的 git 已配置：

`git config core.hooksPath`（非空）

那么每次 `git commit` 都会触发：

- Windows：`.githooks/windows/pre-commit` → `npm run precommit:guard` → `scripts/precommit-guard.mjs`
- macOS/Linux：`.githooks/posix/pre-commit` → `npm run precommit:guard` → `scripts/precommit-guard.mjs`

> 你也可以手动跑（不 commit 也能先验证）：`npm run precommit:guard`  
> 注意：`git commit --no-verify` 会跳过所有 hooks（不建议在 PR 中使用）。

如果你想在本机关闭 hooks（不推荐）：

`git config --unset core.hooksPath`

验证是否关闭（期望无输出）：

`git config --get core.hooksPath`

### 1.2 pre-commit 做了什么（双通道）

它读取 **当前 staged 文件**，按规则走两条通道：

1) **纯文档/说明类改动：直通**（不跑任何门禁命令）
2) **功能/行为改动：快路径**（lint/typecheck/related/typecheck:test/cargo check 等）  
   并在命中触发条件时 **追加** `npm run test:coverage`

触发 `test:coverage` 时会输出：
- 触发原因
- 命中文件
- 将运行的命令清单

---

## 2. 全量门禁：`npm run check:all`（与 CI 合并门禁同口径）

无论你是否启用 hooks，建议在提交 PR 前运行：

`npm run check:all`

该命令包含 `npm run test:coverage`、`npm run build`、`npm run check:rust` 等关键步骤，是“合并前最权威”的本地验证方式。

### 2.1 覆盖率失败时怎么定位（`npm run test:coverage` 输出说明）

本仓库的 `test:coverage` 是一个 wrapper（见：`scripts/coverage/run-test-coverage.mjs`），它会：

1) 先运行 `vitest run --coverage`  
2) **无论成功/失败**，都会尝试输出覆盖率诊断信息（见：`scripts/coverage/coverage-report.mjs`）

你会在日志里看到三段关键输出：

- **覆盖率总览（All files）**：Statements / Branches / Functions / Lines 当前值 vs 门槛（当前门槛是 90%）
- **Top 缺失分支 / Top 缺失行**：按缺口从大到小列出最薄弱文件（优先补这些文件的测试）
- **HTML 报告入口**：`coverage/index.html`（需要更细粒度定位时打开）

如果你看到“未找到 coverage 输出”，通常意味着测试过程提前失败导致没有生成 `coverage/` 产物；先修复测试错误后再重跑即可。

### 2.2 如何清理本地日志/产物遗留（coverage / .tmp / dist / target）

原则：
- **控制台日志**不会自动落盘（除非你手动重定向输出），一般不需要“清理日志文件”。
- 需要清理的通常是**本地构建/测试产物目录**，它们都已在 `.gitignore` 中忽略，不会被提交到仓库。

常见产物目录：
- 覆盖率报告：`coverage/`（HTML 入口：`coverage/index.html`）
- E2E 冒烟产物：`.tmp/e2e/desktop-smoke/`（日志/截图等）
- 前端构建产物：`dist/`
- Rust 构建缓存：`src-tauri/target/`（或任意 `target/`）

清理命令（PowerShell，Windows）：

`Remove-Item -Recurse -Force coverage,.tmp,dist -ErrorAction SilentlyContinue`

（可选）清理 Rust 构建缓存：

`Remove-Item -Recurse -Force src-tauri/target -ErrorAction SilentlyContinue`

清理命令（macOS/Linux）：

`rm -rf coverage .tmp dist`

（可选）`rm -rf src-tauri/target`

进阶（谨慎使用）：如果你想“一次性清掉所有未跟踪文件（含被忽略的 node_modules 等）”，可以先 dry-run：

`git clean -fdxn`

确认无误后再执行：

`git clean -fdx`

---

## 3. 内置命令目录变更（重要：需要生成并提交产物）

### 3.1 哪些文件属于“内置命令真源”？

- `commands/catalog/_*.yaml`
- `scripts/generate_builtin_commands.ps1`
- `scripts/commands/generate-builtin-commands.mjs`

### 3.2 你需要做什么？

当你修改了内置命令真源后，必须运行生成并提交产物：

1) 运行生成（PowerShell）：

`pwsh -File scripts/generate_builtin_commands.ps1`

2) 提交生成产物：

`git add commands/catalog assets/runtime_templates/commands/builtin docs/generated_commands`

> 本地 pre-commit 只会提示，不会阻断；但 GitHub Actions 的 Windows `quality-gate` 会阻断未提交的生成差异。

---

## 4. Windows 桌面端最小 E2E（CI 会跑）

CI/Release 会运行：

`npm run e2e:desktop:smoke`

该用例覆盖：启动 → 搜索输入 → 结果抽屉出现/关闭。失败会产出 `.tmp/e2e/desktop-smoke/`（日志/截图）并以非 0 退出码失败。

### 4.1 本地运行所需依赖（Windows）

Windows 前置：

`cargo install tauri-driver --locked`

`pwsh -File scripts/e2e/install-msedgedriver.ps1`

也可以直接用一键验证脚本（会先跑 `check:all`，再在 Windows 跑桌面冒烟）：

`npm run verify:local`

在 Windows 上，该命令会自动检测 `tauri-driver` / `msedgedriver`，缺失时先补装再继续。  
在 macOS 上，该命令默认仅跑质量门禁（`check:all`），桌面冒烟保持实验性 / 非阻断，默认关闭。

如果你希望每次都先执行 Windows 驱动安装流程，可使用：

`npm run verify:local -- --install-webdriver`

如果你要手动探测 macOS 桌面冒烟（实验性）：

`npm run verify:local -- --macos-desktop-e2e-experimental`

### 4.2 常用环境变量

- `ZAPCMD_E2E_APP_PATH`：指定已构建的 `zapcmd.exe` 路径
- `ZAPCMD_E2E_QUERY`：指定搜索关键词

### 4.3 触发与权限矩阵（commit / push / tag / 手动工作流）

1) 本地 `commit`（已启用 hooks）：会触发 pre-commit hook -> `npm run precommit:guard`（增量本地门禁）。
   - Windows：`.githooks/windows/pre-commit`
   - macOS/Linux：`.githooks/posix/pre-commit`

2) 本地一键全量验证：执行 `npm run verify:local`（全量门禁 + Windows 桌面冒烟；Windows 缺驱动会自动补装）。

3) push / PR 到上游仓库：
- push 到 `main` 或 PR 目标为 `main` 时，触发 `CI Gate`。
- 仅 push 到上游 feature 分支通常不会触发 `CI Gate`，除非已创建到 `main` 的 PR。
- `CI Gate` 当前包含：Windows 质量门禁、Windows 桌面冒烟，以及 cross-platform smoke（macOS/Linux 的构建与测试门禁）。

4) push `v*.*.*` tag：触发发布构建与发布流程。
- 发布流程沿用同一边界：Windows release quality gate 包含 desktop smoke；macOS 只参与多平台 bundle 构建。

5) GitHub 手动工作流（`workflow_dispatch`）权限：
- 在上游仓库中，通常只有具备写权限（write）的成员可以手动触发。
- 外部贡献者（无写权限）通常不能触发上游手动工作流。
- 贡献者可以在自己的 fork 上手动触发（前提是 fork 中启用了对应 workflow）。

---

## 5. CI 什么时候会跑？

本仓库 `CI Gate` 的触发条件是：
- 你开 PR → 自动跑（`pull_request`）
- push 到 `main` → 会跑（`push.branches: main`，但维护者通常会用 PR 合并并配合 branch protection）

因此：
- 你 push 到自己的 feature 分支：通常 **不会** 自动跑 CI（除非你同时开了 PR）

---

## 6. main 分支保护开启时怎么做 PR？我还能在本地 main 开发吗？

结论：
- 分支保护（Branch protection / Rulesets）只影响远端的 `origin/main`，**不会**禁止你在本地 checkout `main`、甚至在本地 `main` 上提交。
- 但为了减少误操作，推荐把本地 `main` 当成“只同步不开发”的基线：只用来跟随 `origin/main`，真正开发在 feature 分支完成。

推荐流程（维护者/贡献者通用）：

1) 同步本地 `main`：

`git fetch origin`

`git switch main`

`git pull --rebase origin main`

2) 从 `main` 拉一个分支开发：

`git switch -c feat/<topic>`

3) 正常开发与提交：

`git add -A`

`git commit -m "feat: <msg>"`

4) 推送分支并开 PR：

`git push -u origin feat/<topic>`

然后在 GitHub 上创建 PR（目标分支 `main`），等待 `CI Gate` 全绿后合并。

如果你已经在本地 `main` 上写了几次 commit（还没 push）：

1) 先把当前提交“收进”一个分支：

`git switch -c feat/<topic>`

`git push -u origin feat/<topic>`

2)（可选）把本地 `main` 复位回远端 `main`（会丢弃本地 main 上的提交，所以务必确认这些提交已经在分支上）：

`git switch main`

`git fetch origin`

`git reset --hard origin/main`

---

## 7. PR 提交建议

- 尽量小步改动（便于 review 与回滚）
- PR 前运行 `npm run check:all`
- 修改内置命令源时务必提交生成产物（否则 CI 会失败）
- 避免使用 `git commit --no-verify` 绕过本地门禁（CI 仍会阻断）
