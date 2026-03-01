# Changelog / 变更记录

All notable changes to this project are documented in this file.
本项目的所有关键变更记录在此文件维护。

Format rule / 格式规则：
1. One section per version: `## [X.Y.Z] - YYYY-MM-DD`.
2. Use bilingual entries in one line when possible: `中文 / English`.
3. Release workflow extracts the matching version section into GitHub Release notes.

## [1.0.1] - 2026-02-28

### Fixes / 修复

1. 修复启动后首次拖拽主窗口可能被打断并意外隐藏（失焦回弹体感）/ Fix initial main window drag occasionally being interrupted and hidden after launch
2. Web 预览模式执行命令时给出明确错误提示（不再假成功）/ Show explicit error when executing commands in web preview (no more fake success)
3. 启动自动更新检查：失败不会写入节流时间戳，避免“失败也节流”/ Startup update check: don’t persist throttle timestamp on failure
4. 设置保存：错误提示按步骤归因（自启/热键/localStorage/broadcast）/ Settings save: error attribution per step (autostart/hotkey/localStorage/broadcast)
5. 命令 schema：`shell` 字段当前不生效时在命令管理中给出校验提示/ Command schema: show validation notice when `shell` is present but ignored

## [1.0.0] - 2026-02-28

### Highlights / 亮点

ZapCmd 首个开源正式版！桌面命令启动器，支持快速搜索、参数化执行、批量队列和安全基线。

ZapCmd first open-source release! A desktop command launcher with fast search, parameterized execution, batch queue, and safety baseline.

### Features / 功能

1. 主流程：搜索 → 参数填写 → 暂存队列 → 终端执行 / Launcher flow: search → param fill → staging queue → terminal execution
2. 209 条内置命令（Git/Docker/系统/网络/SSH/开发等 8 大类）/ 209 builtin commands across 8 categories
3. 用户自定义命令：`~/.zapcmd/commands/*.json` 运行时加载 / User custom commands loaded at runtime
4. 安全基线：高危命令确认 + 参数注入拦截 / Safety baseline: dangerous command confirmation + argument injection guard
5. 设置页：热键、默认终端、语言、自动更新、开机自启、关于 / Settings: hotkeys, default terminal, language, auto-update, launch at login, about
6. 命令管理：启停、来源文件筛选、排序、覆盖标记 / Command management: enable/disable, source filter, sort, override markers
7. 多语言：zh-CN + en-US 运行时切换 / i18n: zh-CN + en-US runtime switch
8. 会话恢复：暂存队列重启后保留 / Session restore: staging queue persisted across restarts
9. 窗口透明度自定义 / Customizable window opacity
10. 自动检查更新（24h 节流）/ Auto-check updates (24h throttle)
11. 跨平台：Windows x64 / macOS arm64 / Linux x64 / Cross-platform support

### CI/CD

1. CI 质量门禁：lint → typecheck → test:coverage → build → cargo check / CI quality gate pipeline
2. 三平台发布构建：tag 触发自动构建 + GitHub Releases 发布 / Three-platform release build matrix
3. CodeQL 安全扫描（v4）/ CodeQL security scanning (v4)
