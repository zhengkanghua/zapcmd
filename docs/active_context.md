# 短期记忆（2026-03-04）

> 只记录“当前已经完成的功能”，用于快速对齐项目现状。

## 最近更新

- 2026-03-04：已完成 Phase 5 规划（CONTEXT/RESEARCH/PLAN），下一步执行 `$gsd-execute-phase 5`。

## 已完成功能

### 启动器主流程

- 命令搜索（支持分词匹配、相关性排序、高亮）
- 搜索结果快捷执行（`Enter`）
- 搜索结果加入暂存区（`ArrowRight`）
- 参数弹层（必填参数填写后再执行或入队）
- 暂存区（Staging Queue）开关、列表展示、清空、批量执行
- 暂存项拖拽排序 + 键盘排序（`Alt+ArrowUp/Down`）
- 暂存项删除（`Delete`）
- 暂存区执行（`Ctrl+Enter`）
- 暂存区会话恢复（重启后恢复队列）

### 命令管理与加载

- 内置命令加载（runtime templates）
- 用户命令目录加载（`~/.zapcmd/commands`，递归 JSON）
- 内置 + 用户命令合并
- 同 ID 用户命令覆盖内置命令
- 按平台过滤命令（win/mac/linux/all）
- 命令文件 schema 校验与加载问题提示（invalid json/schema/duplicate/shell ignored）

### 安全能力

- 参数输入校验（required / number / select / pattern）
- 参数注入拦截（危险控制符拦截）
- 危险命令执行前确认（单命令与队列均支持）
- adminRequired / dangerous 标记参与执行确认

### Settings 功能

- Hotkeys：快捷键录制、冲突检测、保存
- General：默认终端选择、语言切换、自动检查更新开关、开机自启开关
- Commands：命令启用/禁用、批量启停、筛选、排序、按来源文件分组
- Appearance：窗口透明度调节
- About：版本/平台显示、检查更新、下载更新、打开项目主页

### 桌面壳层能力（Tauri）

- 全局快捷键唤起主窗口
- 托盘菜单（显示/隐藏、设置、退出）
- 主窗口显示/隐藏与失焦自动隐藏
- 主窗口位置持久化与恢复
- 设置窗口独立打开/聚焦
- 系统终端执行命令（Windows/macOS/Linux 分支）

### 更新与持久化

- 启动自动检查更新（带 24h 节流）
- 手动检查并下载更新
- 设置持久化（`zapcmd.settings`）
- 暂存区会话持久化（`zapcmd.session.launcher`）

### 工程与质量

- `npm run check:all` 质量门禁（lint/typecheck/test/build/rust）
- 覆盖率阈值提升到 90%（lines/functions/statements/branches）
- CI Gate 与 Windows 桌面 E2E smoke 已接入
- Rust 单测已纳入 `check:all`，本地 precommit 命中高风险 Rust 变更会追加 `cargo test`，CI Gate macOS/Ubuntu 也会运行 `npm run test:rust`
