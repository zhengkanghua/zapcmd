# 执行流入队 preflight 缓存与队列提醒设计

> 日期：2026-04-03
> 状态：approved
> 范围：搜索页入队检测、执行流缓存提醒、批量/单条刷新、队列执行语义调整

---

## 1. 背景

当前 Launcher 的 prerequisite / preflight 链路已经覆盖两条路径：

1. 单条直接执行前检测
2. 整个队列执行前检测

但“加入执行流”这条路径仍存在两个缺口：

1. 入队时不做 preflight，用户直到真正执行队列时才知道环境问题
2. 执行流面板卡片没有 prerequisite 状态缓存，无法逐条展示提醒或单独刷新

这会导致体验不一致：

1. 搜索页直接执行时有环境检测反馈
2. 加入执行流时只有“已加入执行流”提示
3. 用户进入执行流后，看不到哪条命令存在环境问题

---

## 2. 目标

本轮设计目标：

1. 命令加入执行流时立即做一次 preflight 检测
2. 将检测结果缓存到队列项上，供执行流面板直接展示
3. 入队后只给一个 total 级别小提示，不弹窗、不展开明细
4. 执行流面板对每条命令单独展示环境提醒，并支持单条刷新
5. 面板头部支持批量刷新当前队列的检测缓存
6. 不引入新的提醒等级体系，继续沿用现有 prerequisite 提示口径

本轮不做：

1. 不新增“今日不再提醒”
2. 不在卡片里默认展示处理建议与 fallback 命令
3. 不在打开执行流面板时自动重跑 preflight
4. 不继续保留“队列执行前 required prerequisite 统一阻断”的旧语义

---

## 3. 总体决策

### 3.1 采用“入队即检测并缓存”

最终采用以下策略：

1. 入队前运行一次 preflight
2. 将结果缓存到该 `StagedCommand`
3. 入队 toast 只显示 total 提示
4. 面板完全依赖缓存展示卡片提醒

不采用：

1. 打开面板时统一检测
2. 面板渲染期实时检测

原因：

1. 更符合“加入执行流时就提醒一次”的需求
2. 避免面板打开时列表抖动与重复探测
3. 刷新动作可被用户明确感知，不制造隐式更新

### 3.2 提醒分两层表达

入队与面板分工固定为：

1. 入队：顶部 total 小提示
2. 面板：卡片级别的紧凑提醒

入队提示不展开单条原因；单条原因只在队列卡片中出现。

### 3.3 不新增新的等级体系

当前 prerequisite 反馈已经有稳定文案口径与视觉语义，本轮继续复用：

1. 不新增红/黄/绿之外的自定义 badge 体系
2. 不增加“检测通过”态
3. 不让卡片提醒与现有执行反馈产生双重认知模型

### 3.4 队列执行不再被 prerequisite 阻断

用户已明确要求：

1. 队列内命令检测失败时仍然保留
2. 仅提示，不阻断整队列执行

因此本轮调整执行语义：

1. preflight 的主职责从“执行前阻断”转为“入队时提示 + 面板内可见性”
2. 队列执行时不再重新跑 prerequisite 检测
3. 队列执行时也不读取缓存作为阻断条件

---

## 4. 交互设计

### 4.1 入队交互

命令入队时：

1. 先执行一次 prerequisite preflight
2. 生成队列项缓存
3. 再把命令写入执行流

提示规则：

1. 如果该条命令没有环境问题，沿用现有 `launcher.flowAdded`
2. 如果该条命令存在环境问题，改为 total 小提示

推荐文案方向：

1. `已加入执行流，1 条命令存在环境提示。`

说明：

1. total 只按“本次加入的这条命令是否存在问题”计数
2. 同一命令即使有多条 prerequisite 问题，也不在 toast 中展开

### 4.2 队列卡片提醒

卡片采用紧凑状态行，且仅在“有问题”时显示。

默认展示内容：

1. 只显示原因主句
2. 不显示处理建议
3. 不显示 fallback 命令

示例：

1. `未检测到 Docker Desktop。`
2. `缺少 GitHub Token（环境变量 GITHUB_TOKEN）。`

若同一命令存在多条问题，默认折叠为：

1. `未检测到 Docker Desktop 等 2 项环境提示。`

### 4.3 刷新交互

执行流面板新增两类刷新动作：

1. 面板头部：`刷新检测`
2. 卡片右侧：`刷新此条`

行为约束：

1. 面板打开时不自动刷新
2. 刷新动作覆盖现有缓存
3. 刷新完成后继续使用 total 小提示，不弹层
4. 某条命令刷新后若已无问题，卡片提醒整块直接消失

---

## 5. 状态模型

### 5.1 扩展 `StagedCommand`

在 [`src/features/launcher/types.ts`](/home/work/projects/zapcmd/src/features/launcher/types.ts) 的 `StagedCommand` 上新增缓存字段：

```ts
interface StagedCommandPreflightCache {
  checkedAt: number;
  issueCount: number;
  source: "issues" | "system-failure";
  issues: string[];
}
```

`StagedCommand` 增加：

```ts
preflightCache?: StagedCommandPreflightCache;
```

字段语义：

1. `checkedAt`：最后一次检测完成时间
2. `issueCount`：当前命令存在几条环境提示
3. `source`：是普通 prerequisite 问题，还是 preflight 系统级失败
4. `issues`：供卡片直接渲染的紧凑原因文本数组

### 5.2 临时 UI 状态不进快照

以下状态不写入 `StagedCommand`：

1. 某条命令是否“刷新中”
2. 当前是否“批量刷新中”
3. 刷新动作的临时 loading / disabled 态

这些状态放在执行流相关 composable 的运行时内存中管理，按 `stagedCommand.id` 建索引。

原因：

1. 避免把 transient UI 状态污染本地持久化快照
2. 防止恢复会话时出现“已恢复但仍显示刷新中”的脏状态

---

## 6. 代码边界

### 6.1 入队路径

需要统一覆盖两条入队入口：

1. 搜索页无参直接入队
2. 参数面板 `stage` 模式确认入队

现有逻辑：

1. `stageResult()` 无 panel 时直接 `appendToStaging()`
2. `submitParamInput()` 在 `stage` 模式下直接 `appendToStaging()`

调整后：

1. 先跑 preflight
2. 生成 `preflightCache`
3. 再执行 `appendToStaging()`

### 6.2 队列面板

执行流面板与卡片组件只消费缓存：

1. `LauncherQueueReviewPanel.vue` 负责头部批量刷新入口
2. `QueueReviewList.vue` 负责单条提醒渲染与“刷新此条”

面板不在 mounted / opened 时自动触发检测。

### 6.3 队列执行

当前 `executeStaged()` 会：

1. 重新收集队列 preflight 问题
2. 当 required prerequisite 失败时阻断执行

本轮调整为：

1. 删除队列执行前 prerequisite 阻断逻辑
2. 删除执行前的二次 prerequisite 探测
3. `executeStaged()` 仅保留安全确认与终端执行职责

### 6.4 会话恢复

[`src/composables/launcher/useLauncherSessionState.ts`](/home/work/projects/zapcmd/src/composables/launcher/useLauncherSessionState.ts) 需要同步支持：

1. `preflightCache` 的 sanitize
2. `preflightCache` 的持久化
3. `preflightCache` 的恢复
4. `LAUNCHER_SESSION_SCHEMA_VERSION` 升级

要求：

1. 旧快照可安全清理或平滑降级
2. 新快照恢复后，面板直接显示上次缓存结果

---

## 7. 文案与展示规则

### 7.1 入队小提示

规则：

1. 无问题：沿用 `已加入执行流`
2. 有问题：使用 total 级提示

约束：

1. 不展示命令名
2. 不展示原因列表
3. 不展示处理建议

### 7.2 卡片提醒

规则：

1. 仅在 `issueCount > 0` 时显示
2. 默认只展示原因
3. 多个原因时折叠为一条摘要

不做：

1. 不显示“检测通过”
2. 不新增新的等级 tag
3. 不在默认卡片正文中显示 resolution / fallback

### 7.3 系统级失败

如果刷新时遇到 `probe-error` 或 `probe-invalid-response`：

1. 仍然写入缓存
2. 卡片展示系统级失败摘要
3. 不把它伪装成多个依赖同时缺失

---

## 8. 测试与验收

### 8.1 单元测试

需要覆盖：

1. 入队时检测并缓存，无问题时保持原有 `flowAdded`
2. 入队时检测并缓存，有问题时改成 total 小提示
3. 参数面板 `stage` 模式入队同样写入缓存
4. 面板渲染只消费缓存，不自动探测
5. `刷新检测` 与 `刷新此条` 能正确覆盖缓存
6. 某条命令问题消失后，卡片提醒整块消失

### 8.2 会话恢复测试

需要覆盖：

1. `preflightCache` 可持久化
2. 恢复后缓存仍存在
3. schema 升级不导致恢复链路异常

### 8.3 执行语义回归

现有“required prerequisite 阻断队列执行”的测试需要整体改写为：

1. 队列内存在缓存问题时，执行仍可继续
2. prerequisite 不再作为队列执行的阻断条件

### 8.4 UI 回归

需要覆盖：

1. 无问题卡片不显示“检测通过”
2. 有问题卡片显示紧凑状态行
3. 不引入新的视觉等级冲突
4. 头部与单条刷新按钮在执行流面板内可操作

---

## 9. 风险

主要风险：

1. 队列执行语义变化较大，需要同步更新旧测试与旧认知
2. session snapshot 若不升级，`preflightCache` 会在持久化时被吞掉
3. 搜索页直入队与参数面板入队是两条路径，若只改一条会出现行为分叉

对应约束：

1. 先补状态模型与测试，再接 UI
2. 明确区分“缓存提醒”与“执行阻断”的职责
3. 所有显示都以缓存为单一事实源，避免同一命令出现两套检测结果
