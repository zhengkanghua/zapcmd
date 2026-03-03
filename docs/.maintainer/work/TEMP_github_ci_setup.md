# TEMP：GitHub CI 门禁配置操作步骤（维护者一次性设置清单）

**用途：** 这是“仓库管理员/维护者”的一次性配置清单，用于把已经提交到仓库的 GitHub Actions 工作流，真正变成 **强制门禁**（合并前必须绿灯）。  
**这份文档给谁用：** 只给有仓库 `Admin` 权限的人；贡献者不需要做这里的设置。  
**是否需要删除：** 不需要删除（建议保留在 `docs/.maintainer/work/` 作为后续维护者参考）。  
**更新时间：** 2026-03-03  

> 说明：工作流文件已经在仓库里（`.github/workflows/*.yml`）。你要做的是在 GitHub `Settings` 里开启 Actions、配置分支保护（Branch protection / Rulesets）、以及（可选）配置发布 secrets。

---

## 0. 你需要准备什么权限？

- 你需要有仓库的 **Admin** 权限（至少能修改 `Settings` → `Branches / Actions / Secrets`）。

---

## 1. 确认工作流已在默认分支（main）上

在 `main` 分支上确认以下文件存在：

- `.github/workflows/ci-gate.yml`
- `.github/workflows/release-build.yml`
- `.github/workflows/release-dry-run.yml`（可手动触发，用于验证打包链路）
- `.github/workflows/codeql.yml`（安全扫描）

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

说明：GitHub 现在有两套入口：
- 旧入口：`Settings` → `Branches` → `Branch protection rules`
- 新入口（推荐）：`Settings` → `Rules` → `Rulesets`

两者能达到的效果类似；如果你已经在用 Rulesets，建议用 Rulesets 统一管理。

下面给出 **两套路径** 的操作步骤，你选其中一种做即可。

---

### 4A.（推荐）用 Rulesets 保护 `main`

1) 进入：`Settings` → `Rules` → `Rulesets` → `New ruleset` → `New branch ruleset`  
2) 填写：
   - Name：`main-quality-gate`
   - Enforcement status：`Active`
3) Target branches：
   - Include by pattern：`main`
4) 打开规则（关键项）：
   - `Require a pull request before merging`
   - `Require status checks to pass`
   - （推荐）`Require branches to be up to date before merging`
   - （推荐）`Block force pushes`
   - （推荐）`Block deletions`
5) Status checks（必选）：
   - 勾选（以 GitHub UI 展示名称为准）：
     - `CI Gate / quality-gate`
     - `CI Gate / desktop-e2e-smoke`
     - `CI Gate / cross-platform-smoke`
6) Bypass（非常关键，决定“你自己能不能直接 push 到 main”）：
   - 如果你想 **自己也不能直接 push**（推荐，更安全）：不要给任何人 bypass（或勾选 “Do not allow bypassing …” 之类选项）
   - 如果你需要 “break glass”（紧急情况下管理员可直推）：把 `Repository administrators` 加入 bypass list（不推荐常态使用）
7) 保存 Ruleset

---

### 4B.（备选）用 Branch protection rules 保护 `main`

路径：`Settings` → `Branches` → `Branch protection rules` → `Add rule`

### 4.1 规则匹配

- Branch name pattern：`main`

### 4.2 建议勾选的开关（最关键）

1) `Require a pull request before merging`
2) `Require status checks to pass before merging`
3) （推荐）`Require branches to be up to date before merging`
4) （推荐）`Do not allow force pushes`
5) （推荐）`Do not allow deletions`

#### 4.2.1 你自己还能不能 push 到 main？

取决于你是否让规则对管理员/维护者同样生效：
- 如果你勾选了 `Include administrators`（或 Rulesets 里不允许 bypass）：**你自己也不能直接 push 到 `main`**，必须走 PR（推荐）
- 如果你不勾选 `Include administrators`（或 Rulesets 里给管理员 bypass）：管理员可以直推，但不建议常态使用

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

### 4C. 分支保护开启后的日常开发流程（维护者怎么提交改动？）

你开启 `main` 分支保护后，通常会出现两种情况：
- 你自己也不能直推 `main`（推荐，更安全）
- 只有管理员能直推 `main`（不推荐常态使用）

无论哪种，建议你把日常改动统一走 PR（这样 CI 门禁才是“唯一事实”）：

1) 同步本地 `main`：

`git fetch origin`

`git switch main`

`git pull --rebase origin main`

2) 从 `main` 拉分支开发：

`git switch -c chore/<topic>`

3) 开发与提交，然后推送分支：

`git add -A`

`git commit -m "chore: <msg>"`

`git push -u origin chore/<topic>`

4) 在 GitHub 创建 PR（目标 `main`），等待 `CI Gate` 全绿后合并。

#### 我还能不能在本地 main 分支进行开发？

可以。本地 `main` 依然能 commit；分支保护限制的是远端 `origin/main` 的 push/merge。

但推荐把本地 `main` 当作“只同步不开发”的基线，避免把一堆未合并提交留在 `main` 上导致后续同步/回滚麻烦。

如果你已经在本地 `main` 上提交了若干 commit（还没 push），补救方式是：

`git switch -c feat/<topic>`

`git push -u origin feat/<topic>`

然后按正常 PR 流程合并即可。

> 提示：请确保你的 Ruleset/保护规则只匹配 `main`（例如 pattern = `main`），否则可能会连 feature 分支也限制，导致你无法 push 分支来开 PR。

---

## 5.（仅发布需要）配置 Release 所需 secrets

如果你计划推送 `vX.Y.Z` tag 触发发布流程（`.github/workflows/release-build.yml`），需要配置签名相关 secrets。

路径：`Settings` → `Secrets and variables` → `Actions` → `New repository secret`

需要的 secrets（与 workflow 中使用一致）：

1) `TAURI_SIGNING_PRIVATE_KEY`
2) `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

> 如果你暂时不准备发布：可以先不配 secrets，但请不要推 `vX.Y.Z` tag（否则 release workflow 可能失败）。

---

## 6. 验证（强烈建议做一次，让 required checks 出现在下拉列表里）

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

## 7. 手动触发 / 重新运行（你问到的“我想自己手动跑一遍 CI 怎么做？”）

### 7.1 CI Gate 怎么触发？

当前 `CI Gate` 的触发条件是：
- 开 PR 到 `main` → 自动触发（推荐做法）
- push 到 `main` → 自动触发（但如果你开启了 `Require PR`，正常情况下不会允许你直推 main）
- 在 `Actions` 页面手动点击 `Run workflow` → 触发（需要你有写权限）

因此，“想手动触发 CI Gate”的最稳妥方式是：
1) 创建一个分支（哪怕是维护者自己）  
2) push 到远端  
3) 开一个 PR（可以是 Draft PR）  
4) 看 `Checks`/`Actions` 跑完

### 7.2 如何重新跑一次失败的 CI？

1) 进入 PR 页面 → `Checks`  
2) 点击 `Re-run jobs`（或进入 Actions 里对应 run 点 `Re-run all jobs`）

### 7.3 Release Dry Run（只验证打包，不发布）

1) `Actions` → `Release Dry Run Build`  
2) 点击 `Run workflow`  
3) Branch 选 `main`，platform 选 `all`  
4) 预期：三平台构建成功并上传 artifacts（不会出现在 Releases）

### 7.4 正式发版（会发布到 Releases）

发版命令流程见：`docs/.maintainer/work/release_runbook.md`
