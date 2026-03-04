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

---

## 0.1 常用命令速查

| 你想做什么 | 命令 |
|---|---|
| 安装依赖 | `npm install` |
| 启用 git hooks（推荐显式执行一次） | `node scripts/setup-githooks.mjs` |
| 查看 hooks 是否已启用 | `git config core.hooksPath` |
| 手动跑 pre-commit 同口径逻辑（读取 staged 文件） | `npm run precommit:guard` |
| 合并前全量门禁（与 CI 同口径） | `npm run check:all` |
| 开发启动桌面应用 | `npm run tauri:dev` |
| 仅跑测试（不带覆盖率） | `npm run test:run` |
| 跑覆盖率（门禁同口径） | `npm run test:coverage` |
| 修改内置命令源后生成并检查差异 | `pwsh -File scripts/generate_builtin_commands.ps1` |
| Windows 桌面端最小 E2E 冒烟（CI 同口径） | `npm run e2e:desktop:smoke` |

> 提示：`npm install` 会运行 `package.json#prepare`，尝试自动启用 hooks；如果你使用了 `--ignore-scripts`，需要手动运行 `node scripts/setup-githooks.mjs`。

## 1. 本地门禁：pre-commit（提交时触发）

### 1.1 pre-commit 会在什么时候触发？

只要你的 git 已配置：

`git config core.hooksPath .githooks`

那么每次 `git commit` 都会触发：

`.githooks/pre-commit` → `npm run precommit:guard` → `scripts/precommit-guard.mjs`

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

---

## 3. 内置命令源变更（重要：需要生成并提交产物）

### 3.1 哪些文件属于“内置命令源”？

- `docs/command_sources/_*.md`
- `scripts/generate_builtin_commands.ps1`

### 3.2 你需要做什么？

当你修改了内置命令源文件后，必须运行生成并提交产物：

1) 运行生成（PowerShell）：

`pwsh -File scripts/generate_builtin_commands.ps1`

2) 提交生成产物：

`git add assets/runtime_templates/commands/builtin docs/builtin_commands.generated.md`

> 本地 pre-commit 只会提示，不会阻断；但 GitHub Actions 的 Windows `quality-gate` 会阻断未提交的生成差异。

---

## 4. Windows 桌面端最小 E2E（CI 会跑，建议 Windows 贡献者本地可选跑）

CI/Release 会运行：

`npm run e2e:desktop:smoke`

该用例覆盖：启动 → 搜索输入 → 结果抽屉出现/关闭。失败会产出 `.tmp/e2e/desktop-smoke/`（日志/截图）并以非 0 退出码失败。

### 4.1 本地运行所需依赖（仅 Windows）

`cargo install tauri-driver --locked`

`cargo install msedgedriver-tool --locked`

`msedgedriver-tool install`

### 4.2 常用环境变量

- `ZAPCMD_E2E_APP_PATH`：指定已构建的 `zapcmd.exe` 路径
- `ZAPCMD_E2E_QUERY`：指定搜索关键词

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
