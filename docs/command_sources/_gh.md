# _gh

> 分类：GitHub CLI
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `gh-auth-status` | GH 登录状态 | gh | all | `gh auth status` | - | - | false | binary:gh | gh github cli auth status 登录 状态 查看 show |
| 2 | `gh-pr-list` | GH Pull Requests 列表 | gh | all | `gh pr list` | - | - | false | binary:gh | gh github cli pr pull-request list 列表 查看 show |
| 3 | `gh-pr-view` | GH 查看 Pull Request | gh | all | `gh pr view {{pr}}` | pr(text) | - | false | binary:gh | gh github cli pr pull-request view 查看 show |
| 4 | `gh-pr-checkout` | GH 检出 Pull Request | gh | all | `gh pr checkout {{pr}}` | pr(text) | - | false | binary:gh, binary:git | gh github cli pr pull-request checkout 检出 |
| 5 | `gh-issue-list` | GH Issues 列表 | gh | all | `gh issue list` | - | - | false | binary:gh | gh github cli issue list 列表 查看 show |
| 6 | `gh-repo-view` | GH 仓库概览 | gh | all | `gh repo view` | - | - | false | binary:gh | gh github cli repo repository view 概览 查看 show |
| 7 | `gh-run-list` | GH Actions Runs 列表 | gh | all | `gh run list` | - | - | false | binary:gh | gh github cli actions run list 列表 查看 show |
| 8 | `gh-run-view` | GH 查看 Actions Run | gh | all | `gh run view {{runId}}` | runId(text) | - | false | binary:gh | gh github cli actions run view 查看 show |
| 9 | `gh-run-watch` | GH 跟随 Actions Run | gh | all | `gh run watch {{runId}}` | runId(text) | - | false | binary:gh | gh github cli actions run watch 跟随 观察 |
| 10 | `gh-pr-checks` | GH 查看 PR Checks | gh | all | `gh pr checks {{pr}}` | pr(text) | - | false | binary:gh | gh github cli pr pull-request checks 查看 show |
| 11 | `gh-release-list` | GH Releases 列表 | gh | all | `gh release list` | - | - | false | binary:gh | gh github cli release list 列表 查看 show |
| 12 | `gh-workflow-list` | GH Workflows 列表 | gh | all | `gh workflow list` | - | - | false | binary:gh | gh github cli workflow list 列表 查看 show |
| 13 | `gh-pr-diff` | GH 查看 PR 差异 | gh | all | `gh pr diff {{pr}}` | pr(text) | - | false | binary:gh | gh github cli pr diff pull-request 差异 查看 show |
| 14 | `gh-workflow-run` | GH 触发 Workflow | gh | all | `gh workflow run "{{workflow}}"` | workflow(text) | - | false | binary:gh | gh github cli workflow run 触发 执行 |
| 15 | `gh-run-rerun` | GH 重新运行 Actions Run | gh | all | `gh run rerun {{runId}}` | runId(text) | - | false | binary:gh | gh github cli actions run rerun 重跑 |
| 16 | `gh-run-download` | GH 下载 Run 产物 | gh | all | `gh run download {{runId}} -D "{{dir}}"` | runId(text), dir(path, default:.) | - | false | binary:gh | gh github cli actions run download artifact 产物 下载 |
