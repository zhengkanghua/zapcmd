# ZapCmd 项目代码 / 架构 / 鲁棒性审查与优化建议（2026-03-21）

> 状态：Review
> 方法：主代理静态审查 + 前端 / Rust / 文档与门禁三路只读子审查
> 结论：项目分层方向是对的，但还没有达到“整体优雅、契约稳定、鲁棒性高”的标准。问题主要集中在 Windows 执行链、前端窗口适配层、命令契约实现，以及文档与门禁一致性。

---

## 1. 总评

### 1.1 做得好的部分

1. **分层方向正确**：前端已经形成 `features / composables / services / stores / components` 的基本边界，Rust 端也把 `bounds / windowing / hotkeys / terminal / startup` 拆开，说明项目并不是“全堆在入口文件里”的失控状态。
2. **测试与门禁意识较强**：`package.json` 已经有 `lint / typecheck / test:coverage / build / check:rust / test:rust / e2e:desktop:smoke` 链路，说明工程化不是空白。
3. **可维护性意识存在**：组合根、ports、runtime/viewModel 分层已经建立，命令 schema、命令安全检查、设置迁移这些关键点也都有基础设施。

### 1.2 当前不够优雅的根因

1. **关键链路的 contract 没有闭环**：schema 支持的字段、前端执行前的校验、Rust 真正执行的语义，三者并未完全对齐。
2. **窗口级 adapter 层开始失控**：`App.vue`、`viewModel.ts`、`LauncherWindow.vue`、`LauncherFlowPanel.vue` 已经出现大对象透传、死字段保留、多职责组件堆积。
3. **Windows 执行链的安全与权限语义还不够硬**：这是当前最影响鲁棒性的部分。
4. **文档、CI、实际实现之间存在漂移**：会让贡献者和后续 Agent 误判系统真实状态。

---

## 2. P0 问题：优先修复

### 2.1 Windows 执行链的安全与权限语义不够稳

**真实问题**

1. `src-tauri/src/terminal/windows_routing.rs` 当前生成的 `WindowsLaunchPlan` 使用的是裸程序名，如 `wt`、`pwsh`、`cmd`、`powershell`。
2. `src-tauri/src/terminal/windows_launch.rs` 的普通启动与 `runas` 提权启动都直接消费这个程序名，而不是经过校验的绝对路径。
3. `src-tauri/src/terminal/windows_routing.rs` 当前的 `resolve_target_session_kind()` 会在 `requires_elevation=false` 时继承 `last_session_kind`，这意味着一次管理员执行后，后续普通命令可能仍然在管理员上下文里运行。
4. `src-tauri/src/app_state.rs` 把 `last_terminal_session_kind` 与 `last_terminal_program` 拆成两个独立 `Mutex`；`src-tauri/src/terminal.rs` 在读取与写回时也是分开处理，存在并发撕裂快照风险。
5. `src-tauri/src/terminal/windows_routing.rs` 对未知 `terminal_id` 直接 fallback 到 `powershell`，而不是明确返回非法请求。

**为什么这不是“风格问题”**

1. 这会直接影响安全边界、最小权限原则和执行可预测性。
2. 终端型产品一旦执行语义不稳定，前端提示再漂亮也不算鲁棒。

**优化建议**

1. 在后端引入 `ResolvedTerminalProgram`，统一把 discovery 结果收口为绝对路径后再生成 `WindowsLaunchPlan`。
2. 将“是否复用上一会话”和“是否以管理员权限执行”拆成两个独立决策；默认普通命令必须回到 `Normal`。
3. 把最近会话状态改成单个 `Mutex<LastTerminalSession>`，原子读写 `{ kind, program }`。
4. 把 `terminal_id` 收口为白名单 / 枚举，未知值直接返回 `invalid-request`。
5. 为 Windows 路由补充真实运行时 smoke，而不是只测 payload 拼接。

### 2.2 命令 schema 与运行时行为没有闭环

**真实问题**

1. `docs/schemas/command-file.schema.json` 与 `src/features/commands/runtimeTypes.ts` 都支持 `validation.min`、`validation.max`、`prerequisites`。
2. `src/features/commands/runtimeMapper.ts` 实际只映射了 `pattern`、`options`、`errorMessage`，并没有把 `min / max / prerequisites` 带入前端执行链。
3. `src/features/security/commandSafety.ts` 的参数校验只覆盖 `required / number / options / regex / 注入`，没有消费 `min / max / prerequisites`。

**影响**

1. 命令文件作者会以为 schema 里声明的限制在运行时生效，实际上并没有。
2. 文档和类型比实现“更强”，这会制造隐性误导。

**优化建议**

1. 二选一，但必须一次性定下来：
   - **方案 A：实现 contract**
     - 为 number 参数真正支持 `min / max` 校验。
     - 为 `prerequisites` 增加执行前检查与失败提示。
   - **方案 B：收缩 contract**
     - 从 schema、types、文档里删除当前不会生效的字段。
2. 无论选 A 还是 B，都要补对应回归测试，避免再次出现“schema 领先实现”的漂移。

### 2.3 SettingsWindow 契约已经漂移，热键录制存在双状态机

**真实问题**

1. `src/App.vue` 仍在向 `src/components/settings/SettingsWindow.vue` 传递一批组件没有声明 / 没有消费的 props 与 events。
2. `src/composables/app/useAppCompositionRoot/viewModel.ts` 里还保留了 `cancelSettingsCloseConfirm`、`discardUnsavedSettingsChanges` 这类无实现占位。
3. `src/components/settings/ui/SHotkeyRecorder.vue` 自己维护 `recording` 状态与键盘捕获。
4. 但 `src/composables/settings/useSettingsWindow/hotkey.ts`、`src/composables/app/useAppWindowKeydown.ts`、`src/features/hotkeys/windowKeydownHandlers/settings.ts` 仍维护另一套“窗口级热键录制状态机”。

**影响**

1. 父组件以为自己接上了“关闭确认 / 错误导航 / 热键录制”等能力，实际上部分绑定已经是死线。
2. 测试可能覆盖的是未接入 UI 的旧链路，而不是真正用户在点的那条链路。

**优化建议**

1. 让 `SHotkeyRecorder` 变成受控组件，由 `useSettingsWindow` 提供唯一录制状态源。
2. 如果关闭确认、错误导航等能力已经废弃，就从 `viewModel.ts` 和 `App.vue` 一次性删掉，不要保留假接口。
3. 为 `SettingsWindow` 增加一条 props / emits 契约测试，专门防止父子接口继续漂移。

### 2.4 默认终端有效性没有在执行前闭环保证

**真实问题**

1. `src/stores/settings/normalization.ts` 的 `normalizeTerminalId()` 只保证是非空字符串，不保证这个终端真实可用。
2. `src/composables/app/useAppLifecycle.ts` 只有设置窗口路径才会加载可用终端列表。
3. `src/composables/launcher/useTerminalExecution.ts` 执行时直接使用 `defaultTerminal.value`。
4. `src/composables/settings/useSettingsWindow/terminal.ts` 虽然会在设置窗口里做 `ensureDefaultTerminal()`，但 `src/composables/settings/useSettingsWindow/persistence.ts` 的 `loadSettings()` 不会把回退结果持久化。

**影响**

1. 主窗口可能长期持有一个不存在的终端 id。
2. 修复只发生在“用户打开设置页”之后，不是系统级自愈。

**优化建议**

1. 新增统一的 `resolveEffectiveTerminal()`。
2. 在“读取设置后”和“真正执行前”都做一次校验。
3. 一旦发生回退，立即持久化，并给用户非阻断提示。

---

## 3. P1 问题：会持续抬高维护成本

### 3.1 Launcher / Settings adapter 层已经出现巨型 props drilling

**真实问题**

1. `src/composables/app/useAppCompositionRoot/viewModel.ts` 返回一个扁平大对象。
2. `src/App.vue` 做超长解构并继续平铺透传。
3. `src/components/launcher/parts/LauncherFlowPanel.vue` 当前 755 行。
4. `src/composables/launcher/useWindowSizing/controller.ts` 当前 630 行。
5. `src/components/settings/ui/SDropdown.vue` 443 行，`src/composables/settings/useCommandManagement.ts` 402 行。

**影响**

1. 修改一个交互往往需要横穿 viewModel、App、窗口组件、子组件四层。
2. 死 props、死字段和“只声明不消费”的问题会越来越多。

**优化建议**

1. 先把 view model 改成 `launcherVm / settingsVm` 两个嵌套边界。
2. `LauncherFlowPanel` 至少拆出：
   - 高度观测
   - 拖拽排序
   - 参数内联编辑
3. `useWindowSizing/controller.ts` 继续下沉纯计算与状态同步逻辑，避免继续堆流程控制。

### 3.2 Rust 动画 / resize 链仍存在 panic 面

**真实问题**

1. `src-tauri/src/animation/mod.rs` 多处对 `current_size.lock().unwrap()` 做硬 unwrap。
2. `src-tauri/src/windowing.rs` 同样有 `ctrl.current_size.lock().unwrap()`。

**影响**

1. 一旦该 `Mutex` 被 poison，窗口 resize / animation 这条高频路径会直接 panic。
2. 这类 panic 会非常难从前端感知，属于高代价故障。

**优化建议**

1. 不要在窗口高频路径里用 `unwrap()`。
2. 统一改成可恢复分支：
   - `lock().map_err(...)` 后向上返回错误，或
   - 在 poison 时恢复到最后一个安全默认值。

### 3.3 “打开主页”错误边界缺失且实现重复

**真实问题**

1. `src/composables/app/useAppCompositionRoot/context.ts` 与 `src/AppSettings.vue` 都直接调用 `openExternalUrl()`。
2. 默认 ports 实现失败时没有统一用户反馈。

**优化建议**

1. 收口为单一 `openHomepage()` service。
2. 返回结构化结果，失败时接入 toast 或 `settingsError`。
3. 删除重复入口实现。

---

## 4. 文档与门禁问题

### 4.1 生成产物提交规则互相冲突

**真实问题**

1. `docs/README.md` 仍把 Markdown 快照写成“可选且不要求提交到仓库”。
2. 但 CI 的 `.github/workflows/ci-gate.yml` 实际把 `docs/builtin_commands.generated.md` 当作阻断项。

**优化建议**

1. 统一公开口径。
2. 建议把 `docs/builtin_commands.generated.md` 正式写成必提交产物，因为当前 CI 已经如此执行。

### 4.2 当前阻断门禁没有覆盖最脆弱的真实执行链

**真实问题**

1. Windows 执行、UAC、failure-first 输出是产品核心能力。
2. 但当前阻断 desktop smoke 主要覆盖启动、搜索、抽屉开合等 UI 流程，没有覆盖真实执行链。

**优化建议**

1. 至少新增一条“真实执行命令”的阻断桌面 smoke。
2. Windows 再加一条管理员 / UAC 路径验收。

### 4.3 架构文档与当前实现存在漂移

**真实问题**

1. `docs/architecture_plan.md` 仍写“Tailwind + 手写 CSS”，但 `package.json` 已无 Tailwind 依赖。
2. `docs/architecture_plan.md`、`docs/project_structure.md`、`docs/ui-redesign/README.md` 仍引用 `src/styles.css`，而当前入口已是 `src/styles/index.css`。
3. `docs/architecture_plan.md` 仍写 “E2E 测试体系未接入”，但仓库已存在阻断型 desktop smoke。

**优化建议**

1. 更新架构与上手文档到真实现状。
2. 把历史路径标成“归档背景”，不要继续写成当前事实。

### 4.4 覆盖率口径容易误导

**真实问题**

1. `vitest.config.js` 的 coverage 只覆盖 `src/App.vue`、`src/composables`、`src/features`、`src/services`、`src/stores`。
2. 关键组件层和 Rust 执行链并不在这组 90% 阈值里。

**优化建议**

1. 扩大 JS 覆盖范围到 `src/components/**`，并为 Rust 建独立指标；或
2. 收紧文档说法，只称之为“TS 核心模块覆盖率”。

---

## 5. 建议执行顺序

### 5.1 第一轮（先保命）

1. 修 Windows 执行链：绝对路径、权限语义、终端 id 白名单、最近会话原子状态。
2. 收口命令 contract：`min/max/prerequisites` 要么实现，要么删掉。
3. 清理 SettingsWindow stale contract，统一热键录制单一状态机。
4. 增加 `resolveEffectiveTerminal()`，把默认终端校验前移到执行前。

### 5.2 第二轮（再收维护成本）

1. 拆 `LauncherFlowPanel.vue` 与 `useWindowSizing/controller.ts`。
2. 将 view model 改成嵌套边界，移除死 props / 死 emits / 死测试。
3. 修复动画与 resize 高频路径中的 `unwrap()`。

### 5.3 第三轮（文档和治理补齐）

1. 统一生成产物提交规则。
2. 更新架构文档、结构文档、coverage 口径。
3. 明确计划文档的唯一落点：`docs/plan/*`、`docs/superpowers/plans/*`、`plan/*` 三者必须有明确职责边界。

---

## 6. 验收标准

1. Windows 未请求提权的命令不会复用管理员会话。
2. Windows 执行链不再使用裸程序名启动终端。
3. 未知 `terminal_id` 直接返回结构化错误，而不是静默 fallback。
4. `min/max/prerequisites` 与 schema / runtime / UI 行为完全一致。
5. `SettingsWindow` 的 props / emits 契约有测试保护，`App.vue` 不再传递死接口。
6. 默认终端回退在执行前即可生效，且会持久化。
7. `LauncherFlowPanel.vue`、`useWindowSizing/controller.ts` 不再继续膨胀，职责明显收窄。
8. CI 至少覆盖一条真实执行命令路径。

---

## 7. 审查结论

ZapCmd **不是架构失控项目**，但也**不能算已经优雅收口**。底层拆分方向正确，工程化基础存在，说明项目具备继续变好的骨架；但关键 contract、Windows 执行语义、窗口级 adapter 层和文档治理还没有闭环。当前最该做的不是继续加功能，而是先把执行链、契约和 adapter 层的真实性做硬。
