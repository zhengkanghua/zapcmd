# TEMP：GitHub CI 门禁配置操作步骤（执行完可删除）

**用途：** 这是“一次性”的仓库配置说明，用于把已经提交到仓库的 CI 工作流，真正变成“强制门禁”。  
**执行完是否可删除：** 可以（建议你完成配置并验证通过后删除该文件）。  
**更新时间：** 2026-03-03  

> 说明：工作流文件已经在仓库内（`.github/workflows/*.yml`）。你需要做的是 GitHub 仓库 Settings 里的开关与分支保护（branch protection）。

---

## 0. 你需要准备什么权限？

- 你需要有仓库的 **Admin** 权限（至少能修改 `Settings` → `Branches / Actions / Secrets`）。

---

## 1. 确认工作流已在默认分支（main）上

在 `main` 分支上确认以下文件存在：

- `.github/workflows/ci-gate.yml`
- `.github/workflows/release-build.yml`

如果它们还在你的本地/分支，先合并到 `main`，否则 GitHub 不会对 `main` 生效。

---

## 2. 开启 GitHub Actions（如果仓库关闭过 Actions）

路径：`GitHub Repo` → `Settings` → `Actions` → `General`

### 2.1 Actions 权限

在 **Actions permissions** 中选择：

- 推荐：`Allow all actions and reusable workflows`

（如果你有更严格的安全策略，也可以选择更严格的模式，但要确保本仓库工作流能正常运行。）

### 2.2 Workflow permissions

在 **Workflow permissions** 中选择：

- 推荐：`Read and write permissions`

原因：
- `release-build.yml` 中会发布 Release 资产（需要 `contents: write`）；虽然 workflow 里也声明了 permissions，但这里设为读写最不容易踩坑。

保存设置。

---

## 3.（可选）允许 Fork PR 触发 CI

如果这是开源仓库，外部贡献者通常来自 fork。

路径：`Settings` → `Actions` → `General` → `Fork pull request workflows`

建议：
- 如果你希望 fork PR 也自动跑 CI：按你团队策略选择“允许/需要审批”
- 至少要保证：当 PR 创建后，维护者可以让 CI 跑起来（否则贡献者只能等你手动跑/合并后才发现问题）

> 注意：即使允许 fork PR 跑 CI，fork PR 通常**拿不到 secrets**（这是 GitHub 的安全机制）。本仓库的 `CI Gate` 不依赖 secrets；`Release Build` 是 tag 触发且由维护者推 tag，不受影响。

---

## 4. 配置 `main` 分支保护（让 CI 真正变成强制门禁）

路径：`Settings` → `Branches` → `Branch protection rules` → `Add rule`

### 4.1 规则匹配

- Branch name pattern：`main`

### 4.2 建议勾选的开关（最关键）

1) `Require a pull request before merging`
2) `Require status checks to pass before merging`
3) （推荐）`Require branches to be up to date before merging`

### 4.3 选择需要的 Status Checks

你需要把 **CI Gate 的关键 jobs** 设为必过。这里有个坑：
> Status checks 列表通常只有在该 workflow **至少运行过一次**后才会出现。

所以建议你先做一次“触发 CI”的操作（见第 6 节验证），让 checks 出现在下拉列表里，然后再回来选择。

本仓库建议设为 required 的 checks（以 GitHub UI 显示为准，一般格式是 `WorkflowName / JobName`）：

- `CI Gate / quality-gate`
- `CI Gate / desktop-e2e-smoke`
- `CI Gate / cross-platform-smoke`

保存分支保护规则。

---

## 5.（仅发布需要）配置 Release 所需 secrets

如果你计划推送 `vX.Y.Z` tag 触发发布流程（`.github/workflows/release-build.yml`），需要配置签名相关 secrets。

路径：`Settings` → `Secrets and variables` → `Actions` → `New repository secret`

需要的 secrets（与 workflow 中使用一致）：

1) `TAURI_SIGNING_PRIVATE_KEY`
2) `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

> 如果你暂时不准备发布：可以先不配 secrets，但请不要推 `vX.Y.Z` tag（否则 release workflow 可能失败）。

---

## 6. 验证（强烈建议做一次）

### 6.1 触发 CI Gate（让 checks 出现 + 验证门禁有效）

做一个小 PR（例如只改 README 一行）：
1) 从你的分支对 `main` 开 PR
2) 确认 GitHub Actions 中 `CI Gate` workflow 自动运行
3) 等待以下 jobs 完成：
   - `quality-gate`（Windows）
   - `desktop-e2e-smoke`（Windows，上传 `.tmp/e2e/desktop-smoke/`）
   - `cross-platform-smoke`（macOS/Ubuntu）

### 6.2 验证“内置命令生成一致性”阻断是否生效

在 PR 中只改一个内置命令源文件，例如：
- `docs/command_sources/_git.md`

但**不要**提交生成产物，然后 push：

期望结果：
- `CI Gate / quality-gate` 会在 “检查内置命令生成产物已同步提交” 这个 step 失败
- 日志会提示你在本地运行：
  - `pwsh -File scripts/generate_builtin_commands.ps1`
  - 并提交 `assets/runtime_templates/commands/builtin` 与 `docs/builtin_commands.generated.md`

---

## 7. 完成后清理

你完成以上配置并验证通过后，可以删除本文件：

`docs/.maintainer/work/TEMP_github_ci_setup.md`

