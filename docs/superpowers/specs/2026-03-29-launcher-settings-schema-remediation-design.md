# Launcher / Settings / Command Schema 整改设计

> 日期：2026-03-29
> 状态：approved
> 范围：Settings 语义与 i18n 收口、窗口装配去重、Launcher contract 收窄、Queue 命名统一、命令 schema 校验层重构、超长文件拆分

---

## 1. 背景

本轮整改不是做视觉重做，也不是做大爆炸重写，而是解决已经在真实代码中出现的几类结构性问题：

1. Settings 页签语义不完整，键盘和屏幕阅读器体验存在缺口。
2. 主窗口与设置窗口重复装配同一批设置相关状态与副作用，维护成本偏高。
3. Launcher 壳层接口过宽，`App.vue -> LauncherWindow.vue -> 子面板` 之间存在过量 props / emits 透传。
4. 主窗口“Queue / staging / review / flow”命名漂移，语义边界已经不稳定。
5. 命令 schema 校验同时存在 `JSON Schema` 与手写解释器两套结构规则，开始失去一致性。
6. 多个设置与命令管理相关文件已经连续越过项目自己的体积红线。
7. 一批 aria label 仍然保留开发者语义或英文硬编码，i18n 收口不完整。

本轮目标是把这些问题一次性收口到可持续维护的状态，但保持现有产品行为稳定。

---

## 2. 已确认范围

### 2.1 本轮要做

1. 修复 Settings tab 语义与键盘可达性。
2. 提取主窗口与设置窗口共享的设置场景装配。
3. 收窄 Launcher 壳层 contract。
4. 统一 Queue 相关命名。
5. 采用 schema 方案 3：`command-file.schema.json` 作为唯一结构真源，运行时改为消费预编译 validator。
6. 按职责拆分超长文件。
7. 补齐 aria / i18n。

### 2.2 本轮明确不做

1. 不修改默认动效 preset。
2. 不修改队列入口的视觉可发现性。
3. 不开放命令文件的任意自定义扩展字段。

---

## 3. 设计决策汇总

| 决策项 | 结论 |
|--------|------|
| Settings tab 语义 | 完整采用 `tablist / tab / tabpanel` 模型，并补齐焦点跟随与关联属性 |
| 设置装配去重 | 提取共享“设置场景装配工厂”，不做跨窗口全局单例 |
| Launcher 壳层接口 | 改为类型化分片 VM，壳层只接 `launcherVm`，不再平铺超长 props / emits |
| 用户语义 | 统一使用 `Queue` |
| 内部交互模式 | 统一使用 `Review` |
| 旧命名 `staging` | 逐步淘汰 |
| 旧命名 `flow` | 仅保留给真正表示执行流的语义，不再指代右侧队列审阅面板 |
| schema 真源 | `docs/schemas/command-file.schema.json` |
| 社区维护入口 | 继续维护 `docs/command_sources/_*.md` |
| 结构校验实现 | 使用 schema 预编译生成的 standalone validator |
| 保留手写逻辑 | `md -> json` 生成、跨字段业务规则、错误翻译 |
| 文件拆分策略 | 跟随整改顺手拆分，优先按职责切，不单独做大搬家 |

---

## 4. Settings 语义与 i18n 收口

### 4.1 当前问题

现有 `SSegmentNav` 已经声明了 `role="tablist"` 与 `role="tab"`，但仍缺少完整语义闭环：

1. `tab` 与对应内容面板没有 `aria-controls / aria-labelledby` 关联。
2. 方向键切换时仅更新选中值，没有把焦点移动到新的 tab。
3. Settings 内容区目前更像“条件渲染 section”，不是标准 `tabpanel`。
4. 多处 aria label 仍是开发者语义或英文硬编码，例如 `Settings sections`、`command-management`、`settings-content`、`floating-staging`、`search-capsule`。

### 4.2 设计

1. `SSegmentNav` 负责完整 tab 导航行为：
   - 每个 tab 拥有稳定 `id`
   - 每个 tab 输出 `aria-controls`
   - 键盘方向键、`Home`、`End` 切换后焦点跟随
2. `SettingsWindow` 负责 `tabpanel` 容器：
   - 面板拥有稳定 `id`
   - 面板使用 `role="tabpanel"`
   - 面板通过 `aria-labelledby` 关联到 tab
3. aria 优先级调整为：
   - 能用结构关系表达的，优先不用开发代号 label
   - 必须保留 label 的，再进入 i18n
4. 对 Launcher 与 Settings 中现有开发者语义 aria 进行一轮统一收口。

### 4.3 用户影响

本整改会直接改善以下真实用户行为：

1. 键盘用户在 Settings 顶部用方向键切换时，焦点会跟着移动，不会“选中了但焦点还停在旧项”。
2. 屏幕阅读器用户能知道当前 tab 控制的是哪块内容，不再只听到一串无上下文按钮。
3. 设置区块的名称会变成产品语义，不再读出开发代号或英文硬编码。

---

## 5. 主窗口与设置窗口装配去重

### 5.1 当前问题

主窗口组合根与 `AppSettings.vue` 都在重复装配以下内容：

1. `ports`
2. settings store hydrate 与 `storeToRefs`
3. `language / windowOpacity` 副作用
4. `useTheme / useMotionPreset`
5. `useHotkeyBindings`
6. `useSettingsWindow`
7. `useCommandCatalog`
8. `useCommandManagement`
9. `useUpdateManager`
10. `appVersion / openHomepage`

这不是“实现细节重复”，而是同一批设置场景状态被写了两遍，后续修改极易漏同步。

### 5.2 设计

引入共享的“设置场景装配工厂”，专门负责设置相关状态的实例化与副作用绑定。

分层如下：

```text
createSettingsSceneContext
├── settings store / refs
├── settings side effects
├── hotkey bindings
├── settingsWindow
├── commandCatalog
├── commandManagement
├── updateManager
└── app metadata / openHomepage

AppCompositionRoot
├── settingsSceneContext
└── launcher-only runtime

AppSettings.vue
└── consume settingsSceneContext
```

### 5.3 约束

1. 不做跨窗口共享单例。
2. 主窗口和设置窗口仍各自创建实例，只共享装配逻辑，不共享运行时状态对象。
3. `AppSettings.vue` 收缩为入口壳，不再自行拼装完整设置依赖树。

### 5.4 预期收益

1. 设置场景只有一个装配事实源。
2. 新增设置项时，只需扩一处装配逻辑。
3. `AppSettings.vue` 可以明显变薄，职责更清晰。

---

## 6. Launcher 壳层 contract 收窄

### 6.1 当前问题

`App.vue` 当前向 `LauncherWindow.vue` 平铺传递大量字段与事件，导致：

1. 顶层壳像手工接线板。
2. 子组件改动会穿透 `viewModel -> App -> LauncherWindow -> 子面板` 多层。
3. contract 很难一眼读懂，也难验证哪些字段是展示层真正需要的。

### 6.2 设计

保留 VM 架构，但把扁平大对象改为类型化分片 VM。

推荐结构：

```ts
interface LauncherVm {
  search: SearchPanelVm;
  command: CommandPanelVm;
  queue: QueueReviewVm;
  nav: LauncherNavVm;
  dom: LauncherDomVm;
  actions: LauncherActionVm;
}
```

`LauncherWindow` 只接收一个 `launcherVm`，但该对象按职责分片，不是黑盒大包。

### 6.3 壳层职责

`LauncherWindow` 只负责：

1. 根据当前导航状态选择渲染 `Search / Command / Queue Review / Safety Overlay`
2. 转发少量顶层事件，例如空白点击关闭、执行反馈上浮

不再承担“大量字段手动解包再分发”的职责。

### 6.4 测试兼容处理

当前 `App.vue` 暴露 `availableTerminals / terminalLoading` 主要是历史测试兼容债。  
整改后应把相关测试迁回设置入口或 `settingsVm`，不再让主窗口壳层继续携带设置页兼容字段。

---

## 7. Queue / Review 命名统一

### 7.1 命名原则

1. 用户可见语义统一为 `Queue`
2. 右侧打开后的交互模式命名统一为 `Review`
3. 旧词 `staging` 逐步淘汰
4. `flow` 只在真正表达执行流时保留

### 7.2 推荐迁移表

| 旧名 | 新名 |
|------|------|
| `useStagingQueue` | `useCommandQueue` |
| `stagedCommands` | `queuedCommands` |
| `stageResult` | `enqueueResult` |
| `toggleStaging` | `toggleQueue` |
| `stagingExpanded` | `queueOpen` |
| `stagingDrawerState` | `queuePanelState` |
| `stagingActiveIndex` | `queueActiveIndex` |
| `focusZone: "staging"` | `focusZone: "queue"` |
| `removeStagedCommand` | `removeQueuedCommand` |
| `updateStagedArg` | `updateQueuedArg` |
| `clearStaging` | `clearQueue` |
| `executeStaged` | `executeQueue` |
| `LauncherFlowPanel.vue` | `LauncherQueueReviewPanel.vue` |
| `flowPanel/` | `queueReview/` |

### 7.3 保留项

组件内部如 `reviewPanelRef`、`closeReview()` 可以保留，因为它表达的是“队列打开后的审阅模式”，与用户语义不冲突。

### 7.4 迁移策略

1. 先统一主运行链路命名。
2. 再同步更新 visual sandbox、样式契约测试与相关夹具。
3. 最后判断旧命名组件壳是否可以删除。

不做“边改名边清空所有旧件”的大爆炸处理。

---

## 8. 命令 schema 方案 3

### 8.1 目标

取消“结构规则的双份维护”，但保留社区可维护的 `md -> json` 工作流。

### 8.2 最终分层

```text
docs/command_sources/_*.md
  -> scripts/generate_builtin_commands.ps1
  -> builtin json
  -> standalone schema validator 校验结构
  -> runtime merge / business rules
```

三层规则分工如下：

1. `JSON Schema`
   - 定义允许的字段、类型、枚举、结构关系
   - 是唯一结构真源
2. Markdown 命令源
   - 定义某条命令实际使用的规则值
   - 例如参数默认值、范围、选项
3. 薄手写业务规则
   - 处理 schema 不适合表达的跨字段逻辑
   - 处理错误翻译

### 8.3 明确保留手写的内容

1. `md -> json` DSL 解析与生成
2. 跨字段业务规则，例如：
   - `min <= max`
   - `type=number` 时 `default` 必须可解析为数字
   - `default` 必须落在 `min/max` 范围内
   - `template` 中引用的 token 必须能在参数定义中找到
3. schema 错误到产品提示文案的翻译

### 8.4 明确取消手写的内容

取消 `schemaGuard.ts` 这类与 schema 平行维护的整套结构解释器，不再手工重复维护：

1. 允许哪些 key
2. key 的类型
3. 各对象的嵌套结构
4. 枚举值白名单
5. 大量“字段缺失 / 类型错误 / 未知 key”这类结构判断

### 8.5 社区维护口径

社区继续维护 Markdown，不直接维护 schema 解释器代码。

规则写法采用白名单 DSL 扩展，不开放任意扩展字段。  
例如数字范围直接写在 md：

```md
timeout(number, default:3000, min:1000, max:10000)
```

生成后落成：

```json
{
  "key": "timeout",
  "type": "number",
  "default": "3000",
  "validation": {
    "min": 1000,
    "max": 10000
  }
}
```

### 8.6 生成链路调整

本轮需要补两类脚本：

1. 生成 schema standalone validator
2. 校验 builtin 生成产物与 schema 同步

建议方向：

1. 新增 `scripts/commands/generate-command-schema-validator.*`
2. 新增 `scripts/commands/check-command-schema-sync.*`
3. 生成产物提交入库，运行时直接消费

### 8.7 运行时模块拆分

`schemaGuard.ts` 重构后建议拆为：

1. `schemaValidatorAdapter`
2. `schemaBusinessRules`
3. `schemaErrorFormatter`

---

## 9. 大文件拆分方案

### 9.1 拆分原则

1. 跟随本轮整改顺手拆，不单独发起“大搬家”。
2. 优先按职责切，不按行数平均分。
3. 导出 API 尽量稳定。
4. 先抽纯函数和子视图，再动行为。

### 9.2 重点文件

1. `src/AppSettings.vue`
   - 目标：变成设置窗口入口壳
2. `src/components/settings/parts/SettingsCommandsSection.vue`
   - 目标：拆 `toolbar / summary / table / issues`
3. `src/composables/settings/useCommandManagement.ts`
   - 目标：拆 `rows / options / issues / mutations`
4. `src/components/launcher/parts/LauncherFlowPanel.vue`
   - 目标：配合命名统一拆为 queue review 结构
5. `src/features/commands/schemaGuard.ts`
   - 目标：变成 schema adapter + business rules + error formatter

### 9.3 顺序

1. 先做 a11y / i18n 收口
2. 再做设置场景装配去重
3. 再做 Launcher contract 收窄与 Queue 命名统一
4. 再做 schema 方案 3
5. 在上述每一步中顺手拆对应超长文件

---

## 10. 回归控制与验证

### 10.1 验证原则

每一步整改都必须自带契约测试，不接受“先改完再看”。

### 10.2 测试要求

1. Settings a11y
   - tab 键盘导航测试
   - `aria-controls / aria-labelledby / tabpanel` 关联测试
2. 设置装配去重
   - 共享装配工厂的场景单测
   - 主窗口与设置窗口都能消费同一语义状态模型
3. Launcher contract
   - VM 映射测试
   - 壳层 contract 测试
4. Queue 命名统一
   - 主运行链路测试
   - visual sandbox 与样式契约测试同步更新
5. schema 方案 3
   - `md -> json -> validator -> business rules` 链路测试
   - 错误翻译测试
6. 文件拆分
   - 以行为测试不变、导出 API 不变为验收基线

### 10.3 门禁

本轮最终门禁目标保持为：

```bash
npm run check:all
```

---

## 11. 迁移与实施约束

1. 不做大爆炸重写。
2. 每一步都必须可以单独回滚。
3. 每一步都必须在局部完成后运行验证。
4. 不新增任意扩展字段。
5. 不修改默认动效 preset。
6. 不修改队列入口的视觉发现性。

---

## 12. 预期结果

本轮完成后，项目应达到以下状态：

1. Settings 页签语义完整，键盘与读屏体验达标。
2. 设置相关装配只有一个事实源，主窗口与设置窗口不再重复拼装。
3. Launcher 壳层接口收窄，顶层透传显著减少。
4. Queue / Review 命名统一，后续交互演进不再受旧词拖累。
5. 命令 schema 的结构规则只维护一份，社区继续维护 md，运行时不再背双轨解释器。
6. 关键超长文件按职责收口，后续维护成本下降。
7. aria 与 i18n 语义更接近产品语言，而不是开发代号。
