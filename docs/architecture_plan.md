# ZapCmd 架构文档（Current Baseline + Roadmap）

> 状态：Active
> 基线日期：2026-02-23
> 口径：以仓库当前代码实现为准，规划项单独标注为“Roadmap”。

---

## 1. 当前实现总览

当前项目是一个 Tauri v2 + Vue 3 的桌面命令启动器原型，已完成前端主流程雏形与基础桌面壳层能力。

### 1.1 技术栈（当前）

- 桌面框架：Tauri v2
- 后端：Rust
- 前端：Vue 3 + TypeScript
- 状态管理：Pinia（设置状态已收敛到 store）
- 样式：Tailwind + 手写 CSS

### 1.2 已实现能力

1. 主窗口：透明无边框、托盘、全局热键唤起、失焦自动隐藏。
2. 搜索：运行时内置命令资产（`assets/runtime_templates/commands/builtin/*.json`）加载到内存后过滤与展示。
3. 用户命令目录接入：`~/.zapcmd/commands/**/*.json` 运行时读取并合并到搜索命令集（同 id 用户命令覆盖内置命令）。
4. 用户命令加载策略：应用启动时读取用户目录命令并合并到内存命令集；修改后需重启应用生效。
5. 暂存区：入队、重排、编辑参数、执行队列。
6. 参数弹层：参数输入与必填校验。
7. 设置窗口：快捷键录制、默认终端设置、命令管理（启停/冲突标记/导入校验提示/筛选排序/按文件筛选/按文件分组展示）、外观占位页。
8. 终端执行：按平台调用系统终端执行命令。
9. 命令文件轻量 schema guard：按 `docs/schemas/command-file.schema.json` 的核心字段约束做运行时校验（非法文件跳过）。
10. 执行安全链路：参数注入防护 + 高危命令执行前确认（单命令/队列）。
11. 会话恢复：主窗口暂存队列状态跨会话恢复（`zapcmd.session.launcher`）。
12. Phase 8 架构可测试性收敛：组合根引入 `ports/policies/runtime` 分层，`settingsStore` 拆分为 `defaults/normalization/migration/storageAdapter/store`。

### 1.3 未实现能力

1. 高级命令治理能力（规则白名单、团队策略、策略下发）未落地。
2. E2E 测试体系（Playwright/Rust 集成层）未接入。

---

## 2. 当前模块结构

### 2.1 前端（当前）

- 壳层入口（编排层）：`src/App.vue`（159 行）
- 启动入口：`src/main.ts`
- 全局样式：`src/styles.css`
- 应用编排根：`src/composables/app/useAppCompositionRoot/`
- 组合根边界层：`src/composables/app/useAppCompositionRoot/ports.ts`、`src/composables/app/useAppCompositionRoot/policies.ts`
- 主窗口视图：`src/components/launcher/LauncherWindow.vue`
- 主窗口子组件：`src/components/launcher/parts/*`
- 主窗口类型定义：`src/components/launcher/types.ts`
- 设置窗口视图：`src/components/settings/SettingsWindow.vue`
- 设置窗口子组件：`src/components/settings/parts/*`
- 设置窗口类型定义：`src/components/settings/types.ts`
- 设置状态：`src/stores/settingsStore.ts`
- 设置领域子模块：`src/stores/settings/defaults.ts`、`src/stores/settings/normalization.ts`、`src/stores/settings/migration.ts`、`src/stores/settings/storageAdapter.ts`
- 热键工具：`src/shared/hotkeys.ts`
- 窗口尺寸编排：`src/composables/launcher/useWindowSizing/`
- 设置窗口状态编排：`src/composables/settings/useSettingsWindow/`
- 队列状态编排：`src/composables/launcher/useStagingQueue/`
- 执行编排：`src/composables/execution/useCommandExecution/`
- 生命周期与同步编排：`src/composables/app/useAppLifecycle.ts`
- 热键绑定编排：`src/composables/settings/useHotkeyBindings.ts`
- 主窗口 DOM/ref 桥接：`src/composables/launcher/useLauncherDomBridge.ts`
- 主窗口壳层行为：`src/composables/launcher/useMainWindowShell.ts`
- 主窗口 watch 编排：`src/composables/launcher/useLauncherWatchers.ts`
- 主窗口布局度量：`src/composables/launcher/useLauncherLayoutMetrics.ts`
- 主窗口搜索状态：`src/composables/launcher/useLauncherSearch.ts`
- 主窗口命令目录编排：`src/composables/launcher/useCommandCatalog.ts`
- 主窗口搜索聚焦编排：`src/composables/launcher/useSearchFocus.ts`
- 主窗口暂存反馈编排：`src/composables/launcher/useStagedFeedback.ts`
- 主窗口窗口实例解析：`src/composables/app/useAppWindowResolver.ts`
- 主窗口终端执行桥接：`src/composables/launcher/useTerminalExecution.ts`
- 主窗口可见性编排：`src/composables/launcher/useLauncherVisibility.ts`
- 主窗口热键装配编排：`src/composables/app/useAppWindowKeydown.ts`
- 生命周期参数装配桥接：`src/composables/app/useAppLifecycleBridge.ts`
- watcher 参数装配桥接：`src/composables/launcher/useLauncherWatcherBindings.ts`
- 执行适配层：`src/services/commandExecutor.ts`
- Tauri 桥接层（invoke 收口）：`src/services/tauriBridge.ts`
- 窗口级热键处理器：`src/features/hotkeys/windowKeydownHandlers/`
- 内置命令模板：`src/features/commands/commandTemplates.ts`
- 运行时命令加载：`src/features/commands/runtimeLoader.ts`
- 运行时 schema guard：`src/features/commands/schemaGuard.ts`
- 命令运行时逻辑：`src/features/launcher/commandRuntime.ts`
- 文本高亮逻辑：`src/features/launcher/highlight.ts`
- 设置领域类型：`src/features/settings/types.ts`
- 终端 fallback 策略：`src/features/terminals/fallbackTerminals.ts`

当前 UI 与核心状态已完成第二阶段目录化收口；`App.vue` 只保留壳层编排，业务逻辑集中在 composables/features/components 子模块。

### 2.2 后端（当前）

- 入口：`src-tauri/src/main.rs`
- 装配入口：`src-tauri/src/lib.rs`
- 用户命令目录读取：`src-tauri/src/command_catalog.rs`
- 应用状态：`src-tauri/src/app_state.rs`
- 窗口行为：`src-tauri/src/windowing.rs`
- 热键注册与更新：`src-tauri/src/hotkeys.rs`
- 窗口位置持久化：`src-tauri/src/bounds.rs`
- 终端探测与执行：`src-tauri/src/terminal.rs`
- 启动装配（主窗口初始化/全局热键/托盘）：`src-tauri/src/startup.rs`

Rust 侧当前职责：

1. 全局唤起热键注册与更新
2. 主窗口显示/隐藏与尺寸调整
3. 托盘菜单
4. 主窗口位置 `x/y` 持久化
5. 终端探测与命令执行

---

## 3. 数据与配置（当前）

### 3.1 当前数据来源

1. 命令模板：启动时从 `assets/runtime_templates/commands/builtin/_*.json` 读取，做 schema guard 后映射为 `CommandTemplate[]` 并驻留内存（`src/features/commands/commandTemplates.ts`）。
2. 用户命令：从 `~/.zapcmd/commands/**/*.json` 读取，做 schema guard 后与内置命令合并（同 id 用户优先）。
3. 设置存储：Pinia + `localStorage` 版本化快照（`zapcmd.settings`），兼容迁移旧 key（`zapcmd.settings.hotkeys`/`zapcmd.settings.general`）。
4. 全局唤起热键：前端保存 + Rust 注册同步。
5. 主窗口会话：`zapcmd.session.launcher`（恢复暂存队列与面板展开态）。

### 3.2 文档资产现状

`assets/runtime_templates/commands/builtin/*.json` 已接入应用运行时读取；`docs/schemas/command-file.schema.json` 用作运行时 guard 对齐契约。

---

## 4. 当前行为基线

1. 默认唤起热键：`Alt+V`。
2. 搜索区 `Enter` 默认直接执行当前结果。
3. `ArrowRight` 将结果加入队列。
4. 队列串行执行，成功清空、失败保留。
5. 主窗口失焦自动隐藏。

更完整的“当前实现口径”见 `docs/active_context.md`（以代码 + 自动化回归为准）。

---

## 5. 主要技术债

1. 组合根已完成 ports/policies 解耦，但 `runtime/viewModel` 仍有一定跨领域装配密度，后续应继续收敛到更窄接口。
2. 交互状态机仍以组合式逻辑为主，尚未形成统一状态图文档。
3. 文档中的目标能力与当前实现差距较大。
4. lint/typecheck/test/coverage/Rust 本地与 CI 门禁已落地，后续重点是稳定维护与失败分流。
5. 命令治理仍停留在基础层（启停/冲突/导入校验），高级策略能力未产品化。

---

## 6. Roadmap（按当前代码可落地）

### 6.1 P1：稳定性与一致性

1. 保持单一窗口级热键入口，继续完善热键冲突回归测试。
2. 明确“命令输出在终端查看”的交互提示与文案。
3. 完善设置存储迁移与跨窗口同步回归。

### 6.2 P2：可维护性

1. 继续拆分 `useAppCompositionRoot/runtime.ts`（settings/queue/execution/window bindings）。
2. 固化目录级对外 API（index 导出约束 + 内部模块边界），避免回流到 `App.vue` 直连副作用实现。
3. 继续将窗口/同步状态按领域拆分 store/composable。

### 6.3 P3：能力接入

1. 扩展风险策略可配置能力（规则白名单、团队策略下发）。
2. 增强命令治理页面（分组筛选、批量操作、问题定位跳转）。

### 6.4 P4：工程化

1. 维持并固化 lint/typecheck/test/coverage/Rust 本地门禁。
2. 扩展前端单测覆盖并补关键 E2E。
3. 维护 CI 门禁 + 三平台发布构建矩阵，并补最小 E2E 冒烟。

---

## 7. 文档治理说明

1. 本文档描述“当前实现 + 路线图”，不再把未实现能力写成既成事实。
2. 涉及用户可见行为/交互语义时，以 `docs/active_context.md` + 自动化回归为准（并按需同步 `README*`）。
3. 每次行为改动后，同步更新（按变更类型选择）：
   - `docs/active_context.md`
   - 自动化回归测试（对应模块）
   - `README.md` / `README.zh-CN.md`（如影响开源用户使用方式）
