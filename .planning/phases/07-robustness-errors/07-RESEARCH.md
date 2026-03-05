# Phase 7: 鲁棒性与错误提示增强 - Research

**Researched:** 2026-03-05  
**Domain:** 命令加载/执行/更新三条失败链路的可见性、可定位性、可操作性  
**Confidence:** HIGH（仓库代码与测试现状） / MEDIUM（Updater 行为细节依赖官方文档）

<phase_requirements>
## Phase Requirements

| ID | Description (from REQUIREMENTS.md) | Research Support |
|----|------------------------------------|------------------|
| ROB-01 | 命令加载/解析失败给出明确错误提示（来源、命令标识、失败原因），不吞错误 | 明确识别现有 `loadIssues` 契约缺口（无 reason/read-failure），给出统一错误契约与 UI 落点。 |
| ROB-02 | 命令执行失败（终端不可用/参数非法/被安全策略拦截）提示可操作解决方案/下一步 | 识别执行链路的 silent path 与泛化文案问题，给出错误分类器 + next-step 映射策略。 |
| ROB-03 | 更新流程（检查/下载/安装）失败提示清晰，且失败不会导致应用不可用或坏状态 | 给出更新状态机增强方案（失败阶段化、可重试、按钮状态恢复、不中断主流程）。 |
</phase_requirements>

## 用户约束（来自本次请求）

- 本 phase 只聚焦 `ROB-01 / ROB-02 / ROB-03`。
- 输出必须服务于“如何把 PLAN 做好”：实现策略、风险热点、测试策略、planner 可消费产物。
- 产物路径固定：`.planning/phases/07-robustness-errors/07-RESEARCH.md`。

## 执行摘要（给 planner 的一句话）

本 phase 应先建立一个跨模块统一“错误语义层”（错误类别 + 来源 + 命令标识 + 原因 + next step），再分别落到命令加载、命令执行、更新流程三条链路；否则会出现“日志有错、用户无感知”或“有提示但不可操作”的回归空洞。

**Primary recommendation:** 先做错误契约与文案映射，再做各链路接入和回归矩阵，不要直接在各处拼接字符串。

## 现状盘点（基于仓库真实代码）

### ROB-01：命令加载/解析失败

现有能力：
- 前端加载器已区分 `invalid-json / invalid-schema / duplicate-id / shell-ignored`，并包含 `sourceId`、部分场景含 `commandId`。  
  证据：`src/features/commands/runtimeLoader.ts`（`CommandLoadIssue` 与 `issues.push` 逻辑）。
- 设置页可展示导入问题清单。  
  证据：`src/components/settings/parts/SettingsCommandsSection.vue`（`commandLoadIssues` 渲染）。

关键缺口：
1. **read 级失败被吞成 console.warn**  
`refreshUserCommands()` 捕获 `readUserCommandFiles` 异常后只 `console.warn`，用户无提示。  
证据：`src/composables/launcher/useCommandCatalog.ts`（`failed to refresh user command files`）。
2. **reason 不可追溯**  
`invalid-json` 只报“解析失败”，未携带 parser reason；`invalid-schema` 只报“schema 失败”，无字段级失败原因。
3. **命令标识不完整**  
文件级失败场景无 `commandId`，会影响“定位到具体命令”的能力。

### ROB-02：命令执行失败

现有能力：
- 单命令/队列执行异常会进入 `execution.failed` 或 `execution.queueFailed`。  
  证据：`src/composables/execution/useCommandExecution/helpers.ts`、`actions.ts`。
- 安全拦截（注入/高危）可见，且不会执行。  
  证据：`src/features/security/commandSafety.ts` + `useCommandExecution/actions.ts`。

关键缺口：
1. **参数必填为空时 silent return**  
`submitParamInput()` 在 `shouldRejectPendingSubmit()` 命中后直接 return，没有用户提示。  
证据：`src/composables/execution/useCommandExecution/actions.ts`。
2. **终端不可用与其他错误未分类**  
当前主要透传 `error.message`，用户可能看到系统原始错误但无 next step。
3. **“可操作下一步”粒度不足**  
`failedFallback` 仅“检查终端环境或参数”，缺少场景化动作（切换终端、修正参数、查看安全原因等）。

### ROB-03：更新流程失败

现有能力：
- `checkUpdate()`/`downloadUpdate()` 失败会进入 `updateStatus: error`，不会让应用崩溃。  
  证据：`src/composables/update/useUpdateManager.ts`。
- About 页可显示错误文本。  
  证据：`src/components/settings/parts/SettingsAboutSection.vue`。

关键缺口：
1. **错误阶段不可区分**（check/download/install 共用 `state: "error"`）
2. **文案语义偏“检查失败”**  
`settings.about.updateFailed` 在下载/安装失败也复用，语义不准确。  
证据：`src/i18n/messages.ts`。
3. **无明确重试指引**  
例如“重试检查”“切换网络/代理”“稍后手动下载 release”未结构化呈现。

## 风险热点（优先级）

| Priority | Hotspot | 风险描述 | 影响需求 |
|----------|---------|---------|----------|
| P0 | `useCommandCatalog.refreshUserCommands` 异常仅 warn | 真实读盘失败不可见，违反“不吞错” | ROB-01 |
| P0 | 参数必填为空 silent return | 用户无反馈，行为像“点了没反应” | ROB-02 |
| P1 | `CommandLoadIssue` 缺少 `reason/stage` | 提示可见但不可定位到根因 | ROB-01 |
| P1 | 执行错误无统一分类 | 无法提供稳定 next-step，回归断言脆弱 | ROB-02 |
| P1 | 更新错误无阶段字段 | check/download/install 文案混用，修复建议不精准 | ROB-03 |
| P2 | schema 校验仅 boolean | 难输出字段级失败原因，影响诊断质量 | ROB-01 |

## 标准栈与约束（与当前仓库对齐）

### Core

| Library/Module | Version/State | Purpose | 备注 |
|----------------|---------------|---------|------|
| Vue | `^3.5.22` | 前端状态与组件 | 当前主 UI 运行时 |
| Tauri API | `^2.8.0` | 前后端命令桥 | `invoke` 错误走 Promise reject |
| Tauri Updater Plugin | `^2` | 更新检查/下载/安装 | `check(): Promise<Update \| null>` |
| Rust backend commands | 本仓库 `src-tauri` | 终端执行、命令目录读取 | 错误通过 `Result<_, String>` 传回前端 |
| Vitest + Vue Test Utils | `^3.2.4` / `2.4.0` | 单测/组件测试 | 覆盖率门禁 90%+ |

### Don’t Hand-Roll（本 phase 避免）

| Problem | 不要手写 | 用现有能力 |
|--------|----------|------------|
| 更新下载进度协议 | 自定义 IPC 事件协议 | `@tauri-apps/plugin-updater` 的 `Started/Progress/Finished` |
| 终端执行失败传播 | 手工吞错后拼随机文案 | Rust `Result<String>` + 前端统一错误分类器 |
| 校验失败展示 | 各模块各写一套字符串拼接 | 统一错误模型 + i18n key 映射 |

## 推荐实施策略（可直接拆 PLAN）

### Strategy A：先落“统一错误契约层”（跨 ROB-01/02/03）

建议新增一个轻量错误语义层（可放 `src/features/errors/`）：
- `kind`：错误类型（如 `command-load-read-failed`、`execution-terminal-unavailable`、`update-download-failed`）
- `stage`：失败阶段（load/parse/schema/execute/check/download/install）
- `sourceId`：来源文件或模块
- `commandId?`：可定位命令标识（可为空）
- `reason`：可读失败原因（短文本）
- `nextStepKey`：i18n 映射（确保“可操作”）

收益：
- 降低字符串散落，测试断言能基于 `kind/stage` 稳定。
- 新增失败分支时不需重写 UI 逻辑。

### Strategy B：ROB-01 命令加载链路增强

1. 扩展 `CommandLoadIssue`（至少新增 `stage` + `reason`，必要时 `kind`）。
2. `runtimeLoader`：
- `invalid-json` 存 parser 原始错误摘要（截断长度，避免过长）。
- schema 校验从 boolean 升级为带 reason 的 validator（至少给出 first-failure path）。
3. `useCommandCatalog.refreshUserCommands`：
- catch 分支不只 warn；应写入可展示 issue（例如 `read-failed`）。
4. 设置页展示：
- 一行结构建议：`[stage] sourceId · commandId · reason`。
- 保留 badge + sourcePath 联动，便于定位。

### Strategy C：ROB-02 执行失败可操作化

1. 在 `submitParamInput` 的 required-missing 分支给出明确错误反馈（不再 silent）。
2. 建立执行错误分类器：
- 终端不可用（ENOENT/终端不存在）
- 参数非法（required/number/options/pattern/injection）
- 安全策略拦截（保持现有）
- 未知错误
3. i18n 将“失败原因”与“下一步”拆开：
- `execution.failedWithAction` / `execution.nextStep.*`
4. 队列和单条执行共用分类器，避免行为分叉。

### Strategy D：ROB-03 更新流程状态机加固

1. `UpdateStatus` 扩展 `error` 子类型：至少包含 `stage: check | download | install`。
2. `useUpdateManager`：
- check/download/install 各自捕获并映射到对应阶段错误。
- 失败后保证按钮状态可恢复（可再次 check 或 download）。
3. `SettingsAboutSection`：
- 按 `stage` 展示对应文案与下一步按钮（重试检查/重试下载）。
4. 自动检查（startup）失败策略：
- 保持非阻断，但建议记录可观察信号（可选轻提示，不打断主流程）。

## 建议计划切片（给 planner）

> 结合 `STATE.md` 当前 “Phase 07 总计划数=2” 的节奏，建议按 2 个 PLAN 落地。

### Plan 07-01：命令加载错误契约与可见性（ROB-01 主体）

目标：
- 完成加载链路错误结构化（read/parse/schema/merge）。
- 设置页可见“来源 + 命令标识 + 原因”，且不吞 read 失败。

重点文件：
- `src/features/commands/runtimeLoader.ts`
- `src/features/commands/schemaGuard.ts`
- `src/composables/launcher/useCommandCatalog.ts`
- `src/composables/settings/useCommandManagement.ts`
- `src/features/settings/types.ts`
- `src/components/settings/parts/SettingsCommandsSection.vue`
- `src/i18n/messages.ts`

完成定义（DoD）：
- 读盘失败、JSON 失败、schema 失败均可用户可见。
- 每条 issue 至少含 source + reason；可识别命令时含 commandId。
- 相关单测覆盖新增字段与渲染行为。

### Plan 07-02：执行/更新失败提示增强（ROB-02 + ROB-03）

目标：
- 执行失败具备场景化下一步；
- 更新失败按阶段提示且可重试，不进入坏状态。

重点文件：
- `src/composables/execution/useCommandExecution/helpers.ts`
- `src/composables/execution/useCommandExecution/actions.ts`
- `src/composables/update/useUpdateManager.ts`
- `src/features/update/types.ts`
- `src/components/settings/parts/SettingsAboutSection.vue`
- `src/services/startupUpdateCheck.ts`（若纳入可观察失败）
- `src/i18n/messages.ts`

完成定义（DoD）：
- 参数空值不再 silent。
- 执行失败、拦截失败、终端失败均有可操作 next step。
- 更新 check/download/install 失败可区分且重试路径明确。

## 测试策略（Phase Requirements → Test Map）

| Req ID | 行为 | 测试类型 | 建议测试文件 | Automated Command |
|--------|------|----------|-------------|-------------------|
| ROB-01 | read/parse/schema 失败可见且包含定位信息 | unit + composable + component | `src/features/commands/__tests__/runtimeLoader.test.ts`, `src/composables/__tests__/launcher/useCommandCatalog.test.ts`, `src/composables/__tests__/settings/useCommandManagement.test.ts`, `src/components/settings/parts/__tests__/SettingsCommandsSection*.test.ts` | `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts src/composables/__tests__/launcher/useCommandCatalog.test.ts src/composables/__tests__/settings/useCommandManagement.test.ts` |
| ROB-02 | 参数非法/终端不可用/安全拦截均有可操作提示 | unit + integration | `src/composables/__tests__/execution/useCommandExecution.test.ts`, `src/services/__tests__/commandExecutor.test.ts`, `src/__tests__/app.failure-events.test.ts` | `npm run test:run -- src/composables/__tests__/execution/useCommandExecution.test.ts src/services/__tests__/commandExecutor.test.ts src/__tests__/app.failure-events.test.ts` |
| ROB-03 | 更新 check/download/install 失败分阶段提示且可恢复 | unit + component + app | `src/composables/__tests__/update/useUpdateManager.test.ts`, `src/services/__tests__/updateService.test.ts`, `src/services/__tests__/startupUpdateCheck.test.ts`, `src/__tests__/app.settings-hotkeys.test.ts` | `npm run test:run -- src/composables/__tests__/update/useUpdateManager.test.ts src/services/__tests__/updateService.test.ts src/services/__tests__/startupUpdateCheck.test.ts src/__tests__/app.settings-hotkeys.test.ts` |

阶段门禁建议：
- 快速回归：按上表分组命令执行。
- Phase gate：`npm run check:all`（包含 TS + Vue + Rust + 覆盖率）。

## Planner 可直接消费的产物清单

1. **错误契约定义文档（本 phase 内代码注释/类型即文档）**
- `CommandLoadIssue` 新字段说明
- `ExecutionFailureKind` / `UpdateErrorStage` 枚举说明
2. **i18n 键清单**
- ROB-01 新增 issue reason/next-step 键
- ROB-02 新增执行失败 next-step 键
- ROB-03 新增更新阶段失败键
3. **回归矩阵**
- 失败场景 → 预期文案片段 → 预期行为（是否调用执行函数/是否可重试）
4. **计划切片模板**
- 07-01（加载链路）与 07-02（执行+更新）的文件责任边界

## 关键开放问题（planning 前需定）

1. **命令加载 read 失败提示落点**  
仅放设置页“命令管理”是否足够？还是需要在主窗口给一次轻提示（避免用户不知道为何命令缺失）。

2. **更新安装成功后的产品行为**  
当前到 `installing` 后未显式提示“需重启生效”；是否本 phase 一并补“重启提示/按钮”。

3. **schema 失败 reason 粒度**  
是否接受“首个失败字段路径 + 原因”作为 v1，避免一次性做完整 JSON schema error 列表导致复杂度超标。

## Sources

### Primary（HIGH）
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/ROADMAP.md`
- `src/features/commands/runtimeLoader.ts`
- `src/composables/launcher/useCommandCatalog.ts`
- `src/composables/settings/useCommandManagement.ts`
- `src/components/settings/parts/SettingsCommandsSection.vue`
- `src/composables/execution/useCommandExecution/helpers.ts`
- `src/composables/execution/useCommandExecution/actions.ts`
- `src/features/security/commandSafety.ts`
- `src/composables/update/useUpdateManager.ts`
- `src/services/updateService.ts`
- `src/services/startupUpdateCheck.ts`
- `src/components/settings/parts/SettingsAboutSection.vue`
- `src/i18n/messages.ts`
- `src-tauri/src/command_catalog.rs`
- `src-tauri/src/terminal.rs`
- `src-tauri/src/lib.rs`
- `src/composables/__tests__/execution/useCommandExecution.test.ts`
- `src/composables/__tests__/launcher/useCommandCatalog.test.ts`
- `src/composables/__tests__/update/useUpdateManager.test.ts`
- `src/services/__tests__/updateService.test.ts`

### Secondary（MEDIUM）
- Tauri docs: Updater plugin (`v2`)  
  https://v2.tauri.app/plugin/updater/
- Tauri docs: Calling Rust commands / invoke error handling  
  https://v2.tauri.app/develop/calling-rust/
- 本地类型定义（已安装依赖）：`node_modules/@tauri-apps/plugin-updater/dist-js/index.d.ts`  
  关键点：`check(): Promise<Update | null>`、`available` deprecated、下载事件 `Started/Progress/Finished`。

## RESEARCH COMPLETE

