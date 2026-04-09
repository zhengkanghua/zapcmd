# 终端扫描 / 执行链拆分 / Settings 生命周期并轨 / 命令管理收口 / 动画调度收敛设计

> 日期：2026-04-09
> 状态：设计已确认，待规划
> 范围：终端发现缓存与显式重扫、执行链职责拆分、Settings 独立窗口生命周期并轨、命令管理未消费链路收口、窗口尺寸动画调度收敛

---

## 1. 背景

这轮不是做“全面重写”，而是收掉 5 个已经确认、且都能在代码里定位到的真实问题。

### 1.1 终端发现缓存已经从“优化”变成“陈旧风险”

当前终端发现路径集中在：

1. `src-tauri/src/terminal/discovery_cache.rs`
2. `src-tauri/src/terminal.rs`
3. `src/composables/settings/useSettingsWindow/terminal.ts`
4. `src-tauri/src/startup.rs`

现状问题：

1. 磁盘缓存 TTL 是 24 小时，新增或卸载终端后，结果可能长时间不更新。
2. 当前只有 Settings 加载终端列表时才会触发发现，没有显式“重新扫描终端”入口。
3. 托盘右键菜单也没有重扫入口。
4. 正常退出时不会删除磁盘缓存，导致“下次启动重新扫一次”的产品心智和真实行为不一致。

### 1.2 执行主链职责过胖，回归风险来自“缠在一起”

当前高耦合点主要集中在：

1. `src/composables/execution/useCommandExecution/actions.ts`，673 行
2. `src/composables/app/useAppCompositionRoot/runtime.ts`，468 行
3. `src/components/launcher/parts/LauncherCommandPanel.vue`，406 行
4. `src-tauri/src/terminal.rs`，1119 行

真正的问题不是“文件大看着不舒服”，而是这些文件同时承担了多种职责：

1. 参数面板是否打开
2. 高危确认
3. prerequisite / preflight
4. 单条执行
5. 队列执行
6. 反馈文案
7. runtime 装配和生命周期绑定

这样一来，改某一条路径时，很容易把另一条路径顺手带坏。

### 1.3 Settings 独立窗口已经形成第二套生命周期

当前主路径已经有共享生命周期桥：

1. `src/composables/app/useAppLifecycle.ts`
2. `src/composables/app/useAppLifecycleBridge.ts`
3. `src/composables/app/useAppCompositionRoot/runtime.ts`
4. `src/composables/app/useAppCompositionRoot/settingsScene.ts`

但 `src/AppSettings.vue` 仍然手写了一套：

1. `loadSettings`
2. `hashchange` / `storage` / `keydown` 监听
3. `BroadcastChannel`
4. `show_settings_window_when_ready`
5. `loadAvailableTerminals`
6. `loadLauncherHotkey`

这不是已发生的内存泄露，`onBeforeUnmount` 也有清理；真正的问题是“双份事实源”，后续改生命周期时很容易只改一边。

### 1.4 命令管理里已经有未被消费的链路

当前 `useCommandManagement()` 与 Settings 壳层会产出并透传：

1. `commandDisplayModeOptions`
2. `commandGroups`

链路位置：

1. `src/composables/settings/useCommandManagement/index.ts`
2. `src/components/settings/types.ts`
3. `src/components/settings/SettingsWindow.vue`
4. `src/AppSettings.vue`

但当前真实消费者 `SettingsCommandsSection.vue` / `SettingsCommandsToolbar.vue` 并没有用它们。这里可以收口，但必须只收“命令管理这条死链”，不能误伤主题系统和动效系统。

### 1.5 动画问题不是明确泄露，而是“过期任务 churn”

当前窗口尺寸动画在 `src-tauri/src/animation/mod.rs`，已经有两层代纪：

1. `animation_gen`
2. `shrink_delay_gen`

它能让旧任务自我作废，所以这里不是“已经证实的内存泄露”。

但真实问题仍然存在：

1. 高频尺寸变化时，仍会不断 `tokio::spawn` 过期动画任务和延迟收缩任务。
2. 旧任务虽然会退出，但仍然会被创建、唤醒、抢一次执行机会。
3. 行为上容易变成“很多旧目标抢着收尾”，而不是稳定朝最新目标收敛。

---

## 2. 方案选择

围绕这 5 个点，这轮有 3 种推进方式：

| 方案 | 思路 | 结论 |
|---|---|---|
| 方案 1：只补表层入口 | 加个按钮、改 TTL、补几条注释，不动结构 | 否决，很多漂移会继续留着 |
| 方案 2：中强度收口 | 保持现有对外行为和主要 API，不推倒重来，但把已经失真的边界拆开、共用一套生命周期、统一重扫入口和动画调度模型 | **采用** |
| 方案 3：一次性大重构 | 执行链、Settings、terminal.rs、动画一起重写 | 否决，回归面过大 |

用户已明确选择 **方案 2**。

大白话就是：

1. 这轮不是“修一个按钮就走”。
2. 也不是“把整套架构推翻重写”。
3. 而是保留现有产品行为，顺着真实问题把边界收正。

---

## 3. 本轮目标

### 3.1 要达到的结果

1. 应用启动时会主动扫一次终端。
2. Settings 和托盘右键都能显式触发“重新扫描终端”。
3. 终端发现缓存改成“运行期可复用、正常退出清掉、异常退出 1 小时兜底”。
4. 执行链按职责拆开，但 `useCommandExecution()` 对外契约先保持稳定。
5. Settings 独立窗口改为复用共享 lifecycle/composition 路径，不再手写第二套。
6. 命令管理里未被消费的 props / types / computed 收口掉。
7. 动画调度改成“始终只追最新目标”，而不是不断堆过期异步任务。

### 3.2 明确不做

1. 不做终端复用策略的跨平台扩展。
2. 不重做 Settings 的视觉设计。
3. 不把 `src-tauri/src/terminal.rs` 整体拆成大量新模块后顺手改行为。
4. 不把主题系统、动效系统、motion preset 一起重构。
5. 不把动画方案替换成全新第三方引擎。

---

## 4. 详细设计

### 4.1 终端发现改成“启动预热 + 显式重扫 + 正常退出清缓存”

#### 4.1.1 缓存策略

`src-tauri/src/terminal/discovery_cache.rs` 当前 TTL 为 24 小时，本轮改成 1 小时。

新的缓存语义：

1. 进程内缓存：本次运行期间可直接复用。
2. 磁盘缓存：只作为异常退出后的短时兜底。
3. 正常退出：删除磁盘缓存。
4. 下次正常启动：重新扫描一次，再写入新的运行期缓存。

这意味着“1 小时 TTL”主要不是给正常使用者看的，而是给崩溃、强杀、异常退出兜底。

#### 4.1.2 启动预热

在 `src-tauri/src/startup.rs` / `src-tauri/src/lib.rs` 的启动路径里增加一次 best-effort 终端预热扫描。

原则：

1. 不阻断应用启动。
2. 失败只记录日志，不影响主窗口显示。
3. 预热结果直接写入内存缓存和磁盘快照。

大白话就是：

1. 应用一开，就先偷偷扫一遍。
2. 这次扫描是“预热”，不是必须成功的启动前置条件。

#### 4.1.3 显式重扫入口

增加一个统一的强制刷新路径：

1. Rust 侧提供显式 refresh command，内部走“清缓存 -> 重新发现 -> 重新持久化”。
2. Settings 的“重新扫描终端”按钮调用这条 refresh 路径。
3. 托盘右键菜单新增同一入口，也调用这条 refresh 路径。

这里不做两套实现。Settings 和 tray 共用同一条后端刷新逻辑。

#### 4.1.4 Settings 行为

`src/composables/settings/useSettingsWindow/terminal.ts` 拆成两类动作：

1. `loadAvailableTerminals()`
   - 普通读取
   - 优先命中缓存
2. `refreshAvailableTerminals()`
   - 强制重扫
   - 刷新后重新跑 `ensureDefaultTerminal()`
   - 若当前默认终端失效，立即修正并持久化

UI 上在 `SettingsGeneralSection.vue` 的终端分组里增加一个显式按钮，不改当前整体布局结构。

#### 4.1.5 托盘菜单

`src-tauri/src/startup.rs` 的托盘右键菜单新增一项：

1. `rescan_terminals`

它做的事只有一件：触发同一条 refresh 逻辑。

本轮不额外引入复杂通知系统。托盘入口的职责是刷新缓存，不是再额外做前端广播总线。

### 4.2 执行链按职责拆，不改对外行为

#### 4.2.1 拆分原则

这轮不是重写执行系统，而是把互相缠住的职责拆开。

保留不变：

1. `useCommandExecution()` 的对外返回结构
2. 现有 execute / copy / stage / safety dialog 的用户行为
3. prerequisite / preflight 的产品规则

要拆开的职责：

1. 参数面板与 pending intent 判定
2. 单条执行
3. 队列执行
4. prerequisite / preflight 聚合
5. 共享反馈与错误映射

#### 4.2.2 文件边界

`src/composables/execution/useCommandExecution/actions.ts` 改成“编排层”，只负责把子动作装起来。

新增内部边界建议：

1. `src/composables/execution/useCommandExecution/panel.ts`
   - `needsPanel`
   - pending command / intent 路由
2. `src/composables/execution/useCommandExecution/single.ts`
   - 单条执行路径
   - 危险确认
   - prerequisite 阻断 / 告警
3. `src/composables/execution/useCommandExecution/queue.ts`
   - 队列安全校验
   - 整队执行
   - 整队 prerequisite 刷新
4. `src/composables/execution/useCommandExecution/preflight.ts`
   - prerequisite 结果收集与共享转换

这样拆的核心价值是：以后改队列，不必再冒险碰单条执行；改 prerequisite，也不必顺手改到 panel flow。

#### 4.2.3 相关超长文件同步收边

配套做两个轻量收边：

1. `src/composables/app/useAppCompositionRoot/runtime.ts`
   - 继续保留总装配职责
   - 但把 Settings lifecycle 接线和 Launcher runtime 子装配再拆一层，避免继续超过单文件上限
2. `src/components/launcher/parts/LauncherCommandPanel.vue`
   - 不改 UI 行为
   - 只把参数校验、危险 badge、稳定 id 生成等纯状态逻辑抽成独立 composable

大白话就是：

1. 不是为了“分文件而分文件”。
2. 是为了让“执行什么”“什么时候弹确认”“什么时候要参数面板”不再写在一坨里。

### 4.3 Settings 独立窗口并轨到共享 lifecycle

#### 4.3.1 设计选择

本轮选择“共用一套”，不是保留 `AppSettings.vue` 自己手写生命周期。

原因很直接：

1. 主路径已经有 `useAppLifecycle()` 和 `useAppLifecycleBridge()`。
2. `createSettingsScene()` 也已经把 Settings 相关依赖装起来了。
3. 继续让 `AppSettings.vue` 手写第二套，只会让后续行为继续漂移。

#### 4.3.2 落地方式

新增一个 Settings 独立窗口入口装配层，例如：

1. `src/composables/app/useAppCompositionRoot/settingsEntry.ts`

职责：

1. 创建 `settingsScene`
2. 组装 `useAppLifecycleBridge()` 所需的 settings 版本依赖
3. 把 `show_settings_window_when_ready` 放进 `onSettingsReady`
4. 把 `loadAvailableTerminals`、`loadLauncherHotkey`、`storage/hash/broadcast` 这些都接回共享桥

然后 `src/AppSettings.vue` 只保留：

1. 创建入口实例
2. 把 view model 透传给 `SettingsWindow.vue`

#### 4.3.3 行为要求

并轨后，Settings 独立窗口仍必须保持现有行为：

1. 首帧稳定后再 `show_settings_window_when_ready`
2. 首次挂载时加载终端列表
3. 支持 hash 路由
4. 支持 storage / BroadcastChannel 同步
5. 支持 Escape 关闭窗口
6. 能读取 launcher hotkey

换句话说，这不是换行为，只是删掉重复 wiring。

### 4.4 命令管理未消费链路收口

#### 4.4.1 本轮只删“真没人在用”的链路

当前可以明确收口的有：

1. `commandDisplayModeOptions`
2. `commandGroups`
3. 与它们对应的透传 props / types / tests 占位

理由：

1. `SettingsCommandsSection.vue` 真实消费的是 `commandRows`
2. `SettingsCommandsToolbar.vue` 真实消费的是过滤项、排序项、文件项
3. 当前没有任何组件消费 display mode 切换
4. 当前没有任何组件消费 group 展示

#### 4.4.2 本轮不动的部分

以下继续保留：

1. `commandSourceFileOptions`
2. 过滤器状态
3. summary
4. load issues
5. theme / motion / appearance 相关链路

大白话就是：

1. 只把“从 composable 算出来，一路传下去，但页面根本没用”的东西删掉。
2. 不是去碰主题系统，也不是去砍动画系统。

### 4.5 动画调度改成“单实例追最新目标”

#### 4.5.1 设计目标

用户担心“只保留一个任务，会不会不及时”。本轮明确不采用“只处理第一次变化”的模型。

本轮采用的是：

1. 同时最多只存在一个活动动画任务
2. 同时最多只存在一个收缩延迟定时任务
3. 两者都永远只服务于“最新目标尺寸”

这和“把后续变化都丢掉”不是一回事。

#### 4.5.2 新调度语义

新的 resize 调度模型：

1. 新请求到来时，先更新 `latest_target`
2. 如果是 reveal 或扩展：
   - 取消待执行 shrink timer
   - 若当前没有动画，则启动动画
   - 若当前已有动画，则把动画目标切到最新尺寸
3. 如果是收缩：
   - 取消旧 shrink timer
   - 只保留一个新的 shrink timer
   - timer 到期时，若目标没再变化，再朝最新尺寸收缩

动画循环不再执着于“跑完旧目标”，而是每一帧都允许向最新目标重新收敛。

#### 4.5.3 为什么不会变得不顺

因为这里保留的是“唯一活动执行器”，不是“唯一历史目标”。

大白话就是：

1. 旧目标立刻作废
2. 最新目标立即接管
3. 窗口还是持续动，只是不会让很多过期任务轮流抢着动

#### 4.5.4 约束

1. Reveal 模式仍保留“直到本次目标完成再返回”的 blocking 语义。
2. 普通 animated 模式继续允许异步返回。
3. 不改变现有 easing、时长和最小尺寸约束，先只改调度。

---

## 5. 代码边界

| 路径 | 责任 |
|---|---|
| `src-tauri/src/terminal/discovery_cache.rs` | TTL 改为 1 小时，补足磁盘缓存语义 |
| `src-tauri/src/terminal.rs` | 暴露 cached read / force refresh 两条终端发现入口 |
| `src-tauri/src/startup.rs` | 启动预热扫描、tray 新增“重新扫描终端”菜单 |
| `src-tauri/src/lib.rs` | 正常退出时清理终端磁盘缓存 |
| `src/services/tauriBridge.ts` | 新增 refresh terminals bridge |
| `src/composables/app/useAppCompositionRoot/ports.ts` | 暴露 refresh terminals 端口 |
| `src/composables/settings/useSettingsWindow/terminal.ts` | 区分 load 与 refresh 两类终端动作 |
| `src/components/settings/parts/SettingsGeneralSection.vue` | 增加 Settings 内显式“重新扫描终端”入口 |
| `src/composables/execution/useCommandExecution/actions.ts` | 缩成编排层 |
| `src/composables/execution/useCommandExecution/panel.ts` | 参数面板 / pending intent 路由 |
| `src/composables/execution/useCommandExecution/single.ts` | 单条执行职责 |
| `src/composables/execution/useCommandExecution/queue.ts` | 队列执行职责 |
| `src/composables/execution/useCommandExecution/preflight.ts` | prerequisite / preflight 聚合 |
| `src/components/launcher/parts/useLauncherCommandPanelState.ts` | Command panel 纯状态逻辑 |
| `src/composables/app/useAppCompositionRoot/settingsEntry.ts` | Settings 独立窗口共享生命周期入口 |
| `src/AppSettings.vue` | 收敛成薄壳 |
| `src/composables/settings/useCommandManagement/index.ts` | 删除未消费返回值 |
| `src/components/settings/types.ts` | 删除死 props / types |
| `src/components/settings/SettingsWindow.vue` | 删除未消费透传 |
| `src-tauri/src/animation/mod.rs` | 单实例动画 + 单实例 shrink timer + latest target 调度 |

---

## 6. 回归与验证策略

这轮按“安全优先”的原则推进，重点防 4 类回归。

### 6.1 终端发现回归

要覆盖：

1. 缓存 TTL 从 24h 改 1h 后的有效性判断
2. force refresh 会绕过缓存
3. 正常退出会删除磁盘缓存
4. Settings 重扫后默认终端失效时能自动修正

优先测试位置：

1. `src-tauri/src/terminal/tests_cache.rs`
2. `src/services/__tests__/tauriBridge.test.ts`
3. `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`
4. 新增 Settings General 交互测试

### 6.2 执行链回归

要锁住：

1. execute / copy / stage 三种入口仍走原有规则
2. prerequisite 阻断 / 告警语义不变
3. 单条与队列的危险确认行为不变
4. `useCommandExecution()` 对外返回 contract 不变

优先测试位置：

1. `src/composables/__tests__/execution/useCommandExecution.test.ts`
2. `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`

### 6.3 Settings 生命周期回归

要锁住：

1. `show_settings_window_when_ready` 仍在正确时机触发
2. `storage` / `BroadcastChannel` / `hashchange` 监听仍正常
3. 独立 Settings 窗口关闭时仍能正确清理监听

优先测试位置：

1. `src/__tests__/app.settings-hotkeys.test.ts`
2. `src/__tests__/app.failure-events.test.ts`
3. `src/composables/__tests__/app/useAppLifecycle.test.ts`
4. `src/composables/__tests__/app/useAppLifecycleBridge.test.ts`

### 6.4 动画调度回归

要锁住：

1. 快速 expand / shrink 切换时只追最新目标
2. reveal 仍保持 blocking 语义
3. 普通 animated 模式不出现明显卡顿或反向抖动

优先测试位置：

1. `src-tauri/src/animation/tests_logic.rs`
2. 前端现有 failure-events / sizing 回归

---

## 7. 分阶段实施建议

按回归面从小到大，建议后续规划顺序如下：

1. 终端发现入口与缓存策略
2. 命令管理未消费链路收口
3. Settings 生命周期并轨
4. 执行链职责拆分
5. 动画调度收敛

这个顺序的理由：

1. 先把用户可感知、但边界最清楚的终端扫描问题落掉。
2. 再删纯死链，降低后续装配噪音。
3. 然后把 Settings 接回共享 lifecycle，减少双份 wiring。
4. 最后再做执行链和动画这两个回归面更大的部分。

---

## 8. 结论

本轮采用的不是“大重构”，而是用户已确认的 **方案 2：中强度收口**。

落地原则只有 3 条：

1. 行为先稳住，再拆边界。
2. 共享的就共用，未消费的就收掉。
3. 只保留最新目标，不让旧任务继续污染运行态。
