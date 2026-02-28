# 仓库文档范围说明

> 目的：这份仓库只保留面向开源用户/贡献者的文档口径，减少歧义与维护成本。
> 开发阶段补充说明：`docs/.maintainer/**` 当前因多机协作临时入库同步，仅供维护者使用；在正式开源推广前需迁出仓库并恢复为本地私有目录。

## 1. 仓库内文档（保留在仓库）

1. 用户入口与治理：
   - `README.md`
   - `README.zh-CN.md`
   - `CHANGELOG.md`
   - `LICENSE`
   - `CONTRIBUTING*.md`
   - `SECURITY*.md`
   - `SUPPORT*.md`
   - `CODE_OF_CONDUCT*.md`
2. 命令生态与可复用规范：
   - `docs/schemas/**`
   - `docs/command_sources/**`
   - `docs/builtin_commands.md`
   - `docs/runtime_templates/README.md`
3. 协作模板：
   - `.github/ISSUE_TEMPLATE/**`
   - `.github/pull_request_template.md`
   - `.github/release-template.md`

## 2. 执行规则

1. 新增文档前先判断是否面向开源用户。
2. 面向用户/贡献者的文档必须放公开路径。
3. 不要把个人工作笔记、内部草稿、临时跑书等内容提交到仓库（避免公开口径被污染）。
4. 若新增/重命名文档，需同步更新：
   - `docs/README.md`
   - `README.md`
   - `README.zh-CN.md`
5. 若涉及 `docs/.maintainer/**`：
   - 明确标注 maintainer-only；
   - 不作为开源用户入口文档；
   - 在发布开源版本前执行清理迁出。
