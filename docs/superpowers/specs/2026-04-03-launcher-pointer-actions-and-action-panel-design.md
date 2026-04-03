# Launcher 鼠标映射、动作面板与复制入口设计

> 日期：2026-04-03
> 状态：approved
> 范围：搜索结果鼠标交互、动作面板、复制入口、搜索区提示、设置模型、键盘扩展

---

## 1. 背景

当前 Launcher 在“搜索结果层”存在明显的输入能力不对称：

1. 键盘路径已覆盖执行、入队、切换执行流、执行队列、删除、重排等能力
2. 鼠标路径在搜索结果层只有两种手势：
   1. 左键直接执行
   2. 右键加入执行流
3. “复制命令”只在执行流卡片里提供按钮，不在搜索结果层可达

这会导致两个问题：

1. 鼠标用户在最常用的搜索结果层无法直接完成“复制”场景
2. 键盘和鼠标的能力边界不一致，提示文案也无法真实反映用户当前可做的事情

用户已明确约束：

1. 不新增搜索结果复制按钮
2. 不做右键弹出菜单
3. 不采用弹窗式动作菜单
4. 若引入动作选择，必须像现有参数面板一样进入主区域面板

---

## 2. 目标

本轮设计目标：

1. 让搜索结果层对鼠标补齐 `执行 / 入队 / 复制` 三类主动作
2. 保持桌面产品高频搜索交互，不引入营销式或网页式 hover 工具栏
3. 把动作选择做成主区域面板，保持与参数面板一致的导航体验
4. 允许用户自行配置搜索结果左键/右键的动作映射
5. 扩展键盘能力，让键盘用户拥有比鼠标更高效的动作入口
6. 让搜索区提示和设置保持实时一致，禁止提示文案与真实行为脱节

本轮不做：

1. 不引入双击作为正式默认交互
2. 不保留旧默认行为兼容分支
3. 不在搜索结果项内新增显式复制按钮
4. 不把动作选择做成上下文菜单、popover 或独立弹窗

---

## 3. 总体决策

### 3.1 不采用双击复制

最终不采用“双击复制”作为正式方案。

原因：

1. 当前搜索结果项使用 `click` 直接执行，双击前的首次点击已经会触发执行
2. 若要让双击真正独立，必须延迟左键执行判定，破坏现有即时响应
3. 该方案会放大误触、计时器竞争和测试复杂度
4. 对触控板、快节奏操作和桌面工具体验都不稳定

结论：

1. 双击不进入正式交互模型
2. 左键/右键映射 + 动作面板作为主方案

### 3.2 采用“左键动作面板，右键入队”的新默认

新默认行为：

1. 左键：打开动作面板
2. 右键：加入执行流

选择该默认的原因：

1. 左键保留最显式的主路径，适合作为动作分发入口
2. 右键继续承担“次级但高频”的入队动作，风险低于直接执行
3. 与现有右键入队语义更接近，用户迁移成本较低
4. 键盘仍保留 `Enter` 直接执行，不会让执行路径缺席

### 3.3 动作选择必须先于参数输入

一旦某个入口被映射为 `打开动作面板`，流转固定为：

1. 搜索结果
2. 动作面板
3. 用户选择 `执行 / 加入执行流 / 复制`
4. 若命令需要参数，再进入参数面板
5. 参数确认后执行最终动作

不允许：

1. 打开动作面板后又直接跳过动作选择进入参数面板
2. 让“复制”在动作面板路径中绕过参数确认

### 3.4 鼠标映射与键盘热键分开建模

鼠标映射不并入现有 `hotkeys`，而是新增独立设置模型。

原因：

1. `hotkeys` 当前只服务键盘快捷键录制、归一化与冲突检测
2. 左右键不是热键，不应复用 `SHotkeyRecorder` 与冲突规则
3. 鼠标与键盘是两类不同输入模型，分开持久化更清晰

---

## 4. 交互设计

### 4.1 搜索结果默认交互

搜索结果层默认行为调整为：

1. 左键：打开动作面板
2. 右键：加入执行流
3. 键盘 `Enter`：执行当前选中项
4. 键盘 `CmdOrCtrl+Enter`：加入执行流

这样形成三条高频路径：

1. 键盘快速执行
2. 鼠标快速入队
3. 鼠标进入动作面板后选择复制/执行/入队

### 4.2 动作面板

动作面板是一个新的主区域页面，但复用现有 Launcher 的页切换壳，不做弹出层。

建议沿用现有 `command-action` 导航槽位，新增页面变体，而不是再增加新的 overlay。

动作面板固定提供三个主动作：

1. 执行
2. 加入执行流
3. 复制

表现原则：

1. 布局与参数面板保持同级视觉层级
2. 标题区显示命令名、命令预览和返回入口
3. 主体区用三张动作卡或三段式列表展示动作
4. footer 提供当前页热键提示

### 4.3 参数面板联动

参数面板从只支持 `execute / stage`，扩展为支持 `copy`。

建议将现有 `ParamSubmitMode = "stage" | "execute"` 升级为更通用的动作意图枚举：

```ts
type CommandSubmitIntent = "execute" | "stage" | "copy";
```

行为规则：

1. 无参数命令：
   1. 在动作面板直接完成最终动作
2. 有参数命令：
   1. 在动作面板先选择动作
   2. 进入参数面板
   3. 参数面板确认按钮文案与动作一致
3. 复制动作：
   1. 无参数时直接复制渲染命令
   2. 有参数时先填参，再复制渲染命令

### 4.4 高危命令

动作面板不会绕过安全链。

规则：

1. 从动作面板选择 `执行` 后，仍然走现有高危确认逻辑
2. 从动作面板选择 `加入执行流` 时，不新增额外安全弹层
3. 从动作面板选择 `复制` 时，不触发高危确认

### 4.5 搜索区提示

搜索区提示从“固定单行写死文案”改为“设置驱动的最多两行提示”。

默认展示建议：

1. 第一行：`↑/↓ 选择 · Enter 执行 · Ctrl+Enter 入队 · Shift+Enter 动作 · Ctrl+Shift+C 复制`
2. 第二行：`左键 动作 · 右键 入队 · Ctrl+Tab 切焦点 · （若已配置）队列显隐`

生成规则：

1. 鼠标提示跟随左右键设置实时变化
2. 键盘提示跟随热键设置实时变化
3. 未配置的热键不显示
4. 宽度不足时优先换行，不做跑马灯
5. 仍不足时先隐藏二级提示，保留一级动作提示

---

## 5. 键盘扩展

### 5.1 保留现有热键

以下现有热键不变：

1. `Enter`：执行选中命令
2. `CmdOrCtrl+Enter`：加入执行流
3. Flow 区域相关的执行、删除、重排、Esc 关闭等热键

### 5.2 新增热键

新增两个本地热键字段：

1. `openActionPanel`
2. `copySelected`

默认值：

1. `openActionPanel = Shift+Enter`
2. `copySelected = CmdOrCtrl+Shift+C`

语义：

1. `openActionPanel`：对当前选中结果打开动作面板
2. `copySelected`：
   1. 无参数命令直接复制
   2. 有参数命令进入参数面板，确认后复制

### 5.3 动作面板内热键

动作面板页内补齐局部热键：

1. `ArrowUp / ArrowDown` 或 `Tab`：切换动作焦点
2. `Enter`：确认当前动作
3. `Esc`：返回搜索结果

该页热键提示只在动作面板 footer 显示，不挤占搜索区第一优先级提示。

---

## 6. 设置与持久化模型

### 6.1 新增鼠标映射设置

在设置快照中新增：

```ts
type SearchResultPointerAction = "action-panel" | "execute" | "stage" | "copy";

interface PointerActionSettings {
  leftClick: SearchResultPointerAction;
  rightClick: SearchResultPointerAction;
}
```

建议放在 `general.pointerActions` 下：

```ts
general: {
  ...
  pointerActions: {
    leftClick: "action-panel",
    rightClick: "stage"
  }
}
```

默认值：

1. `leftClick = action-panel`
2. `rightClick = stage`

### 6.2 新增热键字段

在现有 `hotkeys` 中新增：

1. `openActionPanel`
2. `copySelected`

这样可以继续复用当前热键录制器、归一化和冲突检测链路。

### 6.3 设置页呈现

Settings 的 Hotkeys 页面新增一个“鼠标操作”分组。

该分组包含两个 dropdown：

1. 搜索结果左键
2. 搜索结果右键

候选值固定为：

1. 打开动作面板
2. 单条执行
3. 加入执行流
4. 复制

约束：

1. 左右键不做冲突校验
2. 允许左右键配置成同一动作
3. 改动后立即持久化并广播到主窗口

### 6.4 Schema 策略

本轮不保留旧默认兼容分支。

策略：

1. 升级 `SETTINGS_SCHEMA_VERSION`
2. 若旧快照缺失 `pointerActions`，直接补新默认
3. 若旧快照缺失 `openActionPanel / copySelected`，直接补新默认热键

用户已明确接受“直接替换”，因此不做“老用户继续沿用旧左键执行”的迁移分支。

---

## 7. 代码边界

### 7.1 搜索结果层

[`src/components/launcher/parts/LauncherSearchPanel.vue`](../../../../src/components/launcher/parts/LauncherSearchPanel.vue)

需要调整：

1. 结果项的 `click` 与 `contextmenu` 行为改为读取设置驱动的动作分发
2. 搜索区提示从固定 hint 列表改为由 `hotkeys + pointerActions` 共同生成

### 7.2 导航与页面层

[`src/composables/launcher/useLauncherNavStack.ts`](../../../../src/composables/launcher/useLauncherNavStack.ts)
[`src/components/launcher/LauncherWindow.vue`](../../../../src/components/launcher/LauncherWindow.vue)

建议：

1. 保留 `command-action` 这一页类型
2. 在其 `props` 中新增面板变体或动作意图字段
3. `LauncherWindow` 在同一壳内渲染 `LauncherActionPanel` 或 `LauncherCommandPanel`

这样可以复用现有过渡、窗口尺寸联动和 back 行为。

### 7.3 执行编排

[`src/composables/execution/useCommandExecution/model.ts`](../../../../src/composables/execution/useCommandExecution/model.ts)
[`src/composables/execution/useCommandExecution/actions.ts`](../../../../src/composables/execution/useCommandExecution/actions.ts)

需要统一成“动作意图”模型：

1. `execute`
2. `stage`
3. `copy`

要求：

1. 参数面板确认逻辑支持 `copy`
2. 搜索结果直接复制与动作面板复制都走同一复制出口
3. 高危执行链只拦 `execute`

### 7.4 设置层

[`src/stores/settings/defaults.ts`](../../../../src/stores/settings/defaults.ts)
[`src/stores/settings/normalization.ts`](../../../../src/stores/settings/normalization.ts)
[`src/stores/settings/migration.ts`](../../../../src/stores/settings/migration.ts)
[`src/components/settings/parts/SettingsHotkeysSection.vue`](../../../../src/components/settings/parts/SettingsHotkeysSection.vue)

需要补：

1. `pointerActions` 默认值、规范化、迁移
2. `openActionPanel / copySelected` 热键默认值
3. Hotkeys 页面中的鼠标操作分组

---

## 8. 异常处理

1. 剪贴板 API 不可用时必须给出失败反馈，不得静默失败
2. 动作面板只是动作选择层，不复制一套执行核心逻辑
3. 搜索结果和动作面板都必须通过统一出口更新 toast
4. 用户若把右键配置为 `execute`，产品允许该行为，但提示文本必须实时反映
5. 搜索区提示和真实行为必须由同一设置源生成，禁止出现“提示仍写左键执行”这类错配

---

## 9. 测试策略

### 9.1 搜索结果交互

1. 默认左键打开动作面板
2. 默认右键加入执行流
3. 用户修改左右键配置后，行为即时生效
4. 搜索区提示会同步反映当前左右键映射

### 9.2 动作面板流转

1. 无参数命令可直接执行 / 入队 / 复制
2. 有参数命令必须先选动作，再进入参数面板
3. 参数面板确认按钮与动作意图一致
4. 从动作面板选择执行时，高危命令仍触发现有确认链

### 9.3 热键

1. `Shift+Enter` 打开动作面板
2. `CmdOrCtrl+Shift+C` 复制选中命令
3. 热键修改后搜索区提示即时更新

### 9.4 设置持久化

1. `pointerActions` 默认值正确
2. 左右键 dropdown 可以持久化
3. schema 升级后缺失字段自动补新默认

---

## 10. 验收标准

1. 搜索结果层对鼠标补齐 `执行 / 入队 / 复制` 的可达路径
2. 默认行为变为“左键动作面板、右键入队”
3. 动作面板与参数面板形成稳定的两段式流转
4. 用户可以在设置页分别配置左右键动作
5. 搜索区提示和设置实时一致
6. 键盘新增动作面板与复制热键，且默认值可用
7. 不新增复制按钮，不做右键菜单，不做弹窗动作层

