# 参数面板重构：导航栈 + CommandPanel 设计

> 日期：2026-03-15
> 状态：approved
> 范围：Launcher 主窗口——参数填写/高危确认面板重构

---

## 1. 背景与动机

当前参数填写和高危确认使用 `LauncherFlowDrawer`（左侧抽屉滑入），与 Raycast/Alfred 的"页面推入"交互模型不一致。本次重构将：

1. 引入**导航栈架构**（`useLauncherNavStack`），统一页面推入/返回语义
2. 新建 `LauncherCommandPanel` 组件，以全页面形式替代旧的抽屉/弹窗
3. 合并参数填写和高危确认为同一面板的不同状态
4. 新增 **24 小时免提示**机制，按命令 ID 粒度记录

---

## 2. 设计决策汇总

| 决策项 | 结论 |
|--------|------|
| 导航模型 | 页面推入（Raycast 风格），替换整个 search-main 区域 |
| 操作意图 | 左键=执行，右键=暂存，按钮文案随意图变化 |
| FlowPanel | 保持右侧抽屉覆盖层，独立于导航栈 |
| 24h 免提示粒度 | 按命令 ID 记录到 localStorage |
| 24h 生效行为 | 完全降级为普通命令（不进面板），搜索结果的红色标注保持 |
| 面板触发条件 | 有参数 → 面板；无参数+高危（未免提示）→ 面板；其余 → 直接操作 |
| 过渡动效 | 左右滑动，推入 250ms 弹簧曲线，退出 200ms ease-in |
| 队列入口 | 参数面板标题栏保留队列图标 |
| 命令预览 | 实时渲染，参数输入时即时更新完整命令（使用文本插值，禁止 v-html） |

---

## 3. 导航栈架构

### 3.1 `useLauncherNavStack` composable

```typescript
// composables/launcher/useLauncherNavStack.ts

// 所有类型从 src/features/commands/types.ts 导入
import type { CommandTemplate } from '@/features/commands/types'

type NavPageType = 'search' | 'command-action'

interface NavPage {
  type: NavPageType
  props?: {
    command?: CommandTemplate
    mode?: 'execute' | 'stage'
    isDangerous?: boolean        // 仅基于 command.dangerous 标记判定
  }
}

// 注意：dangerReasons 不作为静态 props 传入。
// 因为有参数场景下 renderedCommand 依赖用户输入才能做 pattern 匹配。
// dangerReasons 由 CommandPanel 内部 computed 动态计算。

// 暴露 API：
const stack: Ref<NavPage[]>              // 响应式栈，初始 [{type:'search'}]
const currentPage: ComputedRef<NavPage>  // 栈顶
const canGoBack: ComputedRef<boolean>    // stack.length > 1

function pushPage(page: NavPage): void   // 推入新页面
function popPage(): void                 // 弹出栈顶（栈底 search 不可弹出）
function resetToSearch(): void           // 清空栈回搜索首页
```

### 3.2 注入方式

`useLauncherNavStack` 采用 `provide/inject` 模式注入组件树，避免 prop drilling：

```typescript
// LauncherWindow.vue 中 provide
const navStack = useLauncherNavStack()
provide('launcherNavStack', navStack)

// 子组件中 inject
const { currentPage, pushPage, popPage } = inject('launcherNavStack')!
```

后续如需扩展页面类型（如命令详情/帮助页），只需在 `NavPageType` 联合类型中添加新值，并在 LauncherWindow 的渲染分支中加入对应组件即可。

### 3.3 架构分层

```
LauncherWindow
├── 导航栈层（search ↔ command-action，容器需 overflow:hidden 防弹簧 overshoot）
│   ├── LauncherSearchPanel    ← v-if="currentPage.type === 'search'"
│   └── LauncherCommandPanel   ← v-if="currentPage.type === 'command-action'"
│
└── FlowPanel 覆盖层（独立，可在任何页面打开）
    └── LauncherFlowPanel      ← 右侧抽屉 + scrim，保持不变
```

### 3.4 Esc 层级栈（LIFO 顺序回退）

Esc 始终关闭**最后打开的那一层**：

| 优先级 | 条件 | 行为 |
|--------|------|------|
| 1 | FlowPanel 打开 | 关闭 FlowPanel |
| 2 | 导航栈深度 > 1（在 command-action 页） | popPage() 回到搜索 |
| 3 | 搜索首页 + 有搜索词 | 清空搜索词 |
| 4 | 搜索首页 + 无搜索词 | 隐藏窗口 |

---

## 4. LauncherCommandPanel 组件设计

### 4.1 组件结构

```
LauncherCommandPanel.vue
├── 标题栏 (.command-panel__header)
│   ├── ← 返回按钮 (popPage)
│   ├── 命令图标 (LauncherIcon)
│   ├── 命令标题 (command.title)
│   ├── 场景徽标（"参数输入" / "高危操作确认" / "高危拦截与配置"）
│   └── 队列图标 (打开 FlowPanel)
│
├── 内容区 (.command-panel__content, 可滚动)
│   ├── 高危提醒横幅 (v-if="isDangerous")
│   │   ├── ⚠ 危险操作提醒（红色背景横幅）
│   │   ├── 提示文案
│   │   └── ☐ "今日不再针对此命令进行高危提示" 复选框
│   │
│   ├── 参数表单 (v-if="hasArgs")
│   │   └── v-for CommandArg:
│   │       ├── 参数标签 (label + "*" if required)
│   │       └── 输入控件（input / select）
│   │
│   └── 命令预览 (.command-panel__preview)
│       └── <code>{{ ">_ " + renderedCommand }}</code>  ← 文本插值，禁止 v-html
│
└── 底部操作栏 (.command-panel__footer)
    ├── 热键提示 "按 Esc 取消返回"
    ├── 取消按钮
    └── 确认按钮
```

### 4.2 `dangerReasons` 动态计算

`dangerReasons` 在 CommandPanel 内部通过 computed 动态计算，而非通过 props 静态传入：

```typescript
// CommandPanel 内部
const renderedCommand = computed(() =>
  renderCommand(props.command, pendingArgValues.value)
)

const dangerReasons = computed(() =>
  collectConfirmationReasons(props.command, renderedCommand.value)
)

// push 时的 isDangerous 仅基于 command.dangerous 标记（确定可推面板）
// 实时 dangerReasons 会随参数输入而动态更新（如用户输入 "rm -rf /"）
```

### 4.3 三种场景

#### 场景 1：有参数 + 非高危

- 徽标：「参数输入」
- 内容：参数表单 + 命令预览
- 按钮：
  - 执行意图 → "直接执行"（品牌色）
  - 暂存意图 → "+ 加入执行流"（品牌色）

#### 场景 2：无参数 + 高危

- 徽标：「高危操作确认」
- 内容：高危横幅（含 24h 复选框） + 命令预览
- 按钮：
  - 执行意图 → "确定执行"（红色）
  - 暂存意图 → "+ 加入执行流"（红色）

#### 场景 3：有参数 + 高危

- 徽标：「高危拦截与配置」
- 内容：高危横幅（含 24h 复选框） + 参数表单 + 命令预览
- 按钮：
  - 执行意图 → "确定执行"（红色）
  - 暂存意图 → "+ 加入执行流"（红色）

### 4.4 按钮矩阵

| 场景 | 执行意图（左键触发） | 暂存意图（右键触发） |
|------|---------------------|---------------------|
| 有参数 + 非高危 | "直接执行"（品牌色） | "+ 加入执行流"（品牌色） |
| 有参数 + 高危 | "确定执行"（红色） | "+ 加入执行流"（红色） |
| 无参数 + 高危 | "确定执行"（红色） | "+ 加入执行流"（红色） |

### 4.5 Props 接口

```typescript
interface CommandPanelProps {
  command: CommandTemplate       // 从 src/features/commands/types.ts 导入
  mode: 'execute' | 'stage'
  isDangerous: boolean           // 仅基于 command.dangerous 标记
}
// dangerReasons 不在 props 中，由组件内部 computed 动态计算
```

---

## 5. `safetyDialog` 状态迁移

### 5.1 问题

现有架构中 `safetyDialog`（`useCommandExecution/state.ts`）是独立于 `pendingCommand` 的状态分支，用于弹出安全确认对话框。`submitParamInput()` 在执行模式下会调用 `checkSingleCommandSafety`，如果检测到高危则触发 `requestSafetyConfirmation()` 设置 `safetyDialog.value`。

新的 `CommandPanel` 已经将高危确认**内嵌到面板中**（横幅 + 按钮颜色变化），所以进入 CommandPanel 的命令不应再触发独立的 `safetyDialog`。

### 5.2 迁移策略

| 场景 | 旧流程 | 新流程 |
|------|--------|--------|
| 单命令（通过 CommandPanel） | submitParamInput → checkSafety → safetyDialog | CommandPanel 内嵌确认，submit 时**跳过** `requestSafetyConfirmation` |
| 单命令（直接执行，无面板） | executeResult → requestSingleExecution → checkSafety → safetyDialog | 如果 `isDangerDismissed`，跳过 confirmation 环节（**保留** blocked 检查如注入拦截） |
| 队列批量执行 | executeStaged → checkQueueCommandSafety → safetyDialog | **保留不变**，`safetyDialog` 仅用于队列批量执行确认 |

### 5.3 代码改动

在 `actions.ts` 的 `submitParamInput()` 中：
- 如果命令通过 CommandPanel 确认（`pendingCommand` 不为 null），则认为用户已经在面板中看到了高危警告并主动确认，**跳过** `requestSafetyConfirmation` 分支。
- 仍然**保留** `validateArguments()` 的阻断检查（注入防护、必填校验等）。

在 `requestSingleExecution()` 中：
- 增加对 `isDangerDismissed(commandId)` 的判断。如果已免提示，跳过 `collectConfirmationReasons` 的 confirmation 弹窗（但保留 `validateArguments` 的 blocked 检查）。

---

## 6. 24 小时免提示机制

### 6.1 数据结构

```typescript
// features/security/dangerDismiss.ts

// 使用 Record 结构（O(1) 查询），而非数组
type DangerDismissMap = Record<string, number>  // commandId → dismissedAt 时间戳

// localStorage key: 'zapcmd:danger-dismiss'
// 值：JSON 序列化的 DangerDismissMap
```

### 6.2 核心函数

```typescript
// 检查某命令是否在 24h 免提示期内
function isDangerDismissed(commandId: string): boolean

// 记录免提示（确认操作后写入）
function dismissDanger(commandId: string): void

// 清理过期记录（超过 24h 的自动移除，应用启动时 + 每次读取时调用）
function cleanExpiredDismissals(): void
```

### 6.3 集成逻辑

1. 用户选中命令 → 判断 `needsPanel`：
   - `hasArgs === true` → 需要面板
   - `isDangerous && !isDangerDismissed(commandId)` → 需要面板
   - 其余 → 不需要面板，直接执行/暂存
2. 面板内用户勾选"今日不再提示" + **确认**后 → `dismissDanger(commandId)`
3. 如果用户取消（Esc/返回），**不写入**免提示记录
4. 免提示生效后，高危命令完全降级为普通命令行为（不进面板）
5. `requestSingleExecution` 中也检查 `isDangerDismissed`，免提示命令跳过 confirmation（保留 blocked 检查）
6. 读取 localStorage 时做 JSON parse 防御，格式异常则清空重来

---

## 7. 状态管理与数据流

### 7.1 复用现有状态

导航栈不重建状态管理，复用 `useCommandExecution` 的已有状态：

```typescript
// useCommandExecution/state.ts（已有，无需改动）
pendingCommand: Ref<CommandTemplate | null>
pendingArgValues: Ref<Record<string, string>>
pendingSubmitMode: Ref<'execute' | 'stage'>
```

### 7.2 完整数据流

```
1. 用户左键/右键选中命令
2. SearchPanel 判断 needsPanel
   ├── false → 直接调用 executeCommand / stageCommand
   └── true →
3.     openParamInput(command, mode)   ← 设置 pendingCommand 等状态
4.     navStack.pushPage({ type: 'command-action', props: {...} })
5.     LauncherCommandPanel 渲染
6.     用户填写参数 → updatePendingArgValue(key, value)
       （命令预览实时更新：renderCommand(command, argValues)）
       （dangerReasons 实时更新：collectConfirmationReasons()）
7.     用户确认 →
       ├── validateArguments()（阻断检查：注入防护、必填、格式）
       ├── 如果勾选免提示 → dismissDanger(commandId)
       └── 直接执行/暂存（跳过 safetyDialog，面板已确认）
8.     navStack.popPage() → 回到搜索
9.     toast 反馈
```

### 7.3 导航栈守卫

```typescript
// 离开 command-action 页面时自动清理 pendingCommand
watch(currentPage, (page) => {
  if (page.type !== 'command-action' && pendingCommand.value) {
    cancelParamInput()
  }
})
```

---

## 8. 动效规格

### 8.1 页面切换动画

```css
/* 推入（search → command-action） */
.nav-slide-enter-active {
  transition: transform 250ms cubic-bezier(0.175, 0.885, 0.32, 1.15);
}
.nav-slide-enter-from {
  transform: translateX(100%);
}

/* 退出（command-action → search） */
.nav-slide-leave-active {
  transition: transform 200ms ease-in;
}
.nav-slide-leave-to {
  transform: translateX(100%);
}
```

- 使用项目已有的弹簧曲线
- 推入 250ms（弹簧感），退出 200ms（快速干脆）
- 仅使用 `transform`，GPU 加速
- 导航栈容器需设置 `overflow: hidden` 防止弹簧 overshoot 溢出可视区域

### 8.2 高危横幅动画

```css
.danger-banner-enter-from {
  transform: translateY(-8px);
  opacity: 0;
}
.danger-banner-enter-active {
  transition: all 200ms ease-out;
}
```

---

## 9. 旧代码清理

### 9.1 删除文件

| 文件路径 | 原因 |
|---|---|
| `src/components/launcher/parts/LauncherFlowDrawer.vue` | 被 LauncherCommandPanel 完全替代 |
| `src/components/launcher/parts/LauncherParamOverlay.vue` | 旧版参数弹窗，不再使用 |
| `src/components/launcher/parts/LauncherSafetyOverlay.vue` | 旧版安全确认弹窗，不再使用 |
| `src/components/launcher/parts/flowDrawerMotion.ts` | FlowDrawer 专属动画常量，不再需要 |
| `src/components/launcher/parts/__tests__/LauncherFlowDrawer.test.ts` | 旧测试，需用 CommandPanel 测试替代 |

### 9.2 需清理的类型/引用

| 文件路径 | 清理内容 |
|---|---|
| `src/components/launcher/types.ts` | 移除 `LauncherParamOverlayProps` 和 `LauncherSafetyOverlayProps` 接口 |
| `src/components/launcher/__tests__/LauncherWindow.flow.test.ts` | 重写：移除 FlowDrawer/ParamOverlay/SafetyOverlay 的 stub 引用 |

### 9.3 保留不变

- `LauncherFlowPanel.vue` — 右侧抽屉
- `useCommandExecution/` — 核心状态管理（仅调整 actions.ts 中的安全确认路径）
- `commandSafety.ts` — 安全检测逻辑

---

## 10. 测试策略

### 10.1 单元测试

- **`useLauncherNavStack`**：push/pop/reset + 栈边界（空栈 pop 不崩溃、重复 push 防御）
- **`dangerDismiss`**：写入/读取/过期清理/不存在的 commandId/localStorage 格式异常防御
- **`LauncherCommandPanel`**：三种场景渲染正确性 + 按钮文案/颜色 + 参数表单验证 + 命令预览实时更新 + dangerReasons 动态计算

### 10.2 集成测试

- 搜索页 → 左键选命令（有参数）→ 推入面板 → 填参数 → 确认 → toast
- 搜索页 → 右键选命令（高危）→ 推入面板 → 勾选免提示 → 确认 → 再次选同命令 → 不推面板
- Esc 层级回退：FlowPanel 打开 → Esc 关 FlowPanel → Esc 回搜索
- 参数面板内打开 FlowPanel → Esc 关 FlowPanel → Esc 回搜索
- `safetyDialog` 隔离：通过 CommandPanel 确认的高危命令不触发独立 safetyDialog
- `safetyDialog` 保留：队列批量执行仍能弹出安全确认

### 10.3 鲁棒性保障

- **导航栈守卫**：`popPage()` 在栈底 search 时为空操作，不会 pop 到空栈
- **pendingCommand 清理**：离开 command-action 页面时自动 cancel
- **24h 数据校验**：读取 localStorage 时做 JSON parse 防御，格式异常则清空重来
- **参数验证兜底**：`submitParamInput` 内部仍做完整验证（注入防护、必填、格式）
- **安全兜底**：即使 24h 免提示生效，`validateArguments` 的 blocked 检查（注入防护）仍然执行

---

## 11. 新增/修改文件清单

### 新增

| 文件路径 | 职责 |
|---------|------|
| `src/composables/launcher/useLauncherNavStack.ts` | 导航栈 composable |
| `src/components/launcher/parts/LauncherCommandPanel.vue` | 命令操作面板组件 |
| `src/features/security/dangerDismiss.ts` | 24h 免提示逻辑 |

### 修改

| 文件路径 | 改动 |
|---------|------|
| `src/components/launcher/LauncherWindow.vue` | 集成导航栈（provide），条件渲染 SearchPanel / CommandPanel，移除 FlowDrawer 引用 |
| `src/components/launcher/parts/LauncherSearchPanel.vue` | 移除 FlowDrawer 插槽，调整选中命令逻辑接入 navStack.pushPage |
| `src/composables/launcher/useMainWindowShell.ts` | 更新 Esc 层级逻辑（导航栈 popPage 替代 safetyDialog/pendingCommand 分支） |
| `src/composables/execution/useCommandExecution/actions.ts` | submitParamInput 跳过 safetyDialog；requestSingleExecution 增加 isDangerDismissed 判断 |
| `src/i18n/messages.ts` | 新增面板相关 i18n key（见 §12） |
| `src/styles/launcher.css` | 新增 `.command-panel*` 和 `.nav-slide-*` 样式 |
| `src/components/launcher/types.ts` | 移除 `LauncherParamOverlayProps`、`LauncherSafetyOverlayProps` |
| `src/features/hotkeys/windowKeydownHandlers/types.ts` | 更新 `MainHandlers` 接口，`paramDialogOpen`/`safetyDialogOpen` → `commandPanelOpen` |
| `src/features/hotkeys/windowKeydownHandlers/index.ts` | 更新 `flowOpen` 判断逻辑（检查导航栈深度） |
| `src/features/hotkeys/windowKeydownHandlers/main.ts` | 更新 `handleMainGlobalHotkeys` 中 `flowOpen` 引用 |
| `src/composables/app/useAppWindowKeydown.ts` | 更新 computed 定义，适配导航栈 |

### 删除

| 文件路径 |
|---------|
| `src/components/launcher/parts/LauncherFlowDrawer.vue` |
| `src/components/launcher/parts/LauncherParamOverlay.vue` |
| `src/components/launcher/parts/LauncherSafetyOverlay.vue` |
| `src/components/launcher/parts/flowDrawerMotion.ts` |
| `src/components/launcher/parts/__tests__/LauncherFlowDrawer.test.ts` |

---

## 12. i18n Key 清单

新增以下中英双语 key（命名空间 `commandPanel`）：

| Key | 中文 | 英文 |
|-----|------|------|
| `commandPanel.badge.paramInput` | 参数输入 | Parameter Input |
| `commandPanel.badge.dangerConfirm` | 高危操作确认 | Danger Confirmation |
| `commandPanel.badge.dangerWithParam` | 高危拦截与配置 | Danger Intercept |
| `commandPanel.danger.title` | 危险操作提醒 | Danger Warning |
| `commandPanel.danger.description` | 此命令将直接操作敏感系统资源，请确保你知道该命令的作用范围后再继续执行。 | This command directly operates on sensitive system resources. Make sure you understand its scope before proceeding. |
| `commandPanel.danger.dismissToday` | 今日不再针对此命令进行高危提示 | Don't show danger warning for this command today |
| `commandPanel.btn.execute` | 直接执行 | Execute |
| `commandPanel.btn.confirmExecute` | 确定执行 | Confirm Execute |
| `commandPanel.btn.addToFlow` | + 加入执行流 | + Add to Flow |
| `commandPanel.btn.cancel` | 取消 | Cancel |
| `commandPanel.hint.escCancel` | 按 Esc 取消返回 | Press Esc to cancel |
| `commandPanel.preview.label` | 实际执行 | Actual Command |
