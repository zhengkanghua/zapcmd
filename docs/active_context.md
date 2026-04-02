# 短期记忆（2026-04-02）

- ZapCmd 为 Tauri/Vue 桌面命令器，主链路：搜索->参数->暂存->执行，支持命令合并、队列与恢复。
- 当前 contract：移除 command.shell，prerequisite 为 binary/shell/env。
- 下一轮：builtin 真源切 YAML，生成 json+md，执行模型改为 exec/script，runner 与 prerequisite 闭环。
- 已补 implementation plan：先 schema/类型/生成器，再改 runtime/executor，最后全量迁移 builtin、清理旧 Markdown DSL 与 template 主链。
