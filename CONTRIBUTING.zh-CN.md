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

## 1. 本地门禁：pre-commit（提交时触发）

### 1.1 pre-commit 会在什么时候触发？

只要你的 git 已配置：

`git config core.hooksPath .githooks`

那么每次 `git commit` 都会触发：

`.githooks/pre-commit` → `npm run precommit:guard` → `scripts/precommit-guard.mjs`

> 你也可以手动跑（不 commit 也能先验证）：`npm run precommit:guard`  
> 注意：`git commit --no-verify` 会跳过所有 hooks（不建议在 PR 中使用）。

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

## 6. PR 提交建议

- 尽量小步改动（便于 review 与回滚）
- PR 前运行 `npm run check:all`
- 修改内置命令源时务必提交生成产物（否则 CI 会失败）
- 避免使用 `git commit --no-verify` 绕过本地门禁（CI 仍会阻断）

