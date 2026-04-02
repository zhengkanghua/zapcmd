# 短期记忆（2026-04-01）

- ZapCmd 是基于 Tauri + Vue 的桌面命令启动器，强调速度、安全基线与可重复工作流。
- 当前主链路：搜索 -> 参数 -> 暂存 -> 执行；支持内置与用户命令合并加载、队列执行、会话恢复。
- 设置页已覆盖热键、默认终端、语言、更新与命令管理；运行时 `platform` 仍为单值，builtin 不托管 cwd。
- 2026-04-02：命令 contract 已删除 `command.shell`，prerequisite 收口为 `binary/shell/env`；preflight 会展示 `installHint/fallbackCommandId`；builtin 生成器已迁到 Node，产物路径改为稳定相对路径。
