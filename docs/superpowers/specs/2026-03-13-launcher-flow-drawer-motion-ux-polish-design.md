# ZapCmd｜Launcher 左侧 Flow 抽屉：动效修复 + UI/UX 细化设计稿

日期：2026-03-13  
状态：待实现 ⏳  
关联：`docs/superpowers/specs/2026-03-12-launcher-flow-drawer-nav-stack-design.md`（本设计稿是其“动效与视觉细化”补丁，不改变既有交互语义）

## 0. 背景

我们在 2026-03-12 设计稿中把 Param/Safety 从居中弹窗迁移为左侧 Flow 抽屉，并约定：

- 左侧 Flow 抽屉支持 **左进 / 取消左退 / 确认右退**。
- 与右侧 Review 抽屉并存时，左右各占 1/2，且过渡平滑。

当前实现已具备功能与结构，但存在以下体验问题：

1) 左侧抽屉的进入/退出动效“生硬”、不如右侧抽屉顺滑（像是动画未生效）。  
2) “确认/加入执行流”时应出现“向右退场”的完成态动效，但肉眼几乎看不到。  
3) Flow 抽屉内的视觉层级与信息编排还不够清晰：
   - 命令名称需要更强调（更深/更重）。
   - “填写参数”标题需要与退出按钮同一行。
   - “按 Enter 加入执行流/立即执行”的提示希望复用既有 `.keyboard-hint` 样式，而不是单行说明文字。

本设计稿目标是在不改变“行为口径”的前提下，修复动效机制并打磨 Flow 抽屉的 UI 细节。

## 1. 现状问题与根因（Root Cause）

### 1.1 动效未生效的根因

当前 `src/components/launcher/parts/LauncherFlowDrawer.vue` 使用 Vue `<Transition name="flow-drawer">`。

但现有 CSS 把 `transition`/`transform` 的主动画写在 **子元素** `.flow-panel` 上（例如 `.flow-drawer-enter-active .flow-panel { transition: transform ... }`），而 **Transition 的根元素** `.flow-overlay` 自身没有可计算的 enter/leave transition/animation。

Vue 过渡时长推断依赖“根元素的 computed transition/animation”，根元素为 0ms 时会导致：

- enter/leave 的 class 可能在同一帧内被移除
- 子元素上的“依赖这些 class 的过渡规则”无法稳定生效

观感上表现为：左侧抽屉出现/消失更像瞬切，缺少抽屉滑入/滑出的“拉出感”。

### 1.2 “确认右退”看不到的根因

当前 Flow 抽屉关闭时依赖 `v-if="props.pendingCommand || props.safetyDialog"` 直接卸载 DOM。

当用户点击“加入执行流 / 立即执行 / 确认执行”时，即使我们先设置了 `flow-overlay--exit-right`，只要上层状态同步把 `pendingCommand/safetyDialog` 清空，抽屉就会在下一次渲染中被卸载：

- 退场动画没有承载时间窗口
- 用户几乎看不到“向右退场”的完成态

> 结论：**需要把“关闭”拆成两个阶段：先进入 closing 动效态，动效结束后再真正清状态/执行动作。**

## 2. 目标（What）

### 2.1 动效目标

- Flow 抽屉具备与右侧抽屉一致的“抽屉拉出感”：
  - 打开：从左侧滑入 + 轻微淡入
  - 取消：向左退场
  - 确认：向右退场（“完成/提交”的视觉动线）
- 动效行为在 `prefers-reduced-motion: reduce` 下完全禁用（直接切换显示状态）。

### 2.2 UI/UX 目标

- 命令名称（例如“删除镜像”）需要成为 Flow 页的主视觉信息之一，强化层级：
  - 更深的文字颜色（接近 `var(--ui-text)`）
  - 更高 font-weight（建议 650–750）
  - 控制行高与溢出（避免挤压表单）
- 标题“填写参数”与关闭按钮同一行，并保持：
  - 左侧标题
  - 右侧关闭按钮
  - 中间可选的 keyboard hint（右对齐）
- “按 Enter …”提示使用既有 `.keyboard-hint` 组件样式：
  - `Enter` + 动作（`加入执行流` 或 `立即执行`）
  - 可选：补充 `Esc` + `取消`（是否显示由实现阶段决定，避免信息过载）

## 3. 非目标（Non-goals）

- 不改动 2026-03-12 设计稿的交互语义、键盘边界与禁用策略。
- 不在本迭代引入新的页面栈能力（仍以 Param/Safety 两页为主）。
- 不改变右侧 Review 抽屉的既有动效体系（本迭代对齐其“机制”，不是重做它）。

## 4. 方案（How）

### 4.1 从 Vue Transition 迁移为“状态类 + keyframes”

对齐右侧 Review 抽屉的动效机制：通过状态类驱动 `animation`，避免依赖 Vue 对根元素时长推断。

#### 4.1.1 状态机

为 Flow 抽屉引入内部状态（建议命名 `flowDrawerState`）：

- `closed`：不渲染（或渲染但 `display:none`，以实现为准）
- `opening`：开始播放进入动效
- `open`：稳定可交互态
- `closing-left`：取消/返回语义的退场
- `closing-right`：确认/提交语义的退场（向右）

关键点（两阶段关闭的责任归属）：**由 `LauncherFlowDrawer.vue` 内部兜住“先退场后卸载 DOM”**，父组件不需要（也不应）引入“延迟清状态/延迟执行”的额外复杂度。

- 交互（取消、加入执行流、确认执行）仍然 **立即 `emit`** 给父组件（避免破坏“必填为空不关闭”“Safety 取消回退到 Param”等业务口径）。
- 父组件收到 `emit` 后按既有口径同步清理 `pendingCommand/safetyDialog` 或触发执行。
- Flow 抽屉组件在检测到 `drawerOpen` 变为 false 后，切到 `closing-*` 状态播放退场，并 **延迟卸载 DOM**（动效结束后再真正移除），从而保证右退/左退动画可见。

> 这样可以保证“右退完成态一定可见”，并避免把时序复杂度扩散到运行时/Composable 层。

#### 4.1.2 动效协议（最小可实现接口）

为避免实现阶段自由发挥，本迭代固定动效“协议”（class 命名、作用元素、结束信号）：

- 状态类统一加在 `.flow-overlay` 上：
  - `flow-overlay--opening`
  - `flow-overlay--open`
  - `flow-overlay--closing-left`
  - `flow-overlay--closing-right`
- 动效作用元素：
  - 主要位移/淡入淡出：`.flow-panel`
  - 背景遮罩（仅在单抽屉且允许 scrim 时）：`.flow-overlay__scrim`
- 动效结束信号：
  - 默认用“定时器 + 常量时长”作为收敛手段（避免 `animationend` 在嵌套/禁用动效时不触发导致卡死）。
  - 允许（可选）叠加监听 `animationend` 做双保险，但**不应作为唯一信号**。

#### 4.1.3 动效时长（固定值，避免 flaky）

为保证左右抽屉节奏一致，本迭代以当前 `src/styles.css` 的既有数值为准（不再给区间）：

- Opening：`300ms`（panel 位移）；opacity `220ms`
- Closing-left：`220ms`（panel 位移）；opacity `200ms`
- Closing-right：`320ms`（panel 位移）；opacity `260ms`，并允许 `60ms` 延迟以营造“完成感”
- Scrim：`200ms`

实现阶段应将这些时长抽为常量（例如 `FLOW_DRAWER_OPEN_MS / FLOW_DRAWER_EXIT_LEFT_MS / FLOW_DRAWER_EXIT_RIGHT_MS`），并在测试中使用同一常量推进时间，避免定时数值散落。

#### 4.1.4 动效曲线（Easing）

- Opening：`cubic-bezier(0.175, 0.885, 0.32, 1.15)`（对齐现有抽屉“拉出感”）
- Closing-left：`ease-in`
- Closing-right：`cubic-bezier(0.175, 0.885, 0.32, 1.15)`（对齐“完成态更有动量”的语义）

### 4.2 DOM 结构与信息编排（Flow Header）

Flow 抽屉的 header 结构建议与 Review 抽屉对齐：

- `header.flow-panel__header`
  - `h2.flow-panel__title`：Param 页显示 `填写参数`；Safety 页显示 `props.safetyDialog.title`
  - `div.flow-panel__hint`：右侧对齐的 `.keyboard-hint`（只放最关键的一条）
  - `button.flow-close-button`：关闭

Param 页内容区（scroll）中展示：

- 命令名称（更强调）
- 表单字段列表

Safety 页内容区展示：

- 描述文本
- item 列表（保持既有结构即可）

### 4.3 Keyboard Hint 规则

在 Flow 抽屉中把“按 Enter …”改为：

- `.keyboard-hint` 单条提示：
  - `<kbd>Enter</kbd>` + `加入执行流`（当 `pendingSubmitMode === "stage"`；文本使用既有 `t("launcher.stageToQueue")`）
  - `<kbd>Enter</kbd>` + `立即执行`（当 `pendingSubmitMode === "execute"`；文本使用既有 `t("launcher.executeNow")`）

并明确替换策略：

- 移除/不再渲染 `.param-submit-hint`（避免与 `.keyboard-hint` 重复表达同一信息）。
- 仍保留运行时 i18n 文案（`runtime.submitExecuteHint/submitStageHint`）作为“非 UI 呈现的语义来源”（例如用于 a11y/未来 toast），但 Flow UI 不再直接把该段落渲染为正文。

是否同时显示 `Esc`（取消）由实现阶段判断：

- 若 header 空间允许且不挤压标题，则可同时显示 `Esc 取消`
- 否则只显示 `Enter`，避免信息密度过高

### 4.4 CTA（底部按钮）颜色规则

- stage（加入执行流）：submit 使用 `btn-stage`
- execute（立即执行）：submit 使用 `btn-success`（与 stage 做颜色区分）
- Safety 二次确认仍使用 `btn-danger`

## 5. 交互细节（Acceptance）

### 5.0 Search 触发口径（与 Flow 联动）

- `Enter` / 鼠标左键：立即执行（若需要参数/安全确认，则打开 Flow 且为 `execute` 模式）
- `→` / 鼠标右键：加入执行流（若需要参数/安全确认，则打开 Flow 且为 `stage` 模式）

### 5.1 Param 页

1) 打开 Param：左侧抽屉有“左进”动效；命令名视觉更突出。  
2) 取消：抽屉向左退场并关闭；焦点回到搜索框。  
3) 确认加入执行流：抽屉向右退场并关闭；队列计数更新；Review 不被强制改变。  

### 5.2 Safety 页

1) 打开 Safety：左侧抽屉有“左进”动效。  
2) 取消：按既有口径（回到 Param 或关闭），且退场为“左退”。  
3) 确认执行：抽屉向右退场并关闭，然后执行。  

### 5.3 并存与可交互性

- Flow 与 Review 同时打开时，左右均分且可交互；不应出现某一侧遮挡另一侧的可点击区域。
- 本迭代新增“硬不变量”，防止动效重构回归：
  1. `.flow-overlay` 维持 `pointer-events: none`；只有 `.flow-panel`（以及存在时的 `.flow-overlay__scrim`）为 `pointer-events: auto`。
  2. 当 `reviewOpen === true` 时，Flow 不渲染 scrim（现有口径保持），从而不会覆盖右侧抽屉的可点击区域。
  3. **closing-right 时允许降低 Flow 的层级**（当 Review 同时打开）：Flow 右退时可以“滑向右侧并被 Review 遮住”，而不是覆盖 Review 内容（对齐 2026-03-12 设计稿 §7.1 的允许项）。

### 5.4 Reduce Motion

当 `prefers-reduced-motion: reduce`：

- opening/closing 的滑动与淡入淡出应禁用
- 只保留显示状态切换
- 关闭时序必须可完成：在 reduce-motion 下，任何“延迟卸载”逻辑都应立即完成（例如 `queueMicrotask` / `Promise.resolve().then(...)` / `nextTick`），不得等待 `animationend`。

## 6. 测试与回归建议

在不做像素/动画轨迹断言的前提下，补充以下可测契约：

- 动效状态类存在性：
  - opening/closing-right/closing-left 的 class 切换逻辑正确
- “确认右退”不会被立即卸载：
  - 触发确认后，抽屉在一个短暂窗口内仍存在（直到动效结束才卸载）
- header 布局契约：
  - Param 页 header 同时包含标题与关闭按钮
  - 提示使用 `.keyboard-hint`（而不是 `.param-submit-hint` 文案段落）

> 测试稳定性建议（实现阶段约束）：对“短暂窗口仍存在”的断言应使用 fake timers，并依赖同一份动效时长常量推进时间，避免测试在 CI 上抖动。
