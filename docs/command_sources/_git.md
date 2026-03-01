# _git

> 分类：Git 版本控制
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `git-status` | 查看仓库状态 | all | `git status` | - | - | false | git | git 版本控制 状态 status 查看 show |
| 2 | `git-log` | 查看提交历史 | all | `git log --oneline -{{count}}` | count(number, default:20) | - | false | git | git 版本控制 日志 log 查看 show 提交 commit |
| 3 | `git-log-graph` | 图形化提交历史 | all | `git log --oneline --graph --all -{{count}}` | count(number, default:30) | - | false | git | git 版本控制 日志 log 图谱 graph 提交 commit |
| 4 | `git-diff` | 查看未暂存更改 | all | `git diff` | - | - | false | git | git 版本控制 diff 差异 查看 show |
| 5 | `git-diff-staged` | 查看已暂存更改 | all | `git diff --staged` | - | - | false | git | git 版本控制 diff 差异 暂存区 staged 查看 show |
| 6 | `git-add-all` | 暂存所有更改 | all | `git add -A` | - | - | false | git | git 版本控制 添加 add 全部 all |
| 7 | `git-commit` | 提交更改 | all | `git commit -m "{{message}}"` | message(text) | - | false | git | git 版本控制 提交 commit |
| 8 | `git-commit-amend` | 修改上次提交 | all | `git commit --amend -m "{{message}}"` | message(text) | - | false | git | git 版本控制 提交 commit 修订 amend |
| 9 | `git-push` | 推送到远程 | all | `git push origin {{branch}}` | branch(text, default:main) | - | false | git | git 版本控制 推送 push |
| 10 | `git-pull` | 拉取远程更新 | all | `git pull origin {{branch}}` | branch(text, default:main) | - | false | git | git 版本控制 拉取 pull |
| 11 | `git-branch-list` | 查看所有分支 | all | `git branch -a` | - | - | false | git | git 版本控制 分支 branch 列表 list 查看 show |
| 12 | `git-branch-create` | 创建新分支 | all | `git checkout -b {{branch}}` | branch(text) | - | false | git | git 版本控制 分支 branch 创建 create |
| 13 | `git-branch-delete` | 删除本地分支 | all | `git branch -d {{branch}}` | branch(text) | - | false | git | git 版本控制 分支 branch 删除 delete remove |
| 14 | `git-switch` | 切换分支 | all | `git switch {{branch}}` | branch(text) | - | false | git | git 版本控制 切换 switch 分支 branch |
| 15 | `git-stash` | 暂存当前更改 | all | `git stash` | - | - | false | git | git 版本控制 暂存 stash |
| 16 | `git-stash-pop` | 恢复暂存更改 | all | `git stash pop` | - | - | false | git | git 版本控制 暂存 stash 恢复 pop |
| 17 | `git-stash-list` | 查看暂存列表 | all | `git stash list` | - | - | false | git | git 版本控制 暂存 stash 列表 list 查看 show |
| 18 | `git-reset-soft` | 软回退到提交 | all | `git reset --soft {{commit}}` | commit(text) | - | false | git | git 版本控制 回退 reset 软回退 soft 提交 commit |
| 19 | `git-reset-hard` | 硬回退到提交 | all | `git reset --hard {{commit}}` | commit(text) | ⚠️ | false | git | git 版本控制 回退 reset 硬回退 hard 提交 commit |
| 20 | `git-cherry-pick` | Cherry Pick 提交 | all | `git cherry-pick {{commit}}` | commit(text) | - | false | git | git 版本控制 cherry-pick pick 提交 commit |
| 21 | `git-rebase` | 变基到分支 | all | `git rebase {{branch}}` | branch(text) | - | false | git | git 版本控制 变基 rebase 分支 branch |
| 22 | `git-merge` | 合并分支 | all | `git merge {{branch}}` | branch(text) | - | false | git | git 版本控制 合并 merge 分支 branch |
| 23 | `git-tag` | 创建标签 | all | `git tag {{tag}}` | tag(text) | - | false | git | git 版本控制 标签 tag |
| 24 | `git-remote-url` | 查看远程地址 | all | `git remote -v` | - | - | false | git | git 版本控制 远程 remote url 查看 show |
| 25 | `git-clone` | 克隆仓库 | all | `git clone {{url}}` | url(text) | - | false | git | git 版本控制 克隆 clone |
| 26 | `git-blame` | 查看文件修改者 | all | `git blame {{file}}` | file(path) | - | false | git | git 版本控制 blame 查看 show 文件 file |
| 27 | `git-clean` | 清理未跟踪文件 | all | `git clean -fd` | - | ⚠️ | false | git | git 版本控制 清理 clean 文件 file |
| 28 | `git-config-user` | 设置用户名和邮箱 | all | `git config --global user.name "{{name}}" && git config --global user.email "{{email}}"` | name(text), email(text) | - | false | git | git 版本控制 配置 config 用户 user |
