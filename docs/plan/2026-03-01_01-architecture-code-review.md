# ZapCmd 代码/架构/鲁棒性审查与优化计划（2026-03-01）

> 创建日期：2026-03-01  
> 状态：Draft  
> 优先级：P0/P1  
> 版本目标：v1.0.1（建议）

---

## 1. 背景与目标

### 1.1 基线事实（以仓库当前代码为准）

1. 本地门禁 `npm run check:all` 全绿（lint/typecheck/test+coverage/build/cargo check）。
2. 覆盖率（`coverage/index.html`）：
   - Statements：89.63%（4894/5460）
   - Branches：81.79%（1150/1406）
   - Functions：94.8%（347/366）
   - Lines：89.63%（4894/5460）
3. 代码分层清晰：`features`（领域逻辑）/`composables`（编排）/`services`（I/O 边界）/`stores`（状态）/`src-tauri`（系统能力）。

### 1.2 优化目标（工程价值）

1. **鲁棒性**：消除“静默吞错”、修复潜在一致性问题，失败路径可观测且可定位。
2. **可维护性**：削减少数超大文件与“巨型 props/映射”，降低改动成本与漏改风险。
3. **契约一致性**：对齐 schema/文档/运行时行为（避免“schema 支持但运行时忽略”的隐性坑）。

---

## 2. 范围（In / Out）

### 2.1 In Scope

1. 前端：失败路径显式化、错误信息准确化、少量结构拆分（不改行为/少改行为）。
2. Rust：窗口移动持久化的线程模型优化、热键状态一致性修复、关键失败日志化。
3. 文档：补齐“当前实现口径”与 schema 行为说明。

### 2.2 Out of Scope

1. 新功能开发（如文件热重载用户命令、全量 E2E 体系接入）。
2. 大规模 UI 重构（仅做拆分与边界整理）。

---

## 3. 关键发现（真实问题 + 代码定位）

### 3.1 静默吞错（不符合“失败显式化”）

1. 前端读取 launcher 热键失败被静默忽略：`src/composables/app/useAppLifecycle.ts:121-128`（`catch {}`）。
2. 打开设置窗口 invoke 失败被静默忽略：`src/composables/app/useAppCompositionRoot/runtime.ts:194-196`（`.catch(() => {})`）。
3. Rust 初始化全局快捷键/插件注册失败被静默忽略：`src-tauri/src/startup.rs:52-62`（`let _ = ...`）。

**影响：**

- 热键/设置窗口打不开等关键能力失败时，用户与开发者难以定位问题（“看起来没事，但功能坏了”）。

### 3.2 Rust：窗口移动事件的线程风暴风险

- `WindowEvent::Moved` 每次触发都会 `std::thread::spawn`：`src-tauri/src/bounds.rs:208-227`。  
  拖动窗口时 move 事件高频，可能短时间创建大量线程（虽然 token 会抑制最终写入，但线程创建成本仍在）。

**影响：**

- 高负载/卡顿风险、难排查的“拖窗卡顿/CPU 占用异常”问题。

### 3.3 Rust：热键注册成功但内存态可能不一致

- 更新热键后写入 state 的锁失败被忽略：`src-tauri/src/hotkeys.rs:82-85`（`if let Ok(mut guard) = ...`）。  
  可能出现：系统层热键已更新，但 `get_launcher_hotkey` 仍返回旧值（或相反）。

### 3.4 设置保存的错误归因不准确

- `saveSettings()` 的 try/catch 包含多个操作（写后端热键、写 store、broadcast 等），但 catch fallback 文案是“updateLauncherHotkeyFailed”：  
  `src/composables/settings/useSettingsWindow/persistence.ts:76-95`。

**影响：**

- localStorage 失败/广播失败会被误报成“更新热键失败”，降低可诊断性。

### 3.5 更新启动自动检查的节流语义偏“失败也节流”

- 启动检查在网络请求前就写入 `zapcmd.lastUpdateCheck`：`src/services/startupUpdateCheck.ts:56-69`。

**影响：**

- 若首次检查因临时网络错误失败，接下来 24 小时内不会再自动检查（除非手动检查）。

### 3.6 schema 支持 `shell` 字段，但运行时忽略（契约漂移）

1. schema 允许 `shell`：`src/features/commands/schemaGuard.ts:226-229`。
2. `RuntimeCommand.shell` 存在：`src/features/commands/runtimeTypes.ts:59`。
3. 运行时映射未保留/执行层未使用：`src/features/commands/runtimeMapper.ts:69-90`，执行层也未消费。

**影响：**

- 用户命令文件填写 `shell` 会产生“看似支持、实际无效”的困惑与不可预期行为。

### 3.7 Web 预览模式执行“假成功”

- 浏览器环境下使用 `BrowserNoopCommandExecutor` 什么都不做：`src/services/commandExecutor.ts:21-25`。  
  但上层仍会显示“sent to terminal”成功反馈（执行层未区分）。

### 3.8 启动后“首次拖拽窗口”回弹（拖拽中断/疑似失焦）

**现象（多设备复现）：**

- 软件刚运行后，第一次拖拽主窗口（顶部 drag strip / `data-tauri-drag-region`）时，拖到一半会中断，窗口回到拖拽前位置；后续拖拽通常正常。
- 追加验证：启动后让软件空闲运行一段时间再去拖拽，**第一次拖拽仍会复现**（说明不是“刚启动那几秒”的短暂竞态）。
- 追加验证：若先让 ZapCmd **经历一次失焦**（点到别的窗口），再回到 ZapCmd **直接拖拽**，则**不会复现回弹**；如果不失焦直接拖拽，则更容易复现。
- 追加验证：发生“脱离拖拽”时，窗口会直接隐藏（类似触发了失焦自动 hide）。

**高概率原因（基于当前实现的“失焦自动隐藏 / 焦点事件”与拖拽时序冲突）：**

1. Rust 侧监听到 `WindowEvent::Focused(false)` 后，会在 220ms 延迟后执行 `window.hide()`：`src-tauri/src/bounds.rs:229-254`。  
   如果拖拽过程中出现一次短暂的 focus=false（Windows 上可能存在），就会**直接中断系统拖拽并隐藏窗口**，体感为“拖拽被打断/回弹”。
2. 前端在“窗口获得焦点”时会触发一次 **窗口尺寸同步**：
   - `useAppLifecycle` 绑定了 `window.focus` 与 Tauri `onFocusChanged`，都会走 `options.onAppFocused()`：`src/composables/app/useAppLifecycle.ts:56-60` + `src/composables/app/useAppLifecycle.ts:112-119`。
   - `onAppFocused()` 会调用 `syncWindowSizeImmediate()`：`src/composables/launcher/useWindowSizing/controller.ts:90-97`。
3. `syncWindowSizeImmediate()` 最终会调用后端命令 `set_main_window_size`：`src/composables/launcher/useWindowSizing/controller.ts:25-58`。
4. 后端 `set_main_window_size` 会在 `set_size` 后将窗口位置强制回写为“调用瞬间的 outer_position”：`src-tauri/src/windowing.rs:17-44`。  
   若这次调用发生在用户拖拽过程中（例如首次拖拽时窗口/网页视图刚获得焦点，触发了 `onAppFocused`），则**系统级拖拽会被打断**，并出现“回弹到拖拽前位置”的效果。

**与最新复现结果的对应解释（需要在落地时用日志再确认）：**

- “先失焦再拖拽不复现”很像：**`onAppFocused -> syncWindowSizeImmediate` 被提前触发并完成**（发生在你把窗口重新点回来的那个瞬间，尚未进入真正拖拽移动），从而避免在拖拽过程中触发后端 `set_main_window_size`。
- “不失焦直接拖拽复现”很像：首次交互时的 focus 相关回调（DOM focus / Tauri focusChanged）与拖拽启动时序交织，导致 `set_main_window_size` 在拖拽移动过程中执行，触发 position 回写并取消拖拽。

**为何“只发生第一次”：**

- `useWindowSizing` 内部会缓存 `lastWindowSize`，之后若尺寸变化在 epsilon 内会跳过 resize：`src/composables/launcher/useWindowSizing/controller.ts:37-42` + `src/composables/launcher/useWindowSizing/calculation.ts:88-99`。  
  因此只有第一次焦点驱动的 resize 可能真实触发后端 `set_main_window_size`，后续即便再次触发 focus 事件也更可能被 skip。

**本次最小修复（已落地，待手动回归确认）：**

- 目标：拖拽期间不允许被“自动 hide / 自动回写位置”打断。
- 修复点 A（后端 hide gate）：`WindowEvent::Focused(false)` 的 220ms 延迟隐藏逻辑中，若这段时间内窗口发生过 `WindowEvent::Moved`（通过 `AppState.move_save_token` 变化判断），则跳过 `hide()`，避免拖拽中被隐藏：`src-tauri/src/bounds.rs:229-254`。
- 修复点 B（后端 position gate）：`set_main_window_size` 在检测到窗口正在移动（本次命令执行期间收到 `WindowEvent::Moved`）时跳过 `set_position(prev_pos)`：`src-tauri/src/windowing.rs:17-44`。

---

## 4. 优化方案（按优先级）

### 4.1 P0：鲁棒性与可观测性（建议先做）

1. **前端禁止静默吞错**
   - `useAppLifecycle` 读取热键失败：改为 `console.warn` +（可选）用户可见的非阻断提示。
   - `runtime.ts` 打开设置窗口失败：至少 `console.error`，并回传可定位信息（window label、invoke name）。
2. **Rust：窗口 bounds 保存改为单任务 debounce**
   - 目标：拖动窗口期间最多 1 个后台任务在跑；稳定 500ms 后落盘一次。
   - 优选：使用 `tauri::async_runtime::spawn` + `tokio::time::sleep` 循环等待稳定。
3. **Rust：热键更新保证“注册状态”和“内存态”一致**
   - state 写入失败时应返回 Err，并尽量回滚已注册的热键到旧值，避免不一致。
4. **设置保存错误归因拆分**
   - 将“写后端热键/自启”“写 localStorage”“broadcast”拆为独立 try/catch，分别给出准确错误 key。
5. **启动更新检查节流语义调整（建议）**
   - 选项 A（推荐）：仅在 check 成功（请求完成）后写入 lastCheck；失败不更新或写入短间隔 retry。
   - 选项 B：保留“失败也节流”但在 UI/文档中明确说明。
6. **schema `shell` 字段策略对齐**
   - 近期（推荐）：文档明确“当前未生效”，并在 UI/issue 中可见。
   - 中期：执行层支持 `command.shell`（需要明确“终端应用 vs shell 解释器”的模型）。
7. **Web 预览模式显式禁止执行**
   - `BrowserNoopCommandExecutor` 直接抛错或返回可识别错误，让 UI 给出“仅桌面版支持执行”的提示，避免假成功。
8. **修复“启动后首次拖拽回弹”**
   - 结论：拖拽过程中出现 `Focused(false)` 会触发延迟隐藏，且 `onAppFocused -> syncWindowSizeImmediate -> set_main_window_size` 也可能与首次拖拽时序交织；两者都具备“中断拖拽”的触发条件。
   - 已落地修复（后端最小副作用）：
     - `Focused(false)` 延迟隐藏：拖拽移动期间不 hide：`src-tauri/src/bounds.rs:229-254`。
     - `set_main_window_size`：拖拽移动期间不回写 position：`src-tauri/src/windowing.rs:17-44`。
   - 回归验证：见 6.2.2（两条路径：未失焦直接拖拽 / 先失焦再拖拽）。

### 4.2 P1：可维护性（在 P0 后推进）

1. **拆分超大文件**
   - `src/stores/settingsStore.ts`（546 行）：拆为 `defaults/types/normalize/persistence` 等模块，store 仅保留 state/actions。
   - `src/components/settings/parts/SettingsCommandsSection.vue`（331 行）：拆出 FilterBar / IssueList / ListView / GroupView 子组件。
   - `src/composables/settings/useCommandManagement.ts`（320 行）：拆为 `filters.ts` / `grouping.ts` / `sorting.ts`（或按函数职责）。
2. **减少 App 层“巨型映射/巨型 props”**
   - `src/App.vue` + `src/composables/app/useAppCompositionRoot/viewModel.ts` 当前是“字段枚举式映射”，改动易漏。
   - 方案：把 ViewModel 拆为 `launcherVm` / `settingsVm` 两个对象，以单 prop 传入对应窗口（保持显式，但降低维护成本）。

---

## 5. 验收标准（可验证）

1. `npm run check:all` 全绿。
2. 前端不再存在 `.catch(() => {})` 与 `catch {}` 的静默吞错（允许“显式忽略”，但必须 log 且理由明确）。
3. Rust：拖动主窗口 5 秒内不会创建与 move 事件数量线性增长的线程/任务（实现应保证单 debounce 任务）。
4. Rust：更新 launcher 热键后，`get_launcher_hotkey` 与实际注册的全局热键保持一致；失败时有可读错误信息。
5. 设置保存失败时，错误提示能准确区分：
   - 后端写热键失败 / 写自启失败
   - localStorage 持久化失败
   - broadcast 同步失败（如有）
6. `shell` 字段：文档与实现一致（要么明确不支持，要么实现支持）。
7. Web 预览模式执行命令不会显示“成功发送到终端”的误导性反馈。
8. 启动后立即拖拽主窗口（首次拖拽）不会出现“拖拽中断/窗口回弹到旧位置”的问题（Windows/macOS/Linux 至少各验证 1 次）。
9. “无需先失焦”也能稳定拖拽：在 **未发生过失焦** 的情况下直接拖拽主窗口，拖拽不中断且不回弹。

---

## 6. 测试计划

### 6.1 自动化测试（必须）

1. Rust：
   - 为 bounds debounce 行为补单测（或最小集成测试），验证“多次 Moved 只触发一次写入”。
   - 为 hotkey 更新的回滚/一致性补测试（至少覆盖锁失败分支）。
2. 前端：
   - `useAppLifecycle`：当 `readLauncherHotkey` reject 时，应该 `console.warn`（用 `vi.spyOn(console, 'warn')`）。
   - `persistence.saveSettings`：分别模拟 localStorage 抛错/广播抛错，断言错误文案与状态正确。
   - Web 预览执行：断言显示“不可执行”反馈而不是 success。
   - （新增）窗口 sizing：补一个单测覆盖“拖拽期间不触发 requestSetMainWindowSize”的 gate（建议把 gate 抽成纯函数/小模块后测试）。

### 6.2 人工回归（按需）

1. 参考：`docs/.maintainer/work/manual_regression_m0_m0a.md`（热键、窗口显示/隐藏、设置窗口、执行链路）。
2. （新增）启动后首次拖拽回归：
   - 启动 ZapCmd 后立刻用顶部拖拽条拖动窗口 2-3 秒，确认不会中断、不会回弹；
   - 连续拖拽 3 次对比（首次/非首次一致）。
   - 对照组：先点到别的窗口让 ZapCmd 失焦，再点回 ZapCmd 并立刻拖拽；两种路径均应稳定无回弹。

---

## 7. 文档同步清单

1. `docs/active_context.md`：同步“shell 字段是否生效”“Web 预览执行语义”等行为口径。
2. `README.md` / `README.zh-CN.md`：如对用户命令字段语义（shell）产生影响，需要对外说明。
3. `docs/architecture_plan.md`：如 composition root / 命令执行模型有调整，需更新模块口径。

---

## 8. 风险与回滚

1. 风险点：
   - Rust debounce 改动可能影响“窗口移动后坐标持久化”的时机与频率。
   - 拆分文件可能引入循环依赖或导出路径变更。
2. 回滚策略：
   - 所有改动保持行为可回归；每个子任务独立落地并通过 `npm run check:all`。
   - Rust debounce 若出现问题，可回退到旧实现（保留 token 机制的同时减少 thread spawn）。

---

## 9. 任务拆解（建议执行顺序）

1. P0：前端去静默吞错（`useAppLifecycle` / `runtime.ts`）+ 补测试
2. P0：Rust bounds debounce 单任务化 + 补测试/日志
3. P0：Rust hotkey 更新一致性修复 + 补测试
4. P0：设置保存错误归因拆分 + 补测试
5. P0：shell 字段口径对齐（先文档，后实现/移除）
6. P0：Web 预览执行显式失败（避免假成功）
7. P1：拆分 `settingsStore.ts` / `SettingsCommandsSection.vue` / `useCommandManagement.ts`
8. P1：减少 App 级映射与 props
