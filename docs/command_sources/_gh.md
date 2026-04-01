# _gh

> 分类：GitHub CLI
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `gh-auth-status` | GH 登录状态 | gh | all | `gh auth status` | - | - | false | gh | gh github cli auth status 登录 状态 查看 show |
| 2 | `gh-pr-list` | GH Pull Requests 列表 | gh | all | `gh pr list` | - | - | false | gh | gh github cli pr pull-request list 列表 查看 show |
| 3 | `gh-pr-view` | GH 查看 Pull Request | gh | all | `gh pr view {{pr}}` | pr(text) | - | false | gh | gh github cli pr pull-request view 查看 show |
| 4 | `gh-pr-checkout` | GH 检出 Pull Request | gh | all | `gh pr checkout {{pr}}` | pr(text) | - | false | gh, git | gh github cli pr pull-request checkout 检出 |
| 5 | `gh-issue-list` | GH Issues 列表 | gh | all | `gh issue list` | - | - | false | gh | gh github cli issue list 列表 查看 show |
| 6 | `gh-repo-view` | GH 仓库概览 | gh | all | `gh repo view` | - | - | false | gh | gh github cli repo repository view 概览 查看 show |
| 7 | `gh-run-list` | GH Actions Runs 列表 | gh | all | `gh run list` | - | - | false | gh | gh github cli actions run list 列表 查看 show |
| 8 | `gh-run-view` | GH 查看 Actions Run | gh | all | `gh run view {{runId}}` | runId(text) | - | false | gh | gh github cli actions run view 查看 show |
| 9 | `gh-run-watch` | GH 跟随 Actions Run | gh | all | `gh run watch {{runId}}` | runId(text) | - | false | gh | gh github cli actions run watch 跟随 观察 |
| 10 | `gh-pr-checks` | GH 查看 PR Checks | gh | all | `gh pr checks {{pr}}` | pr(text) | - | false | gh | gh github cli pr pull-request checks 查看 show |
| 11 | `gh-release-list` | GH Releases 列表 | gh | all | `gh release list` | - | - | false | gh | gh github cli release list 列表 查看 show |
| 12 | `gh-workflow-list` | GH Workflows 列表 | gh | all | `gh workflow list` | - | - | false | gh | gh github cli workflow list 列表 查看 show |
