# ZapCmd 自动化检测确认清单（CI / CodeQL / Release）

> 目标：发版前或变更后，快速确认“本地门禁 + GitHub Actions + CodeQL + 发版工作流”都正常开启且可用。

---

## 1. 本地（提交前）门禁是否生效

1. 确认 git hooks 路径：
   - `git config core.hooksPath`
   - 预期输出：`.githooks`
2. 确认 pre-commit 会执行：
   - 改一个 `src/**/*.ts` 或 `src/**/*.vue`
   - `git add -A`
   - `git commit -m "test: pre-commit guard"`
   - 预期看到：`precommit:guard` 输出（会跑 `lint` / `typecheck`，以及按改动触发 `test:related` / `typecheck:test` / `cargo check`）
3. 发版前全量门禁（必须）：
   - `npm run check:all`

---

## 2. GitHub Actions 是否启用

1. 仓库 `Settings` → `Actions` → `General`
2. 确认允许运行 workflows（不要被禁用）
3. 仓库 `Actions` 页能看到这些 workflow（至少）：
   - `CI Gate`（`.github/workflows/ci-gate.yml`）
   - `CodeQL`（`.github/workflows/codeql.yml`）
   - `Release Build Matrix`（`.github/workflows/release-build.yml`）
   - `Release Dry Run Build`（`.github/workflows/release-dry-run.yml`）

---

## 3. CI Gate 是否正常触发与展示

1. 新建一个 PR（目标分支：`main`）
2. 在 PR 页签 `Checks` 中确认出现 `CI Gate`
3. 合并该 PR 后，在 `Actions` 中确认 `CI Gate` 对 `push(main)` 也会跑

如果你开启了主分支保护（推荐）：

1. `Settings` → `Branches`（或 `Settings` → `Rules` → `Rulesets`）
2. 对 `main` 启用：
   - Require PR
   - Required status checks：至少勾选 `CI Gate`

---

## 4. CodeQL 是否正常（以及你遇到的报错怎么修）

### 4.1 先确认：不要同时启用 Default setup + Advanced workflow

你当前仓库使用的是 Advanced workflow：`.github/workflows/codeql.yml`。

如果你在 GitHub 的 `Security` → `Code scanning` 里启用了 **Default setup**，会出现你贴的错误：

> `CodeQL analyses from advanced configurations cannot be processed when the default setup is enabled`

解决方式（二选一）：

1. **保留 Advanced（推荐）**：关闭 Code scanning 的 Default setup，然后继续用仓库内的 `codeql.yml`
2. 使用 Default setup：删除/禁用仓库内的 `codeql.yml`

### 4.2 怎么看 CodeQL 结果

1. 运行入口：仓库 `Actions` → `CodeQL`
2. 结果入口：仓库 `Security` → `Code scanning`

说明：日志里的 `Not performing diff-informed analysis because we are not analyzing a pull request.` 不是错误，只表示当前不是 PR 扫描。

---

## 5. 发版工作流是否正常

### 5.1 Dry-run（不发布，只验证能构建）

1. 仓库 `Actions` → `Release Dry Run Build`
2. 点击 `Run workflow`，platform 选 `all`
3. 预期：三平台构建成功并上传 artifacts

### 5.2 正式发版（会发布到 GitHub Releases）

1. 确保版本号与 changelog 就绪：
   - `package.json` 版本更新
   - `CHANGELOG.md` 存在对应 `## [X.Y.Z] - YYYY-MM-DD`
2. 合并到 `main` 后，创建并推送 tag：
   - `git tag vX.Y.Z`
   - `git push origin vX.Y.Z`
3. 预期：
   - `Release Build Matrix` 自动运行
   - GitHub Releases 出现对应版本资产 + `SHA256SUMS`

