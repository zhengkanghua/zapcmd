# ZapCmd 短期记忆（Active Context）

> 状态：Active  
> 最后更新：2026-03-01  
> 目标：让开发者/维护者/Agent 快速知道“现在已经实现了什么”，避免把 Roadmap 当成现状。

---

## 1. 当前实现（用户可用能力）

### 1.1 主唤起窗口（Launcher）

1. 透明壳层单窗口，主视觉为搜索框。
2. 主界面三块：`Search Capsule` + `Result Drawer` + `Floating Staging`（暂存队列可折叠为计数按钮）。
3. 输入为空不显示结果抽屉；输入非空显示结果抽屉；结果最多 8 条。

### 1.2 搜索与结果交互

1. 过滤字段：`title + description + preview`（大小写不敏感子串匹配）。
2. 支持空格分词 AND；高亮按分词逐词展示（顺序无关）。
3. 默认 `Enter`：执行当前命令；`ArrowRight`：加入暂存队列。

### 1.3 暂存队列（Staging）

1. 支持入队、移除、清空、拖拽重排。
2. 队列执行入口：按钮或 `Ctrl+Enter`。
3. 执行成功清空队列；执行失败保留队列。
4. 队列从 0->1 时自动展开（展开/收起可手动切换）。

### 1.4 参数弹层与安全

1. 需要参数的命令会先进入参数弹层；提交后按触发来源决定“立即执行”或“入队”。
2. 高危命令执行前必须二次确认（高危/需管理员权限/命中高危规则）。
3. 参数命中明显注入符号（如 `;`、`&&`、`||`、换行、命令替换）会被阻断并给出错误反馈。

### 1.5 执行与输出

1. 命令在系统终端中执行；应用内不提供输出面板。
2. 批量队列执行会在同一终端窗口内顺序执行。
3. 应用内仅展示状态级反馈（toast，约 3 秒自动消失），失败原因在主界面可见。

### 1.6 设置窗口（Settings）

1. 独立窗口，包含 `hotkeys / general / appearance` 三个页签（外观页为占位）。
2. 通用页包含：启动自动检查更新、开机自启动开关（在 Tauri runtime 下可读取系统自启动状态）。
3. 多语言：支持 `zh-CN` / `en-US`。

### 1.7 命令管理（Settings -> Command Management）

1. 支持按关键词、来源、启用状态、覆盖状态、导入异常、来源文件进行筛选。
2. 支持排序（默认/标题/分类/来源/状态）。
3. 支持展示方式切换：平铺列表 / 按来源文件分组。
4. 命令管理视图状态会持久化到 `zapcmd.settings.commands.view`。

### 1.8 命令来源与加载策略

1. 内置命令：`assets/runtime_templates/commands/builtin/*.json`
2. 用户命令：用户目录 `~/.zapcmd/commands/*.json`
3. 用户命令在应用启动时加载（修改后需重启生效）；非法/不合法文件会被跳过并给出导入校验提示。

---

## 2. 已知限制（当前口径）

1. 用户命令 JSON 修改后需重启应用生效。
2. 桌面壳层 E2E 自动化基线尚未完全落地（以 `README.md` 的 Roadmap 段落为准）。

---

## 3. 快速定位（从文档到代码）

1. UI/Launcher 代码入口：`src/App.vue` / `src/styles.css` / `src-tauri/src/lib.rs`
2. 项目结构与技术栈：`docs/project_structure.md`
3. 架构说明（当前 + Roadmap）：`docs/architecture_plan.md`
4. 发布与回滚：`docs/.maintainer/work/release_runbook.md`
5. 人工回归：`docs/.maintainer/work/manual_regression_m0_m0a.md` / `docs/.maintainer/work/manual_regression_m4_release.md`
