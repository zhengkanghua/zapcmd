# 执行链 / Settings / 文档门禁分阶段加固设计

> 日期：2026-03-21
> 状态：设计已确认，待规划
> 范围：Windows 终端复用与权限边界、命令 schema/runtime contract 闭环、SettingsWindow 契约收敛、默认终端有效性与持久化、adapter 层拆分边界、Rust 高频路径 `unwrap()` 恢复、文档与 coverage 口径同步
>
> 关联：
> - 本设计基于审查结论：`docs/plan/2026-03-21_01-project-elegance-robustness-review.md`
> - 本设计在“终端复用默认语义”上补充并 supersede 既有 Windows 设计：
>   - `docs/superpowers/specs/2026-03-21-windows-terminal-session-strategy-design.md`
>   - `docs/superpowers/specs/2026-03-21-windows-terminal-admin-routing-design.md`
>
> 明确不在本轮范围：
> - Tailwind 回归、迁移或样式栈切换
> - 新增 macOS / Linux 提权设计
> - 大规模 UI 视觉改版
> - 把 ZapCmd 主进程整体提升为管理员权限

---

## 1. 背景

当前仓库的整体方向没有跑偏，但有 4 类问题已经从“可接受技术债”进入“必须收口的系统问题”：

1. Windows 执行链已经具备基本终端策略与管理员路由能力，但“复用终端”和“最小权限边界”仍然绑在同一条状态链上，默认行为不够稳。
2. 命令文件 schema、运行时类型、前端执行前校验没有完全闭环，导致命令作者能声明一些限制，但系统不会真正执行这些限制。
3. SettingsWindow 的父子契约和热键录制流程已经发生漂移，`App.vue`、`viewModel.ts`、`SettingsWindow.vue`、`SHotkeyRecorder.vue` 对同一件事存在两套不一致的状态语义。
4. 文档、CI、coverage 口径和当前实现存在多处事实漂移，继续放任会直接误导贡献者和后续 agent。

这轮不做“大而全重构”，而是采用分阶段治理：先把高风险 contract 收紧，再拆 adapter 层，最后同步文档与门禁。

---

## 2. 方案选择

评估 3 种推进方式后，采用 **方案 A：分阶段治理，先保命再重构**。

| 方案 | 思路 | 结论 |
|---|---|---|
| A. 分阶段治理 | 先修执行链安全、contract、Settings 契约与持久化，再做 adapter 拆分，最后同步文档与 coverage | **采用** |
| B. 一次性大重构 | 执行链、Settings、adapter、文档一起重写 | 否决，回归面过大 |
| C. 只修现象 bug | 只补个别问题，不碰结构 | 否决，会继续积债 |

本设计后续所有规划都以方案 A 为唯一基线。

---

## 3. 设计目标

本轮设计目标是：

1. 把“是否复用终端”和“是否进入管理员终端”从隐式状态继承改成显式用户策略。
2. 让 schema、运行时类型、执行前校验和真实执行结果重新对齐，不再出现“定义支持、运行时忽略”的假 contract。
3. 收敛 SettingsWindow 的父子接口和热键录制状态源，删除已经失效的壳层能力。
4. 让默认终端的有效性从“打开设置页时顺手修一下”变成“系统级自愈并持久化”。
5. 给 adapter 层设清晰边界，阻止 `App.vue` / `viewModel.ts` / `LauncherFlowPanel.vue` / `useWindowSizing/controller.ts` 继续膨胀。
6. 清除 Rust 动画 / resize 高频路径上的 panic 面，把缓存类故障改成可恢复错误。
7. 把文档、README、CI、coverage 的口径统一成“代码真实行为优先”。

---

## 4. 非目标

本轮明确不做：

1. 不讨论是否重新引入 Tailwind，也不迁移现有 CSS 体系。
2. 不把 Windows 终端策略扩展成“同一执行流内普通终端和管理员终端混合拆分投递”。
3. 不把 `prerequisites` 设计成自动安装器或自动修复器。
4. 不在本轮对 `LauncherFlowPanel.vue`、`controller.ts` 做行为级重写，只定义拆分边界和落地顺序。

Tailwind 只作为延期架构议题记录：当前仓库事实仍以 `src/styles/index.css` + 语义化 CSS token 体系为准，本轮不改。

---

## 5. Phase 1：执行链与 contract 加固

### 5.1 Windows 终端复用策略改为三挡枚举

Settings 中新增终端复用策略枚举：

```text
never
normal-only
normal-and-elevated
```

默认值为 `never`。

产品语义如下：

1. `never`
   - 不复用任何既有终端会话。
   - 普通执行始终新开普通终端。
   - 管理员执行始终新开管理员终端。
2. `normal-only`
   - 只允许复用普通权限终端。
   - 需要管理员权限的执行始终新开管理员终端，不复用管理员终端。
3. `normal-and-elevated`
   - 允许复用普通终端。
   - 也允许复用管理员终端。
   - 这是唯一明确允许打破最小权限边界的选项，必须由用户显式开启。

这一定义会替换当前“跟随最近会话”的默认心智。后端不再因为“上一条命令恰好在管理员终端执行”就让后续普通命令隐式继承管理员上下文。

### 5.2 管理员执行以整次执行为单位升权

无论是单条命令还是执行流队列，只要当前执行中任一步 `adminRequired=true`，整次执行都按管理员终端处理。

规则如下：

1. 单条命令：
   - `requiresElevation = command.adminRequired === true`
2. 执行流：
   - `requiresElevation = items.some(item => item.adminRequired === true)`
3. 一旦 `requiresElevation=true`，整次执行只能进入管理员终端，不做队列内部分裂。
4. `normal-only` 下管理员执行仍允许发生，但只能新开管理员终端，执行完成后不会把普通执行链切到管理员复用语义。

### 5.3 Windows 路由层改为“用户策略 + 会话能力”双输入

Windows 后端路由不再只依赖“最近一次会话类型”，而是显式计算：

1. 当前执行需要的权限等级
2. 当前终端程序是否支持应用级复用
3. 用户设置的 `terminalReusePolicy`

建议收口为以下概念：

```rust
enum TerminalReusePolicy {
    Never,
    NormalOnly,
    NormalAndElevated,
}

enum WindowsSessionKind {
    Normal,
    Elevated,
}

struct ResolvedTerminalProgram {
    id: String,
    executable_path: PathBuf,
    supports_reuse: bool,
}
```

路由规则：

1. 先通过 discovery / 配置把终端解析成绝对路径的 `ResolvedTerminalProgram`。
2. 再按 `TerminalReusePolicy + requires_elevation + supports_reuse` 生成 `WindowsLaunchPlan`。
3. 对未知 `terminal_id` 直接返回结构化 `invalid-request`，不再静默 fallback 到 `powershell`。
4. 只有显式允许复用的 lane 才允许命中固定窗口或可复用会话。

### 5.4 最近会话状态改为原子结构，不再分裂成多个 `Mutex`

当前 `last_terminal_session_kind` 与 `last_terminal_program` 分开存储，会产生并发撕裂。新的状态模型必须原子化。

本轮要求：

1. 不再分开持有“权限种类”和“终端程序名”。
2. 若仍需要运行时记忆，必须改成单个结构体统一读写。
3. 如果复用策略改为按 lane 路由，应优先进一步收口成“可复用 lane 状态”，而不是“最近一次会话”。

建议方向：

```rust
struct WindowsReusableSessionState {
    normal: Option<ReusableTerminalLane>,
    elevated: Option<ReusableTerminalLane>,
}
```

这比“单一 latest session”更符合三挡复用策略，也不会让普通命令被管理员会话污染。

### 5.5 Settings 里的说明文案必须把风险讲清楚

终端复用不是普通“体验偏好”，它影响权限边界。Settings 里必须给出明确解释。

建议文案要求：

1. `never`
   - 说明“每次都新开终端，权限边界最清晰”
2. `normal-only`
   - 说明“普通终端可复用，管理员终端始终新开”
3. `normal-and-elevated`
   - 说明“管理员终端也会复用，可能让后续命令继续在管理员上下文中执行”
4. 风险说明应紧贴控件展示，不藏在帮助页里。

---

## 6. Phase 1：命令 schema/runtime contract 闭环

### 6.1 选择“实现 contract”，不选择“删字段收缩”

本轮对命令 schema 的选择明确为：

1. 保留 `validation.min`
2. 保留 `validation.max`
3. 保留 `prerequisites`
4. 让它们真正进入运行时和执行前校验

也就是说，本轮不采用“从 schema 和类型里删掉不会生效字段”的方案。

### 6.2 `min/max` 必须进入运行时参数模型与安全校验

当前 `runtimeMapper.ts` 没有把 `min/max` 映射到前端 `CommandArg`，`commandSafety.ts` 也没有消费它们。本轮必须补齐。

目标 contract：

1. schema 允许声明 `number` 参数的 `min/max`
2. runtime mapper 必须把这两个边界带入前端运行时模型
3. 执行前校验必须在“数值合法”之后继续校验边界
4. 错误提示优先复用 `validation.errorMessage`；未提供时走统一 i18n 文案

### 6.3 `prerequisites` 不允许再停留在 schema-only 元数据

`prerequisites` 本轮要从“可写但不执行”改成“有 transport、有检查结果、有阻断策略”的正式 contract。

统一行为：

1. runtime mapper 必须保留 prerequisite 列表，不允许在映射时丢弃。
2. 执行前新增 prerequisite preflight 阶段。
3. `required=true` 且检查失败时，阻断执行并展示结构化错误。
4. `required=false` 且检查失败时，不阻断执行，但要给出明确告警。
5. `fallbackCommandId` 只作为推荐替代，不自动切换命令。

### 6.4 prerequisite 检查能力分阶段实现，但不能再静默忽略

考虑到 `binary / shell / network / permission / env` 的实现复杂度不同，本轮允许分阶段落地，但不允许继续“schema 接受、运行时装没看见”。

收口规则：

1. 已支持的类型：
   - 必须给出真实 preflight 结果
2. 尚未支持的类型：
   - 命令导入阶段必须生成明确 load issue
   - 或在 preflight 阶段返回 `unsupported-prerequisite`
3. 不允许把未支持类型当成“检查通过”

这样即使某些类型延后实现，contract 也不会继续撒谎。

---

## 7. Phase 1：SettingsWindow 契约与热键录制收敛

### 7.1 清理失效 props / emits / viewModel 占位

`App.vue`、`viewModel.ts` 仍在向 `SettingsWindow` 传递一批已经不存在或未消费的能力。本轮必须一次性删干净。

清理原则：

1. 父组件只传 `SettingsWindow` 实际声明并消费的 props。
2. 父组件只监听 `SettingsWindow` 实际声明的 emits。
3. `viewModel.ts` 中已经没有真实实现的“关闭确认 / 错误导航 / 占位动作”全部删除。
4. 若未来需要恢复这些能力，必须以新 contract 重新设计，不能继续保留假接口。

### 7.2 热键录制以当前生产 UI 交互为准，去掉窗口级第二状态机

本轮将 `SHotkeyRecorder` 视为当前热键录制的真实交互来源，删除旧的窗口级热键录制状态机。

设计要求：

1. 保留 `SHotkeyRecorder` 当前“点击录制、按键采集、Escape 取消、blur 提交”的交互模型。
2. 删除 `recordingHotkeyField` 这一套窗口级录制状态。
3. 删除 `useAppWindowKeydown` 中仅服务于旧设置录制流程的特殊分支。
4. `useSettingsWindow/hotkey.ts` 只保留值更新、冲突检测和持久化，不再维护第二套录制状态。
5. 热键冲突提示继续由 Settings 数据状态驱动，而不是由全局录制状态驱动。

这样可以保证“测试覆盖的就是用户真正在点的那条链路”。

### 7.3 增加父子契约测试

本轮需要为 SettingsWindow 增加专门的接口契约测试，至少覆盖：

1. `SettingsWindow` 暴露的 props 与 `App.vue` 传入的一致
2. `SettingsWindow` 暴露的 emits 与 `App.vue` 监听的一致
3. 删除旧能力后，`App.vue` 不再透传死字段

---

## 8. Phase 1：默认终端有效性与持久化闭环

### 8.1 终端有效性不再由设置页“顺手修一下”

默认终端的有效性必须从设置页局部逻辑提升为应用级 contract。

本轮新增统一能力：

```ts
resolveEffectiveTerminal(requestedId, availableTerminals, fallbackOptions)
```

它负责：

1. 判断请求中的 `defaultTerminal` 是否仍然存在
2. 不存在时选择稳定回退目标
3. 返回 `effectiveId` 和 `corrected` 标记

### 8.2 校验时机改为“读取设置后 + 执行前”

新的校验时机：

1. 应用读取设置后立即做一次校验
2. 打开设置页并刷新终端列表后再做一次校验
3. 执行前仍做最后一次校验

执行链只允许消费 `effectiveTerminalId`，不允许直接拿原始 `defaultTerminal.value` 下发。

### 8.3 自愈回退必须持久化

只做内存回退是不够的。发生回退后必须：

1. 立即把新的 `defaultTerminal` 写回 settings store
2. 广播 settings updated
3. 需要时给用户非阻断提示

这一步要避免“用户没打开设置页之前一直拿着坏 terminal id 执行”的状态。

### 8.4 设置持久化审计口径

本轮对 Settings 的持久化审计结论如下：

1. 关键业务设置目前基本都有持久化入口
2. 明确漏项是“默认终端自愈回退后未持久化”
3. `availableTerminals`、`terminalLoading`、`settingsRoute`、错误态、录制中状态属于瞬态，不纳入持久化

因此本轮不扩大瞬态状态落盘范围，只修正真实业务漏项。

---

## 9. Phase 2：adapter 层拆分边界

### 9.1 目标不是重写，而是先建立边界

adapter 层的问题不是“文件大就有罪”，而是跨层透传已经让很多字段必须横穿 3 到 5 层。Phase 2 先做边界收口，不做行为翻新。

### 9.2 `viewModel.ts` 改成分区输出

`useAppCompositionRoot/viewModel.ts` 不再返回一个扁平超大对象，改成按边界输出：

1. `launcherVm`
2. `settingsVm`
3. `appShellVm`

`App.vue` 只负责把这三个边界对象传给对应窗口，不再在根组件手动解构几十个字段。

### 9.3 `LauncherFlowPanel.vue` 与 `useWindowSizing/controller.ts` 的拆分方向

Phase 2 的拆分目标：

1. `LauncherFlowPanel.vue`
   - 拆出列表渲染
   - 拆出参数内联编辑
   - 拆出拖拽排序相关逻辑
2. `useWindowSizing/controller.ts`
   - 拆出纯计算规则
   - 拆出 DOM 测量
   - 拆出 session / persistence 协调

要求：

1. 先拆边界，再拆文件
2. 不在拆分过程中顺手改用户行为
3. 每一次拆分都要有 contract test 兜底

---

## 10. Phase 2：Rust 高频路径 `unwrap()` 恢复策略

### 10.1 按场景分类，不做一刀切

`unwrap()` 不做“全仓清零”，但必须按场景分类治理：

1. 启动致命路径
   - 可保留显式失败
2. 高频 UI 路径
   - 禁止 `unwrap()`
3. 测试代码
   - 单独处理，不作为本轮重点

### 10.2 `current_size` 缓存改成可恢复访问

`animation/mod.rs` 和 `windowing.rs` 中的 `current_size` 只是窗口尺寸缓存，不是唯一真实来源。缓存坏了应当恢复，而不是 panic。

本轮设计要求：

1. 不再直接写 `current_size.lock().unwrap()`
2. 为尺寸缓存增加统一访问 helper 或包装类型
3. 读缓存失败时：
   - 记录日志
   - 从 poisoned mutex 中恢复内部值，或回退到安全默认值
4. 写缓存失败时：
   - 同样记录日志
   - 恢复并继续覆盖写入

建议收口为：

```rust
struct WindowSizeCache {
    inner: Mutex<(f64, f64)>,
}

impl WindowSizeCache {
    fn read_or_recover(&self) -> (f64, f64) { ... }
    fn write_or_recover(&self, width: f64, height: f64) { ... }
}
```

### 10.3 测试与验收

这块的验收不以“代码更优雅”为准，而以“不再因为缓存锁 poison 直接炸窗口”为准。

至少覆盖：

1. helper 的 poison recovery 单测
2. resize / animate 路径在异常缓存状态下不 panic
3. 原有窗口尺寸同步行为不回归

---

## 11. Phase 3：文档、门禁与 coverage 真相同步

### 11.1 生成产物必须提交

本轮文档口径统一为：

1. `assets/runtime_templates/commands/builtin`
2. `docs/builtin_commands.generated.md`

二者都属于必须提交的生成产物，与 CI 阻断规则保持一致。

### 11.2 样式入口文档按当前事实修正

当前事实是：

1. 样式入口为 `src/styles/index.css`
2. 当前仓库已移除 Tailwind 依赖
3. 样式体系以语义化 CSS + token 为准

因此本轮只修正文档事实：

1. 把 `src/styles.css` 的当前时描述改成历史路径或归档背景
2. 把“Tailwind + 手写 CSS”改成与当前代码一致的表述
3. 不在本轮讨论是否回归 Tailwind

### 11.3 coverage 口径扩大并拆分为 JS / Rust 两套事实

当前 90% 阈值只覆盖部分 TS 模块，不能再对外表达成“全仓高覆盖率”。

本轮要求：

1. JS coverage 扩展纳入 `src/components/**/*.vue`
2. README 和架构文档改成“核心前端逻辑覆盖率”或同等准确说法，直到范围扩完
3. Rust 单独维护关键链路测试指标，不把它混成同一组 JS 百分比

### 11.4 文档漂移清单同步

本轮一并修正文档事实：

1. 搜索说明补齐 `folder/category` 参与匹配
2. 清理 `.github/README*.md` 僵尸引用
3. `docs/README.md`、`docs/architecture_plan.md`、`docs/project_structure.md`、`docs/ui-redesign/README.md` 与 README 口径同步

### 11.5 计划文档目录冲突不作为本轮改造对象

由于当前 superpowers 工作流已经实际使用 `docs/superpowers/specs` 与 `docs/superpowers/plans`，本轮不做目录迁移。

只做两件事：

1. 文档里说明当前实际职责
2. 停止继续把旧目录结构写成唯一事实

---

## 12. 验收标准

本设计落地后，至少要满足以下结果：

1. Windows 默认不复用终端，只有用户显式修改 `terminalReusePolicy` 后才允许复用。
2. `normal-only` 不会复用管理员终端。
3. 执行流中任一步需要管理员权限时，整次执行进入管理员终端。
4. Windows 执行链只消费经过解析的终端程序，不再使用裸程序名兜底。
5. 未知 `terminal_id` 返回结构化错误，不再静默 fallback。
6. `validation.min/max` 在 schema、runtime mapper、执行前校验三层一致生效。
7. `prerequisites` 不再被静默忽略；已支持类型真实检查，未支持类型明确报出。
8. `App.vue` 不再向 `SettingsWindow` 透传死 props / emits。
9. 热键录制只有一套真实状态链，且就是当前生产 UI 在走的那条链路。
10. 默认终端失效后会在执行前自愈并持久化。
11. Rust resize / animation 路径不再因缓存锁 poison 直接 panic。
12. README、架构文档、CI、coverage 口径与当前实现一致。

---

## 13. 设计结论

本轮最终设计不是“再做一次大重构”，而是先把系统最薄弱的 contract 收紧：

1. Windows 终端复用改成用户显式枚举策略，默认不复用。
2. 权限升级以整次执行为单位，不再跟随最近会话隐式漂移。
3. schema / runtime / preflight 重新闭环。
4. SettingsWindow 去掉假接口，热键录制只保留生产 UI 的真实状态链。
5. 默认终端有效性前移到应用级 contract，并在自愈后持久化。
6. adapter 层先设边界，再拆实现。
7. Rust 高频 UI 路径禁止再用 `unwrap()` 赌不出错。
8. 文档、CI、coverage 一律以代码真实行为为准。

Tailwind 被明确记录为延期架构议题，但不纳入本轮改造。当前样式体系保持不变。
