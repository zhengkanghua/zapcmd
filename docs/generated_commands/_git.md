# _git

> 此文件为自动生成，禁止手动修改。
> Source: _git.yaml

## Git 版本控制

## Commands

### git-status

- 名称：查看仓库状态
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git status`
- Tags：git, 版本控制, 状态, status, 查看, show

### git-log

- 名称：查看提交历史
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git log --oneline -{{count}}`
- Tags：git, 版本控制, 日志, log, 查看, show, 提交, commit

### git-log-graph

- 名称：图形化提交历史
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git log --oneline --graph --all -{{count}}`
- Tags：git, 版本控制, 日志, log, 图谱, graph, 提交, commit

### git-diff

- 名称：查看未暂存更改
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git diff`
- Tags：git, 版本控制, diff, 差异, 查看, show

### git-diff-staged

- 名称：查看已暂存更改
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git diff --staged`
- Tags：git, 版本控制, diff, 差异, 暂存区, staged, 查看, show

### git-add-all

- 名称：暂存所有更改
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git add -A`
- Tags：git, 版本控制, 添加, add, 全部, all

### git-commit

- 名称：提交更改
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git commit -m "{{message}}"`
- Tags：git, 版本控制, 提交, commit

### git-commit-amend

- 名称：修改上次提交
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git commit --amend -m "{{message}}"`
- Tags：git, 版本控制, 提交, commit, 修订, amend

### git-push

- 名称：推送到远程
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git push origin {{branch}}`
- Tags：git, 版本控制, 推送, push

### git-pull

- 名称：拉取远程更新
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git pull origin {{branch}}`
- Tags：git, 版本控制, 拉取, pull

### git-branch-list

- 名称：查看所有分支
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git branch -a`
- Tags：git, 版本控制, 分支, branch, 列表, list, 查看, show

### git-branch-create

- 名称：创建新分支
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git checkout -b {{branch}}`
- Tags：git, 版本控制, 分支, branch, 创建, create

### git-branch-delete

- 名称：删除本地分支
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git branch -d {{branch}}`
- Tags：git, 版本控制, 分支, branch, 删除, delete, remove

### git-switch

- 名称：切换分支
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git switch {{branch}}`
- Tags：git, 版本控制, 切换, switch, 分支, branch

### git-stash

- 名称：暂存当前更改
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git stash`
- Tags：git, 版本控制, 暂存, stash

### git-stash-pop

- 名称：恢复暂存更改
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git stash pop`
- Tags：git, 版本控制, 暂存, stash, 恢复, pop

### git-stash-list

- 名称：查看暂存列表
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git stash list`
- Tags：git, 版本控制, 暂存, stash, 列表, list, 查看, show

### git-reset-soft

- 名称：软回退到提交
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git reset --soft {{commit}}`
- Tags：git, 版本控制, 回退, reset, 软回退, soft, 提交, commit

### git-reset-hard

- 名称：硬回退到提交
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git reset --hard {{commit}}`
- Tags：git, 版本控制, 回退, reset, 硬回退, hard, 提交, commit

### git-cherry-pick

- 名称：Cherry Pick 提交
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git cherry-pick {{commit}}`
- Tags：git, 版本控制, cherry-pick, pick, 提交, commit

### git-rebase

- 名称：变基到分支
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git rebase {{branch}}`
- Tags：git, 版本控制, 变基, rebase, 分支, branch

### git-merge

- 名称：合并分支
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git merge {{branch}}`
- Tags：git, 版本控制, 合并, merge, 分支, branch

### git-tag

- 名称：创建标签
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git tag {{tag}}`
- Tags：git, 版本控制, 标签, tag

### git-remote-url

- 名称：查看远程地址
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git remote -v`
- Tags：git, 版本控制, 远程, remote, url, 查看, show

### git-clone

- 名称：克隆仓库
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git clone {{url}}`
- Tags：git, 版本控制, 克隆, clone

### git-blame

- 名称：查看文件修改者
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git blame {{file}}`
- Tags：git, 版本控制, blame, 查看, show, 文件, file

### git-clean

- 名称：清理未跟踪文件
- 平台：all
- 分类：git
- 执行：exec
- 预览：`git clean -fd`
- Tags：git, 版本控制, 清理, clean, 文件, file

### git-config-user

- 名称：设置用户名和邮箱
- 平台：all
- 分类：git
- 执行：script
- 预览：`bash: git config --global user.name "{{name}}" && git config --global user.email "{{email}}"`
- Tags：git, 版本控制, 配置, config, 用户, user
